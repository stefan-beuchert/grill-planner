# CLAUDE.md

## Project

This project is called **Orbit**.

It is a small web application for organizing private events.

The goal is not to build a sprawling, do-everything platform. It should solve one specific problem really well:

> Organize an event with friends as easily as possible.

The application should be modern, fast, responsive and fun to use.

---

# Tech Stack

Use the following stack unless there is a strong reason not to.

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
    - PostgreSQL
    - Row Level Security
- Prisma ORM
- Zod
- React Hook Form

Deployment target:

- Vercel
- Supabase Free Tier

The application should always remain compatible with free hosting on Vercel and Supabase.

Avoid solutions that require running a dedicated backend server.

---

# Architecture

Keep the project simple.

Use:

- Server Components where appropriate
- Server Actions when possible
- API routes only if necessary
- Clear separation between
    - UI
    - business logic
    - database

Prefer maintainability over cleverness.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for how the app is actually put
together today (data model, auth mechanisms, external services, request
flow) and [PRODUCT.md](./PRODUCT.md) for the product rules/behavior spec.

---

## UI

The application is **mobile-first**.

Assume that more than 90% of users will access the application on their smartphone after opening an invite link in a messaging app.

Desktop support is still required, but every feature should be designed for mobile first.

The UI should feel modern and clean.

Inspired by:

- Linear
- Notion
- Vercel
- Apple

Requirements:

- Mobile-first design
- Fully responsive
- Accessible
- Fast
- Minimal
- Touch-friendly
- Excellent readability outdoors (high contrast)
- Large tap targets (minimum 44x44px)
- Forms should be easy to complete with one hand
- Avoid horizontal scrolling
- Keep important actions within thumb reach
- Optimize for slow mobile connections

Avoid unnecessary animations.

Before implementing any page or feature, ask:

> "Would this be pleasant to use on a phone while standing in a garden with one hand occupied by a drink?"

If the answer is no, redesign it.

---

# Core Features

Version 1 should include:

## Party

- Create party
- Party title
- Date
- Time
- Meeting location
- Optional notes

Each party gets a unique shareable URL.

No user registration.

---

## Participants

Visitors can

- enter their name
- join the party
- edit their own information

---

## Food

Participants can

- choose what they want to eat
- specify quantities
- add custom food items

Examples:

- Pizza
- Salad
- Veggie Skewers
- Cheese Platter

---

## Drinks

Participants can indicate

- beer
- soft drinks
- wine
- other

---

## Driver Coordination

Participants can specify

- driving
- available seats
- need a ride

The UI should clearly show available seats.

---

## Shopping List

Automatically aggregate

Food selections

into

- total quantities
- shopping checklist

The shopping list should update automatically.

---

## Weather

Integrate a weather API.

Display

- weather forecast
- temperature
- rain probability

for the party date.

---

## Maps

Display the meeting location.

Integrate Google Maps or OpenStreetMap.

---

# Future Features

Not part of Version 1.

Possible ideas:

- AI generated shopping list
- AI recipe suggestions
- Cost splitting
- Further languages beyond German/English/Spanish
- Polls
- Push notifications
- Calendar export
- QR invite
- Photo gallery
- SpongeBob-themed party skin/variant — for an upcoming SpongeBob-themed
  grill party. Idea only so far: custom color palette, imagery, and
  copy/tone for that one event. Not scoped yet — no decision on whether
  this is a one-off reskin, a per-party "theme" concept, or something
  else entirely.

---

# Database

Prefer a normalized PostgreSQL schema.

Use migrations.

Avoid unnecessary complexity.

---

# Code Style

Write readable code.

Prefer

- small components
- descriptive names
- explicit typing

Avoid

- giant files
- deeply nested components
- duplicated logic

Refactor when duplication appears.

**Established patterns worth knowing before touching these areas:**

- Server Actions return `{success: true, ...} | {success: false, error?: string}`
  rather than throwing, everywhere. Mutating Prisma calls across every
  `lib/actions/*.ts` file (`item.ts`, `admin.ts`, `party.ts`,
  `participant.ts`, `ride.ts`, `ai-summary.ts`, `receipt.ts`) are wrapped in
  `try/catch` with `console.error("<actionName> failed", {context}, err)` —
  this is now the universal pattern, not just an item.ts/admin.ts
  convention. Keep new/edited actions consistent with it.
- Every user-facing string goes through `t.<namespace>.<key>` —
  `lib/i18n/dictionaries/de.ts` and `en.ts` must be updated together, never
  just one.
- Zod schemas live in `lib/validations/`, never inline in an action or form.
- Server Action names are verb-first camelCase (`setContribution`,
  `addItem`, `joinParty`); validation schema factories are `xSchema`
  (`itemNameSchema`); their inferred types are `XValues` (`ItemNameValues`).
- Components: PascalCase function in a kebab-case file
  (`contribution-list.tsx` exports `ContributionList`).

---

# Development

Whenever implementing a feature:

1. Explain the implementation plan.
2. Implement.
3. Check for obvious issues.
4. If the change affects the data model, an auth mechanism, an external
   service, or how a request flows through the app, update the relevant
   section of [ARCHITECTURE.md](./ARCHITECTURE.md) in the same commit. If
   it changed `prisma/schema.prisma`, also run
   `docker compose exec app npm run docs:generate` to regenerate the Data
   Model section from the schema's own doc-comments — don't hand-edit that
   section. If it changes product-facing behavior/rules, update
   [PRODUCT.md](./PRODUCT.md) too.
5. Suggest improvements if appropriate.

Keep commits small.
Everything should run with Docker Compose.

**Iteration speed: don't restart the containers for ordinary source edits.**
`docker-compose.yml` bind-mounts the repo into the `app` container and Next.js
(Turbopack) watches it directly — saving a file is picked up in place, no
Docker command needed at all. Reach for a heavier command only when the
change actually requires it:

- Edited a `.tsx`/`.ts` file, styles, translations → nothing. Just save.
- Changed `prisma/schema.prisma` → `docker compose exec app npx prisma
  migrate dev` (or `generate`) **then** `docker compose restart app` — the
  running dev server keeps its old in-memory Prisma client otherwise.
- Changed an env var in `docker-compose.yml` → `docker compose restart app`
  (~3s).
- Changed `package.json`/lockfile or the `Dockerfile` → `docker compose build
  app` (only this service needs rebuilding).
- `docker compose down && up` should be rare — it recreates the network and,
  unlike a plain `restart`, is ~5-10x slower. It's for when the stack is
  genuinely in a broken state, not a routine step between edits.

**Testing on your phone (LAN):** `docker-compose.yml` already publishes the
dev server on `0.0.0.0:3000`, so it's reachable from any device on the same
WiFi — no deploy needed. Find the current LAN IP with (PowerShell):

```
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -ne "127.0.0.1" }
```

— look for the real WLAN/Ethernet adapter (not `vEthernet (WSL ...)` or a
VPN adapter like `NordLynx`), then open `http://<that-ip>:3000` on the
phone. It's DHCP-assigned and can change (e.g. after a reboot), so re-run
the lookup if it stops connecting. If the phone still can't reach it on the
same WiFi: check whether a VPN client (e.g. NordVPN) has LAN
access/discovery disabled, and whether the WiFi network is classified
Private in Windows (`Get-NetConnectionProfile`) rather than Public — Docker
Desktop's firewall rule blocks inbound on Public.

On this network, none of the above was enough — LAN access from a phone
stayed unreachable (`ERR_CONNECTION_ABORTED`) even with the network set to
Private, NordVPN fully disconnected, and Windows Firewall confirmed clear
(tested with a plain Python server outside Docker entirely, same result),
which points at router-level client/AP isolation rather than anything in
this repo or on this machine. Not pursued further. **Fallback: check
changes in a browser on this machine itself** (`http://localhost:3000`) —
slower than a phone for the "outdoor readability" gut-check, but everything
else about the fast local loop (hot reload, `/party/demo`) still applies.

**Demo data:** `docker compose exec app npm run db:seed` (re)creates a
fixed party at `/party/demo` with guests, shopping list items (including a
purchased one), things-people-bring items, ride info, and notes already
filled in — safe to re-run any time, it resets to the same known state.
Use this instead of creating a fresh party by hand for routine UI checks.

---

# AI Agent Workflow

For a small, obvious change (a copy tweak, a one-line fix, adding a single
i18n string), just follow the "Development" checklist above directly —
spinning up the full pipeline below is overhead a small change doesn't need.

For a purely cosmetic change — a color, an icon swap, a spacing/margin
value, font size, or similar with no logic/behavior change — just make the
edit directly. Skip typecheck/lint/the test suite/e2e and the
browser-screenshot verification loop; trust the change and let the user
eyeball it live over the LAN dev URL themselves (see "Testing on your
phone" above). The moment a change touches a Server Action, a conditional,
validation, the data model, or anything else that could behave differently
rather than just look different, it's no longer cosmetic and gets the full
treatment from the "Development" checklist above.

For a real feature or bug fix, this repo has seven role-specific subagents
in `.claude/agents/`, each pre-loaded with this project's actual
conventions (not generic advice) so it doesn't have to be re-derived every
session:

```
Feature request
  → Repository Analyst   (only if it's unclear where the change belongs —
                           skip straight to Planner otherwise)
  → Planner               (produces a plan: files, risks, complexity — no edits)
  → Software Engineer     (implements the plan, nothing more)
  → Reviewer              (findings list — report only, doesn't fix)
  → Software Engineer     (addresses findings — same agent, not a debate loop)
  → QA Engineer           (verifies acceptance criteria, adds missing tests,
                           runs the *relevant* validation, not the full suite)
  → Done
```

**DevOps Engineer** and **Documentation Engineer** sit outside this linear
pipeline — invoke them directly for their respective concerns (a
Docker/Compose/CI change, a docs-only update), not as a stage every feature
passes through. Most features never touch either.

| Agent | Use for |
|---|---|
| `repository-analyst` | "Where does X live?" / "How does Y work?" — fast, read-only |
| `planner` | Turning a feature request into files-to-touch + risks + complexity |
| `software-engineer` | Implementing a planned change |
| `reviewer` | Reviewing a diff before it's considered done |
| `qa-engineer` | Checking acceptance criteria, writing/running tests |
| `devops-engineer` | Docker, Compose, build/test infra, CI |
| `docs-engineer` | Keeping CLAUDE.md / ARCHITECTURE.md / PRODUCT.md / README.md current |

Each stage should produce one focused output for the next stage to act on —
not an extended back-and-forth. If a reviewer/QA finding requires real
back-and-forth debate about approach, that's a signal to stop and involve
the person driving the session, not to loop the agents against each other.

---

# Dependencies

Only introduce dependencies when they provide significant value.

Avoid dependency bloat.

---

# Goal

This project exists to:

- learn modern full-stack development
- learn AI-assisted software engineering
- build something people will actually use
- provide an excellent mobile experience for organizing an event with friends

Prioritize developer experience, mobile usability and code quality over feature count.


# AI Collaboration

Assume the developer wants to learn.

Do not immediately write large amounts of code.

Before implementing larger features:

- explain the design
- discuss trade-offs
- point out potential pitfalls

Prefer incremental implementation.

If a feature is becoming too large, suggest breaking it into smaller milestones.

Act like a senior software engineer mentoring another engineer, not like a code generator.
