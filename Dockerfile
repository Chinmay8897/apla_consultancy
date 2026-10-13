# Multi-stage Dockerfile for APLA Consultancy Invoice Studio
FROM node:20-alpine AS builder

WORKDIR /app

# 1. Build Frontend Static Assets
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2. Prepare Backend & Generate Prisma Client
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate

# 3. Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY --from=builder /app/backend /app/backend
COPY --from=builder /app/frontend/dist /app/frontend/dist

WORKDIR /app/backend
RUN mkdir -p uploads

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push && node src/index.js"]
