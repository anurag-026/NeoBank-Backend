# Testing

## Frameworks

| Module | Test dependency | Framework |
|--------|-----------------|-----------|
| eureka-server | `spring-boot-starter-test` | JUnit (Spring Boot Test) |
| Other services | **No** `src/test` trees found; most POMs omit test starter | — |

## Existing tests

### `eureka-server`

Path: `eureka-server/src/test/java/com/bank/eurekaserver/EurekaServerApplicationTests.java`

- Annotation: `@SpringBootTest`
- Method: `contextLoads()` — verifies application context starts

**Execution status:** Not run during documentation generation. Pass/fail is **unknown**.

## Test directory structure

```
eureka-server/src/test/java/com/bank/eurekaserver/
  EurekaServerApplicationTests.java
```

No unit/integration/e2e suites under auth, customer, account, transaction, gateway, or config-server.

## How to run tests

```powershell
cd d:\Projects\NeoBank\eureka-server
.\mvnw.cmd test
```

## Test environment configuration

No dedicated `application-test.yml` or Testcontainers setup found. The Eureka context-load test uses the main configuration (may require network resources depending on auto-config).

## Mocking and test data

None observed — no Mockito-based tests, no fixtures, no Flyway test profiles.

## Coverage reports

No JaCoCo (or similar) configuration found in parent/module POMs. Coverage: **unknown / unavailable**.

## Missing test areas (recommended)

Priority suggestions grounded in code risk:

1. **auth-service:** login lockout, OTP verify IP/device binding, token claims, RBAC admin
2. **transaction-service:** debit/credit limits, idempotency by `referenceId`, reversal rules, failure → FAILED status
3. **account-service:** validator rules, account number generation, balance update semantics
4. **customer-service:** duplicate customer, KYC status transitions, null KYC on internal get
5. **api-gateway:** security path matchers; route integration once config is available
6. **Flyway:** migration uniqueness and entity/table name alignment
7. **Contract tests** for Feign clients (`CustomerClient`, `AccountClient`)

## Statement on test results

Automated tests were **not executed** as part of this documentation task. Do not assume they pass.
