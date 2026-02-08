# Rackbase - Database Schema Design

## Overview
This document outlines the database schema for a multi-tenant IT inventory and documentation system designed for MSPs and internal IT teams.

## Core Entities

### 1. Organizations (Tenants)
- id (UUID)
- name (string)
- description (text)
- created_at (timestamp)
- updated_at (timestamp)
- is_active (boolean)

### 2. Sites
- id (UUID)
- organization_id (UUID, foreign key to Organizations)
- name (string)
- description (text)
- address (text)
- contact_email (string)
- contact_phone (string)
- created_at (timestamp)
- updated_at (timestamp)
- is_active (boolean)

### 3. Users
- id (UUID)
- email (string, unique)
- password_hash (string)
- first_name (string)
- last_name (string)
- is_active (boolean)
- created_at (timestamp)
- updated_at (timestamp)

### 4. User Organizations (Join table)
- user_id (UUID, foreign key to Users)
- organization_id (UUID, foreign key to Organizations)
- role (string) - Super Admin, Org Admin, Technician, Read-Only
- created_at (timestamp)

### 5. Assets
- id (UUID)
- organization_id (UUID, foreign key to Organizations)
- site_id (UUID, foreign key to Sites)
- asset_type (string) - host, network, software, user, credential, device
- name (string)
- description (text)
- status (string) - planned, active, deprecated, retired
- created_at (timestamp)
- updated_at (timestamp)
- is_active (boolean)

### 6. Asset Fields (Custom fields)
- id (UUID)
- asset_id (UUID, foreign key to Assets)
- field_name (string)
- field_value (text)
- data_type (string) - string, integer, boolean, date

### 7. Asset Tags
- id (UUID)
- asset_id (UUID, foreign key to Assets)
- tag (string)

### 8. Asset Relationships
- id (UUID)
- source_asset_id (UUID, foreign key to Assets)
- target_asset_id (UUID, foreign key to Assets)
- relationship_type (string) - contains, uses, manages, connects_to
- created_at (timestamp)

### 9. Networks
- id (UUID, inherits from Assets)
- cidr (string) - IP range
- vlan_id (integer)
- gateway (string)
- dns_servers (JSON array)
- netmask (string)

### 10. Hosts
- id (UUID, inherits from Assets)
- hostname (string)
- ip_address (string)
- mac_address (string)
- os (string)
- cpu_cores (integer)
- memory_gb (integer)
- storage_gb (integer)
- last_seen (timestamp)
- asset_type (string) - server, workstation, vm

### 11. Software
- id (UUID, inherits from Assets)
- version (string)
- vendor (string)
- license_type (string)
- license_key (string)
- license_expiration (timestamp)
- end_of_life (timestamp)
- installation_path (string)

### 12. Users (Identity)
- id (UUID, inherits from Assets)
- username (string)
- user_principal_name (string)
- department (string)
- job_title (string)
- manager_id (UUID, foreign key to Users)
- is_service_account (boolean)

### 13. Credentials
- id (UUID, inherits from Assets)
- credential_type (string) - password, api_key, ssh_key, certificate
- encrypted_value (byte array)
- expires_at (timestamp)
- created_by_user_id (UUID, foreign key to Users)
- is_active (boolean)

### 14. Devices
- id (UUID, inherits from Assets)
- device_type (string) - firewall, switch, access_point, printer, iot
- model (string)
- manufacturer (string)
- serial_number (string)
- firmware_version (string)

### 15. Documentation
- id (UUID)
- organization_id (UUID, foreign key to Organizations)
- site_id (UUID, foreign key to Sites)
- asset_id (UUID, foreign key to Assets)
- title (string)
- content (text)
- content_type (string) - markdown, html, pdf
- version (integer)
- created_at (timestamp)
- updated_at (timestamp)
- author_id (UUID, foreign key to Users)

### 16. Audit Logs
- id (UUID)
- organization_id (UUID, foreign key to Organizations)
- user_id (UUID, foreign key to Users)
- action (string) - create, update, delete, view
- target_type (string)
- target_id (UUID)
- details (JSON)
- created_at (timestamp)