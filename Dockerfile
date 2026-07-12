# Development image. Vercel builds production separately from source —
# this Dockerfile exists so nobody needs Node/npm installed on the host.
FROM node:24-slim

WORKDIR /app

# Prisma's engine needs OpenSSL to be present explicitly on Debian slim images.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json ./
COPY prisma ./prisma
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
