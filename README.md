# Coco

AI-based cognitive gaming and memory assistance platform for elderly dementia patients in North East India.

Built for **Smart India Hackathon** — Problem Statement **26003** (MDoNER).

## Monorepo structure

```
coco/
├── apps/
│   ├── backend/              # FastAPI — shared API for all frontends
│   ├── caretaker-dashboard/  # Next.js — caregiver-facing web app (port 3000)
│   ├── admin-dashboard/      # Next.js — platform admin web app (port 3001)
│   └── mobile/               # Expo — elderly-facing patient app (own npm install)
├── packages/
│   ├── shared-types/         # TypeScript API contracts (both dashboards)
│   └── ui/                   # Shared shadcn-style React components (dashboards only)
├── docker-compose.yml        # Postgres + Redis + backend for local dev
├── pnpm-workspace.yaml       # pnpm workspaces (dashboards + packages only)
├── .env.example
└── package.json              # Root scripts
```

**pnpm workspaces** cover `apps/caretaker-dashboard`, `apps/admin-dashboard`, and `packages/*`. The FastAPI backend and Expo mobile app live in the repo but are **not** part of pnpm workspace resolution — they use Python venv and npm respectively.

## Prerequisites

| Tool | Version | Used by |
|------|---------|---------|
| Node.js | ≥ 20 | Dashboards, root scripts |
| pnpm | ≥ 9 | Dashboards, shared packages |
| Python | ≥ 3.9 (3.12 in Docker) | Backend (local dev) |
| Docker & Docker Compose | latest | Backend + Postgres + Redis |
| npm | latest | Mobile app only |

## Quick start

### 1. Clone and configure environment

```bash
cp .env.example .env
# Edit .env if needed (defaults work for local Docker dev)
```

### 2. Start the backend stack (recommended)

Spins up **Postgres**, **Redis**, and the **FastAPI** backend with hot reload:

```bash
pnpm dev:backend
# or: docker compose up backend postgres redis
```

API available at **http://localhost:8000**

- Health check: `GET /health`
- OpenAPI docs: **http://localhost:8000/docs**
- API routes are namespaced under `/api/v1/` (auth, patients, games, reminders, progress, caregivers, admin)

### 3. Start the dashboards

From the repo root (install once with `pnpm install`):

```bash
pnpm dev:caretaker   # http://localhost:3000
pnpm dev:admin       # http://localhost:3001
pnpm dev:dashboards  # both in parallel
```

### 4. Start the mobile app

The mobile app is **outside** the pnpm workspace. Install and run from its directory:

```bash
cd apps/mobile
npm install
npm start            # Expo dev server (default port 8081)
```

Set `EXPO_PUBLIC_API_URL` in `.env` (see `.env.example`) so the app can reach the backend.

## Running each app individually

### Backend (without Docker)

```bash
cd apps/backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Requires Postgres and Redis running locally (or use `docker compose up postgres redis`).

### Caretaker dashboard

```bash
pnpm --filter caretaker-dashboard dev
```

### Admin dashboard

```bash
pnpm --filter admin-dashboard dev
```

### Mobile (Expo)

```bash
cd apps/mobile
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run web      # Web preview
```

## Shared packages

### `@coco/shared-types`

TypeScript interfaces for API contracts (`Patient`, `Caregiver`, `GameSession`, `Reminder`, etc.). Import in either dashboard:

```ts
import type { Patient, HealthResponse } from "@coco/shared-types";
```

### `@coco/ui`

Shared React components (shadcn-style `Button`, `cn` utility). Used by both Next.js dashboards only.

```tsx
import { Button } from "@coco/ui";
```

## Backend architecture

| Domain router | Prefix | Purpose |
|---------------|--------|---------|
| `auth` | `/api/v1/auth` | JWT login/register |
| `patients` | `/api/v1/patients` | Patient CRUD |
| `games` | `/api/v1/games` | Cognitive game sessions |
| `reminders` | `/api/v1/reminders` | Medication/activity reminders |
| `progress` | `/api/v1/progress` | Cognitive progress metrics |
| `caregivers` | `/api/v1/caregivers` | Caregiver profiles |
| `admin` | `/api/v1/admin` | Platform-wide stats & health |

**Stack:** FastAPI · SQLAlchemy · Alembic · PostgreSQL · Redis · Pydantic v2 · JWT (python-jose) · passlib

**Roles:** `patient` · `caregiver` · `admin` — mapped to the three frontends.

## Environment variables

See [`.env.example`](.env.example) for all variables. Key ones:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `SECRET_KEY` | JWT signing secret |
| `BACKEND_CORS_ORIGINS` | Allowed origins (dashboards + Expo dev server) |
| `NEXT_PUBLIC_API_URL` | API base URL for Next.js dashboards |
| `EXPO_PUBLIC_API_URL` | API base URL for Expo mobile app |

## Team workflow (6 members)

| Member focus | App / package |
|--------------|---------------|
| Backend API | `apps/backend` |
| Caregiver UX | `apps/caretaker-dashboard` |
| Admin / analytics | `apps/admin-dashboard` |
| Patient mobile | `apps/mobile` |
| Shared types | `packages/shared-types` |
| Shared UI + integration | `packages/ui` + docker-compose |

Everyone can run `docker compose up` for a consistent backend. Frontends connect via `NEXT_PUBLIC_API_URL` / `EXPO_PUBLIC_API_URL`.

## Root scripts

| Script | Action |
|--------|--------|
| `pnpm dev:backend` | Docker Compose: Postgres + Redis + FastAPI |
| `pnpm dev:caretaker` | Caretaker dashboard on :3000 |
| `pnpm dev:admin` | Admin dashboard on :3001 |
| `pnpm dev:dashboards` | Both dashboards in parallel |
| `pnpm build:caretaker` | Production build — caretaker |
| `pnpm build:admin` | Production build — admin |
| `pnpm build:dashboards` | Build both dashboards |

## License

TBD — Smart India Hackathon project.
