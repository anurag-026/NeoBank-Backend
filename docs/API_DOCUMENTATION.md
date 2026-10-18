# API Documentation

Endpoints below are taken from controller mappings and Authorization Server configuration in this repository.

**Gateway routes** are defined in external config `api-gateway-dev.yml` (mirrored at [external-config/api-gateway-dev.yml](external-config/api-gateway-dev.yml)). Clients should prefer the gateway prefixes in the table below. Direct service ports remain available for local debugging.

Unless noted, domain services expect:

```http
Authorization: Bearer <access_token>
```

JWT authorities are read from claim `authorities` (no extra `ROLE_` prefix added by converters).

## Client paths via api-gateway (`:8080`)

Source: `api-gateway-dev.yml` (Config Server / `dev` profile).

| Client path (gateway) | Downstream (after `StripPrefix=1`) | Eureka service |
|-----------------------|------------------------------------|----------------|
| `/api/accounts/**` | `/accounts/**` | `ACCOUNT-SERVICE` (`lb://`) |
| `/api/transactions/**` | `/transactions/**` | `TRANSACTION-SERVICE` |
| `/api/customers/**` | `/customers/**` | `CUSTOMER-SERVICE` |
| `/api/kyc/**` | `/kyc/**` | `CUSTOMER-SERVICE` |
| `/auth/**` | `/**` (first segment stripped) | `AUTH-SERVICE` |
| `/oauth2/**` | `/**` (first segment stripped) | `AUTH-SERVICE` |

**Examples (intended happy paths after StripPrefix):**

| Call through gateway | Reaches service as |
|----------------------|--------------------|
| `POST /api/accounts` | `POST /accounts` on account-service |
| `POST /api/transactions` | `POST /transactions` on transaction-service |
| `POST /api/customers` | `POST /customers` on customer-service |
| `POST /api/kyc/{id}` | `POST /kyc/{id}` on customer-service |

**Confirmed mismatches with service controllers:**

1. **Auth `StripPrefix=1`:** `POST /auth/login` becomes `POST /login`, but auth-service maps `POST /auth/login`. Likewise `/oauth2/token` becomes `/token` instead of `/oauth2/token`. Auth through the gateway as configured is **broken** unless StripPrefix is removed or rewrite filters are added.
2. **No gateway route for `/user/register`** — registration must hit auth-service directly (e.g. `:9000`) or a route must be added.
3. **KYC callback:** DigiLocker redirect uses `http://localhost:8080/api/kyc/callback` → after StripPrefix becomes `/kyc/callback` on customer-service (matches controller). Gateway security also permits `/kyc/callback` (without `/api`), which is a **different** path than `/api/kyc/callback`.
4. **Transaction CircuitBreaker fallback** `forward:/fallback/transaction` — **no** fallback controller exists in the api-gateway module.
5. **Rate limiting:** default filter `RequestRateLimiter` (replenish 5 / burst 10) uses Redis; key resolver bean is `UserKeyResolver` (`X-User-Id` or IP).

Gateway security (in-repo `SecurityConfig`) still applies before routing:

| Path pattern | Rule |
|--------------|------|
| `/public/**` | permitAll |
| `/kyc/callback` | permitAll |
| `/api/admin/**` | `hasRole("ADMIN")` |
| everything else | authenticated JWT |

---

## auth-service (`:9000`)

### Public application endpoints

#### POST `/user/register`

| | |
|--|--|
| **Purpose** | Create a user with BCrypt password |
| **Auth** | Public (`SecurityBeanConfig`) |
| **Body** | `RegisterRequest` JSON |

| Field | Type | Validation in code |
|-------|------|--------------------|
| `username` | string | none |
| `password` | string | none (encoded on save) |
| `branchId` | string | none |
| `employeeCode` | string | none |
| `phoneNumber` | string | none |
| `email` | string | none |

**Success:** returns the persisted `User` entity JSON (includes password hash — security concern).  
**Errors:** unchecked exceptions → default Spring error response (typically 500).

Illustrative request:

```json
{
  "username": "jdoe",
  "password": "<plaintext-password>",
  "branchId": "4201",
  "employeeCode": "E1001",
  "phoneNumber": "+15551234567",
  "email": "jdoe@example.com"
}
```

#### POST `/auth/login`

| | |
|--|--|
| **Purpose** | Verify password; generate OTP; send SMS + email |
| **Auth** | Public |
| **Params** | `userName`, `password` (`@RequestParam`) |
| **Headers** | `X-Device-Id` (stored with OTP metadata; required later for token) |

**Success:** `200` body `"OTP sent"`.  
**Failures:** `"Account locked. Try After 15 minutes"`, `"Invalid Credential"` as `RuntimeException`.

#### POST `/auth/login-success`

| | |
|--|--|
| **Purpose** | Write successful login audit |
| **Auth** | Public |
| **Params** | `userName` |

#### POST `/auth/login-failure`

| | |
|--|--|
| **Purpose** | Write failed login audit |
| **Auth** | Public |
| **Params** | `userName`, `reason` |

Note: `AuditService.logFailure` does not persist `reason` into the entity in the current implementation.

### Admin endpoints (JWT + `ROLE_ADMIN`)

| Method | Path | Response body |
|--------|------|---------------|
| POST | `/admin/rbac/role/{roleId}/permission/{permissionId}` | `"permission assigned successfully"` |
| DELETE | `/admin/rbac/role/{roleId}/permission/{permissionId}` | `"permission removed successfully"` |
| POST | `/admin/user-role/user/{userId}/role/{roleId}` | `"role assigned successfully"` |
| DELETE | `/admin/user-role/user/{userId}/role/{roleId}` | `"Role Removed successfully"` |

### OAuth 2 Authorization Server (framework + custom grant)

Custom code customizes the **token endpoint** for `grant_type=otp`. Other AS endpoints exist via Spring Authorization Server defaults.

#### POST `/oauth2/token` (custom grant `otp`)

| | |
|--|--|
| **Purpose** | Exchange verified OTP for JWT access token |
| **Client auth** | Registered client `api-gateway` (secret configured in `ClientConfig` — rotate; do not reuse committed values) |
| **Params** | `grant_type=otp`, `username`, `otp` |
| **Headers** | `X-Device-Id` must match Redis metadata from login; IP must match |

**JWT custom claims:** `userId` (Long), `authorities` (list of role + permission names).  
**Access token TTL:** 3 hours (client token settings).

Illustrative token request (form body; client authentication per AS defaults):

```http
POST /oauth2/token
Content-Type: application/x-www-form-urlencoded
X-Device-Id: device-abc-001

grant_type=otp&username=jdoe&otp=123456
```

Illustrative success shape (standard OAuth2 access token response; field names framework-standard):

```json
{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "expires_in": 10800
}
```

#### Other AS endpoints (framework defaults; not customized in controllers)

| Endpoint | Purpose |
|----------|---------|
| `GET /oauth2/jwks` | Public JWK set for resource servers |
| `GET /.well-known/oauth-authorization-server` | Metadata |
| `POST /oauth2/introspect`, `POST /oauth2/revoke`, `GET /oauth2/authorize` | Standard AS (present via framework) |

---

## customer-service (`:8082`)

All mapped endpoints use OAuth2 resource server defaults (JWT required). No `permitAll` in this module.

### POST `/customers`

| | |
|--|--|
| **Purpose** | Create customer for JWT user |
| **Auth** | JWT |
| **Body** | `CustomerRequest`: `name`, `phone`, `email` |

Annotations `@NotBlank` / `@Email` exist on DTO but controller does **not** use `@Valid`.

**Response `CustomerResponse`:** `id`, `name`, `email`, `phone`, `status`.

Illustrative:

```json
{
  "name": "Jane Doe",
  "phone": "+15559876543",
  "email": "jane@example.com"
}
```

### GET `/customers/internal`

| | |
|--|--|
| **Purpose** | Internal customer + KYC status by user id |
| **Auth** | JWT (same as other endpoints; no mTLS/service account) |
| **Query** | `userId` (Long) |
| **Response** | `CustomerDto`: `id`, `status`, `kycStatus` |

Used by account-service Feign client.

### KYC endpoints (`KycController`)

| Method | Path | Input | Response |
|--------|------|-------|----------|
| POST | `/kyc/{customerId}` | JSON `KycDetails` (`panNumber`, `aadharNumber`, …) | Persisted `KycDetails` entity |
| POST | `/kyc/verify_pan` | Query `pan` | Raw Setu response string |
| GET | `/kyc/digilocker` | — | Raw Setu response string |
| GET | `/kyc/callback` | Query `id`, `success`, `scope` | `"user denied consent"` or `"callback received"` |
| GET | `/kyc/status/{id}` | Path Setu request id | Raw Setu status string |

**Gateway note:** DigiLocker redirect is hardcoded to `http://localhost:8080/api/kyc/callback`. With the verified customer route + `StripPrefix=1`, that becomes `GET /kyc/callback` on customer-service. Gateway security permits `/kyc/callback` (no `/api` prefix), so unauthenticated callback access may still fail if clients hit `/api/kyc/callback` while only `/kyc/callback` is permitAll.

---

## account-service (`:8083`)

Security: `/actuator/**` permitAll; else authenticated JWT. Method security enabled.

### POST `/accounts`

| | |
|--|--|
| **Purpose** | Open account for authenticated user |
| **Auth** | JWT + `@PreAuthorize("hasAuthority('CREATE_ACCOUNT')")` |
| **Headers** | Optional `X-Device-Id` (passed through; not audited today) |
| **Body** | `CreateAccountRequest` |

| Field | Type | Notes |
|-------|------|-------|
| `accountType` | enum | `SAVING` or `CURRENT` (`AccountType`) |
| `intialDeposit` | BigDecimal | Typo in field name; min 1000 enforced in validator |

**Response `AccountResponse`:** `accountNumber`, `type`, `balance`, `status`.

Business prerequisites: customer ACTIVE and KYC VERIFIED.

### GET `/accounts/internal`

| | |
|--|--|
| **Purpose** | Service-to-service account snapshot |
| **Auth** | JWT only (no specific authority) |
| **Query** | `accountNumber` |
| **Response** | `AccountDto`: `accountNumber`, `balance`, `status` |

### POST `/accounts/internal/update-balance`

| | |
|--|--|
| **Purpose** | Set account balance (absolute) |
| **Auth** | JWT only |
| **Body** | `BalanceUpdateRequest`: `accountNumber`, `newBalance`, `transactionType` |
| **Response** | empty |

---

## transaction-service (`:8084`)

### POST `/transactions`

| | |
|--|--|
| **Purpose** | Debit or credit a single account |
| **Auth** | JWT + `@PreAuthorize("hasAuthority('TRANSFER_MONEY')")` |
| **Headers** | Optional `X-Device-Id` |
| **Body** | `TransactionRequest` |

| Field | Type | Rules |
|-------|------|-------|
| `referenceId` | string | Idempotency key if present |
| `accountNumber` | string | Target account |
| `amount` | BigDecimal | Must be ≤ 50000 |
| `type` | enum | `DEBIT` or `CREDIT` |

**Response `TransactionResponse`:** `txnId`, `status`, `amount`.

Illustrative:

```json
{
  "referenceId": "ref-2026-0001",
  "accountNumber": "4201100123456789",
  "amount": 1500.00,
  "type": "CREDIT"
}
```

Illustrative success:

```json
{
  "txnId": "3f2a0c8e-....",
  "status": "SUCCESS",
  "amount": 1500.00
}
```

Failure path marks transaction `FAILED` and throws `RuntimeException("Transaction failed: ...")`.

### POST `/transactions/reverse/{txnId}`

| | |
|--|--|
| **Purpose** | Reverse a SUCCESS transaction by opposite type |
| **Auth** | JWT authenticated; **no** `@PreAuthorize` |
| **Path** | `txnId` |
| **Response** | `TransactionResponse` wrapped in `ResponseEntity.ok` |

Errors: txn not found; only SUCCESS can be reversed.

---

## api-gateway (`:8080`)

No `@RestController` endpoints in the module. Runtime routes, JWT JWK URI, Redis, Eureka client, rate limiter, and Actuator exposure come from `api-gateway-dev.yml` (see [Client paths via api-gateway](#client-paths-via-api-gateway-8080) and [external-config/api-gateway-dev.yml](external-config/api-gateway-dev.yml)).

| Setting | Value in `api-gateway-dev.yml` |
|---------|--------------------------------|
| JWT `jwk-set-uri` | `http://auth-service:9000/oauth2/jwks` |
| Redis | `redis:6379` |
| Rate limit | replenishRate `5`, burstCapacity `10` |
| Actuator | `health`, `info`, `prometheus` |
| Eureka | `http://eureka-server:8761/eureka` |

---

## config-server (`:8888`)

HTTP Basic for all requests. Serves Spring Cloud Config properties from Git. Actuator: `/actuator/health`, `/actuator/info`, `/actuator/metrics` (still behind Basic auth per security config).

## eureka-server (`:8761`)

Eureka dashboard/API (unsecured in code). Clients register at `/eureka`.

---

## Endpoint classification summary

| Class | Examples |
|-------|----------|
| Public | `/user/register`, `/auth/**`, gateway `/public/**`, `/kyc/callback` |
| User JWT | Most customer/account/transaction APIs |
| Admin JWT | auth `/admin/**`, gateway `/api/admin/**` |
| Internal (but JWT-gated) | `/customers/internal`, `/accounts/internal*` |

There is **no** separate machine-to-machine credential path for internal APIs beyond reusing the caller JWT.
