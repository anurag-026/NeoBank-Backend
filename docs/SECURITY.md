# Security

This document describes mechanisms **as implemented**. Presence of Spring Security / OAuth dependencies does **not** mean the system is production-hardened.

## Authentication

### Password authentication

- Passwords stored with `BCryptPasswordEncoder` (`SecurityBeanConfig`).
- Login via `POST /auth/login` with `userName` + `password`.
- Lockout: ≥5 failed attempts → `accountNonLocked=false` for 15 minutes.

### OTP second factor

- OTP generated in `OtpService`, stored in Redis with IP + `X-Device-Id` metadata.
- Delivered via Twilio SMS and SMTP email.
- Verified during `grant_type=otp` token request (`OtpAuthenticationProvider`).

### JWT issuance

- Spring Authorization Server issues JWT signed with in-memory RSA JWK (`JwkConfig`).
- Custom claims: `userId`, `authorities`.
- Access token TTL: 3 hours (`ClientConfig`).

### Resource servers

api-gateway, customer-service, account-service, and transaction-service validate JWTs (gateway converter in-repo; domain services configure `jwk-set-uri` to auth-service).

## Authorization

| Rule | Location |
|------|----------|
| Public register + `/auth/**` | auth-service `SecurityBeanConfig` |
| `/admin/**` requires `ROLE_ADMIN` | auth-service |
| Gateway `/public/**`, `/kyc/callback` public | `api-gateway` `SecurityConfig` |
| Gateway `/api/admin/**` requires `ADMIN` | api-gateway |
| `CREATE_ACCOUNT` for `POST /accounts` | `@PreAuthorize` |
| `TRANSFER_MONEY` for `POST /transactions` | `@PreAuthorize` |
| Internal account/customer APIs | Authenticated JWT only — **no service role** |

Authorities in JWT are role names **and** permission names from `CustomUserDetailService`.

## Roles and permissions

Seeded roles/permissions listed in [DATABASE_DOCUMENTATION.md](DATABASE_DOCUMENTATION.md).  
Registration does not assign roles automatically — admin must call user-role APIs.

## Token / session lifecycle

| Item | Behavior |
|------|----------|
| Access token | JWT, ~3h |
| Refresh token | Client settings allow refresh; custom OTP provider returns access token path only — refresh **not verified** as implemented for OTP |
| JWK rotation | New key pair **every auth-service restart** → prior tokens fail validation |
| Redis OTP TTL | 30 minutes; deleted after successful verify |

## Security filters / middleware

- Gateway: correlation ID, request logging, JWT WebFlux filter chain
- Domain services: servlet `SecurityFilterChain` + OAuth2 resource server
- Feign: forwards `Authorization` header

## Input validation

- Sparse: many endpoints lack `@Valid`
- Business checks: deposit minimum, amount limit, balance, account blocked
- KYC callback does not verify signatures/authenticity of Setu callback

## Secrets and environment variables

**Do not commit real secrets.** The repository currently contains sensitive-looking values in:

- Service `application.yml` files (DB, mail, Twilio, Setu, config-server client password)
- `kb/secrets/banking-secret.yml`
- Hardcoded OAuth client secret material in `ClientConfig`

Documented property **names** (use env/secret injection in real deployments):

| Name / area | Purpose |
|-------------|---------|
| `spring.datasource.username` / `password` | DB credentials |
| `spring.mail.username` / `password` | SMTP |
| `twilio.sid` / `token` / `number` | SMS |
| `setu.client-id` / `client-secret` / product IDs | Setu |
| `spring.security.user.*` (config-server) | Config server Basic auth |
| `spring.cloud.config.username` / `password` (gateway) | Config client Basic auth |
| OAuth client secret in `ClientConfig` | Token endpoint client auth |

## CORS / CSRF

- CSRF disabled on auth-service, gateway, and domain security configs inspected.
- No explicit CORS configuration found in the reviewed modules (**unknown** if set externally).

## Protection against common issues — gap analysis

| Concern | Assessment |
|---------|------------|
| Password storage | BCrypt used |
| Brute force | Lockout after 5 failures |
| Token theft | No refresh rotation analysis for OTP path; short-ish access TTL |
| Registration response | Returns password hash in JSON |
| Internal APIs | Any valid JWT can call balance update / reverse |
| Eureka | Unauthenticated registry |
| Config server | Basic auth only; credentials often placeholders or committed |
| PII | PAN/Aadhaar stored in clear text in KYC entity |
| Logging | Token prefix printed in account-service Feign config; OTP/security debug logging enabled in auth YAML |
| Dependency secrets in Git | High risk if values are real |

## Recommended remediation (priority)

1. Remove secrets from Git; inject via env/K8s Secrets/vault; rotate all exposed credentials.
2. Persist and rotate JWKs; do not regenerate ephemeral keys on every boot.
3. Stop returning `User` entity (with hash) from register; return a safe DTO.
4. Restrict `/accounts/internal*` and reverse to service accounts or specific authorities.
5. Secure Eureka and tighten Config Server access; use HTTPS in non-local envs.
6. Complete KYC verification safely; validate DigiLocker callbacks.
7. Align gateway public callback path with DigiLocker redirect.
8. Fix Flyway/entity mismatches that can force unsafe `ddl-auto` workarounds.

## Related

- [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- [CONFIGURATION.md](CONFIGURATION.md)
- [KNOWN_ISSUES_AND_IMPROVEMENTS.md](KNOWN_ISSUES_AND_IMPROVEMENTS.md)
