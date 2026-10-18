# CI/CD (GitHub Actions)

The pipeline is a single workflow, [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml). Dependency updates are handled by [`.github/dependabot.yml`](../.github/dependabot.yml).

```text
 push / PR ─┬─► backend (matrix ×7: mvn verify) ──┐
            ├─► frontend (npm ci, lint, test, build)├─► publish-images (matrix ×7) ─► deploy (optional)
            └─► infra (compose / promtool / JSON) ─┘    main or v*.*.* tag only       DEPLOY_HOST set
```

## Triggers

| Event | CI jobs | Publish images | Deploy |
|-------|---------|----------------|--------|
| Pull request to `main` / `develop` | yes | no | no |
| Push to `develop` | yes | no | no |
| Push to `main` | yes | yes | if configured |
| Push tag `v*.*.*` | yes | yes | if configured |
| Manual (`workflow_dispatch`) | yes | only on `main`/tags | if configured |

Runs for the same ref are grouped; superseded pull-request runs are cancelled.

## CI jobs

### `backend` — one job per service

`config-server`, `eureka-server`, `auth-service`, `customer-service`, `account-service`, `transaction-service`, `api-gateway`.

1. Temurin JDK 21 with Maven dependency cache (keyed on the service POM and `banking-system-parent/pom.xml`).
2. `mvn -B -ntp verify` in the service directory (compiles, runs tests, packages the Spring Boot JAR). The runner's Maven is used because `.mvn/wrapper/maven-wrapper.jar` is not committed.
3. Uploads `target/surefire-reports` (always) and the JAR (`jar-<service>`, 7 days).

Only eureka-server currently has a test (`contextLoads`); the other services have no tests yet, so their job verifies compilation and packaging.

### `frontend`

Node 22 with npm cache → `npm ci` → `npm run lint` (oxlint) → `npm test` (Vitest) → `npm run build`. The `dist/` folder is uploaded as `frontend-dist`. No secrets are needed: Vite variables are public, and the build does not read any.

### `infra`

- `docker compose config --quiet` — Compose file is valid.
- `promtool check config` — Prometheus configuration is valid.
- `jq empty` — Grafana dashboards are valid JSON.

## CD jobs

### `publish-images`

Runs after all CI jobs pass, only for pushes to `main` or `v*.*.*` tags. For each service it downloads the JAR built in CI (so the image contains exactly the tested artifact), then builds the service's `Dockerfile` with Buildx (GitHub Actions layer cache) and pushes to GitHub Container Registry:

```text
ghcr.io/<owner-lowercase>/neobank-<service>
```

Tags (via `docker/metadata-action`):

| Tag | When |
|-----|------|
| `sha-<7 chars>` | always |
| `main` | push to `main` |
| `latest` | push to the default branch |
| `1.2.3`, `1.2` | tag `v1.2.3` |

Authentication uses the built-in `GITHUB_TOKEN` (`packages: write`); no extra secret is required. New GHCR packages are private by default — change visibility in the package settings if needed.

### `deploy` (optional)

Skipped unless the repository (or `production` environment) **variable** `DEPLOY_HOST` is set. It:

1. Copies `docker-compose.yml` and `observability/` to the server over SCP.
2. SSHes in, logs in to GHCR with the job's `GITHUB_TOKEN`, then runs
   `IMAGE_PREFIX=ghcr.io/<owner>/neobank IMAGE_TAG=sha-<sha> docker compose pull && docker compose up -d --no-build --remove-orphans`.

`docker-compose.yml` names every image `${IMAGE_PREFIX:-neobank}-<service>:${IMAGE_TAG:-latest}`, so the same file builds locally and pulls published images on the server.

The job uses the `production` GitHub environment, so you can add required reviewers to gate deployments.

#### Required configuration

| Name | Kind | Description |
|------|------|-------------|
| `DEPLOY_HOST` | Variable | Hostname or IP of the Docker host (enables the job) |
| `DEPLOY_PATH` | Variable (optional) | Directory on the host, default `~/neobank` |
| `DEPLOY_USER` | Secret | SSH user |
| `DEPLOY_SSH_KEY` | Secret | Private key for that user (store only in GitHub Secrets) |

The host needs Docker with the Compose plugin. Application credentials (database passwords, SMTP, Twilio, Setu) currently live in each service's `application.yml`; for a real deployment move them to environment variables or a secrets manager and supply them on the host — never in the workflow file.

## Running the same checks locally

```bash
# backend (per service)
cd account-service && mvn -B verify

# frontend
cd frontend && npm ci && npm run lint && npm test && npm run build

# infrastructure
docker compose config --quiet
docker run --rm -v "$PWD/observability/prometheus:/cfg:ro" --entrypoint promtool \
  prom/prometheus:v2.55.1 check config /cfg/prometheus.yml

# workflow syntax
docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest
```

## Dependabot

Weekly updates for Maven (all modules; Spring/Micrometer/OpenTelemetry/springdoc grouped) and npm; monthly for GitHub Actions and Dockerfile base images.
