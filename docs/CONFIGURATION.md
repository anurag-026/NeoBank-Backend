# Configuration Reference

Values shown as placeholders. **Do not copy real secrets from YAML into docs or commits.**

## Global / Compose infrastructure

| Variable / setting | Purpose | Required | Example placeholder | Consumed by |
|--------------------|---------|----------|---------------------|-------------|
| `POSTGRES_DB` | Database name | Yes (Compose) | `authdb` / `customerdb` / … | Postgres containers |
| `POSTGRES_USER` | DB user | Yes | `postgres` | Postgres containers |
| `POSTGRES_PASSWORD` | DB password | Yes | `<db-password>` | Postgres containers |
| Redis host/port | Cache / OTP | Yes for auth/customer/account | `redis` / `6379` | Services via Spring Redis |
| `KAFKA_*` env on Kafka container | Broker config | Yes for account/txn | see Compose | Kafka |
| Network `banking-network` | Service DNS | Yes for most apps | bridge | Compose services |

## config-server

| Property | Purpose | Required | Default / file value | Notes |
|----------|---------|----------|----------------------|-------|
| `server.port` | Listen port | No | `8888` | |
| `spring.application.name` | App name | Yes | `config-server` | |
| `spring.security.user.name` | Basic auth user | Yes | placeholder in YAML | Protect all endpoints |
| `spring.security.user.password` | Basic auth password | Yes | placeholder in YAML | |
| `spring.cloud.config.server.git.uri` | Config Git repo | Yes | `https://github.com/HindiCodeClass/banking-config-repo` | Partial mirror under `docs/external-config/` |
| `spring.cloud.config.server.git.default-label` | Branch | Yes | `main` | |
| `spring.cloud.config.server.git.clone-on-start` | Eager clone | No | `true` | |
| `spring.cloud.config.server.git.timeout` | Clone timeout seconds | No | `10` | |
| `management.endpoints.web.exposure.include` | Actuator | No | health, info, metrics | |

## eureka-server

| Property | Purpose | File value |
|----------|---------|------------|
| `server.port` | Registry port | `8761` |
| `eureka.client.register-with-eureka` | Self-register | `false` |
| `eureka.client.fetch-registry` | Fetch registry | `false` |

## api-gateway

### Bootstrap (in-repo `application.yml`)

| Property | Purpose | Required | Notes |
|----------|---------|----------|-------|
| `spring.application.name` | `api-gateway` | Yes | Config file name key remotely |
| `spring.config.import` | Config server URL | Yes for routes | `optional:configserver:http://config-server:8888` |
| `spring.cloud.config.username` | Config Basic user | Yes if server secured | Must match config-server user |
| `spring.cloud.config.password` | Config Basic password | Yes if server secured | Treat as secret |
| `spring.profiles.active` | Profile | Yes | `dev` → loads remote `api-gateway-dev.yml` |

### Remote `api-gateway-dev.yml` (verified; mirrored in docs)

| Property | Purpose | Value / notes |
|----------|---------|---------------|
| `server.port` | Gateway port | `8080` |
| `spring.security.oauth2.resourceserver.jwt.jwk-set-uri` | JWT validation | `http://auth-service:9000/oauth2/jwks` |
| `spring.data.redis.host` / `port` | Rate limiter store | `redis` / `6379` |
| `spring.cloud.gateway.default-filters` RequestRateLimiter | Global rate limit | replenishRate `5`, burstCapacity `10` |
| `spring.cloud.gateway.routes[*]` | Path → service | See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) |
| `eureka.client.service-url.defaultZone` | Discovery | `http://eureka-server:8761/eureka` |
| `management.endpoints.web.exposure.include` | Actuator | `health,info,prometheus` |
| `logging.level.org.springframework.cloud.gateway` | Debug | `DEBUG` |
| `logging.level.com.bank.apigateway` | Debug | `DEBUG` — package in code is `com.bank.gateway` (logger name mismatch) |

## auth-service

| Property | Purpose | Required | Example |
|----------|---------|----------|---------|
| `server.port` | HTTP | Yes | `9000` |
| `spring.datasource.url` | JDBC | Yes | `jdbc:postgresql://postgres-auth:5432/authdb` |
| `spring.datasource.username` | DB user | Yes | `<db-user>` |
| `spring.datasource.password` | DB password | Yes | `<db-password>` |
| `spring.jpa.hibernate.ddl-auto` | Schema mode | Yes | `validate` |
| `spring.flyway.enabled` | Migrations | Yes | `true` |
| `spring.flyway.locations` | Scripts | Yes | `classpath:/db/migration` |
| `spring.data.redis.host` | OTP store | Yes | `redis` |
| `spring.data.redis.port` | OTP store | Yes | `6379` |
| `spring.mail.host` / `port` | SMTP | Yes for email OTP | `smtp.example.com` / `587` |
| `spring.mail.username` / `password` | SMTP auth | Yes for email OTP | secrets |
| `spring.mail.properties.mail.smtp.auth` | SMTP | No | `true` |
| `spring.mail.properties.mail.smtp.starttls.enable` | SMTP | No | `true` |
| `twilio.sid` / `token` / `number` | SMS OTP | Yes for SMS | secrets |
| `eureka.client.service-url.defaultZone` | Discovery | Yes | `http://eureka-server:8761/eureka` |
| `logging.level.[org.springframework.security]` | Debug | No | `debug` |

**Code-level (not YAML):** OAuth client id/secret and TTLs in `ClientConfig.java`.

## customer-service

| Property | Purpose | Required | Example |
|----------|---------|----------|---------|
| `server.port` | HTTP | Yes | `8082` |
| `spring.datasource.url` | JDBC | Yes | `jdbc:postgresql://postgres-customer:5432/customerdb` |
| `spring.datasource.username` / `password` | DB | Yes | Must match Compose (`postgres` / `<password>`) — YAML placeholders may mismatch |
| `spring.jpa.hibernate.ddl-auto` | Schema | Yes | `update` |
| `spring.security.oauth2.resourceserver.jwt.jwk-set-uri` | JWT trust | Yes | `http://auth-service:9000/oauth2/jwks` |
| `spring.cache.type` | Cache | Yes | `redis` |
| `spring.cache.redis.time-to-live` | TTL ms | No | `300000` |
| `spring.data.redis.host` / `port` | Cache | Yes | `redis` / `6379` |
| `eureka.client.service-url.defaultZone` | Discovery | Yes | Eureka URL |
| `setu.base-url` | Setu API | Yes for Setu | sandbox URL |
| `setu.client-id` / `client-secret` | Setu auth | Yes for Setu | secrets |
| `setu.pan-product-id` / `digilocker-product-key` | Product instances | Yes for Setu | secrets |

## account-service

### In-repo `application.yml` (used when not overridden by Config Server)

| Property | Purpose | Required | Example |
|----------|---------|----------|---------|
| `server.port` | HTTP | Yes | `8083` |
| Datasource / JPA / Flyway | Persistence | Yes | postgres-account / `accountdb` |
| `spring.security.oauth2.resourceserver.jwt.jwk-set-uri` | JWT | Yes | auth JWKS |
| `spring.kafka.bootstrap-servers` | Kafka | Yes | `kafka:9092` |
| Kafka producer serializers / `spring.json.trusted.packages` | Serialization | Yes | `*` trusted packages in YAML |
| Redis + cache TTL | Caching | Yes | host `redis` |
| Eureka defaultZone | Discovery | Yes | Eureka URL |

**Code-level:** Redisson address `redis://redis:6379` in `RedissonConfig` (hardcoded).  
**Logback:** Logstash host `logstash:5000` in `logback-spring.xml`.

### Remote `account-service-dev.yml` (verified; mirrored in docs)

| Property | Purpose | Value | Conflict notes |
|----------|---------|-------|----------------|
| `server.port` | HTTP | `8082` | Collides with **customer-service** local port `8082`; differs from in-repo `8083` |
| `spring.datasource.url` | JDBC | `jdbc:postgresql://localhost:5432/account_db` | Differs from Compose `postgres-account` / `accountdb` |
| `spring.datasource.username` / `password` | DB auth | `account_user` / `account_pwd` | Differs from Compose `postgres` / Compose password |
| `spring.jpa.hibernate.ddl-auto` | Schema | `validate` | Same intent as local |
| `spring.jpa.show-sql` | SQL log | `false` | |
| `redis.host` / `redis.port` | Redis | `localhost` / `6379` | **Non-standard keys** — Spring Boot expects `spring.data.redis.*` unless custom binder exists (none found in account-service) |

**Important:** account-service’s in-repo YAML does **not** set `spring.config.import` for Config Server. Remote `account-service-dev.yml` applies only if the service is started as a config client with profile `dev`.

## transaction-service

| Property | Purpose | Required | Example |
|----------|---------|----------|---------|
| `server.port` | HTTP | Yes | `8084` |
| Datasource / Flyway / JPA | Persistence | Yes | postgres-transaction |
| JWT `jwk-set-uri` | Auth | Yes | auth JWKS |
| Kafka bootstrap | Events | Yes | `kafka:9092` |
| Resilience4j `accountService` instance | CB/retry/bulkhead/timelimiter | Configured in YAML | window 10, 50% failure, 30s open, 5s TL, 3 retries, bulkhead 20 |
| Eureka | Discovery | Yes | Eureka URL |

## Kubernetes ConfigMap / Secret (`kb/`)

ConfigMap `banking-config` keys:

- `REDIS_HOST`
- `EUREKA_URL`
- `KAFKA_BOOTSTRAP_SERVER`
- `AUTH_JWK_URI`

Secret `banking-secret` holds Postgres, mail, and Twilio keys as `stringData` — **rotate and avoid committing real values**.

## Environment-specific considerations

| Environment | Notes |
|-------------|-------|
| Docker Compose | Hostnames like `postgres-auth`, `redis`, `eureka-server`, `kafka` |
| Local JVM outside Compose | Replace hosts with `localhost` and mapped ports; Kafka advertised listener may not work for host clients |
| Gateway | Requires reachable config-server **and** cloneable Git config repo |
| Auth restart | Invalidates JWTs due to new JWK |

## Properties files

Most modules also have nearly empty `application.properties` setting only `spring.application.name`. Prefer `application.yml` as source of truth.
