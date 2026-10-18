# NeoBank Frontend

React (Vite) digital banking UI for the NeoBank Spring Cloud backend.

## Stack

- React + Vite (JavaScript)
- React Router
- Material UI
- Axios
- React Hook Form + Zod
- Recharts
- Lucide icons

## Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173

### Environment

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | API Gateway (default `http://localhost:8080`) |
| `VITE_AUTH_URL` | Auth service (default `http://localhost:9000`) |
| `VITE_USE_DEV_PROXY` | Use Vite proxy (`true` recommended for local CORS) |
| `OAUTH_CLIENT_ID` | OAuth client id for token proxy (server-side only) |
| `OAUTH_CLIENT_SECRET` | OAuth client secret for token proxy (server-side only) |

`OAUTH_*` values are **not** prefixed with `VITE_` so they stay in the Vite dev server and are injected on `/oauth2/token` via the proxy. Do not put real production secrets in the client bundle.

## Commands

```bash
npm run dev       # development server + API proxy
npm run build     # production build
npm run preview   # preview production build
npm test          # vitest
npm run lint      # oxlint
```

## Backend prerequisites

1. Start NeoBank services (`docker compose up --build` from repo root, or run services locally).
2. Ensure Config Server can serve gateway routes (`/api/accounts/**`, `/api/transactions/**`, `/api/customers/**`, `/api/kyc/**`).
3. Call auth login/token against auth-service (proxied as `/auth-proxy`) because gateway `StripPrefix` on `/auth/**` does not match controllers.
4. After registration, assign roles/permissions (Admin UI or SQL) so JWT contains `CREATE_ACCOUNT` / `TRANSFER_MONEY` as needed.

## Implemented screens

| Screen | Backend integration |
|--------|---------------------|
| Register / Login / OTP | `POST /user/register`, `POST /auth/login`, `POST /oauth2/token` |
| Dashboard | Live balances via `GET /api/accounts/internal` for saved account numbers |
| Accounts | `POST /api/accounts`, account lookup |
| Payments | `POST /api/transactions`, `POST /api/transactions/reverse/{txnId}` |
| Activity | Session-local history (no list API) |
| Onboarding & KYC | `POST /api/customers`, `POST /api/kyc/{id}`, PAN proxy |
| Profile | JWT claims only |
| Admin | Auth RBAC admin APIs |

## Not available from backend

- List accounts for current user
- Full transaction history / statements / PDF
- Peer-to-peer transfer, beneficiaries, NEFT/RTGS/IMPS
- Forgot password / profile edit
- HttpOnly cookie sessions (Bearer JWT in sessionStorage)

See [API_INVENTORY.md](./API_INVENTORY.md).
