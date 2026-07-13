# Grill Planner

A small, mobile-first app for organizing a BBQ with friends — no accounts,
just a shareable link. See [CLAUDE.md](./CLAUDE.md) for stack/conventions,
[PRODUCT.md](./PRODUCT.md) for the product spec, and
[ARCHITECTURE.md](./ARCHITECTURE.md) for how it's built.

## Getting started

Everything runs through Docker Compose — no local Node/npm install needed.

```bash
docker compose up
```

This starts:

- `app` — Next.js dev server at http://localhost:3000, hot-reloading via a bind mount
- `db` — a local Postgres 16 instance (throwaway data, persisted in a Docker volume)

The first run builds the image and applies nothing to the database yet — run
migrations once the schema has changes to apply:

```bash
docker compose exec app npx prisma migrate dev
```

Other useful commands:

```bash
docker compose exec app npx prisma studio   # inspect data in the browser
docker compose logs -f app                  # follow app logs
docker compose down                         # stop everything
docker compose down -v                      # stop and wipe local DB data
docker compose exec app npm run docs:generate  # regenerate ARCHITECTURE.md's Data Model section from schema.prisma
```

Production deploys to Vercel, connecting to a real Supabase Postgres
instance — see `.env.example` for the connection string format used there.

## Testing

```bash
docker compose exec app npm run test       # unit tests (Vitest) — real
                                            # queries against grillplanner_test,
                                            # a separate database (see
                                            # docker-compose.yml), never dev data
docker compose exec app npm run test:e2e   # e2e smoke test (Playwright), against
                                            # the running dev server — one-time
                                            # setup below
```

Playwright's browser binary lives in its own named volume, not the image
(keeps the dev image lean) — install it once per environment:

```bash
docker compose exec app npx playwright install --with-deps chromium
```
