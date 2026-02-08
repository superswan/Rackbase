# Rackbase

A self-hosted IT inventory and documentation system for tracking assets, networks, and services across multiple organizations and sites.

## Features

- **Multi-Organization**: Manage multiple orgs with data isolation
- **Asset Management**: Track servers, workstations, networks, software, and devices
- **Nmap Integration**: Import network scans to auto-discover assets and services
- **Documentation**: Markdown-based docs with asset linking
- **File Sharing**: Share files and documentation via public links
- **Role-Based Access**: Super Admin, Org Admin, Technician, Read-Only roles

## Quick Start

### Requirements
- Python 3.8+
- Node.js 18+

### Install

```bash
# Backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### Run

```bash
# Terminal 1 - Backend (port 8088)
python -m uvicorn main:app --reload --port 8088

# Terminal 2 - Frontend (port 3000)
cd frontend
npm run dev
```

## Default Login

- **Email**: `admin@inventory.local`
- **Password**: `admin123`

*Change these after first login!*

```Password change on first login will be forced in future versions```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection | `sqlite:///inventory.db` |
| `SECRET_KEY` | JWT signing key | Auto-generated |
| `CORS_ORIGINS` | Allowed origins | `http://localhost:3000` |

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8088/docs
- ReDoc: http://localhost:8088/redoc

## Nmap Import

Automatically imports assets and services via Nmap XML output

## Tech Stack

- **Backend**: Python, FastAPI, SQLModel, SQLite/PostgreSQL
- **Frontend**: Next.js 14, React 18

## License

MIT
