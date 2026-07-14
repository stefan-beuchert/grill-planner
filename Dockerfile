# syntax=docker/dockerfile:1
# Development image. Vercel builds production separately from source —
# this Dockerfile exists so nobody needs Node/npm installed on the host.
FROM node:24-slim

WORKDIR /app

# Prisma's engine needs OpenSSL to be present explicitly on Debian slim images.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
# --mount=type=cache keeps npm's package cache and Prisma's engine-download
# cache in a BuildKit cache (reused across builds, never shipped in the
# image) instead of being committed into this layer — without it, both
# caches get baked in permanently and never read again after this RUN.
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/root/.cache \
    npm ci

# Playwright's own npm postinstall downloads the headless Chromium binary,
# but the Debian OS-level shared libraries it links against (glib, nss,
# X11/Xrender/Xrandr, pango, cairo, gbm, xvfb, fonts, etc.) aren't present
# on this slim base image — install-deps apt-get installs exactly what the
# installed Playwright version needs for Chromium on Debian bookworm. Must
# run after `npm ci` (it shells out to the local playwright CLI in
# node_modules), so it can't be folded into the OpenSSL apt-get step above.
RUN npx playwright install-deps chromium && rm -rf /var/lib/apt/lists/*

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
