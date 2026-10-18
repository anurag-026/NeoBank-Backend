# Project Structure

Relevant workspace layout (excluding Eclipse `.metadata`, `target/`, and IDE caches).

```
NeoBank/
├── README.md
├── docker-compose.yml          # Local multi-service orchestration
├── logstash.config             # ELK pipeline (unused while Compose ELK is commented)
├── banking-system-parent/      # Maven parent POM
├── config-server/              # Spring Cloud Config Server
├── eureka-server/              # Service discovery
├── api-gateway/                # Edge gateway
├── auth-service/               # Identity / OAuth2 AS / OTP
├── customer-service/           # Customers + KYC + Setu
├── account-service/            # Accounts
├── transaction-service/        # Debit/credit transactions
├── kb/                         # Partial Kubernetes manifests
└── docs/                       # This documentation set
    └── external-config/        # Mirrored Config Server YAML (not loaded at runtime from here)
```

## Root files

| Path | Responsibility |
|------|----------------|
| `docker-compose.yml` | Defines Redis, Kafka/ZK, Config, Eureka, four Postgres DBs, all app services, gateway |
| `logstash.config` | TCP JSON → Elasticsearch index pattern `banking-logs-%{+YYYY.MM.DD}` |
| `banking-system-parent/pom.xml` | Shared versions and module list |

## Common Maven module layout

Each Spring service follows:

```
<service>/
├── Dockerfile
├── pom.xml
├── .mvn/wrapper/
├── mvnw / mvnw.cmd
└── src/main/
    ├── java/com/bank/...
    └── resources/
        ├── application.yml
        ├── application.properties
        └── db/migration/          # Flyway (auth, account, transaction only)
```

## Entry points (main classes)

| Service | Main class |
|---------|------------|
| config-server | `com.bank.configserver.ConfigServerApplication` |
| eureka-server | `com.bank.eurekaserver.EurekaServerApplication` |
| api-gateway | `com.bank.gateway.ApiGatewayApplication` |
| auth-service | `com.bank.authservice.AuthServiceApplication` |
| customer-service | `com.bank.customer.CustomerServiceApplication` |
| account-service | `com.bank.account.AccountServiceApplication` |
| transaction-service | `com.bank.transaction.TransactionServiceApplication` |

## auth-service

| Path | Purpose |
|------|---------|
| `controller/` | Register, login/OTP trigger, RBAC admin, user-role admin |
| `config/` | Authorization Server, security, JWK, in-memory OAuth client |
| `security/` | Custom OTP grant converter/provider/token |
| `service/` | Users, OTP (Redis), SMS, email, audit, RBAC helpers |
| `domain/` | JPA entities: User, Role, Permission, Client |
| `repository/` | Spring Data repositories |
| `event/` | Login listeners / OTP success handler (partially unwired) |
| `dto/RegisterRequest.java` | Registration payload |
| `resources/db/migration/` | Flyway V1–V3 |

## customer-service

| Path | Purpose |
|------|---------|
| `controller/CustomerController.java` | Create customer; internal get by userId |
| `controller/KycController.java` | KYC submit + Setu proxy endpoints |
| `service/` | Customer, KYC, Setu HTTP |
| `entity/` | Customer, KycDetails |
| `config/SetuConfig.java` | WebClient bean |
| `config/MethodSecurityConfig.java` | Enables method security (no `@PreAuthorize` usage found) |
| `exception/` | Global handler + `ResourceNotFoundException` |
| `security/SecurityUtil.java` | Reads JWT `userId` / subject |

No Flyway; schema via `ddl-auto: update`.

## account-service

| Path | Purpose |
|------|---------|
| `controller/AccountController.java` | Public create + internal get/update balance |
| `service/` | Account create, locked balance update, sequence, audit, distributed lock |
| `client/CustomerClient.java` | Feign → customer-service |
| `validator/AccountValidator.java` | Deposit and customer status rules |
| `util/AccountNumberGenerator.java` | Account number algorithm |
| `config/` | Security, Redis cache, Redisson, Feign auth forwarding |
| `resources/db/migration/` | V1 accounts; **two V2 scripts** (conflict risk) |
| `resources/logback-spring.xml` | Logstash TCP appender |

## transaction-service

| Path | Purpose |
|------|---------|
| `controller/TransactionController.java` | Process + reverse |
| `service/TransactionService.java` | Core debit/credit workflow |
| `resilience/AccountProtectionService.java` | Resilience4j-wrapped account GET |
| `client/AccountClient.java` | Feign → account-service |
| `audit/TransactionAuditService.java` | Persist audit rows |
| `config/` | Security + Feign auth forwarding |

## api-gateway

| Path | Purpose |
|------|---------|
| `config/SecurityConfig.java` | Reactive JWT security rules |
| `filter/CorrelationIdFilter.java` | Ensures `X-Correlation-Id` |
| `filter/BankingRequestLoggingFilter.java` | Request logging + `X-Request-id` |
| `ratelimit/UserKeyResolver.java` | Rate-limit key bean (not wired to routes in-repo) |
| `error/GlobalErrorHandler.java` | Generic 500 JSON |

## config-server / eureka-server

| Path | Purpose |
|------|---------|
| `config-server/.../security/SecurityConfig.java` | HTTP Basic for all endpoints |
| `eureka-server/.../EurekaServerApplication.java` | `@EnableEurekaServer` |
| `eureka-server/src/test/.../EurekaServerApplicationTests.java` | Context load test |

## kb/ (Kubernetes)

| Path | Purpose |
|------|---------|
| `namespace.yml` | `banking-system` namespace |
| `configmaps/banking-config.yml` | REDIS_HOST, EUREKA_URL, KAFKA_BOOTSTRAP_SERVER, AUTH_JWK_URI |
| `secrets/banking-secret.yml` | Postgres / mail / Twilio stringData (**sensitive**) |
| `authService.yml` | Auth Deployment + Service |
| `postgresAuthDb.yml` / `postgresSqlCustomerDb.yml` | Postgres Deployments/Services |
| `redis/redis.yml` | Redis Deployment/Service (contains `metadate` typo) |

Missing from `kb/`: gateway, eureka, config-server, account, transaction, customer, kafka manifests.

## File inventory (source)

Approximately **111** Java files under the seven services (including one test). Configuration/SQL/YAML/Docker files exist alongside each module.
