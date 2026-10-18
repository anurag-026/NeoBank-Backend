# NeoBank

[![CI/CD](https://github.com/anurag-026/NeoBank-Backend/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/anurag-026/NeoBank-Backend/actions/workflows/ci-cd.yml)

NeoBank is a **Spring Boot / Spring Cloud** microservices backend for digital banking: authentication with OTP and JWT, customer onboarding & KYC, account management, and debit/credit transactions.

## Architecture

```text
                    ┌─────────────────┐
                    │  API Gateway    │  :8080
                    │  (JWT, rate     │
                    │   limit, routes)│
                    └────────┬────────┘
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
    ┌────────────┐   ┌────────────┐   ┌────────────────┐
    │ Customer   │   │ Account    │   │ Transaction    │
    │ :8082      │◄──│ :8083      │◄──│ :8084          │
    └────────────┘   └─────┬──────┘   └────────────────┘
                           │ Kafka / Redis
    ┌────────────┐   ┌─────┴──────┐   ┌────────────────┐
    │ Auth       │   │ Eureka     │   │ Config Server  │
    │ :9000      │   │ :8761      │   │ :8888          │
    └────────────┘   └────────────┘   └────────────────┘
           │
      PostgreSQL × 4   Redis   Kafka
```

| Service | Role |
|---------|------|
| **api-gateway** | Edge routing, JWT validation, rate limiting |
| **auth-service** | Registration, login, OTP, OAuth2 JWT, RBAC |
| **customer-service** | Customer profiles, KYC, Setu sandbox proxies |
| **account-service** | Account creation, balance APIs, Redis, Kafka events |
| **transaction-service** | Debit/credit processing, Resilience4j, Kafka events |
| **eureka-server** | Service discovery |
| **config-server** | Centralized configuration (Git-backed) |

## Features

- User registration and password login with **OTP** (Redis) and **JWT** (`grant_type=otp`)
- Role / permission administration (RBAC)
- Customer onboarding and KYC endpoints (Setu sandbox integration)
- Account opening with generated account numbers
- Debit and credit transactions with idempotency (`referenceId`) and reversal
- API Gateway routes under `/api/**` (see [docs](docs/))
- **Swagger UI / OpenAPI 3** for every service, aggregated at the gateway
- **Prometheus** metrics, **Grafana Tempo** distributed tracing and a provisioned **Grafana** dashboard
- **GitHub Actions** CI/CD: build + test every module, publish Docker images to GHCR, optional SSH deploy
- Docker Compose stack for local development

## Tech stack

| Area | Choice |
|------|--------|
| Language | Java **21** |
| Framework | Spring Boot **3.4.10**, Spring Cloud **2024.0.0** |
| Security | Spring Security, OAuth2 Authorization Server, JWT |
| Data | PostgreSQL, Spring Data JPA, Flyway |
| Cache / locks | Redis, Redisson |
| Messaging | Apache Kafka |
| Clients | OpenFeign, WebClient |
| Resilience | Resilience4j |
| API docs | springdoc-openapi 2.8 (Swagger UI) |
| Observability | Micrometer, Prometheus, OpenTelemetry (OTLP), Grafana Tempo, Grafana |
| Build | Maven |
| CI/CD | GitHub Actions, GitHub Container Registry |
| Runtime | Docker Compose (optional Kubernetes manifests in `kb/`) |

## Prerequisites

- [JDK 21](https://adoptium.net/)
- [Maven 3.9+](https://maven.apache.org/) (or use each module’s `mvnw` / `mvnw.cmd`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended)
- Config Server Git repository reachable for gateway routes (see `config-server`)
- Optional: SMTP + Twilio (OTP), Setu sandbox credentials (KYC)

## Frontend

A React (Vite) banking UI lives in [`frontend/`](frontend/).

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173 (dev server proxies auth + gateway to avoid CORS). Details: [frontend/README.md](frontend/README.md).

## Quick start (backend)

### 1. Clone

```bash
git clone <your-repo-url>.git
cd NeoBank
```

### 2. Configure secrets

Do **not** commit real credentials. Update each service’s `application.yml` (or use environment variables / a secrets manager) for:

- PostgreSQL username & password  
- Redis / Kafka hosts (Compose service names work inside Docker)  
- SMTP & Twilio (auth OTP)  
- Setu client credentials (customer KYC)  
- Config Server / gateway Basic auth  

Kubernetes sample secrets under `kb/secrets/` are gitignored — create them locally from your own values.

### 3. Run with Docker Compose

```bash
docker compose up --build
```

| Endpoint | URL |
|----------|-----|
| API Gateway | http://localhost:8080 |
| Eureka Dashboard | http://localhost:8761 |
| Config Server | http://localhost:8888 |
| Auth Service | http://localhost:9000 |
| Customer Service | http://localhost:8082 |
| Account Service | http://localhost:8083 |
| Transaction Service | http://localhost:8084 |
| Swagger UI (all services) | http://localhost:8080/swagger-ui.html |
| Prometheus | http://localhost:9090 |
| Grafana (dashboards, traces) | http://localhost:3000 |
| Tempo API | http://localhost:3200 |

The Spring services must be packaged first (`mvn package` in each module) because each Dockerfile copies `target/*.jar`.

### 4. Build a single service (example)

```bash
cd auth-service
./mvnw clean package -DskipTests          # Linux / macOS
.\mvnw.cmd clean package -DskipTests      # Windows
```

## API documentation (Swagger)

Every Spring service publishes an OpenAPI 3 spec at `/v3/api-docs` and Swagger UI at `/swagger-ui.html`. The gateway aggregates them:

- **http://localhost:8080/swagger-ui.html** — pick a service from the *Select a definition* dropdown. Choose the **"Through API Gateway"** server to send requests via `/api/**`.
- Direct per-service UIs: `http://localhost:{9000|8082|8083|8084}/swagger-ui.html`.

Click **Authorize** and paste an access token from `POST /oauth2/token` to call protected endpoints. See [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md#swagger--openapi).

## Monitoring (Prometheus, Tempo, Grafana)

- Every service exposes Micrometer metrics at `/actuator/prometheus`; Prometheus scrapes them every 15 s.
- Every request is traced with Micrometer Tracing (OpenTelemetry bridge) and exported over OTLP to **Tempo**. Trace context propagates through the gateway, Feign calls and Kafka messages.
- Log lines carry `[traceId,spanId]`, so a log entry can be looked up in Tempo.
- Grafana is provisioned with Prometheus + Tempo data sources and a **NeoBank - Services Overview** dashboard (request rate, p95 latency, errors, JVM, DB pool, circuit breaker, service graph).

Details: [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md).

## CI/CD

[`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) runs on pushes and pull requests to `main`/`develop`:

1. **CI** — `mvn verify` for each of the 7 services (matrix), frontend lint/test/build, Compose + Prometheus config validation.
2. **CD** (push to `main` or a `v*.*.*` tag) — builds Docker images from the CI JARs and pushes them to `ghcr.io/<owner>/neobank-<service>`.
3. **Deploy** (optional) — if the `DEPLOY_HOST` variable is configured, pulls the new images on a server over SSH and restarts Docker Compose.

Details and required secrets: [docs/CI_CD.md](docs/CI_CD.md).

## Typical API flow

1. **Register** — `POST http://localhost:9000/user/register`  
2. **Assign roles** (admin) — auth `/admin/**` APIs  
3. **Login** — `POST http://localhost:9000/auth/login` → OTP via SMS/email  
4. **Token** — `POST http://localhost:9000/oauth2/token` with `grant_type=otp`  
5. **Call APIs** through the gateway with `Authorization: Bearer <token>`:
   - `POST /api/customers`
   - `POST /api/accounts`
   - `POST /api/transactions`

Gateway route details and request/response shapes: **[docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)**.

> Auth login and token endpoints are most reliable against **auth-service `:9000`** directly. Gateway `/auth/**` rewriting may strip path segments depending on Config Server YAML.

## Project structure

```text
NeoBank/
├── api-gateway/           # Spring Cloud Gateway
├── auth-service/          # Identity & OAuth2
├── customer-service/      # Customers & KYC
├── account-service/       # Accounts
├── transaction-service/   # Transactions
├── eureka-server/         # Discovery
├── config-server/         # Central config
├── banking-system-parent/ # Shared Maven parent / BOM
├── frontend/              # React (Vite) banking UI
├── observability/         # Prometheus, Tempo and Grafana config
├── .github/               # GitHub Actions workflows, Dependabot
├── kb/                    # Partial Kubernetes manifests
├── docs/                  # Technical documentation
├── docker-compose.yml
└── README.md
```

## Documentation

| Document | Description |
|----------|-------------|
| [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) | Scope and use cases |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture and diagrams |
| [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | REST & OAuth endpoints |
| [docs/DATABASE_DOCUMENTATION.md](docs/DATABASE_DOCUMENTATION.md) | Schemas and migrations |
| [docs/SECURITY.md](docs/SECURITY.md) | Authentication & authorization |
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md) | Configuration reference |
| [docs/SETUP_AND_DEPLOYMENT.md](docs/SETUP_AND_DEPLOYMENT.md) | Setup, deploy, troubleshooting |
| [docs/WORKFLOWS.md](docs/WORKFLOWS.md) | End-to-end flows |
| [docs/TECHNICAL_DOCUMENTATION.md](docs/TECHNICAL_DOCUMENTATION.md) | Module implementation notes |
| [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) | Metrics, tracing, dashboards |
| [docs/CI_CD.md](docs/CI_CD.md) | GitHub Actions pipeline and deployment |
| [docs/external-config/](docs/external-config/) | Sample Config Server YAML mirrors |

## Contributing

1. Fork the repository and create a feature branch.  
2. Keep secrets out of commits (use `.env` / local overrides — already gitignored).  
3. Open a pull request with a clear description of the change.

## License

Add a license file (for example MIT or Apache-2.0) before publishing if you intend others to reuse this code.
