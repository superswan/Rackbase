# Rackbase - API Route Design

## Overview
This document outlines the API design for our multi-tenant IT inventory and documentation system.

## Authentication Endpoints

### POST /auth/login
- Authenticate user and return JWT token
- Request body: { "email": "string", "password": "string" }
- Response: { "access_token": "string", "token_type": "bearer" }

### POST /auth/register
- Register a new user
- Request body: { "email": "string", "password": "string", "first_name": "string", "last_name": "string" }
- Response: { "message": "User registered successfully" }

## Organizations Endpoints

### GET /organizations
- List all organizations (with pagination)
- Response: Array of organization objects

### GET /organizations/{org_id}
- Get specific organization by ID
- Response: Organization object

### POST /organizations
- Create new organization
- Request body: { "name": "string", "description": "string" }
- Response: Created organization object

### PUT /organizations/{org_id}
- Update organization
- Request body: { "name": "string", "description": "string", "is_active": "boolean" }
- Response: Updated organization object

### DELETE /organizations/{org_id}
- Delete organization (soft delete)
- Response: { "message": "Organization deleted" }

## Sites Endpoints

### GET /sites
- List all sites (with pagination)
- Query parameters: organization_id, is_active
- Response: Array of site objects

### GET /sites/{site_id}
- Get specific site by ID
- Response: Site object

### POST /sites
- Create new site
- Request body: { "organization_id": "UUID", "name": "string", "description": "string" }
- Response: Created site object

### PUT /sites/{site_id}
- Update site
- Request body: { "name": "string", "description": "string", "is_active": "boolean" }
- Response: Updated site object

### DELETE /sites/{site_id}
- Delete site (soft delete)
- Response: { "message": "Site deleted" }

## Assets Endpoints

### GET /assets
- List all assets (with pagination)
- Query parameters: organization_id, site_id, asset_type, status
- Response: Array of asset objects

### GET /assets/{asset_id}
- Get specific asset by ID
- Response: Asset object

### POST /assets
- Create new asset
- Request body: { "organization_id": "UUID", "site_id": "UUID", "asset_type": "string", "name": "string", "description": "string" }
- Response: Created asset object

### PUT /assets/{asset_id}
- Update asset
- Request body: { "name": "string", "description": "string", "status": "string" }
- Response: Updated asset object

### DELETE /assets/{asset_id}
- Delete asset (soft delete)
- Response: { "message": "Asset deleted" }

## Documentation Endpoints

### GET /documentation
- List all documentation (with pagination)
- Query parameters: organization_id, site_id, asset_id
- Response: Array of documentation objects

### GET /documentation/{doc_id}
- Get specific documentation by ID
- Response: Documentation object

### POST /documentation
- Create new documentation
- Request body: { "organization_id": "UUID", "site_id": "UUID", "asset_id": "UUID", "title": "string", "content": "string" }
- Response: Created documentation object

### PUT /documentation/{doc_id}
- Update documentation
- Request body: { "title": "string", "content": "string" }
- Response: Updated documentation object

### DELETE /documentation/{doc_id}
- Delete documentation
- Response: { "message": "Documentation deleted" }

## Search Endpoints

### GET /search
- Global search across assets and documentation
- Query parameter: q (search query)
- Response: Array of search results

## Audit Endpoints

### GET /audit
- List audit logs
- Query parameters: organization_id, user_id, action
- Response: Array of audit log objects

## Security Considerations

- All endpoints require authentication with JWT tokens
- RBAC checks ensure users can only access data within their organizations
- All API requests are logged in audit logs
- Sensitive data (credentials) is encrypted