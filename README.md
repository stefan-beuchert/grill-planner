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
The `build` script runs `prisma migrate deploy` before `next build`, so
every deploy applies pending schema migrations to production automatically,
in the correct order (migration first, new code second) — no manual step
needed. If the migration fails, the build fails with it, and Vercel simply
doesn't promote the new deployment — the previous working version stays
live.

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

## CI

`.github/workflows/ci.yml` runs two jobs in parallel on every push to
`main` and every pull request, each against its own ephemeral Postgres
service container: `test` (lint, typecheck, unit test suite) and `e2e`
(builds the app and runs the Playwright golden-path test against it). CI
builds and starts its own server for the e2e job — the manual
`docker compose exec app npm run test:e2e` above (against your local dev
server) is still how you run it locally; nothing about that workflow
changes.
