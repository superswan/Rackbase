# Rackbase - System Architecture Overview

## Introduction
This document provides an overview of the system architecture for our multi-tenant IT inventory and documentation system. The system is designed to be used by MSPs (Managed Service Providers) and internal IT teams to manage their IT infrastructure inventory and documentation.

## Architecture Components

### 1. Backend (Python/FastAPI)
- Primary application server built with FastAPI
- RESTful API providing all system functionality
- Database integration using SQLModel with PostgreSQL
- Authentication and authorization layer (JWT-based)
- RBAC (Role-Based Access Control) for multi-tenancy
- Audit logging for all system operations

### 2. Database (PostgreSQL)
- Relational database with a normalized schema
- Multi-tenant isolation at the database level
- Support for all asset types including hosts, networks, software, users, and credentials
- Full text search capabilities through PostgreSQL
- Audit logs tracking all system changes

### 3. Frontend (React/Next.js)
- Modern user interface with clean admin-style layout
- Responsive design for various device sizes
- Rich text editor for documentation
- Asset relationship visualization
- Organization and site management views
- Dashboard with key metrics and search capabilities

### 4. Infrastructure
- Docker Compose for deployment orchestration
- Self-hosted environment with minimal external dependencies
- Support for Windows development environment
- Pluggable design for future extensions

## Technology Stack

### Backend
- Python 3.9+
- FastAPI (web framework)
- SQLModel (ORM for database operations)
- PostgreSQL (database)
- Alembic (database migrations)
- JWT (authentication)

### Frontend
- React 18+
- Next.js (framework)
- TypeScript (type safety)
- Tailwind CSS (styling)
- React Query (data fetching)
- React Flow (visualization)

### DevOps
- Docker (containerization)
- Docker Compose (orchestration)
- Git for version control
- GitHub Actions (CI/CD)

## Data Flow

1. User authenticates via JWT
2. System validates permissions per RBAC model
3. API requests forwarded to appropriate service layer
4. Services interact with database through SQLModel
5. Database operations are logged in audit tables
6. Responses are returned to frontend for display

## Multi-Tenancy Implementation

The system supports multiple organizations (tenants) with strict isolation:
- Organizations are independent with unique assets
- Users can belong to multiple organizations with different roles
- All database operations are scoped to organization context
- Role-based access control ensures proper permissions
- Site-level organization within organizations

## Security Features

- JWT-based authentication with refresh tokens
- RBAC model with explicit permissions
- Data encryption for sensitive information (passwords, credentials)
- Audit logging of all system activities
- API rate limiting
- Secure password hashing using bcrypt
- Input sanitization and validation

## Scalability Considerations

- Database normalization for efficient queries
- Indexing on frequently queried fields
- Pagination for large result sets
- Caching for frequently accessed data
- Horizontal scaling potential for future requirements
- Microservices-ready architecture design

## Deployment Architecture

### Development
- Local development with Docker Desktop on Windows
- PostgreSQL container for database
- FastAPI application container
- Frontend development server

### Production
- Docker Compose deployment
- Reverse proxy (Nginx) for routing
- Load balancing for high availability
- Database backup and recovery procedures

## Future Extensibility

### Planned Features
- Credential vault with encrypted storage
- API-first design with GraphQL support
- Plugin architecture for integrations
- Reporting and analytics dashboard
- Integration with external monitoring systems
- Mobile application support
- Advanced visualization and mapping

### Integration Points
- Third-party authentication (SSO)
- Backup and recovery systems
- Notification systems
- Integration with monitoring tools
- Export capabilities (CSV, JSON, PDF)