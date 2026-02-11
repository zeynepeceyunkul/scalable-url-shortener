# Scalable URL Shortener

A production-style mini-SaaS URL shortener built with **NestJS**, **TypeScript**, **PostgreSQL**, and **Redis**. It demonstrates clean modular architecture, JWT auth, caching, rate limiting, and Docker-based deployment.

## Architecture

- **PostgreSQL**: Source of truth for users and links.
- **Redis**: Cache for hot redirects (`short:{code}` → `originalUrl` with TTL); rate limiting via `INCR`/`EXPIRE` (per-IP and per-user buckets).
- **NestJS**: Modular structure with Auth, Users, and URL modules; thin controllers, logic in services; global validation and JWT guard.

```
                    +----------+
                    |  Client  |
                    +----+-----+
                         |
                         v
                    +----------+
                    |   API    |
                    | (NestJS) |
                    +----+-----+
                         |
         +---------------+---------------+
         v               v               v
   +-----------+   +-----------+   +-----------+
   |  Redis    |   |  Redis    |   | Postgres  |
   |  (cache)  |   | (rate lm) |   |  (data)   |
   +-----------+   +-----------+   +-----------+
```

*(Placeholder: architecture diagram can be designed in [Figma](https://figma.com) or similar.)*

### Scalability considerations

- **Cache hot links**: Redirects read from Redis first; only on cache miss do we hit PostgreSQL, then populate cache with TTL (e.g. 1h).
- **Rate limiting**: Redis-backed per-IP (redirect) and per-user (create link) limits to protect the API and DB.
- **Unique short codes**: Base62 random codes with collision handling (retry with new code) to keep creation reliable under concurrency.

## Tech stack

- **Node.js** + **TypeScript** (NestJS)
- **PostgreSQL** (TypeORM)
- **Redis** (ioredis) — cache + rate limit
- **JWT** (access token)
- **Docker** + **Docker Compose**
- **Jest** (unit tests)
- **GitHub Actions** (CI: lint, test, build)

## Setup

### Using Docker Compose (recommended)

1. Clone and from the project root run:

   ```bash
   docker compose up --build
   ```

2. API is available at **http://localhost:3000**.

**Docker build fails with "TLS handshake timeout" or "failed to resolve source metadata":**  
Docker cannot reach Docker Hub (registry-1.docker.io). Check your internet connection, disable VPN if it blocks Docker Hub, or retry later. You can test with `docker pull node:20-alpine`. If you use a proxy, set it in Docker Desktop (Settings → Resources → Proxies).

### Local development (API on host, DB/Redis in Docker)

1. Start only Postgres and Redis:

   ```bash
   docker compose up -d postgres redis
   ```

2. Copy env and install:

   ```bash
   cp .env.example .env
   npm install
   ```

3. Run the API:

   ```bash
   npm run start:dev
   ```

## Environment variables

See [.env.example](.env.example). Main ones:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API port | `3000` |
| `APP_BASE_URL` | Base URL for short links | `http://localhost:3000` |
| `DATABASE_*` | PostgreSQL connection | see .env.example |
| `REDIS_HOST`, `REDIS_PORT` | Redis connection | `localhost`, `6379` |
| `JWT_SECRET` | JWT signing secret | **Must set in production** |
| `CACHE_REDIRECT_TTL` | Redirect cache TTL (seconds) | `3600` |
| `RATE_LIMIT_REDIRECT` | Redirects per minute per IP | `120` |
| `RATE_LIMIT_CREATE_LINK` | Link creations per minute per user | `30` |

## API endpoints

### Auth (public)

- **POST** `/auth/register` — Register  
  Body: `{ "email": "user@example.com", "password": "password123" }`
- **POST** `/auth/login` — Login  
  Body: `{ "email": "user@example.com", "password": "password123" }`  
  Returns: `{ "accessToken": "<jwt>", "user": { "id", "email", "role" } }`

### Links (authenticated; Bearer token)

- **POST** `/links` — Create short link  
  Body: `{ "originalUrl": "https://example.com", "expiresAt": "2026-12-31T23:59:59Z" }` (expiresAt optional)  
  Returns: `{ "code", "shortUrl", "originalUrl", "expiresAt", "id" }`
- **GET** `/links` — List user's links (optional query: `?page=1&limit=20`)
- **PATCH** `/links/:id` — Update link (owner or admin)  
  Body: `{ "isEnabled": false }` or `{ "expiresAt": "2026-12-31T23:59:59Z" }`

### Redirect (public, rate-limited per IP)

- **GET** `/r/:code` — Redirect to original URL (302). Returns 404 if not found or expired/disabled.

### Example curl

```bash
# Register
curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq -r '.accessToken')

# Create link
curl -s -X POST http://localhost:3000/links \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"originalUrl":"https://example.com"}'

# Redirect (browser or curl -L)
curl -sI http://localhost:3000/r/abc12345
```

## Project structure

```
src/
  app.module.ts
  main.ts
  config/           # app + typeorm config, Redis module
  common/
    guards/         # rate-limit guard
    decorators/     # @CurrentUser, @Public, @RateLimit
  modules/
    auth/           # register, login, JWT strategy
    users/          # user entity + service
    url/            # links CRUD, redirect, cache
test/               # unit tests (Jest)
docker-compose.yml
Dockerfile
.github/workflows/ci.yml
```

## Testing

- Unit tests (no real DB/Redis): `npm run test`
- Coverage: `npm run test:cov`

Tests cover: AuthService (register/login, hashing, token), UrlService (code generation, collision handling, redirect cache hit/miss, enabled/expired), UsersService (create, password hash), RateLimitGuard (allow/429, key prefixes).

## CI

GitHub Actions on push/PR to `main`/`master`: install → lint → test → build.

## License

MIT.
