# Glossary

| Term | Meaning in this project |
|------|-------------------------|
| **NeoBank / Banking System** | The multi-module Spring Cloud backend in this repository |
| **AS / Authorization Server** | auth-service Spring Authorization Server issuing JWTs |
| **Resource Server** | Service that validates JWTs (gateway, customer, account, transaction) |
| **OTP grant** | Custom OAuth2 grant type `otp` exchanging one-time password for access token |
| **JWKS** | JSON Web Key Set published at `/oauth2/jwks` for signature verification |
| **RBAC** | Role-based access control via `roles`, `permissions`, and JWT `authorities` |
| **ROLE_ADMIN / ROLE_BANKER / ROLE_CUSTOMER** | Seeded role names in authdb |
| **CREATE_ACCOUNT** | Permission required to open accounts |
| **TRANSFER_MONEY** | Permission required for `POST /transactions` (debit/credit, not P2P transfer) |
| **VIEW_ACCOUNT / APPROVE_TRNASACTION** | Seeded permissions; little/no controller usage found |
| **KYC** | Know Your Customer; `kyc_details` + Setu sandbox flows |
| **Setu** | Third-party India fintech sandbox used for PAN / DigiLocker APIs |
| **DigiLocker** | Document consent flow proxied via Setu |
| **Customer status** | PENDING, ACTIVE, BLOCKED |
| **KYC status** | PENDING, VERIFIED, REJECTED |
| **Account type** | `SAVING`, `CURRENT` |
| **Account status** | Includes ACTIVE, BLOCKED (see `AccountStatus` enum) |
| **DEBIT / CREDIT** | Transaction types moving money out of / into a single account |
| **referenceId** | Client-supplied idempotency key for transactions |
| **txnId** | Server-generated UUID identifying a transaction |
| **Feign** | Declarative HTTP client for inter-service calls |
| **Eureka** | Netflix service discovery registry |
| **Config Server** | Spring Cloud Config serving Git-backed YAML to clients |
| **banking-config-repo** | External Git repository referenced by config-server (not in this workspace) |
| **Redisson** | Redis client used for distributed locks in account-service |
| **Resilience4j** | Circuit breaker, retry, bulkhead, time limiter around account reads |
| **Flyway** | SQL migration tool used by auth, account, transaction services |
| **ddl-auto validate / update** | Hibernate schema modes used per service |
| **Correlation ID** | `X-Correlation-Id` header ensured by gateway filter |
| **X-Device-Id** | Client device header bound to OTP and used in audits |
| **Database-per-service** | Each domain service owns a dedicated PostgreSQL database |
| **kb/** | Kubernetes manifests folder (partial) |
| **ELK** | Elasticsearch, Logstash, Kibana (Compose definitions commented out) |
