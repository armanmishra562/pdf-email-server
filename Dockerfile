# -------------------------------
# 1️⃣ Builder Stage
# -------------------------------
FROM node:20-bullseye-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm
RUN pnpm install

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

RUN npx puppeteer browsers install chrome

# Build TypeScript
RUN pnpm build
    
    
# -------------------------------
# 2️⃣ Runner Stage
# -------------------------------
FROM node:20-bullseye-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

# Install production deps
RUN pnpm install --prod

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client AGAIN (important)
RUN npx prisma generate

RUN npx puppeteer browsers install chrome

# Copy built app
COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/server.js"]