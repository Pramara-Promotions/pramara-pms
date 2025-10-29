# Multi-Device Development — Quick Reference

## 🚀 Quick Start Commands

### Pull Latest Code & Setup (Automated)
```powershell
# One command to pull, check dependencies, and setup
.\scripts\pull-and-setup.ps1
```

### Manual Pull & Setup
```powershell
# 1. Pull latest code
git pull origin phase2-execution-control

# 2. Check for dependency changes
cat docs/DEPENDENCY_SYNC.md

# 3. Install dependencies (if needed)
cd api && npm install && cd ../web && npm install && cd ..

# 4. Copy environment config
Copy-Item -Force .env.cloud .env

# 5. Start servers
npm run dev
```

### Find Your Network IP
```powershell
npm run network:ip
```

### Setup for Local Development (Single Machine)
```powershell
npm run setup:local
docker-compose up -d
npm run dev
```
Access at: `http://localhost:5173`

### Setup for Network Development (Multi-Device)
```powershell
npm run setup:network
docker-compose up -d
npm run dev:network
```
Access from any device: `http://YOUR_IP:5173`

---

## 📁 Configuration Files

| File | Purpose | Commit? |
|------|---------|---------|
| `.env` | Active configuration | ❌ No (gitignored) |
| `.env.example` | Documentation template | ✅ Yes |
| `.env.local` | Localhost template | ✅ Yes |
| `.env.network` | Network template | ✅ Yes |

---

## 🔧 npm Scripts

| Command | Description |
|---------|-------------|
| `npm run network:ip` | Display your network IP address |
| `npm run setup:local` | Configure for single-machine dev |
| `npm run setup:network` | Configure for multi-device dev |
| `npm run dev` | Start API + Web (localhost only) |
| `npm run dev:network` | Start API + Web (network accessible) |
| `npm run api:dev` | Start API server only |
| `npm run web:dev` | Start frontend only (localhost) |
| `npm run web:dev:network` | Start frontend only (network) |

---

## 🌐 Access URLs

### Local Mode
- Frontend: `http://localhost:5173`
- API: `http://localhost:4000`
- MinIO Console: `http://localhost:9001`
- Prisma Studio: `http://localhost:5555`

### Network Mode (example with IP 192.168.1.26)
**From host machine:**
- Frontend: `http://localhost:5173` or `http://192.168.1.26:5173`
- API: `http://localhost:4000` or `http://192.168.1.26:4000`
- MinIO Console: `http://localhost:9001` or `http://192.168.1.26:9001`

**From other devices (laptop, tablet, phone):**
- Frontend: `http://192.168.1.26:5173`
- API: `http://192.168.1.26:4000`
- MinIO Console: `http://192.168.1.26:9001`

---

## 🔥 Firewall Rules (Windows)

```powershell
# Allow all development ports
New-NetFirewallRule -DisplayName "Pramara API Dev" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Pramara Web Dev" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "MinIO API Dev" -Direction Inbound -LocalPort 9000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "MinIO Console Dev" -Direction Inbound -LocalPort 9001 -Protocol TCP -Action Allow
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| CORS errors | Check `CORS_ORIGIN` includes your IP |
| File uploads fail | Check all MinIO endpoints use same IP |
| Can't access from 2nd device | Check firewall, ensure `--host` flag on Vite |
| IP changed | Run `npm run network:ip` and reconfigure |
| Connection refused | Ensure Docker services are running |

---

## 📚 Full Documentation

See **docs/MULTI_DEVICE_SETUP.md** for complete setup instructions and troubleshooting.

---

## 💡 Best Practices

1. ✅ Use `setup:local` for solo work
2. ✅ Use `setup:network` when working across devices
3. ✅ Run `network:ip` after connecting to a new network
4. ✅ Keep `.env` out of git (it's gitignored)
5. ✅ Share templates (`.env.local`, `.env.network`) with your team
6. ⚠️ Never expose these ports to the internet (dev only!)

---

**Happy coding! 🎉**
