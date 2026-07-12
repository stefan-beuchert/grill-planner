# Grill Planner

A small, mobile-first app for organizing a BBQ with friends — no accounts,
just a shareable link. See [AGENTS.md](./AGENTS.md) for the full product
and architecture brief.

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
```

Production deploys to Vercel, connecting to a real Supabase Postgres
instance — see `.env.example` for the connection string format used there.
