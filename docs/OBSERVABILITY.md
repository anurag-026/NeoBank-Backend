# Observability

NeoBank ships metrics to **Prometheus**, distributed traces to **Grafana Tempo**, and visualises both in **Grafana**. All three run in `docker-compose.yml`; their configuration lives in [`observability/`](../observability/).

```text
 ┌──────────────┐  scrape /actuator/prometheus (15s)  ┌────────────┐
 │ Spring Boot  │◄────────────────────────────────────│ Prometheus │◄──┐ remote-write
 │ services ×7  │                                     └─────┬──────┘   │ (span metrics,
 │              │  OTLP/HTTP :4318 /v1/traces         ┌─────┴──────┐   │  service graph)
 │              │────────────────────────────────────►│   Tempo    │───┘
 └──────────────┘                                     └─────┬──────┘
                                                            │
                                     ┌──────────────────────┴───┐
                                     │ Grafana :3000            │
                                     │ datasources: Prometheus, │
                                     │ Tempo (+ exemplars link) │
                                     └──────────────────────────┘
```

| Component | URL | Image |
|-----------|-----|-------|
| Prometheus | http://localhost:9090 | `prom/prometheus:v2.55.1` |
| Tempo (query API) | http://localhost:3200 | `grafana/tempo:2.6.1` |
| Tempo OTLP receivers | gRPC `:4317`, HTTP `:4318` | |
| Grafana | http://localhost:3000 | `grafana/grafana:11.3.0` |

## Metrics (Prometheus)

Each service includes `spring-boot-starter-actuator` and `micrometer-registry-prometheus` and exposes:

| Endpoint | Purpose |
|----------|---------|
| `/actuator/health` | Liveness/health |
| `/actuator/info` | Build info |
| `/actuator/metrics` | Metric browser |
| `/actuator/prometheus` | Prometheus scrape endpoint |

All metrics carry an `application` tag (= `spring.application.name`). `http.server.requests` publishes histogram buckets, so percentiles can be computed in PromQL.

Scrape targets are defined in [`observability/prometheus/prometheus.yml`](../observability/prometheus/prometheus.yml) (job `neobank-services`). Check them at http://localhost:9090/targets.

Useful queries:

```promql
# request rate per service (excluding actuator)
sum by (application) (rate(http_server_requests_seconds_count{uri!~"/actuator.*"}[1m]))

# p95 latency
histogram_quantile(0.95, sum by (le, application) (rate(http_server_requests_seconds_bucket[5m])))

# 5xx rate
sum by (application, uri) (rate(http_server_requests_seconds_count{status=~"5.."}[5m]))

# service-to-service calls derived from traces by Tempo
traces_service_graph_request_total
```

`/actuator/**` is permitted without authentication in every service so Prometheus can scrape it. On config-server only `/actuator/health`, `/actuator/info` and `/actuator/prometheus` are public; everything else still requires HTTP Basic.

> In production, do not publish actuator ports to the internet — restrict them to the monitoring network or put them on a separate `management.server.port`.

## Distributed tracing (Tempo)

Services use **Micrometer Tracing** with the **OpenTelemetry bridge** (`micrometer-tracing-bridge-otel`) and the OTLP exporter (`opentelemetry-exporter-otlp`). Spans are pushed over OTLP/HTTP to Tempo.

Trace context (W3C `traceparent`) is propagated across:

- **API Gateway → downstream services** (Spring Cloud Gateway, reactor context propagation enabled with `spring.reactor.context-propagation: auto`)
- **OpenFeign** calls between account / transaction / customer services (`feign-micrometer`)
- **Kafka** producers in account-service and transaction-service (`spring.kafka.template.observation-enabled: true`)
- JDBC/Redis are recorded as child spans where Spring instruments them

To keep traces readable, an `ObservationPredicate` in each service (`config/ObservabilityConfig.java`) drops:

- server spans for `/actuator/**` (Prometheus scrapes, health checks),
- client spans to `/eureka/**` (registry polling / heartbeats),
- Spring Security filter-chain spans that would otherwise become orphan root traces for those requests.

### Configuration

| Property | Env variable override | Default |
|----------|----------------------|---------|
| `management.otlp.tracing.endpoint` | `OTLP_TRACING_ENDPOINT` | `http://tempo:4318/v1/traces` |
| `management.tracing.sampling.probability` | `TRACING_SAMPLING_PROBABILITY` | `1.0` (sample everything — lower it in production, e.g. `0.1`) |

Running a service outside Docker? Set `OTLP_TRACING_ENDPOINT=http://localhost:4318/v1/traces`.

### Tempo metrics generator

Tempo's metrics generator ([`observability/tempo/tempo.yml`](../observability/tempo/tempo.yml)) derives RED metrics (`traces_spanmetrics_*`) and the service graph (`traces_service_graph_*`) from spans and remote-writes them to Prometheus. Prometheus runs with `--web.enable-remote-write-receiver` and `--enable-feature=exemplar-storage` for this.

Tempo stores traces locally inside the container (`/tmp/tempo`) with 72 h block retention, so traces are lost when the container is recreated. Use object storage (S3/GCS/Azure) for a persistent setup.

## Logs and trace correlation

Tempo stores **traces, not logs**. Logs still go to each container's stdout (`docker compose logs <service>`), but every line includes the active trace and span IDs:

- Services using Spring Boot's default console pattern print `[<app>] [<traceId>-<spanId>]`.
- account-service uses `logback-spring.xml` with `[%X{traceId},%X{spanId}]`; its (currently unused) Logstash JSON appender also includes MDC.

Copy a `traceId` from a log line and paste it into **Grafana → Explore → Tempo → TraceQL / Trace ID** to see the full request.

> For searchable centralised logs, add **Grafana Loki** (with Promtail/Alloy or the Loki Docker driver) and configure Tempo's *trace to logs* link to Loki. This is not part of the current stack.

## Grafana

Provisioning is in [`observability/grafana/provisioning/`](../observability/grafana/provisioning/):

- **Data sources** — `Prometheus` (uid `prometheus`, default; exemplars link to Tempo) and `Tempo` (uid `tempo`; service map and traces-to-metrics via Prometheus).
- **Dashboard** — [`neobank-services.json`](../observability/grafana/dashboards/neobank-services.json) → *NeoBank - Services Overview*: scrape status, request rate, p95 latency (with exemplars), 4xx/5xx rates, JVM heap, CPU, Hikari pool, Resilience4j circuit-breaker state, and the Tempo service graph.

Login: admin user/password come from `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD` (Grafana's defaults apply when unset — change them for anything beyond local use). Anonymous users get read-only **Viewer** access for local development; disable `GF_AUTH_ANONYMOUS_ENABLED` outside of local use.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Target `DOWN` in Prometheus | Service not started yet, or `/actuator/prometheus` returns 401/404 — confirm the service image was rebuilt after `mvn package` |
| No traces in Tempo | `docker compose logs tempo`; service log for `OtlpHttpSpanExporter` errors; `OTLP_TRACING_ENDPOINT` points to the right host |
| Dashboard panels empty | Generate traffic; check the `Service` variable; time range |
| Grafana "database is locked" on first start | Restart Grafana; if provisioning still fails, `docker compose rm -sf grafana && docker volume rm neobank_grafana-data` |
