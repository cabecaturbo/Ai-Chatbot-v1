# Netia Monorepo

This repository contains a multi-tenant API (`apps/api`) and a minimal admin app (`apps/admin`). Existing services are preserved under `archive/`.

## Quick start

1. Copy `.env.example` to `.env` and fill values
2. Install deps where needed
3. Push Prisma schema to your Postgres
4. Start both apps

```bash
npm run prisma:push
npm run dev
```

API runs on :8080, Admin on :3000 (Next.js). See `apps/api/src/routes` for endpoints.
