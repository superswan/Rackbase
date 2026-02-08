from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID, uuid4

class BaseModel(SQLModel):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# ============================================================================
# CORE TABLES
# ============================================================================

class Organization(BaseModel, table=True):
    name: str = Field(index=True)
    description: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = Field(default=True)

class Site(BaseModel, table=True):
    organization_id: UUID = Field(foreign_key="organization.id", index=True)
    name: str = Field(index=True)
    description: Optional[str] = None
    location: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = Field(default=True)

class User(BaseModel, table=True):
    """System users - for login/authentication"""
    email: str = Field(unique=True, index=True)
    password_hash: str
    first_name: str
    last_name: str
    notes: Optional[str] = None
    is_active: bool = Field(default=True)
    is_superadmin: bool = Field(default=False)

class UserOrganization(BaseModel, table=True):
    """RBAC - User roles within organizations"""
    user_id: UUID = Field(foreign_key="user.id", index=True)
    organization_id: UUID = Field(foreign_key="organization.id", index=True)
    role: str = Field(default="technician")  # superadmin, orgadmin, technician, readonly

# ============================================================================
# ASSETS - ONLY IP-Addressable Devices
# ============================================================================

class Asset(BaseModel, table=True):
    """
    Assets represent IP-addressable devices that can run services.
    Examples: Servers, workstations, firewalls, switches, APs, NAS, hypervisors, printers
    """
    organization_id: UUID = Field(foreign_key="organization.id", index=True)
    site_id: UUID = Field(foreign_key="site.id", index=True)
    
    # Hierarchy - for VMs pointing to their hypervisor
    parent_asset_id: Optional[UUID] = Field(default=None, foreign_key="asset.id", index=True, nullable=True)
    
    # Categorization
    asset_category: str = Field(index=True)  # compute, network, storage, peripheral
    asset_type: str = Field(index=True)  # server, workstation, firewall, switch, ap, nas, hypervisor, printer, other
    
    # Identity
    name: str = Field(index=True)
    description: Optional[str] = None
    notes: Optional[str] = None
    
    # Network
    ip_address: Optional[str] = Field(index=True)
    mac_address: Optional[str] = None
    
    # Hardware
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    
    # Compute-specific
    operating_system: Optional[str] = None
    os_version: Optional[str] = None
    cpu: Optional[str] = None
    ram_gb: Optional[int] = None
    storage_gb: Optional[int] = None
    
    # Network device-specific
    firmware_version: Optional[str] = None
    management_ip: Optional[str] = None
    
    # Status
    status: str = Field(default="active")  # active, maintenance, retired
    is_active: bool = Field(default=True)
    last_seen: Optional[datetime] = None

# ============================================================================
# NETWORKS - Separate from Assets
# ============================================================================

class Network(BaseModel, table=True):
    """Networks represent CIDR/VLANs at a site"""
    organization_id: UUID = Field(foreign_key="organization.id", index=True)
    site_id: UUID = Field(foreign_key="site.id", index=True)
    
    name: str = Field(index=True)
    cidr: str = Field(index=True)  # e.g., 192.168.1.0/24
    vlan_id: Optional[int] = None
    gateway: Optional[str] = None
    dns_servers: Optional[str] = None  # comma-separated
    dhcp_enabled: bool = Field(default=True)
    notes: Optional[str] = None
    is_active: bool = Field(default=True)

# ============================================================================
# SOFTWARE - Definitions + Installations
# ============================================================================

class Software(BaseModel, table=True):
    """Software definitions - NOT installations"""
    name: str = Field(index=True)
    vendor: Optional[str] = None
    version: Optional[str] = None
    license_key: Optional[str] = None
    license_expiry: Optional[datetime] = None
    notes: Optional[str] = None
    is_active: bool = Field(default=True)

class AssetSoftware(BaseModel, table=True):
    """Join table: Software installed on Assets"""
    asset_id: UUID = Field(foreign_key="asset.id", index=True)
    software_id: UUID = Field(foreign_key="software.id", index=True)
    installation_path: Optional[str] = None
    installed_version: Optional[str] = None
    installed_at: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None

class PersonSoftware(BaseModel, table=True):
    """Join table: Software assigned to People (users)"""
    person_id: UUID = Field(foreign_key="person.id", index=True)
    software_id: UUID = Field(foreign_key="software.id", index=True)
    assigned_at: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None

# ============================================================================
# PEOPLE - Client Users (not system users)
# ============================================================================

class Person(BaseModel, table=True):
    """Client employees/domain users - NOT system login users"""
    organization_id: UUID = Field(foreign_key="organization.id", index=True)
    site_id: Optional[UUID] = Field(foreign_key="site.id", index=True)
    
    first_name: str
    last_name: str
    email: Optional[str] = Field(index=True)
    department: Optional[str] = None
    job_title: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = Field(default=True)

# ============================================================================
# INVENTORY - Spare hardware, peripherals, non-deployed items
# ============================================================================

class InventoryItem(BaseModel, table=True):
    """Peripherals, spare hardware, cables - NOT deployed assets"""
    organization_id: UUID = Field(foreign_key="organization.id", index=True)
    site_id: UUID = Field(foreign_key="site.id", index=True)
    
    name: str = Field(index=True)
    category: str = Field(index=True)  # peripheral, spare_hardware, cable, component, other
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    quantity: int = Field(default=1)
    location_note: Optional[str] = None
    status: str = Field(default="in_stock")  # in_stock, deployed, disposed
    notes: Optional[str] = None
    is_active: bool = Field(default=True)

# ============================================================================
# SERVICES - What runs on Assets
# ============================================================================

class Service(BaseModel, table=True):
    """Services running on assets (web interfaces, SSH, RDP, etc.)"""
    organization_id: UUID = Field(foreign_key="organization.id", index=True)
    site_id: UUID = Field(foreign_key="site.id", index=True)
    asset_id: UUID = Field(foreign_key="asset.id", index=True)
    
    name: str = Field(index=True)  # e.g., "Proxmox Web UI", "SSH"
    protocol: str = Field(index=True)  # http, https, ssh, rdp, smb, vnc, other
    port: int = Field(index=True)
    path: Optional[str] = None  # e.g., /admin
    url: Optional[str] = None
    authentication_type: str = Field(default="none")  # none, password, ldap, sso, other
    description: Optional[str] = None
    notes: Optional[str] = None
    status: str = Field(default="active")  # active, deprecated
    is_active: bool = Field(default=True)

# ============================================================================
# CREDENTIALS - Encrypted storage with Asset OR Service support
# ============================================================================

class Credential(BaseModel, table=True):
    organization_id: UUID = Field(foreign_key="organization.id", index=True)
    site_id: UUID = Field(foreign_key="site.id", index=True)
    asset_id: Optional[UUID] = Field(foreign_key="asset.id", index=True)
    service_id: Optional[UUID] = Field(foreign_key="service.id", index=True)  # Can belong to service
    
    name: str = Field(index=True)  # e.g., "Admin Password"
    credential_type: str = Field(index=True)  # password, ssh_key, api_key, certificate, token
    encrypted_value: str  # AES-256 encrypted
    username: Optional[str] = None
    description: Optional[str] = None
    expires_at: Optional[datetime] = None
    last_used: Optional[datetime] = None
    is_active: bool = Field(default=True)
    created_by: UUID = Field(foreign_key="user.id")

# ============================================================================
# FILES & DOCUMENTATION
# ============================================================================

class FileAttachment(BaseModel, table=True):
    organization_id: UUID = Field(foreign_key="organization.id", index=True)
    site_id: UUID = Field(foreign_key="site.id", index=True)
    asset_id: Optional[UUID] = Field(foreign_key="asset.id", index=True)
    
    name: str = Field(index=True)
    file_path: str
    file_size: int
    mime_type: str
    uploaded_by: UUID = Field(foreign_key="user.id")
    description: Optional[str] = None
    is_active: bool = Field(default=True)
    share_token: Optional[str] = None
    is_public: bool = Field(default=False)

class Documentation(BaseModel, table=True):
    organization_id: UUID = Field(foreign_key="organization.id", index=True)
    site_id: UUID = Field(foreign_key="site.id", index=True)
    asset_id: Optional[UUID] = Field(foreign_key="asset.id", index=True)
    
    title: str = Field(index=True)
    category: str = Field(default="general", index=True)
    description: str
    content: Optional[str] = Field(default=None)
    content_type: str = Field(default="markdown")  # markdown, html
    author_id: UUID = Field(foreign_key="user.id")
    notes: Optional[str] = None
    version: int = Field(default=1)
    is_active: bool = Field(default=True)
    share_token: Optional[str] = None
    is_public: bool = Field(default=False)

# ============================================================================
# CUSTOM FIELDS - Normalized (not JSON)
# ============================================================================

class CustomFieldDefinition(BaseModel, table=True):
    """Defines custom fields available per organization"""
    organization_id: UUID = Field(foreign_key="organization.id", index=True)
    name: str = Field(index=True)
    data_type: str = Field(default="string")  # string, integer, boolean, date, text
    is_active: bool = Field(default=True)

class CustomFieldValue(BaseModel, table=True):
    """Values for custom fields on assets"""
    custom_field_id: UUID = Field(foreign_key="customfielddefinition.id", index=True)
    asset_id: UUID = Field(foreign_key="asset.id", index=True)
    value: str  # Stored as string, cast based on data_type

# ============================================================================
# TAGS - Normalized (not JSON)
# ============================================================================

class AssetTag(BaseModel, table=True):
    """Many-to-many: Assets can have multiple tags"""
    asset_id: UUID = Field(foreign_key="asset.id", index=True)
    tag: str = Field(index=True)

class NetworkTag(BaseModel, table=True):
    """Many-to-many: Networks can have multiple tags"""
    network_id: UUID = Field(foreign_key="network.id", index=True)
    tag: str = Field(index=True)

# ============================================================================
# RELATIONSHIPS
# ============================================================================

class AssetRelationship(BaseModel, table=True):
    """Relationships between assets"""
    source_asset_id: UUID = Field(foreign_key="asset.id", index=True)
    target_asset_id: UUID = Field(foreign_key="asset.id", index=True)
    relationship_type: str = Field(default="relates_to")  # contains, uses, manages, connects_to

class AssetNetwork(BaseModel, table=True):
    """Join table: Assets connected to Networks"""
    asset_id: UUID = Field(foreign_key="asset.id", index=True)
    network_id: UUID = Field(foreign_key="network.id", index=True)
    ip_address: Optional[str] = None  # If different from asset's main IP

# ============================================================================
# AUDIT LOG
# ============================================================================

class AuditLog(BaseModel, table=True):
    organization_id: Optional[UUID] = Field(foreign_key="organization.id", index=True)
    user_id: UUID = Field(foreign_key="user.id", index=True)
    action: str = Field(index=True)  # create, update, delete, view
    target_type: str = Field(index=True)  # asset, network, person, etc.
    target_id: Optional[UUID] = Field(index=True)
    details: Optional[str] = None
