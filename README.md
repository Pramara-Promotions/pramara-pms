# Pramara PMS – Project Management System

Full-stack project management system for promotional product manufacturing with document versioning, quality control, task management, and multi-device development support.

## Features

- 📁 **Document Management** - Version control, revision history, sharing
- 👥 **User Management** - Authentication, MFA, role-based access 
- 📊 **Project Tracking** - Projects, SKUs, tasks, quality control
- 🔒 **Security** - JWT auth, session management, audit logging
- 📦 **File Storage** - MinIO/S3-compatible object storage
- 🌐 **Multi-Device** - Develop across multiple devices on your network

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (via Docker)
- MinIO (via Docker)

### Installation

```powershell
# Clone the repository
git clone <repo-url>
cd pramara-pms

# Install dependencies
npm install
cd api && npm install
cd ../web && npm install
cd ..

# Setup environment (choose one)
npm run setup:local     # Single-machine development
npm run setup:network   # Multi-device development

# Start services
docker-compose up -d

# Run migrations
cd api
npx prisma migrate deploy
npx prisma db seed

# Start development servers
cd ..
npm run dev              # Local mode
# OR
npm run dev:network      # Network mode (accessible from other devices)
```

Access the app at:
- **Local:** http://localhost:5173
- **Network:** http://YOUR_IP:5173 (run `npm run network:ip` to find your IP)

## Multi-Device Development

Work seamlessly across desktop, laptop, or any device on your network:

```powershell
# Find your network IP
npm run network:ip

# Configure for network access
npm run setup:network

# Start with network access enabled
npm run dev:network
```

📚 **Full guide:** [docs/MULTI_DEVICE_SETUP.md](docs/MULTI_DEVICE_SETUP.md)  
⚡ **Quick reference:** [docs/MULTI_DEVICE_QUICK_START.md](docs/MULTI_DEVICE_QUICK_START.md)

## Project Structure

```
pramara-pms/
├── api/                    # Backend API (Express + Prisma)
│   ├── routes/            # API endpoints
│   ├── middleware/        # Auth, permissions
│   └── lib/               # Utilities (storage, auth, audit)
├── web/                   # Frontend (React + Vite)
│   └── src/
│       ├── pages/         # Route pages
│       ├── components/    # Reusable components
│       └── lib/           # API client, utilities
├── prisma/                # Database schema & migrations
├── docs/                  # Documentation
└── scripts/               # Setup & utility scripts
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API + Web (localhost) |
| `npm run dev:network` | Start with network access |
| `npm run setup:local` | Configure for local dev |
| `npm run setup:network` | Configure for network dev |
| `npm run network:ip` | Show your network IP |
| `npm run api:dev` | Start API server only |
| `npm run web:dev` | Start frontend only |
| `npm run prisma:studio` | Open Prisma Studio (DB GUI) |

## Documentation

- [Setup Guide](docs/SETUP.md) - Detailed setup instructions
- [Multi-Device Setup](docs/MULTI_DEVICE_SETUP.md) - Network development guide
- [Quick Start](docs/MULTI_DEVICE_QUICK_START.md) - Quick reference card
- [Release Notes](docs/RELEASE_NOTES.md) - Version history

## Tech Stack

**Backend:**
- Node.js + Express
- Prisma ORM
- PostgreSQL
- MinIO (S3-compatible storage)
- JWT authentication

**Frontend:**
- React 18
- TypeScript
- Vite
- TailwindCSS

## Environment Variables

See `.env.example` for all available configuration options.

**Quick templates:**
- `.env.local` - Localhost development
- `.env.network` - Multi-device development

## Security

- 🔐 JWT-based authentication with refresh tokens
- 🛡️ Role-based access control (RBAC)
- 🔑 Multi-factor authentication (MFA) support
- 📝 Comprehensive audit logging
- 🔒 Secure session management

⚠️ **Development only:** This configuration is for local/network development. Never expose these ports to the internet without proper security measures.

## License

Proprietary - Shubham Mishra

---

**Built with ❤️ by the Pramara team**
