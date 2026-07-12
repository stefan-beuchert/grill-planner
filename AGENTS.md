# AGENTS.md

## Project

This project is called **Grill Planner**.

It is a small web application for organizing private BBQ/grill parties.

The goal is not to build a generic event management platform. It should solve one specific problem really well:

> Organize a grill party with friends as easily as possible.

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

- Steak
- Sausage
- Veggie Burger
- Halloumi

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
- Polls
- Push notifications
- Calendar export
- QR invite
- Photo gallery

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

---

# Development

Whenever implementing a feature:

1. Explain the implementation plan.
2. Implement.
3. Check for obvious issues.
4. Suggest improvements if appropriate.

Keep commits small.
Everything should run with Docker Compose.

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
- provide an excellent mobile experience for organizing a BBQ with friends

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