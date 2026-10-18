# Setup and Deployment

## Required software

| Tool | Version / notes |
|------|-----------------|
| JDK | **21** (parent POM `java.version`) |
| Maven | 3.9+ or module `mvnw` / `mvnw.cmd` |
| Docker / Docker Compose | For Compose stack (file version `3.8`) |
| Git | For config-server clone of external repo |
| Optional kubectl | For `kb/` manifests |

## Local development — Docker Compose (primary)

From repository root (`d:\Projects\NeoBank` on Windows):

```powershell
docker compose up --build
```

### What Compose starts

- Infrastructure: Redis, Zookeeper, Kafka, four Postgres containers
- Platform: config-server, eureka-server
- Domain: auth, customer, account, transaction
- Edge: api-gateway
- ELK: **commented out**

### Before first run

1. Align DB credentials in each service `application.yml` with Compose `POSTGRES_*` values (especially **customer-service**).
2. Ensure config-server can clone `banking-config-repo` (network + credentials if private). Expected files include `api-gateway-dev.yml` (see `docs/external-config/`).
3. Align config-server Basic auth with api-gateway `spring.cloud.config.username/password`.
4. Configure Twilio/SMTP/Setu or expect OTP/KYC proxy failures.
5. Be aware of known Kafka network issue (below).
6. For auth login/token and user register, call **auth-service `:9000` directly** until gateway `StripPrefix` on `/auth/**` and `/oauth2/**` is fixed. Use gateway for `/api/accounts`, `/api/transactions`, `/api/customers`, `/api/kyc`.

### Verify

| Check | URL / command |
|-------|----------------|
| Eureka UI | http://localhost:8761 |
| Config server health | http://localhost:8888/actuator/health (Basic auth) |
| Gateway | http://localhost:8080 |
| Auth JWKS | http://localhost:9000/oauth2/jwks |

## Local development — Maven per service

Build JARs (example):

```powershell
cd d:\Projects\NeoBank\auth-service
.\mvnw.cmd clean package -DskipTests
```

Run (after infra is up):

```powershell
java -jar target\auth-service-0.0.1-SNAPSHOT.jar
```

Adjust JAR names per module (`api-gateway-1.0.0.jar` vs `*-0.0.1-SNAPSHOT.jar` as defined in each POM/Dockerfile).

**Parent reactor caveat:** `banking-system-parent` lists module `../customer-server` which does not exist — prefer per-module builds.

## Database setup

Compose creates empty databases. On service start:

- auth / account / transaction: Flyway migrations apply
- customer: Hibernate `ddl-auto: update` creates tables

No seed users beyond auth role/permission inserts. Register users via API, then assign roles with admin endpoints.

## Build commands

```powershell
# Per module
.\mvnw.cmd clean package -DskipTests

# Docker image (from module directory; Compose uses build context)
docker build -t neobank/<service> .
```

## Run commands

```powershell
# Full stack
docker compose up --build

# Single infra dependency example
docker compose up -d redis postgres-auth
```

## Test commands

```powershell
cd eureka-server
.\mvnw.cmd test
```

Other modules lack test suites. Documentation generation did **not** execute tests.

## Deployment — Kubernetes (`kb/`)

Partial manifests only:

```powershell
kubectl apply -f kb/namespace.yml
kubectl apply -f kb/configmaps/banking-config.yml
# Review secrets before apply — replace plaintext values
kubectl apply -f kb/secrets/banking-secret.yml
kubectl apply -f kb/postgresAuthDb.yml
kubectl apply -f kb/postgresSqlCustomerDb.yml
kubectl apply -f kb/redis/redis.yml   # fix metadate typo first
kubectl apply -f kb/authService.yml
```

Missing manifests for gateway, eureka, config-server, customer, account, transaction, kafka — **not a complete K8s deploy**.

## Required external services

| Service | Role |
|---------|------|
| Git config repo | Gateway (and potentially other) remote config |
| Twilio | SMS OTP |
| SMTP provider | Email OTP |
| Setu sandbox | KYC proxies |

## Health checks

- config-server / eureka expose Actuator to varying degrees
- Domain services permit `/actuator/**` in security configs but **may lack** actuator dependency on classpath — treat availability as **unverified**
- Compose has no healthcheck blocks

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| api-gateway starts without routes | Config server down, Git clone failed, or Basic auth mismatch |
| JWT invalid after auth restart | Ephemeral JWK regenerated |
| OTP never arrives | Twilio/SMTP secrets invalid; check logs |
| customer-service cannot connect DB | Username/password mismatch vs Compose; missing `depends_on` postgres-customer |
| Kafka producer errors from account/txn | Kafka/ZK not on `banking-network` in Compose |
| Flyway failure on account-service | Duplicate `V2` migration scripts |
| transaction-service validate fail | `TransactionAudit` table name mismatch |
| KYC always REJECTED | Setu calls commented in `KycService.submitKyc` |
| Feign 401 | Missing/forwarded Authorization; JWKS unreachable |
| Parent `mvn` fails | `customer-server` module path typo |

## Common Compose networking fix (recommended)

Attach `kafka` and `zookeeper` to `banking-network` (and ensure advertised listeners match). This change is **not** applied by the documentation task; apply manually if you authorize Compose edits.
