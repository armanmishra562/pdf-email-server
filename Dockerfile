# -------------------------------
# 1️⃣ Builder Stage
# -------------------------------
FROM node:20-bullseye-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
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
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
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