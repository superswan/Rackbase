# Rackbase - RBAC Model

## Overview
This document outlines the Role-Based Access Control (RBAC) model for our multi-tenant IT inventory system.

## Roles and Permissions

### 1. Super Admin
- Full access to all organizations
- Can manage users, organizations, and system settings
- Can view and modify all assets across all organizations
- Can create, update, and delete any documentation
- Can manage all credentials and API keys
- Can view and manage all audit logs

### 2. Org Admin
- Full access to their organization
- Can manage users within their organization (limited to their organization)
- Can view and modify all assets within their organization
- Can create, update, and delete documentation within their organization
- Can manage credentials within their organization
- Can view audit logs for their organization

### 3. Technician
- Read and write access to assets within their organization
- Can create and update documentation within their organization
- Can view and manage credentials they have access to
- Can view audit logs for their organization

### 4. Read-Only / Auditor
- Read-only access to assets within their organization
- Can view documentation within their organization
- Can view audit logs for their organization
- Cannot create, update, or delete any data

## Permission Scopes

### Organization Level
- View organization details
- Manage organization users and their roles
- Manage organization sites

### Site Level
- View site details
- Manage assets within site

### Asset Level
- Create new assets
- Read asset details
- Update asset details
- Delete assets (with appropriate permissions)
- View relationships between assets

### Documentation Level
- Create new documentation
- Read documentation
- Update documentation
- Delete documentation

### Credentials Level
- Store credentials
- View credentials (with appropriate permissions)
- Update credentials
- Delete credentials

### Audit Level
- View audit logs
- Export audit logs

## Implementation Details

### Role Assignment
- Users can have different roles in different organizations
- Role hierarchy is enforced at both organization and site levels
- Super Admin role is system-wide and cannot be revoked
- Organization roles are scoped to specific organizations

### Access Control Enforcement
- All API calls are validated against user roles and organization boundaries
- Database queries are filtered by organization ID for multi-tenant isolation
- Permissions are checked before each operation
- Audit logs record all access attempts and actions