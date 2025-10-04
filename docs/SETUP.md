# Pramara PMS — Local Setup (Dev)

## Prereqs
- Docker Desktop
- Node.js LTS (18/20)
- Git

## Steps
1) docker compose up -d
2) cd api && npx prisma migrate deploy && cd ..
3) npm --prefix api run start
4) npm --prefix web run dev

## Env
- Copy api/.env.example -> api/.env and fill JWT_SECRET, MINIO keys.
- Copy web/.env.example -> web/.env
