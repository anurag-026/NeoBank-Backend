# Technical Documentation

Organized by module. Line numbers refer to the workspace state at documentation time.

## Parent BOM

`banking-system-parent/pom.xml` manages:

- Java 21, Spring Boot 3.4.10, Spring Cloud 2024.0.0
- Lombok, PostgreSQL driver, JJWT, Bouncy Castle versions
- Modules list includes typo `../customer-server` (directory is `customer-service`)

---

## config-server

**Entry:** `ConfigServerApplication` with `@EnableConfigServer`.

**Security:** `SecurityConfig` requires authentication for all requests; CSRF disabled. Credentials from `spring.security.user.name` / `password`.

**Backend:** Git URI `https://github.com/HindiCodeClass/banking-config-repo`, branch `main`, `clone-on-start: true`, timeout 10s.

**Actuator:** health, info, metrics exposed.

---

## eureka-server

**Entry:** `EurekaServerApplication` with `@EnableEurekaServer`.

**Config:** Port 8761; `register-with-eureka: false`, `fetch-registry: false` (standalone registry).

**Security:** None in module.

---

## api-gateway

### Components

| Class | Role |
|-------|------|
| `SecurityConfig` | Permits `/public/**`, `/kyc/callback`; `/api/admin/**` needs `ROLE_ADMIN`; else authenticated JWT; authorities from claim `authorities` with empty prefix |
| `CorrelationIdFilter` | Order -2; sets `X-Correlation-Id` if absent |
| `BankingRequestLoggingFilter` | Order -1; logs method/path; sets `X-Request-id` |
| `UserKeyResolver` | KeyResolver using `X-User-Id` or client IP |
| `GlobalErrorHandler` | Returns `{"error": "..."}` with HTTP 500 |

### Config client

`application.yml` imports `optional:configserver:http://config-server:8888` with profile `dev`. Remote `api-gateway-dev.yml` (mirrored in `docs/external-config/`) supplies:

- JWT `jwk-set-uri` → auth-service JWKS
- Redis host for rate limiting
- Global `RequestRateLimiter` (5 / 10)
- Routes: `/api/accounts/**`, `/api/transactions/**` (+ CircuitBreaker), `/auth/**`+`/oauth2/**`, `/api/customers/**`+`/api/kyc/**` all with `StripPrefix=1` and Eureka `lb://` URIs
- Eureka client + Actuator (`health`, `info`, `prometheus`)

### Known remote-config vs code gaps

- Auth route `StripPrefix=1` breaks `/auth/*` and `/oauth2/*` controller paths.
- Fallback `forward:/fallback/transaction` has **no** handler in the gateway module.
- Logger package `com.bank.apigateway` ≠ code package `com.bank.gateway`.
- `UserKeyResolver` bean exists for rate-limit keys; default filter enables Redis rate limiting when Redis is up.

---

## auth-service

### Authorization Server

`AuthorizationServerConfig` (`@Order(-1)`):

- Matches Authorization Server endpoints
- Registers custom OTP authentication converter + provider
- JWT customizer adds claims `userId` and `authorities` (role names + permission names)

`JwkConfig`: generates a new RSA 2048 key pair **at startup** (not persisted).

`ClientConfig`: in-memory client `api-gateway`, grant types `otp`, `refresh_token`, `client_credentials`, scope `accounts.read`, access TTL 3h, refresh TTL 7d. Client secret is BCrypt-encoded from a plaintext value in source — treat as a secret to rotate.

### Application security

`SecurityBeanConfig` (`@Order(2)`):

- Public: `/user/register`, `/auth/**`
- `/admin/**` → `hasRole("ADMIN")`
- Else authenticated JWT resource server
- `BCryptPasswordEncoder`

### OTP

`OtpService` stores Redis keys `otp{userName}` and `otp_meta{userName}` (IP|deviceId), 30-minute TTL. `OtpAuthenticationProvider` verifies OTP + IP + `X-Device-Id` header before issuing token.

### Login lockout

`LoginController.login` (lines 47–76): unlock after 15 minutes; increment failures; lock at ≥5.

### Dead / unwired code (verified)

- `AuthenticationService` — no references found
- `Client` entity / `oauth_clients` table not wired to `RegisteredClientRepository`
- `OtpLoginSuccessHandler` not attached to a filter chain
- `LoginController.loginFailureEventListener` field unused

---

## customer-service

### Customer create

`CustomerService.create`:

1. Read `userId` and subject from JWT via `SecurityUtil`
2. Reject if customer already exists for user
3. Persist with status `PENDING`, `isDeleted=false`

### Internal lookup

`getByUserId`: loads customer and KYC; builds `CustomerDto` with `kycStatus`. **Risk:** NPE if KYC row is null when accessing `kyc.getStatus()`.

### KYC submit

`KycService.submitKyc` (lines 20–47): Setu verification calls commented out; `panVerified`/`aadhaarVerified` remain false → status **REJECTED** (or **PENDING** if the empty try somehow threw).

### SetuService

Real `WebClient` calls to sandbox base URL for:

- PAN verify
- DigiLocker create (redirect hardcoded `http://localhost:8080/api/kyc/callback`)
- Status check
- Aadhaar fetch

Headers: `x-client-id`, `x-client-secret`, `x-product-instance-id`.

### Exception handling

`GlobalExceptionHandler` exists for customer-service; other services mostly throw `RuntimeException` without structured handlers.

---

## account-service

### Account creation (`AccountService.accountCreate`)

1. `SecurityUtil.getUserId()`
2. Feign `CustomerClient.getCustomerByUserId`
3. Validate deposit ≥ 1000 and customer ACTIVE + KYC VERIFIED (`AccountValidator`)
4. Next sequence via `account_seq`
5. Generate account number (`AccountNumberGenerator` with branch `4201`, type `10`)
6. Save `Account` ACTIVE with initial balance
7. Kafka send to `account-created-topic` (key = account id string)
8. Return `AccountResponse`

IP/`deviceId` parameters are accepted but **not** written via `AccountAuditService`.

### Balance update divergence

| Path | Behavior |
|------|----------|
| `AccountController.updateBalance` (used by Feign) | Sets `account.balance = request.newBalance` (absolute) |
| `AccountService.updateBalance` | Treats `newBalance` as **amount** to debit/credit under Redisson lock |

Transaction-service sends **absolute** balances → matches controller path; locked service method is unused by Feign.

### Caching

`getAccount` is `@Cacheable("account-cache")` but **no REST mapping** exposes it. Internal GET uses repository directly.

### Feign security

`FeignSecurityConfig` copies `Authorization` header to outgoing requests; also prints a token prefix to stdout (information leak risk).

---

## transaction-service

### Process (`TransactionService.process`, `@Transactional`)

1. Resolve `userId` from JWT
2. If `referenceId` exists → return existing mapped response (idempotency)
3. Create `PENDING` transaction with UUID `txnId`
4. Load account via `AccountProtectionService` (circuit breaker, retry, time limiter, bulkhead)
5. Reject if status string `"BLOCKED"`; amount > 50000; debit without funds
6. Compute absolute `newBalance`; Feign `updateBalance`
7. Mark SUCCESS; audit; Kafka `transaction-event`
8. On exception: mark FAILED; audit; rethrow

### Reversal

`TransactionController.reverse`: load SUCCESS txn; flip DEBIT↔CREDIT; call `process` with ip `System`, device `reversal`. No `referenceId` set on reverse request. No `@PreAuthorize`.

### Resilience scope

Only **GET** account is wrapped. Balance update Feign call is unprotected.

---

## Cross-cutting integrations

| Integration | Producer / consumer |
|-------------|---------------------|
| Kafka `account-created-topic` | account-service produce only |
| Kafka `transaction-event` | transaction-service produce only |
| Redis OTP | auth-service |
| Redis cache | customer-service, account-service |
| Redisson locks | account-service service method only |
| Setu | customer-service outbound |
| Twilio / SMTP | auth-service OTP delivery |
| Logstash TCP | account-service logback (target `logstash:5000`) |

## Transaction boundaries

- `TransactionService.process` — `@Transactional` (Jakarta)
- `AccountService.updateBalance` — `@Transactional` (unused by controller path)
- Customer/KYC — repository saves without explicit class-level transaction annotations beyond Spring Data defaults

## Validation

- Bean Validation annotations exist on some DTOs (e.g. `CustomerRequest`) but controllers often omit `@Valid`
- account-service has validation starter; programmatic validation in `AccountValidator`
- transaction-service has no validation starter; rules are imperative in service
