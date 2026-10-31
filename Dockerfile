# --- Stage 1: Frontend build (named build context "frontend", see docker-compose.prod.yml) ---
FROM node:20-alpine AS web
WORKDIR /web
COPY --from=frontend package.json package-lock.json ./
RUN npm ci
COPY --from=frontend . .
RUN npm run build

# --- Stage 2: Backend builder (also used by the dev compose and the prod "migrate" job) ---
FROM node:20-alpine AS builder
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# --- Stage 3: Production runner ---
FROM node:20-alpine AS runner
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NODE_ENV=production \
    APP_HOST=0.0.0.0 \
    APP_PORT=3000 \
    APP_FRONTEND_MODE=spa \
    SPA_DIST_PATH=/app/frontend
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
COPY --from=web /web/dist ./frontend

RUN addgroup -S toproc && adduser -S toproc -G toproc
USER toproc

# Runtime paths (BO/, src/config, src/locales) are resolved from the cwd, so run from dist/
WORKDIR /app/dist
EXPOSE 3000
CMD ["node", "src/index.js"]
