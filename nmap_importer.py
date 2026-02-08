"""Nmap scan importer.

Parses Nmap XML output ("-oX") and upserts Assets + Services.

Design goals:
- Idempotent: importing the same scan repeatedly doesn't create duplicates
- Upsert: updates existing assets/services when new details appear
- Conservative: never deactivates/removes services by default
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from uuid import UUID
from xml.etree import ElementTree as ET

from sqlmodel import Session, select

from models import Asset, Service


@dataclass
class NmapPort:
    port: int
    transport: str  # tcp|udp
    service_name: Optional[str]
    product: Optional[str]
    version: Optional[str]
    tunnel: Optional[str]
    extra: Optional[str]


@dataclass
class NmapHost:
    ip: str
    mac: Optional[str]
    hostname: Optional[str]
    os_guess: Optional[str]
    ports: List[NmapPort]


def parse_nmap_xml(xml_bytes: bytes) -> List[NmapHost]:
    root = ET.fromstring(xml_bytes)
    hosts: List[NmapHost] = []

    for host_el in root.findall("host"):
        status_el = host_el.find("status")
        if status_el is not None and status_el.get("state") != "up":
            continue

        ip = None
        mac = None
        for addr_el in host_el.findall("address"):
            addr_type = (addr_el.get("addrtype") or "").lower()
            addr = addr_el.get("addr")
            if not addr:
                continue
            if addr_type in ("ipv4", "ipv6") and ip is None:
                ip = addr
            if addr_type == "mac":
                mac = addr

        if not ip:
            continue

        hostname = None
        hn_el = host_el.find("hostnames/hostname")
        if hn_el is not None:
            hostname = hn_el.get("name")

        os_guess = None
        osmatch_el = host_el.find("os/osmatch")
        if osmatch_el is not None:
            os_guess = osmatch_el.get("name")

        ports: List[NmapPort] = []
        for port_el in host_el.findall("ports/port"):
            state_el = port_el.find("state")
            if state_el is None or state_el.get("state") != "open":
                continue

            try:
                port = int(port_el.get("portid") or "0")
            except ValueError:
                continue
            if port <= 0:
                continue

            transport = (port_el.get("protocol") or "tcp").lower()

            svc_el = port_el.find("service")
            svc_name = svc_el.get("name") if svc_el is not None else None
            product = svc_el.get("product") if svc_el is not None else None
            version = svc_el.get("version") if svc_el is not None else None
            tunnel = svc_el.get("tunnel") if svc_el is not None else None
            extra = svc_el.get("extrainfo") if svc_el is not None else None

            ports.append(
                NmapPort(
                    port=port,
                    transport=transport,
                    service_name=svc_name,
                    product=product,
                    version=version,
                    tunnel=tunnel,
                    extra=extra,
                )
            )

        hosts.append(
            NmapHost(
                ip=ip,
                mac=mac,
                hostname=hostname,
                os_guess=os_guess,
                ports=ports,
            )
        )

    return hosts


def _guess_service_protocol(port: int, service_name: Optional[str], tunnel: Optional[str]) -> str:
    """Map Nmap's service name + port to Rackbase's protocol enum."""
    name = (service_name or "").lower()
    tun = (tunnel or "").lower()

    if tun == "ssl" or name in ("https", "ssl/http") or port == 443:
        return "https"
    if name in ("http", "http-alt", "http-proxy") or port == 80 or port == 8080:
        return "http"

    if name in ("ssh", "sftp") or port == 22:
        return "ssh"
    if name in ("ms-wbt-server", "rdp") or port == 3389:
        return "rdp"
    if name in ("microsoft-ds", "netbios-ssn", "smb") or port in (139, 445):
        return "smb"
    if name in ("vnc",) or port in (5900, 5901, 5902):
        return "vnc"
    if name in ("snmp",) or port == 161:
        return "snmp"
    if name in ("ftp",) or port == 21:
        return "ftp"

    return "other"


def _service_display_name(protocol: str, port: int, product: Optional[str]) -> str:
    base = {
        "http": "HTTP",
        "https": "HTTPS",
        "ssh": "SSH",
        "rdp": "RDP",
        "smb": "SMB",
        "vnc": "VNC",
        "snmp": "SNMP",
        "ftp": "FTP",
        "other": "Service",
    }.get(protocol, "Service")

    if product:
        return f"{base} - {product}"
    return f"{base} ({port})"


def _service_description(port_data: NmapPort) -> Optional[str]:
    parts: List[str] = []
    if port_data.service_name:
        parts.append(f"nmap:{port_data.service_name}")
    if port_data.product:
        parts.append(f"product:{port_data.product}")
    if port_data.version:
        parts.append(f"version:{port_data.version}")
    if port_data.extra:
        parts.append(f"info:{port_data.extra}")
    if not parts:
        return None
    return ", ".join(parts)


def import_nmap_xml(
    session: Session,
    xml_bytes: bytes,
    organization_id: UUID,
    site_id: UUID,
    *,
    default_asset_category: str = "computer",
    default_asset_type: str = "other",
    update_asset_names: bool = True,
) -> Dict[str, int]:
    """Upsert assets + services from an Nmap XML scan.

    Returns a dict of counters.
    """

    now = datetime.utcnow()
    hosts = parse_nmap_xml(xml_bytes)

    # Preload existing assets by IP for this org/site
    existing_assets = session.exec(
        select(Asset).where(
            Asset.organization_id == organization_id,
            Asset.site_id == site_id,
            Asset.is_active == True,
        )
    ).all()
    assets_by_ip: Dict[str, Asset] = {a.ip_address: a for a in existing_assets if a.ip_address}

    # Preload existing services by (asset_id, port) to enforce idempotency
    # Query ALL services (including inactive) so we can reactivate them if needed
    existing_services = session.exec(
        select(Service).where(
            Service.organization_id == organization_id,
            Service.site_id == site_id,
        )
    ).all()
    services_by_asset_port: Dict[Tuple[UUID, int], Service] = {(s.asset_id, s.port): s for s in existing_services}

    assets_created = 0
    assets_updated = 0
    services_created = 0
    services_updated = 0
    hosts_processed = 0

    for host in hosts:
        hosts_processed += 1
        asset = assets_by_ip.get(host.ip)

        if asset is None:
            name = host.hostname or host.ip
            asset = Asset(
                organization_id=organization_id,
                site_id=site_id,
                asset_category=default_asset_category,
                asset_type=default_asset_type,
                name=name,
                ip_address=host.ip,
                mac_address=host.mac,
                operating_system=host.os_guess,
                last_seen=now,
                status="active",
                is_active=True,
            )
            session.add(asset)
            assets_by_ip[host.ip] = asset
            assets_created += 1
        else:
            updated = False
            # Keep name stable; update only when we have a better hostname
            if update_asset_names and host.hostname:
                if (not asset.name) or (asset.name == asset.ip_address):
                    asset.name = host.hostname
                    updated = True
            if host.mac and not asset.mac_address:
                asset.mac_address = host.mac
                updated = True
            if host.os_guess and not asset.operating_system:
                asset.operating_system = host.os_guess
                updated = True

            asset.last_seen = now
            if updated:
                asset.updated_at = now
                assets_updated += 1

        # Upsert services for open ports
        for port_data in host.ports:
            key = (asset.id, port_data.port)
            protocol = _guess_service_protocol(port_data.port, port_data.service_name, port_data.tunnel)
            display_name = _service_display_name(protocol, port_data.port, port_data.product)
            description = _service_description(port_data)

            # Build URL only for web services
            url = None
            if asset.ip_address and protocol in ("http", "https"):
                default_port = 80 if protocol == "http" else 443
                if port_data.port == default_port:
                    url = f"{protocol}://{asset.ip_address}"
                else:
                    url = f"{protocol}://{asset.ip_address}:{port_data.port}"

            existing = services_by_asset_port.get(key)
            if existing is None:
                service = Service(
                    organization_id=organization_id,
                    site_id=site_id,
                    asset_id=asset.id,
                    name=display_name,
                    protocol=protocol,
                    port=port_data.port,
                    url=url,
                    description=description,
                    notes=f"Imported from Nmap ({port_data.transport}) on {now.isoformat()}Z",
                    status="active",
                    is_active=True,
                )
                session.add(service)
                services_by_asset_port[key] = service
                services_created += 1
            else:
                changed = False
                # Ensure service is active (in case it was previously deactivated)
                if not existing.is_active:
                    existing.is_active = True
                    changed = True
                # Update the service details as we learn more
                if existing.protocol != protocol and protocol != "other":
                    existing.protocol = protocol
                    changed = True
                if display_name and existing.name != display_name:
                    existing.name = display_name
                    changed = True
                if description and (not existing.description or existing.description != description):
                    existing.description = description
                    changed = True
                if url and (not existing.url or existing.url != url):
                    existing.url = url
                    changed = True

                if changed:
                    existing.updated_at = now
                    services_updated += 1

    return {
        "hosts_processed": hosts_processed,
        "assets_created": assets_created,
        "assets_updated": assets_updated,
        "services_created": services_created,
        "services_updated": services_updated,
    }
