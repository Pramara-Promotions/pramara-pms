# Multi-Device Development Setup

This guide explains how to set up Pramara PMS for development across multiple devices on your local network (e.g., desktop + laptop).

## Overview

By default, Pramara PMS runs on `localhost`, which only works on a single machine. For multi-device development, you need to:

1. **Find your network IP address** (e.g., `192.168.1.100`)
2. **Configure the server and services** to bind to your network IP
3. **Access the app** from any device on the same network

---

## Quick Start

### 1. Find Your Network IP Address

Run the helper script:

```powershell
node scripts/get-network-ip.js
```

Or manually:

**Windows (PowerShell):**
```powershell
ipconfig
```
Look for `IPv4 Address` under your active network adapter (e.g., `192.168.1.100`)

**Mac/Linux:**
```bash
ifconfig
# or
ip addr show
```

### 2. Configure Environment Variables

Copy the network template:

```powershell
# Windows PowerShell
Copy-Item .env.network .env
```

Edit `.env` and replace **all instances** of `YOUR_NETWORK_IP` with your actual IP:

```env
APP_URL="http://192.168.1.100:4000"
CORS_ORIGIN="http://192.168.1.100:5173,http://localhost:5173"
S3_ENDPOINT="http://192.168.1.100:9000"
S3_PUBLIC_BASE="http://192.168.1.100:9000/pramara"
MINIO_ENDPOINT=192.168.1.100
```

### 3. Update Frontend Configuration

Edit `web/.env` (or create it):

```env
VITE_API_URL=http://192.168.1.100:4000
```

### 4. Configure Docker Services

Edit `docker-compose.yml` to expose MinIO on all network interfaces:

```yaml
services:
  minio:
    image: minio/minio:latest
    ports:
      - "0.0.0.0:9000:9000"  # Expose MinIO API
      - "0.0.0.0:9001:9001"  # Expose MinIO Console
    # ... rest of config
```

Or use the simpler format that binds to all interfaces by default:
```yaml
    ports:
      - "9000:9000"
      - "9001:9001"
```

### 5. Start Services

```powershell
# Start Docker services (PostgreSQL, MinIO)
docker-compose up -d

# Run database migrations
cd api
npx prisma migrate deploy

# Start API server
npm run dev

# In another terminal, start frontend
cd web
npm run dev -- --host
```

The `--host` flag makes Vite listen on all network interfaces.

### 6. Access from Other Devices

On your **second device** (laptop, tablet, etc.) connected to the same network:

**Frontend:** `http://192.168.1.100:5173`  
**API:** `http://192.168.1.100:4000`  
**MinIO Console:** `http://192.168.1.100:9001`

---

## Switching Between Local and Network Mode

### Local Mode (Single Device)

```powershell
# Use the local template
Copy-Item .env.local .env
```

All services will run on `localhost` only.

### Network Mode (Multi-Device)

```powershell
# Use the network template
Copy-Item .env.network .env
# Then replace YOUR_NETWORK_IP with your actual IP
```

Services will be accessible from other devices on your network.

---

## Troubleshooting

### CORS Errors

**Symptom:** Frontend can't connect to API, browser console shows CORS errors.

**Solution:** Ensure `CORS_ORIGIN` in `.env` includes both your network IP and localhost:
```env
CORS_ORIGIN="http://192.168.1.100:5173,http://localhost:5173"
```

### MinIO/S3 Errors (404, SignatureDoesNotMatch)

**Symptom:** File uploads fail, presigned URLs don't work.

**Solution:** Ensure ALL MinIO endpoints use your network IP:
```env
S3_ENDPOINT="http://192.168.1.100:9000"
S3_PUBLIC_BASE="http://192.168.1.100:9000/pramara"
MINIO_ENDPOINT=192.168.1.100
```

### Can't Access from Second Device

**Symptom:** Connection refused or timeout when accessing from another device.

**Possible causes:**
1. **Firewall:** Windows Firewall may be blocking incoming connections on ports 4000, 5173, 9000, 9001.
   - Add firewall rules to allow these ports
   - Or temporarily disable Windows Firewall for private networks (not recommended for production)

2. **Vite not binding to network:** Make sure you start Vite with `--host`:
   ```powershell
   npm run dev -- --host
   ```

3. **Docker not exposing ports:** Verify `docker-compose.yml` uses `0.0.0.0` or omits the bind address:
   ```yaml
   ports:
     - "9000:9000"  # Binds to all interfaces
   ```

### IP Address Changed

**Symptom:** Everything worked yesterday, now it doesn't.

**Solution:** Your network IP may have changed (DHCP). Check your IP with `ipconfig` and update `.env` accordingly.

To prevent this, configure a static IP for your development machine in your router settings.

### Database Connection Issues

**Symptom:** API can't connect to PostgreSQL.

**Solution:** PostgreSQL in Docker is bound to `localhost:5432`. Keep `DATABASE_URL` using `localhost`:
```env
DATABASE_URL="postgresql://pramara:pramara@localhost:5432/pramara?schema=public"
```

Only the API server needs network access; it acts as a proxy to the database.

---

## Firewall Configuration (Windows)

To allow incoming connections on development ports:

```powershell
# Allow API server (port 4000)
New-NetFirewallRule -DisplayName "Pramara API Dev" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow

# Allow Vite dev server (port 5173)
New-NetFirewallRule -DisplayName "Pramara Web Dev" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow

# Allow MinIO API (port 9000)
New-NetFirewallRule -DisplayName "MinIO API Dev" -Direction Inbound -LocalPort 9000 -Protocol TCP -Action Allow

# Allow MinIO Console (port 9001)
New-NetFirewallRule -DisplayName "MinIO Console Dev" -Direction Inbound -LocalPort 9001 -Protocol TCP -Action Allow
```

---

## Best Practices

1. **Use `.env.local` for solo development** on a single machine
2. **Use `.env.network` when working across devices** (copy and replace IP)
3. **Don't commit `.env`** — it's in `.gitignore`
4. **Share the same database** — both devices can connect through the network
5. **Coordinate code changes** — use Git branches to avoid conflicts
6. **Hot reload works** — Vite and nodemon will detect changes and reload

---

## Security Note

⚠️ **This setup is for LOCAL DEVELOPMENT ONLY.**

- Services are accessible to anyone on your network
- No HTTPS, no authentication on MinIO console
- Use strong JWT secrets even in development
- Never expose these ports to the internet

For production, use proper reverse proxies (nginx), HTTPS, and secure credentials.

---

## Summary

| Configuration | When to Use | Access From |
|--------------|-------------|-------------|
| `.env.local` | Single machine development | Same machine only |
| `.env.network` | Multi-device development | Any device on network |

**Key files:**
- `.env` — Active configuration (not committed)
- `.env.example` — Documentation template
- `.env.local` — Localhost template
- `.env.network` — Network template (replace YOUR_NETWORK_IP)

**Ports:**
- `4000` — API server
- `5173` — Vite dev server (frontend)
- `5432` — PostgreSQL (localhost only)
- `9000` — MinIO S3 API
- `9001` — MinIO Web Console

Happy multi-device development! 🚀
