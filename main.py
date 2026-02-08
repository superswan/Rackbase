"""
Rackbase - Backend API
Multi-tenant IT inventory and documentation system
"""

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, SQLModel, col
from sqlalchemy import desc, or_
from typing import List, Optional
from datetime import datetime, timedelta
from uuid import UUID, uuid4
from pydantic import BaseModel
import logging
import os
import shutil
from pathlib import Path

from models import (
    Organization, Site, User, UserOrganization,
    Asset, Network, Software, AssetSoftware,
    Person, InventoryItem,
    Service, Credential,
    FileAttachment, Documentation,
    CustomFieldDefinition, CustomFieldValue,
    AssetTag, NetworkTag,
    AssetRelationship, AssetNetwork,
    AuditLog
)
from database import engine, get_session
from auth import (
    get_current_user, get_password_hash, verify_password,
    create_access_token, require_superadmin
)
from encryption import encrypt_credential, decrypt_credential
from nmap_importer import import_nmap_xml

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(
    title="Rackbase",
    description="Multi-tenant IT inventory and documentation system for MSPs and internal IT teams",
    version="2.0.0"
)

# Get CORS origins from environment variable or use defaults
cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    allow_origins = [origin.strip() for origin in cors_origins_env.split(",")]
else:
    allow_origins = [
        "http://localhost:3036",
        "http://127.0.0.1:3036",
        "http://localhost:8088",
        "http://127.0.0.1:8088",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

SQLModel.metadata.create_all(engine)

# ============================================================================
# REQUEST MODELS
# ============================================================================

class LoginRequest(BaseModel):
    email: str
    password: str

class OrganizationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    notes: Optional[str] = None

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class SiteCreate(BaseModel):
    organization_id: UUID
    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None

class SiteUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class AssetCreate(BaseModel):
    organization_id: UUID
    site_id: UUID
    parent_asset_id: Optional[UUID] = None
    asset_category: str
    asset_type: str
    name: str
    description: Optional[str] = None
    notes: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    operating_system: Optional[str] = None
    os_version: Optional[str] = None
    cpu: Optional[str] = None
    ram_gb: Optional[int] = None
    storage_gb: Optional[int] = None
    firmware_version: Optional[str] = None
    management_ip: Optional[str] = None

class AssetUpdate(BaseModel):
    site_id: Optional[UUID] = None
    parent_asset_id: Optional[UUID] = None
    asset_category: Optional[str] = None
    asset_type: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    operating_system: Optional[str] = None
    os_version: Optional[str] = None
    cpu: Optional[str] = None
    ram_gb: Optional[int] = None
    storage_gb: Optional[int] = None
    firmware_version: Optional[str] = None
    management_ip: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None

class NetworkCreate(BaseModel):
    organization_id: UUID
    site_id: UUID
    name: str
    cidr: str
    vlan_id: Optional[int] = None
    gateway: Optional[str] = None
    dns_servers: Optional[str] = None
    dhcp_enabled: bool = True
    notes: Optional[str] = None

class NetworkUpdate(BaseModel):
    name: Optional[str] = None
    cidr: Optional[str] = None
    vlan_id: Optional[int] = None
    gateway: Optional[str] = None
    dns_servers: Optional[str] = None
    dhcp_enabled: Optional[bool] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class SoftwareCreate(BaseModel):
    name: str
    vendor: Optional[str] = None
    version: Optional[str] = None
    license_key: Optional[str] = None
    license_expiry: Optional[datetime] = None
    notes: Optional[str] = None

class SoftwareUpdate(BaseModel):
    name: Optional[str] = None
    vendor: Optional[str] = None
    version: Optional[str] = None
    license_key: Optional[str] = None
    license_expiry: Optional[datetime] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class PersonCreate(BaseModel):
    organization_id: UUID
    site_id: Optional[UUID] = None
    first_name: str
    last_name: str
    email: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None

class PersonUpdate(BaseModel):
    site_id: Optional[UUID] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class InventoryItemCreate(BaseModel):
    organization_id: UUID
    site_id: UUID
    name: str
    category: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    quantity: int = 1
    location_note: Optional[str] = None
    status: str = "in_stock"
    notes: Optional[str] = None

class InventoryItemUpdate(BaseModel):
    site_id: Optional[UUID] = None
    name: Optional[str] = None
    category: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    quantity: Optional[int] = None
    location_note: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class ServiceCreate(BaseModel):
    organization_id: UUID
    site_id: UUID
    asset_id: UUID
    name: str
    protocol: str
    port: int
    path: Optional[str] = None
    url: Optional[str] = None
    authentication_type: str = "none"
    description: Optional[str] = None
    notes: Optional[str] = None

class ServiceUpdate(BaseModel):
    asset_id: Optional[UUID] = None
    name: Optional[str] = None
    protocol: Optional[str] = None
    port: Optional[int] = None
    path: Optional[str] = None
    url: Optional[str] = None
    authentication_type: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None

class CredentialCreate(BaseModel):
    organization_id: UUID
    site_id: UUID
    asset_id: Optional[UUID] = None
    service_id: Optional[UUID] = None
    name: str
    credential_type: str
    value: str
    username: Optional[str] = None
    description: Optional[str] = None
    expires_at: Optional[datetime] = None

class CredentialUpdate(BaseModel):
    asset_id: Optional[UUID] = None
    service_id: Optional[UUID] = None
    name: Optional[str] = None
    value: Optional[str] = None
    username: Optional[str] = None
    description: Optional[str] = None
    expires_at: Optional[datetime] = None
    is_active: Optional[bool] = None

class DocumentationCreate(BaseModel):
    organization_id: UUID
    site_id: UUID
    asset_id: Optional[UUID] = None
    title: str
    description: str
    content: Optional[str] = None
    content_type: str = "markdown"
    notes: Optional[str] = None
    category: str = "general"

class DocumentationUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    content_type: Optional[str] = None
    notes: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None

class AssetNetworkCreate(BaseModel):
    asset_id: UUID
    network_id: UUID
    ip_address: Optional[str] = None

# ============================================================================
# STARTUP
# ============================================================================

@app.on_event("startup")
async def create_superadmin():
    with Session(engine) as session:
        statement = select(User).where(User.is_superadmin == True)
        superadmin = session.exec(statement).first()
        if not superadmin:
            superadmin = User(
                email="admin@inventory.local",
                password_hash=get_password_hash("admin123"),
                first_name="Super",
                last_name="Admin",
                is_superadmin=True
            )
            session.add(superadmin)
            session.commit()
            logger.info("Created default superadmin")

# ============================================================================
# AUTH
# ============================================================================

@app.post("/auth/login")
async def login(credentials: LoginRequest, session: Session = Depends(get_session)):
    statement = select(User).where(User.email == credentials.email)
    user = session.exec(statement).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# ============================================================================
# ORGANIZATIONS
# ============================================================================

@app.get("/organizations", response_model=List[Organization])
async def list_organizations(
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.is_superadmin:
        statement = select(Organization).where(Organization.is_active == True).offset(skip).limit(limit)
    else:
        statement = (
            select(Organization)
            .join(UserOrganization)
            .where(UserOrganization.user_id == current_user.id)
            .where(Organization.is_active == True)
            .offset(skip).limit(limit)
        )
    return session.exec(statement).all()

@app.post("/organizations", response_model=Organization)
async def create_organization(
    data: OrganizationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_superadmin)
):
    org = Organization(**data.dict())
    session.add(org)
    session.commit()
    session.refresh(org)
    return org

@app.get("/organizations/{org_id}", response_model=Organization)
async def get_organization(
    org_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    org = session.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org

@app.put("/organizations/{org_id}", response_model=Organization)
async def update_organization(
    org_id: UUID,
    data: OrganizationUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    org = session.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(org, key, value)
    org.updated_at = datetime.utcnow()
    
    session.commit()
    session.refresh(org)
    return org

@app.delete("/organizations/{org_id}")
async def delete_organization(
    org_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_superadmin)
):
    org = session.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Permanently delete organization
    session.delete(org)
    session.commit()
    return {"message": "Organization deleted"}

# ============================================================================
# SITES
# ============================================================================

@app.get("/sites", response_model=List[Site])
async def list_sites(
    organization_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Site).where(Site.is_active == True)
    if organization_id:
        statement = statement.where(Site.organization_id == organization_id)
    statement = statement.offset(skip).limit(limit)
    return session.exec(statement).all()

@app.post("/sites", response_model=Site)
async def create_site(
    data: SiteCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    org = session.get(Organization, data.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    site = Site(**data.dict())
    session.add(site)
    session.commit()
    session.refresh(site)
    return site

@app.get("/sites/{site_id}", response_model=Site)
async def get_site(
    site_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    site = session.get(Site, site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return site

@app.put("/sites/{site_id}", response_model=Site)
async def update_site(
    site_id: UUID,
    data: SiteUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    site = session.get(Site, site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(site, key, value)
    site.updated_at = datetime.utcnow()
    
    session.commit()
    session.refresh(site)
    return site

@app.delete("/sites/{site_id}")
async def delete_site(
    site_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    site = session.get(Site, site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    # Permanently delete site
    session.delete(site)
    session.commit()
    return {"message": "Site deleted"}

# ============================================================================
# ASSETS (IP-addressable devices only)
# ============================================================================

@app.get("/assets", response_model=List[Asset])
async def list_assets(
    organization_id: Optional[UUID] = None,
    site_id: Optional[UUID] = None,
    asset_category: Optional[str] = None,
    asset_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Asset).where(Asset.is_active == True)
    if organization_id:
        statement = statement.where(Asset.organization_id == organization_id)
    if site_id:
        statement = statement.where(Asset.site_id == site_id)
    if asset_category:
        statement = statement.where(Asset.asset_category == asset_category)
    if asset_type:
        statement = statement.where(Asset.asset_type == asset_type)
    statement = statement.offset(skip).limit(limit)
    return session.exec(statement).all()

@app.post("/assets", response_model=Asset)
async def create_asset(
    data: AssetCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    site = session.get(Site, data.site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    if site.organization_id != data.organization_id:
        raise HTTPException(status_code=400, detail="Site does not belong to organization")
    
    # Validate parent_asset_id if provided
    if data.parent_asset_id:
        parent_asset = session.get(Asset, data.parent_asset_id)
        if not parent_asset:
            raise HTTPException(status_code=404, detail="Parent asset not found")
        if parent_asset.organization_id != data.organization_id:
            raise HTTPException(status_code=400, detail="Parent asset does not belong to organization")
    
    asset = Asset(**data.dict())
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset

@app.get("/assets/{asset_id}", response_model=Asset)
async def get_asset(
    asset_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    asset = session.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

@app.put("/assets/{asset_id}", response_model=Asset)
async def update_asset(
    asset_id: UUID,
    data: AssetUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    asset = session.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Validate parent_asset_id if being updated
    if data.parent_asset_id is not None:
        parent_asset = session.get(Asset, data.parent_asset_id)
        if not parent_asset:
            raise HTTPException(status_code=404, detail="Parent asset not found")
        if parent_asset.organization_id != asset.organization_id:
            raise HTTPException(status_code=400, detail="Parent asset does not belong to organization")
        if str(parent_asset.id) == str(asset_id):
            raise HTTPException(status_code=400, detail="Asset cannot be its own parent")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(asset, key, value)
    asset.updated_at = datetime.utcnow()
    
    session.commit()
    session.refresh(asset)
    return asset

@app.delete("/assets/{asset_id}")
async def delete_asset(
    asset_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    asset = session.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Permanently delete associated services
    services = session.exec(
        select(Service).where(Service.asset_id == asset_id)
    ).all()

    for service in services:
        session.delete(service)

    # Permanently delete the asset
    session.delete(asset)
    session.commit()
    return {"message": "Asset deleted"}

@app.get("/assets/{asset_id}/details")
async def get_asset_details(
    asset_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get asset with all associated data (files, credentials, services, people, networks, software, parent_asset, child_vms)"""
    asset = session.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Get parent asset (hypervisor) if parent_asset_id is set
    parent_asset = None
    if asset.parent_asset_id:
        parent_asset = session.get(Asset, asset.parent_asset_id)
    
    # Get child VMs (assets that have this asset as their parent)
    child_vms = session.exec(
        select(Asset).where(
            Asset.parent_asset_id == asset_id,
            Asset.is_active == True
        )
    ).all()
    
    # Get associated files
    files = session.exec(
        select(FileAttachment).where(
            FileAttachment.asset_id == asset_id,
            FileAttachment.is_active == True
        )
    ).all()
    
    # Get associated credentials
    credentials = session.exec(
        select(Credential).where(
            Credential.asset_id == asset_id,
            Credential.is_active == True
        )
    ).all()
    
    # Get associated services
    services = session.exec(
        select(Service).where(
            Service.asset_id == asset_id,
            Service.is_active == True
        )
    ).all()
    
    # Get associated people (if they have asset_id set)
    # Note: Person model needs asset_id field added
    people = []
    
    # Get associated networks through AssetNetwork join table with IP addresses
    asset_networks = session.exec(
        select(AssetNetwork, Network).join(
            Network, AssetNetwork.network_id == Network.id
        ).where(
            AssetNetwork.asset_id == asset_id
        )
    ).all()
    
    networks = []
    for asset_network, network in asset_networks:
        networks.append({
            "id": network.id,
            "name": network.name,
            "cidr": network.cidr,
            "vlan_id": network.vlan_id,
            "gateway": network.gateway,
            "ip_address": asset_network.ip_address  # IP specific to this mapping
        })
    
    # Get installed software
    software = session.exec(
        select(Software, AssetSoftware).join(
            AssetSoftware, AssetSoftware.software_id == Software.id
        ).where(
            AssetSoftware.asset_id == asset_id,
            Software.is_active == True
        )
    ).all()
    
    return {
        "asset": asset,
        "parent_asset": parent_asset,
        "child_vms": child_vms,
        "files": files,
        "credentials": credentials,
        "services": services,
        "people": people,
        "networks": networks,
        "software": [s[0] for s in software] if software else []
    }

# ============================================================================
# NETWORKS (Separate from Assets)
# ============================================================================

@app.get("/networks", response_model=List[Network])
async def list_networks(
    organization_id: Optional[UUID] = None,
    site_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Network).where(Network.is_active == True)
    if organization_id:
        statement = statement.where(Network.organization_id == organization_id)
    if site_id:
        statement = statement.where(Network.site_id == site_id)
    statement = statement.offset(skip).limit(limit)
    return session.exec(statement).all()

@app.post("/networks", response_model=Network)
async def create_network(
    data: NetworkCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    site = session.get(Site, data.site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    network = Network(**data.dict())
    session.add(network)
    session.commit()
    session.refresh(network)
    return network

@app.get("/networks/{network_id}", response_model=Network)
async def get_network(
    network_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    network = session.get(Network, network_id)
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")
    return network

@app.put("/networks/{network_id}", response_model=Network)
async def update_network(
    network_id: UUID,
    data: NetworkUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    network = session.get(Network, network_id)
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(network, key, value)
    network.updated_at = datetime.utcnow()
    
    session.commit()
    session.refresh(network)
    return network

@app.delete("/networks/{network_id}")
async def delete_network(
    network_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    network = session.get(Network, network_id)
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")
    
    # Permanently delete network
    session.delete(network)
    session.commit()
    return {"message": "Network deleted"}

# ============================================================================
# ASSET-NETWORK MAPPINGS
# ============================================================================

@app.post("/asset-networks", response_model=AssetNetwork)
async def create_asset_network_mapping(
    data: AssetNetworkCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new mapping between an asset and a network"""
    # Validate asset exists
    asset = session.get(Asset, data.asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Validate network exists
    network = session.get(Network, data.network_id)
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")
    
    # Validate asset and network belong to the same organization
    if asset.organization_id != network.organization_id:
        raise HTTPException(
            status_code=400, 
            detail="Asset and network must belong to the same organization"
        )
    
    # Check if mapping already exists
    existing = session.exec(
        select(AssetNetwork).where(
            AssetNetwork.asset_id == data.asset_id,
            AssetNetwork.network_id == data.network_id
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="Asset is already mapped to this network"
        )
    
    # Create the mapping
    mapping = AssetNetwork(
        asset_id=data.asset_id,
        network_id=data.network_id,
        ip_address=data.ip_address
    )
    session.add(mapping)
    session.commit()
    session.refresh(mapping)
    
    return mapping

@app.delete("/asset-networks/{asset_id}/{network_id}")
async def delete_asset_network_mapping(
    asset_id: UUID,
    network_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Remove a mapping between an asset and a network"""
    mapping = session.exec(
        select(AssetNetwork).where(
            AssetNetwork.asset_id == asset_id,
            AssetNetwork.network_id == network_id
        )
    ).first()
    
    if not mapping:
        raise HTTPException(status_code=404, detail="Asset-Network mapping not found")
    
    session.delete(mapping)
    session.commit()
    
    return {"message": "Asset-Network mapping deleted"}

# ============================================================================
# SOFTWARE
# ============================================================================

@app.get("/software", response_model=List[Software])
async def list_software(
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Software).where(Software.is_active == True).offset(skip).limit(limit)
    return session.exec(statement).all()

@app.post("/software", response_model=Software)
async def create_software(
    data: SoftwareCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    software = Software(**data.dict())
    session.add(software)
    session.commit()
    session.refresh(software)
    return software

@app.get("/software/{software_id}", response_model=Software)
async def get_software(
    software_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    software = session.get(Software, software_id)
    if not software:
        raise HTTPException(status_code=404, detail="Software not found")
    return software

@app.put("/software/{software_id}", response_model=Software)
async def update_software(
    software_id: UUID,
    data: SoftwareUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    software = session.get(Software, software_id)
    if not software:
        raise HTTPException(status_code=404, detail="Software not found")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(software, key, value)
    software.updated_at = datetime.utcnow()
    
    session.commit()
    session.refresh(software)
    return software

@app.delete("/software/{software_id}")
async def delete_software(
    software_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    software = session.get(Software, software_id)
    if not software:
        raise HTTPException(status_code=404, detail="Software not found")
    
    # Permanently delete software
    session.delete(software)
    session.commit()
    return {"message": "Software deleted"}

# ============================================================================
# PEOPLE (Client employees)
# ============================================================================

@app.get("/people", response_model=List[Person])
async def list_people(
    organization_id: Optional[UUID] = None,
    site_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Person).where(Person.is_active == True)
    if organization_id:
        statement = statement.where(Person.organization_id == organization_id)
    if site_id:
        statement = statement.where(Person.site_id == site_id)
    statement = statement.offset(skip).limit(limit)
    return session.exec(statement).all()

@app.post("/people", response_model=Person)
async def create_person(
    data: PersonCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    person = Person(**data.dict())
    session.add(person)
    session.commit()
    session.refresh(person)
    return person

@app.get("/people/{person_id}", response_model=Person)
async def get_person(
    person_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    person = session.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    return person

@app.put("/people/{person_id}", response_model=Person)
async def update_person(
    person_id: UUID,
    data: PersonUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    person = session.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(person, key, value)
    person.updated_at = datetime.utcnow()
    
    session.commit()
    session.refresh(person)
    return person

@app.delete("/people/{person_id}")
async def delete_person(
    person_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    person = session.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    
    # Permanently delete person
    session.delete(person)
    session.commit()
    return {"message": "Person deleted"}

# ============================================================================
# INVENTORY ITEMS
# ============================================================================

@app.get("/inventory", response_model=List[InventoryItem])
async def list_inventory(
    organization_id: Optional[UUID] = None,
    site_id: Optional[UUID] = None,
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(InventoryItem).where(InventoryItem.is_active == True)
    if organization_id:
        statement = statement.where(InventoryItem.organization_id == organization_id)
    if site_id:
        statement = statement.where(InventoryItem.site_id == site_id)
    if category:
        statement = statement.where(InventoryItem.category == category)
    statement = statement.offset(skip).limit(limit)
    return session.exec(statement).all()

@app.post("/inventory", response_model=InventoryItem)
async def create_inventory_item(
    data: InventoryItemCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    item = InventoryItem(**data.dict())
    session.add(item)
    session.commit()
    session.refresh(item)
    return item

@app.get("/inventory/{item_id}", response_model=InventoryItem)
async def get_inventory_item(
    item_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    item = session.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return item

@app.put("/inventory/{item_id}", response_model=InventoryItem)
async def update_inventory_item(
    item_id: UUID,
    data: InventoryItemUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    item = session.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(item, key, value)
    item.updated_at = datetime.utcnow()
    
    session.commit()
    session.refresh(item)
    return item

@app.delete("/inventory/{item_id}")
async def delete_inventory_item(
    item_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    item = session.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    # Permanently delete inventory item
    session.delete(item)
    session.commit()
    return {"message": "Inventory item deleted"}

# ============================================================================
# SERVICES
# ============================================================================

@app.get("/services", response_model=List[Service])
async def list_services(
    organization_id: Optional[UUID] = None,
    site_id: Optional[UUID] = None,
    asset_id: Optional[UUID] = None,
    protocol: Optional[str] = None,
    port: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Service).where(Service.is_active == True)
    if organization_id:
        statement = statement.where(Service.organization_id == organization_id)
    if site_id:
        statement = statement.where(Service.site_id == site_id)
    if asset_id:
        statement = statement.where(Service.asset_id == asset_id)
    if protocol:
        statement = statement.where(Service.protocol == protocol)
    if port:
        statement = statement.where(Service.port == port)
    statement = statement.offset(skip).limit(limit)
    return session.exec(statement).all()

@app.post("/services", response_model=Service)
async def create_service(
    data: ServiceCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    asset = session.get(Asset, data.asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    service = Service(**data.dict())
    session.add(service)
    session.commit()
    session.refresh(service)
    return service

@app.get("/services/{service_id}", response_model=Service)
async def get_service(
    service_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    service = session.get(Service, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service

@app.put("/services/{service_id}", response_model=Service)
async def update_service(
    service_id: UUID,
    data: ServiceUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    service = session.get(Service, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(service, key, value)
    service.updated_at = datetime.utcnow()
    
    session.commit()
    session.refresh(service)
    return service

@app.delete("/services/{service_id}")
async def delete_service(
    service_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    service = session.get(Service, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Permanently delete service
    session.delete(service)
    session.commit()
    return {"message": "Service deleted"}

# ============================================================================
# CREDENTIALS
# ============================================================================

@app.get("/credentials", response_model=List[Credential])
async def list_credentials(
    organization_id: Optional[UUID] = None,
    site_id: Optional[UUID] = None,
    asset_id: Optional[UUID] = None,
    service_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Credential).where(Credential.is_active == True)
    if organization_id:
        statement = statement.where(Credential.organization_id == organization_id)
    if site_id:
        statement = statement.where(Credential.site_id == site_id)
    if asset_id:
        statement = statement.where(Credential.asset_id == asset_id)
    if service_id:
        statement = statement.where(Credential.service_id == service_id)
    statement = statement.offset(skip).limit(limit)
    return session.exec(statement).all()

@app.post("/credentials", response_model=Credential)
async def create_credential(
    data: CredentialCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not data.asset_id and not data.service_id:
        raise HTTPException(status_code=400, detail="Must provide asset_id or service_id")
    
    if data.asset_id:
        asset = session.get(Asset, data.asset_id)
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")
    
    if data.service_id:
        service = session.get(Service, data.service_id)
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
    
    encrypted_value = encrypt_credential(data.value)
    
    credential = Credential(
        organization_id=data.organization_id,
        site_id=data.site_id,
        asset_id=data.asset_id,
        service_id=data.service_id,
        name=data.name,
        credential_type=data.credential_type,
        encrypted_value=encrypted_value,
        username=data.username,
        description=data.description,
        expires_at=data.expires_at,
        created_by=current_user.id
    )
    session.add(credential)
    session.commit()
    session.refresh(credential)
    return credential

@app.get("/credentials/{credential_id}")
async def get_credential(
    credential_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    credential = session.get(Credential, credential_id)
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    decrypted_value = decrypt_credential(credential.encrypted_value)
    
    return {
        "id": credential.id,
        "organization_id": credential.organization_id,
        "site_id": credential.site_id,
        "asset_id": credential.asset_id,
        "service_id": credential.service_id,
        "name": credential.name,
        "credential_type": credential.credential_type,
        "value": decrypted_value,
        "username": credential.username,
        "description": credential.description,
        "expires_at": credential.expires_at,
        "last_used": credential.last_used,
        "is_active": credential.is_active,
        "created_by": credential.created_by,
        "created_at": credential.created_at,
        "updated_at": credential.updated_at
    }

@app.put("/credentials/{credential_id}", response_model=Credential)
async def update_credential(
    credential_id: UUID,
    data: CredentialUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    credential = session.get(Credential, credential_id)
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    update_data = data.dict(exclude_unset=True)
    
    if "value" in update_data and update_data["value"]:
        update_data["encrypted_value"] = encrypt_credential(update_data.pop("value"))
    
    for key, value in update_data.items():
        setattr(credential, key, value)
    credential.updated_at = datetime.utcnow()
    
    session.commit()
    session.refresh(credential)
    return credential

@app.delete("/credentials/{credential_id}")
async def delete_credential(
    credential_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    credential = session.get(Credential, credential_id)
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    # Permanently delete credential
    session.delete(credential)
    session.commit()
    return {"message": "Credential deleted"}

# ============================================================================
# FILES (File Attachments)
# ============================================================================

@app.post("/files/upload")
async def upload_file(
    file: UploadFile = File(...),
    organization_id: UUID = Query(...),
    site_id: UUID = Query(...),
    asset_id: Optional[UUID] = Query(None),
    name: Optional[str] = Query(None),
    description: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Validate organization and site exist
    org = session.get(Organization, organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    site = session.get(Site, site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    # Validate asset if provided
    if asset_id:
        asset = session.get(Asset, asset_id)
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")
    
    # Determine friendly name
    original_filename = file.filename or "unnamed"
    friendly_name = name if name else original_filename
    
    # Check for duplicate file name in this org/site
    existing_file = session.exec(
        select(FileAttachment).where(
            FileAttachment.organization_id == organization_id,
            FileAttachment.site_id == site_id,
            FileAttachment.name == friendly_name,
            FileAttachment.is_active == True
        )
    ).first()
    
    if existing_file:
        raise HTTPException(
            status_code=409, 
            detail=f"A file named '{friendly_name}' already exists in this site. Please use a different name or delete the existing file first."
        )
    
    # Generate unique filename
    file_extension = os.path.splitext(original_filename)[1]
    unique_filename = f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file to uploads directory
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save file: {e}")
        raise HTTPException(status_code=500, detail="Failed to save file")
    finally:
        file.file.close()
    
    # Create FileAttachment record
    file_attachment = FileAttachment(
        organization_id=organization_id,
        site_id=site_id,
        asset_id=asset_id,
        name=friendly_name,
        file_path=str(file_path),
        file_size=os.path.getsize(file_path),
        mime_type=file.content_type or "application/octet-stream",
        description=description,
        uploaded_by=current_user.id
    )
    
    session.add(file_attachment)
    session.commit()
    session.refresh(file_attachment)
    
    return {
        "id": file_attachment.id,
        "name": file_attachment.name,
        "file_size": file_attachment.file_size,
        "mime_type": file_attachment.mime_type,
        "description": file_attachment.description,
        "organization_id": file_attachment.organization_id,
        "site_id": file_attachment.site_id,
        "asset_id": file_attachment.asset_id,
        "uploaded_by": file_attachment.uploaded_by,
        "created_at": file_attachment.created_at
    }

@app.get("/files", response_model=List[FileAttachment])
async def list_files(
    organization_id: Optional[UUID] = None,
    site_id: Optional[UUID] = None,
    asset_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(FileAttachment).where(FileAttachment.is_active == True)
    
    if organization_id:
        statement = statement.where(FileAttachment.organization_id == organization_id)
    if site_id:
        statement = statement.where(FileAttachment.site_id == site_id)
    if asset_id:
        statement = statement.where(FileAttachment.asset_id == asset_id)
    
    statement = statement.offset(skip).limit(limit)
    return session.exec(statement).all()

@app.get("/files/{file_id}/download")
async def download_file(
    file_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Download a file by its ID - uses friendly name for the download filename"""
    file_attachment = session.get(FileAttachment, file_id)
    if not file_attachment:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check if file exists on filesystem
    file_path = Path(file_attachment.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    # Use the friendly name for download, but keep the original extension
    original_extension = file_path.suffix
    friendly_filename = file_attachment.name
    if not friendly_filename.endswith(original_extension):
        friendly_filename = f"{friendly_filename}{original_extension}"
    
    return FileResponse(
        path=str(file_path),
        filename=friendly_filename,
        media_type=file_attachment.mime_type
    )

@app.delete("/files/{file_id}")
async def delete_file(
    file_id: UUID,
    delete_from_filesystem: bool = Query(True, description="Also delete file from filesystem"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    file_attachment = session.get(FileAttachment, file_id)
    if not file_attachment:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Delete from filesystem
    if delete_from_filesystem:
        try:
            file_path = Path(file_attachment.file_path)
            if file_path.exists():
                file_path.unlink()
                logger.info(f"Deleted file from filesystem: {file_attachment.file_path}")
        except Exception as e:
            logger.error(f"Failed to delete file from filesystem: {e}")
            # Don't fail the request if file deletion fails, just log it
    
    # Permanently delete file record
    session.delete(file_attachment)
    session.commit()
    return {"message": "File deleted", "file_id": file_id}

@app.post("/files/{file_id}/share")
async def toggle_file_share(
    file_id: UUID,
    share: bool = Query(..., description="Enable or disable sharing"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Generate or revoke a share token for a file"""
    file_attachment = session.get(FileAttachment, file_id)
    if not file_attachment:
        raise HTTPException(status_code=404, detail="File not found")
    
    if share:
        # Generate a new share token
        import secrets
        file_attachment.share_token = secrets.token_urlsafe(32)
        file_attachment.is_public = True
        message = "Sharing enabled"
    else:
        # Revoke the share token
        file_attachment.share_token = None
        file_attachment.is_public = False
        message = "Sharing disabled"
    
    file_attachment.updated_at = datetime.utcnow()
    session.commit()
    
    return {
        "message": message,
        "file_id": str(file_id),
        "share_token": file_attachment.share_token,
        "is_public": file_attachment.is_public,
        "share_url": f"/shared/file/{file_attachment.share_token}" if file_attachment.share_token else None
    }

@app.get("/shared/file/{token}")
async def view_shared_file(
    token: str,
    session: Session = Depends(get_session)
):
    """View or download a shared file by token (no auth required)"""
    file_attachment = session.exec(
        select(FileAttachment).where(
            FileAttachment.share_token == token,
            FileAttachment.is_public == True,
            FileAttachment.is_active == True
        )
    ).first()
    
    if not file_attachment:
        raise HTTPException(status_code=404, detail="Shared file not found or no longer available")
    
    # Check if file exists on filesystem
    file_path = Path(file_attachment.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=str(file_path),
        filename=file_attachment.name,
        media_type=file_attachment.mime_type
    )

# ============================================================================
# DOCUMENTATION SHARING
# ============================================================================

@app.post("/documentation/{doc_id}/share")
async def toggle_doc_share(
    doc_id: UUID,
    share: bool = Query(..., description="Enable or disable sharing"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Generate or revoke a share token for a document"""
    doc = session.get(Documentation, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if share:
        import secrets
        doc.share_token = secrets.token_urlsafe(32)
        doc.is_public = True
        message = "Sharing enabled"
    else:
        doc.share_token = None
        doc.is_public = False
        message = "Sharing disabled"
    
    doc.updated_at = datetime.utcnow()
    session.commit()
    
    return {
        "message": message,
        "doc_id": str(doc_id),
        "share_token": doc.share_token,
        "is_public": doc.is_public,
        "share_url": f"/shared/doc/{doc.share_token}" if doc.share_token else None
    }

@app.get("/shared/doc/{token}")
async def view_shared_doc(
    token: str,
    session: Session = Depends(get_session)
):
    """View a shared document by token (no auth required)"""
    doc = session.exec(
        select(Documentation).where(
            Documentation.share_token == token,
            Documentation.is_public == True,
            Documentation.is_active == True
        )
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Shared document not found or no longer available")
    
    return {
        "id": str(doc.id),
        "title": doc.title,
        "description": doc.description,
        "content": doc.content,
        "content_type": doc.content_type,
        "category": doc.category,
        "share_url": f"/shared/doc/{token}"
    }

# ============================================================================
# IMPORTS
# ============================================================================
# IMPORTS
# =========================================================================

@app.post("/imports/nmap")
async def import_nmap_scan(
    scan: UploadFile = File(..., description="Nmap XML output (use: nmap ... -oX scan.xml)"),
    organization_id: UUID = Query(...),
    site_id: UUID = Query(...),
    default_asset_category: str = Query("computer"),
    default_asset_type: str = Query("other"),
    update_asset_names: bool = Query(True),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Import an Nmap XML scan and upsert assets + services.

    - Assets are matched by IP address within the org/site.
    - Services are matched by (asset_id, port) to avoid duplicates.
    - Re-importing the same scan is safe (idempotent).
    """

    org = session.get(Organization, organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    site = session.get(Site, site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    if site.organization_id != organization_id:
        raise HTTPException(status_code=400, detail="Site does not belong to organization")

    # Basic access check (matches existing access patterns elsewhere)
    if not current_user.is_superadmin:
        membership = session.exec(
            select(UserOrganization).where(
                UserOrganization.user_id == current_user.id,
                UserOrganization.organization_id == organization_id,
            )
        ).first()
        if not membership:
            raise HTTPException(status_code=403, detail="Access denied")

    xml_bytes = await scan.read()
    if not xml_bytes:
        raise HTTPException(status_code=400, detail="Empty scan file")

    try:
        result = import_nmap_xml(
            session,
            xml_bytes,
            organization_id,
            site_id,
            default_asset_category=default_asset_category,
            default_asset_type=default_asset_type,
            update_asset_names=update_asset_names,
        )
    except Exception as e:
        logger.exception("Failed to import Nmap scan")
        raise HTTPException(status_code=400, detail=f"Invalid Nmap XML: {str(e)}")

    session.add(
        AuditLog(
            organization_id=organization_id,
            user_id=current_user.id,
            action="import",
            target_type="nmap",
            target_id=None,
            details=(
                f"nmap_import hosts={result.get('hosts_processed', 0)} "
                f"assets_created={result.get('assets_created', 0)} assets_updated={result.get('assets_updated', 0)} "
                f"services_created={result.get('services_created', 0)} services_updated={result.get('services_updated', 0)}"
            ),
        )
    )

    session.commit()
    return result

# ============================================================================
# DOCUMENTATION
# ============================================================================

@app.get("/documentation", response_model=List[Documentation])
async def list_documentation(
    organization_id: Optional[UUID] = None,
    site_id: Optional[UUID] = None,
    asset_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Documentation).where(Documentation.is_active == True)
    
    if organization_id:
        statement = statement.where(Documentation.organization_id == organization_id)
    if site_id:
        statement = statement.where(Documentation.site_id == site_id)
    if asset_id:
        statement = statement.where(Documentation.asset_id == asset_id)
    
    statement = statement.offset(skip).limit(limit)
    return session.exec(statement).all()

@app.post("/documentation", response_model=Documentation)
async def create_documentation(
    data: DocumentationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Verify organization exists
    org = session.get(Organization, data.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Verify site exists and belongs to organization
    site = session.get(Site, data.site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    if site.organization_id != data.organization_id:
        raise HTTPException(status_code=400, detail="Site does not belong to organization")
    
    # Verify asset if provided
    if data.asset_id:
        asset = session.get(Asset, data.asset_id)
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")
        if asset.organization_id != data.organization_id:
            raise HTTPException(status_code=400, detail="Asset does not belong to organization")
    
    # Create documentation
    documentation = Documentation(
        organization_id=data.organization_id,
        site_id=data.site_id,
        asset_id=data.asset_id,
        title=data.title,
        description=data.description,
        content=data.content,
        content_type=data.content_type,
        notes=data.notes,
        category=data.category,
        version=1,
        author_id=current_user.id
    )
    
    session.add(documentation)
    session.commit()
    session.refresh(documentation)
    
    # Log audit event
    audit_log = AuditLog(
        organization_id=data.organization_id,
        user_id=current_user.id,
        action="create",
        target_type="documentation",
        target_id=documentation.id,
        details=f"Created documentation '{data.title}'"
    )
    session.add(audit_log)
    session.commit()
    
    return documentation

@app.get("/documentation/{doc_id}", response_model=Documentation)
async def get_documentation(
    doc_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    documentation = session.get(Documentation, doc_id)
    if not documentation:
        raise HTTPException(status_code=404, detail="Documentation not found")
    return documentation

@app.put("/documentation/{doc_id}", response_model=Documentation)
async def update_documentation(
    doc_id: UUID,
    data: DocumentationUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    documentation = session.get(Documentation, doc_id)
    if not documentation:
        raise HTTPException(status_code=404, detail="Documentation not found")
    
    # Update fields
    for key, value in data.dict(exclude_unset=True).items():
        setattr(documentation, key, value)
    
    # Increment version on content change
    if data.description is not None or data.title is not None or data.content is not None:
        documentation.version += 1
    
    documentation.updated_at = datetime.utcnow()
    
    session.commit()
    session.refresh(documentation)
    
    # Log audit event
    audit_log = AuditLog(
        organization_id=documentation.organization_id,
        user_id=current_user.id,
        action="update",
        target_type="documentation",
        target_id=documentation.id,
        details=f"Updated documentation '{documentation.title}' (version {documentation.version})"
    )
    session.add(audit_log)
    session.commit()
    
    return documentation

@app.delete("/documentation/{doc_id}")
async def delete_documentation(
    doc_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    documentation = session.get(Documentation, doc_id)
    if not documentation:
        raise HTTPException(status_code=404, detail="Documentation not found")
    
    # Capture info for audit log before deletion
    org_id = documentation.organization_id
    doc_title = documentation.title
    
    # Permanently delete documentation
    session.delete(documentation)
    session.commit()
    
    # Log audit event
    audit_log = AuditLog(
        organization_id=org_id,
        user_id=current_user.id,
        action="delete",
        target_type="documentation",
        target_id=doc_id,
        details=f"Deleted documentation '{doc_title}'"
    )
    session.add(audit_log)
    session.commit()
    
    return {"message": "Documentation deleted", "doc_id": doc_id}

# ============================================================================
# USERS (Global Management)
# ============================================================================

class UserCreate(BaseModel):
    email: str
    password: str
    first_name: str = ""
    last_name: str = ""

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None

@app.get("/users")
async def list_users(
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_superadmin)
):
    """List all users with their organization memberships"""
    statement = select(User).where(User.is_active == True).offset(skip).limit(limit)
    users = session.exec(statement).all()
    
    result = []
    for user in users:
        # Get user organizations
        user_orgs_stmt = select(UserOrganization, Organization).join(
            Organization, UserOrganization.organization_id == Organization.id
        ).where(UserOrganization.user_id == user.id)
        user_orgs = session.exec(user_orgs_stmt).all()
        
        user_data = {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_active": user.is_active,
            "is_superadmin": user.is_superadmin,
            "created_at": user.created_at,
            "organizations": [
                {
                    "id": uo.id,
                    "organization_id": org.id,
                    "organization_name": org.name,
                    "role": uo.role
                }
                for uo, org in user_orgs
            ]
        }
        result.append(user_data)
    
    return result

@app.post("/users")
async def create_user(
    data: UserCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_superadmin)
):
    """Create a new global user"""
    # Check if email already exists
    existing = session.exec(select(User).where(User.email == data.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=data.email,
        password_hash=get_password_hash(data.password),
        first_name=data.first_name or "",
        last_name=data.last_name or ""
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Log audit
    audit_log = AuditLog(
        user_id=current_user.id,
        organization_id=None,
        action="create",
        target_type="user",
        target_id=user.id,
        details=f"Created user '{user.email}'"
    )
    session.add(audit_log)
    session.commit()
    
    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_active": user.is_active
    }

@app.put("/users/{user_id}")
async def update_user(
    user_id: UUID,
    data: UserUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_superadmin)
):
    """Update user details"""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(user, key, value)
    user.updated_at = datetime.utcnow()
    
    session.commit()
    session.refresh(user)
    
    # Log audit
    audit_log = AuditLog(
        user_id=current_user.id,
        organization_id=None,
        action="update",
        target_type="user",
        target_id=user.id,
        details=f"Updated user '{user.email}'"
    )
    session.add(audit_log)
    session.commit()
    
    return user

# ============================================================================
# USER ORGANIZATIONS (Membership Management)
# ============================================================================

class UserOrganizationCreate(BaseModel):
    user_id: UUID
    organization_id: UUID
    role: str  # orgadmin, technician, readonly

@app.post("/user-organizations")
async def add_user_to_organization(
    data: UserOrganizationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_superadmin)
):
    """Add a user to an organization with a role"""
    # Validate user exists
    user = session.get(User, data.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate organization exists
    org = session.get(Organization, data.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Validate role
    valid_roles = ["orgadmin", "technician", "readonly"]
    if data.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")
    
    # Check if already exists
    existing = session.exec(
        select(UserOrganization).where(
            UserOrganization.user_id == data.user_id,
            UserOrganization.organization_id == data.organization_id
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this organization")
    
    # Create membership
    membership = UserOrganization(
        user_id=data.user_id,
        organization_id=data.organization_id,
        role=data.role
    )
    session.add(membership)
    session.commit()
    session.refresh(membership)
    
    # Log audit
    audit_log = AuditLog(
        organization_id=data.organization_id,
        user_id=current_user.id,
        action="create",
        target_type="user_organization",
        target_id=membership.id,
        details=f"Added user '{user.email}' to organization '{org.name}' as {data.role}"
    )
    session.add(audit_log)
    session.commit()
    
    return {
        "id": membership.id,
        "user_id": membership.user_id,
        "organization_id": membership.organization_id,
        "role": membership.role
    }

@app.delete("/user-organizations/{membership_id}")
async def remove_user_from_organization(
    membership_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_superadmin)
):
    """Remove a user from an organization"""
    membership = session.get(UserOrganization, membership_id)
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    
    user = session.get(User, membership.user_id)
    org = session.get(Organization, membership.organization_id)
    
    if not user or not org:
        raise HTTPException(status_code=404, detail="User or organization not found")
    
    session.delete(membership)
    session.commit()
    
    # Log audit
    audit_log = AuditLog(
        organization_id=membership.organization_id,
        user_id=current_user.id,
        action="delete",
        target_type="user_organization",
        target_id=membership_id,
        details=f"Removed user '{user.email}' from organization '{org.name}'"
    )
    session.add(audit_log)
    session.commit()
    
    return {"message": "User removed from organization"}

# ============================================================================
# SETTINGS
# ============================================================================

# In-memory settings storage (replace with database table for production)
_system_settings = {
    "storagePath": "./uploads",
    "maxFileSize": 50,
    "allowedFileTypes": "pdf,doc,docx,xls,xlsx,png,jpg,jpeg,gif,txt,md,json,xml,zip"
}

_ui_settings = {
    "theme": "light",
    "defaultLandingPage": "dashboard"
}

# Organization-specific settings
_org_protocols = {}  # org_id -> list of protocols

@app.get("/settings/system")
async def get_system_settings(
    current_user: User = Depends(require_superadmin)
):
    """Get system-wide file storage settings"""
    return _system_settings

@app.put("/settings/system")
async def update_system_settings(
    settings: dict,
    current_user: User = Depends(require_superadmin)
):
    """Update system-wide file storage settings"""
    global _system_settings
    _system_settings.update(settings)
    return _system_settings

@app.get("/settings/ui")
async def get_ui_settings(
    current_user: User = Depends(get_current_user)
):
    """Get UI preferences"""
    return _ui_settings

@app.put("/settings/ui")
async def update_ui_settings(
    settings: dict,
    current_user: User = Depends(get_current_user)
):
    """Update UI preferences"""
    global _ui_settings
    _ui_settings.update(settings)
    return _ui_settings

@app.get("/settings/protocols")
async def get_service_protocols(
    organization_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Get allowed service protocols for an organization"""
    protocols = _org_protocols.get(str(organization_id), ["http", "https", "ssh", "rdp", "smb", "vnc", "other"])
    return {"protocols": protocols}

@app.put("/settings/protocols")
async def update_service_protocols(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Update allowed service protocols for an organization"""
    global _org_protocols
    org_id = str(data.get("organization_id"))
    protocols = data.get("protocols", [])
    _org_protocols[org_id] = protocols
    return {"protocols": protocols}

# ============================================================================
# AUDIT LOG
# ============================================================================

@app.get("/audit")
async def list_audit_logs(
    organization_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """List audit logs, optionally filtered by organization"""
    statement = select(AuditLog, User).join(User, AuditLog.user_id == User.id, isouter=True)
    
    if organization_id:
        statement = statement.where(AuditLog.organization_id == organization_id)
    
    statement = statement.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit)
    results = session.exec(statement).all()
    
    logs = []
    for log, user in results:
        log_data = {
            "id": log.id,
            "organization_id": log.organization_id,
            "user_id": log.user_id,
            "user_email": user.email if user else None,
            "action": log.action,
            "target_type": log.target_type,
            "target_id": log.target_id,
            "details": log.details,
            "created_at": log.created_at
        }
        logs.append(log_data)
    
    return logs

# ============================================================================
# DATABASE CONFIGURATION & BACKUP
# ============================================================================

# In-memory database config storage
_db_config = {
    "type": "sqlite",
    "sqlite_path": "./inventory.db",
    "postgres_host": "localhost",
    "postgres_port": 5432,
    "postgres_database": "rackbase",
    "postgres_username": "",
    "postgres_password": "",
}

@app.get("/settings/database")
async def get_database_config(
    current_user: User = Depends(require_superadmin)
):
    """Get current database configuration and status"""
    # Calculate database size
    db_size = "0 MB"
    if _db_config["type"] == "sqlite":
        try:
            db_file = Path(_db_config["sqlite_path"])
            if db_file.exists():
                size_bytes = db_file.stat().st_size
                db_size = f"{size_bytes / (1024*1024):.2f} MB"
        except:
            pass
    
    return {
        **{k: v for k, v in _db_config.items() if k != "postgres_password"},
        "status": {
            "connected": True,
            "type": _db_config["type"],
            "size": db_size
        }
    }

@app.put("/settings/database")
async def update_database_config(
    config: dict,
    current_user: User = Depends(require_superadmin)
):
    """Update database configuration"""
    global _db_config
    
    # Update config
    _db_config["type"] = config.get("type", _db_config["type"])
    _db_config["sqlite_path"] = config.get("sqlite_path", _db_config["sqlite_path"])
    _db_config["postgres_host"] = config.get("postgres_host", _db_config["postgres_host"])
    _db_config["postgres_port"] = config.get("postgres_port", _db_config["postgres_port"])
    _db_config["postgres_database"] = config.get("postgres_database", _db_config["postgres_database"])
    _db_config["postgres_username"] = config.get("postgres_username", _db_config["postgres_username"])
    
    if config.get("postgres_password"):
        _db_config["postgres_password"] = config["postgres_password"]
    
    return {
        **{k: v for k, v in _db_config.items() if k != "postgres_password"},
        "message": "Configuration saved. Restart server to apply changes."
    }

BACKUP_DIR = Path("backups")
BACKUP_DIR.mkdir(exist_ok=True)

@app.get("/database/backups")
async def list_backups(
    current_user: User = Depends(require_superadmin)
):
    """List all database backups"""
    backups = []
    for backup_file in BACKUP_DIR.glob("*.db"):
        stat = backup_file.stat()
        backups.append({
            "filename": backup_file.name,
            "size": stat.st_size,
            "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
        })
    
    # Sort by creation date (newest first)
    backups.sort(key=lambda x: x["created_at"], reverse=True)
    return backups

@app.post("/database/backup")
async def create_backup(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_superadmin)
):
    """Create a new database backup"""
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"rackbase_backup_{timestamp}.db"
    backup_path = BACKUP_DIR / backup_filename
    
    if _db_config["type"] == "sqlite":
        import shutil
        source_db = Path(_db_config["sqlite_path"])
        if source_db.exists():
            shutil.copy2(source_db, backup_path)
            
            # Log audit
            audit_log = AuditLog(
                organization_id=None,
                user_id=current_user.id,
                action="create",
                target_type="database_backup",
                target_id=None,
                details=f"Created database backup: {backup_filename}"
            )
            session.add(audit_log)
            session.commit()
            
            return {
                "filename": backup_filename,
                "message": "Backup created successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Database file not found")
    else:
        raise HTTPException(status_code=501, detail="Backup for PostgreSQL not yet implemented")

@app.get("/database/backup/{filename}/download")
async def download_backup(
    filename: str,
    current_user: User = Depends(require_superadmin)
):
    """Download a backup file"""
    backup_path = BACKUP_DIR / filename
    
    if not backup_path.exists():
        raise HTTPException(status_code=404, detail="Backup not found")
    
    from fastapi.responses import FileResponse
    return FileResponse(
        path=backup_path,
        filename=filename,
        media_type="application/octet-stream"
    )

@app.post("/database/restore")
async def restore_backup(
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_superadmin)
):
    """Restore database from backup"""
    filename = data.get("filename")
    if not filename:
        raise HTTPException(status_code=400, detail="Filename required")
    
    backup_path = BACKUP_DIR / filename
    
    if not backup_path.exists():
        raise HTTPException(status_code=404, detail="Backup not found")
    
    if _db_config["type"] == "sqlite":
        import shutil
        source_db = Path(_db_config["sqlite_path"])
        
        # Create a safety backup of current database
        safety_timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        safety_backup = BACKUP_DIR / f"rackbase_pre_restore_{safety_timestamp}.db"
        if source_db.exists():
            shutil.copy2(source_db, safety_backup)
        
        # Restore the backup
        shutil.copy2(backup_path, source_db)
        
        # Log audit
        audit_log = AuditLog(
            organization_id=None,
            user_id=current_user.id,
            action="restore",
            target_type="database",
            target_id=None,
            details=f"Restored database from backup: {filename}"
        )
        session.add(audit_log)
        session.commit()
        
        return {
            "message": "Database restored successfully. Please restart the server to reload the database."
        }
    else:
        raise HTTPException(status_code=501, detail="Restore for PostgreSQL not yet implemented")

@app.delete("/database/backup/{filename}")
async def delete_backup(
    filename: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_superadmin)
):
    """Delete a backup file"""
    backup_path = BACKUP_DIR / filename
    
    if not backup_path.exists():
        raise HTTPException(status_code=404, detail="Backup not found")
    
    backup_path.unlink()
    
    # Log audit
    audit_log = AuditLog(
        organization_id=None,
        user_id=current_user.id,
        action="delete",
        target_type="database_backup",
        target_id=None,
        details=f"Deleted database backup: {filename}"
    )
    session.add(audit_log)
    session.commit()
    
    return {"message": "Backup deleted successfully"}

# ============================================================================
# GLOBAL SEARCH
# ============================================================================

@app.get("/search")
async def global_search(
    q: str = Query(..., min_length=2, description="Search query"),
    organization_id: Optional[UUID] = None,
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Global search across:
    - Assets (by name, IP address)
    - Services (by port, name) - links to asset with services tab
    - Files (by name)
    - People (by name, email)
    - Documentation (by title, description)
    """
    if not q:
        return {"results": [], "total": 0}
    
    search_term = f"%{q}%"
    results = []
    
    # Search Assets (by name or IP) - only active assets
    asset_stmt = select(Asset).distinct().where(
        Asset.is_active == True,
        or_(
            Asset.name.like(search_term),
            Asset.ip_address.like(search_term)
        )
    )
    
    if organization_id:
        asset_stmt = asset_stmt.where(Asset.organization_id == organization_id)
    
    asset_stmt = asset_stmt.limit(limit)
    
    assets = session.exec(asset_stmt).all()
    for asset in assets:
        results.append({
            "type": "asset",
            "id": str(asset.id),
            "title": asset.name,
            "subtitle": f"{asset.asset_type} • {asset.ip_address or 'No IP'}",
            "url": f"/organizations/{asset.organization_id}/sites/{asset.site_id}/assets/{asset.id}",
            "organization_id": str(asset.organization_id),
            "site_id": str(asset.site_id)
        })
    
    # Search Services (by name, port, or protocol) - link to asset with services tab
    # Only include services where both the service AND the asset are active
    service_stmt = (
        select(Service, Asset.name.label('asset_name'))
        .join(Asset, Service.asset_id == Asset.id)
        .distinct()
        .where(
            Service.is_active == True,
            Asset.is_active == True,
            or_(
                Service.name.like(search_term),
                Service.protocol.like(search_term)
            )
        )
    )
    if q.isdigit():
        service_stmt = service_stmt.where(Service.port == int(q))
    
    if organization_id:
        service_stmt = service_stmt.where(Service.organization_id == organization_id)
    service_stmt = service_stmt.limit(limit)
    
    services = session.exec(service_stmt).all()
    for service, asset_name in services:
        results.append({
            "type": "service",
            "id": str(service.id),
            "title": service.name,
            "subtitle": f"{service.protocol} • {service.port}/tcp ({asset_name})",
            "url": f"/organizations/{service.organization_id}/sites/{service.site_id}/assets/{service.asset_id}?tab=services",
            "organization_id": str(service.organization_id),
            "site_id": str(service.site_id),
            "asset_id": str(service.asset_id)
        })
    
    # Search Files (by name) - only active files
    file_stmt = select(FileAttachment).distinct().where(
        FileAttachment.is_active == True,
        FileAttachment.name.like(search_term)
    )
    if organization_id:
        file_stmt = file_stmt.where(FileAttachment.organization_id == organization_id)
    file_stmt = file_stmt.limit(limit)
    
    files = session.exec(file_stmt).all()
    for file in files:
        results.append({
            "type": "file",
            "id": str(file.id),
            "title": file.name,
            "subtitle": f"File • {file.mime_type}",
            "url": f"/organizations/{file.organization_id}/sites/{file.site_id}/files",
            "organization_id": str(file.organization_id),
            "site_id": str(file.site_id)
        })
    
    # Search People (by name or email) - only active people
    person_stmt = select(Person).distinct().where(
        Person.is_active == True,
        or_(
            Person.first_name.like(search_term),
            Person.last_name.like(search_term),
            Person.email.like(search_term)
        )
    )
    if organization_id:
        person_stmt = person_stmt.where(Person.organization_id == organization_id)
    person_stmt = person_stmt.limit(limit)
    
    people = session.exec(person_stmt).all()
    for person in people:
        results.append({
            "type": "person",
            "id": str(person.id),
            "title": f"{person.first_name} {person.last_name}",
            "subtitle": person.email or "No email",
            "url": f"/organizations/{person.organization_id}/sites/{person.site_id}/people",
            "organization_id": str(person.organization_id),
            "site_id": str(person.site_id) if person.site_id else None
        })
    
    # Search Documentation (by title or description) - only active docs
    doc_stmt = select(Documentation).distinct().where(
        Documentation.is_active == True,
        or_(
            Documentation.title.like(search_term),
            Documentation.description.like(search_term)
        )
    )
    if organization_id:
        doc_stmt = doc_stmt.where(Documentation.organization_id == organization_id)
    doc_stmt = doc_stmt.limit(limit)
    
    docs = session.exec(doc_stmt).all()
    for doc in docs:
        results.append({
            "type": "documentation",
            "id": str(doc.id),
            "title": doc.title,
            "subtitle": f"Documentation • v{doc.version}",
            "url": f"/organizations/{doc.organization_id}/sites/{doc.site_id}/documentation/{doc.id}",
            "organization_id": str(doc.organization_id),
            "site_id": str(doc.site_id)
        })
    
    # Limit total results
    results = results[:limit]
    
    return {
        "query": q,
        "total": len(results),
        "results": results
    }

# ============================================================================
# STATS / DASHBOARD
# ============================================================================

@app.get("/stats")
async def get_site_stats(
    organization_id: Optional[UUID] = None,
    site_id: Optional[UUID] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get accurate counts for dashboard"""
    
    # Assets
    assets_stmt = select(Asset).where(Asset.is_active == True)
    if organization_id:
        assets_stmt = assets_stmt.where(Asset.organization_id == organization_id)
    if site_id:
        assets_stmt = assets_stmt.where(Asset.site_id == site_id)
    assets_count = len(session.exec(assets_stmt).all())
    
    # Networks
    networks_stmt = select(Network).where(Network.is_active == True)
    if organization_id:
        networks_stmt = networks_stmt.where(Network.organization_id == organization_id)
    if site_id:
        networks_stmt = networks_stmt.where(Network.site_id == site_id)
    networks_count = len(session.exec(networks_stmt).all())
    
    # Services
    services_stmt = select(Service).where(Service.is_active == True)
    if organization_id:
        services_stmt = services_stmt.where(Service.organization_id == organization_id)
    if site_id:
        services_stmt = services_stmt.where(Service.site_id == site_id)
    services_count = len(session.exec(services_stmt).all())
    
    # Credentials
    credentials_stmt = select(Credential).where(Credential.is_active == True)
    if organization_id:
        credentials_stmt = credentials_stmt.where(Credential.organization_id == organization_id)
    if site_id:
        credentials_stmt = credentials_stmt.where(Credential.site_id == site_id)
    credentials_count = len(session.exec(credentials_stmt).all())
    
    # Inventory
    inventory_stmt = select(InventoryItem).where(InventoryItem.is_active == True)
    if organization_id:
        inventory_stmt = inventory_stmt.where(InventoryItem.organization_id == organization_id)
    if site_id:
        inventory_stmt = inventory_stmt.where(InventoryItem.site_id == site_id)
    inventory_count = len(session.exec(inventory_stmt).all())
    
    # People
    people_stmt = select(Person).where(Person.is_active == True)
    if organization_id:
        people_stmt = people_stmt.where(Person.organization_id == organization_id)
    if site_id:
        people_stmt = people_stmt.where(Person.site_id == site_id)
    people_count = len(session.exec(people_stmt).all())
    
    # Software (global)
    software_count = len(session.exec(select(Software).where(Software.is_active == True)).all())
    
    return {
        "assets": assets_count,
        "networks": networks_count,
        "software": software_count,
        "people": people_count,
        "inventory": inventory_count,
        "services": services_count,
        "credentials": credentials_count,
    }

# ============================================================================
# HEALTH
# ============================================================================

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    import uvicorn
    # Get host and port from environment variables with defaults
    host = os.getenv("BACKEND_HOST", "127.0.0.1")
    port = int(os.getenv("BACKEND_PORT", "8088"))
    uvicorn.run(app, host=host, port=port)
