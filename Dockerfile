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

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
