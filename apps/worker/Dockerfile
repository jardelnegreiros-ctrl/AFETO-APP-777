# Docker image for the Worker service
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY apps/worker/package.json apps/worker/package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/worker/ .
RUN npm run build

# Production image, copy all the files and run the worker
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY apps/worker/src ./src
COPY apps/worker/package.json ./

EXPOSE 3001
CMD ["node", "dist/index.js"]