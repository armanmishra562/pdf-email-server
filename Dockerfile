# -------------------------------
# 1️⃣ Builder Stage
# -------------------------------
    FROM node:20-alpine AS builder

    WORKDIR /app
    
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
FROM node:20-alpine AS runner

WORKDIR /app

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