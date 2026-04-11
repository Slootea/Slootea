FROM node:22-alpine AS base

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable

# Install dependencies first (cache-friendly)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable

COPY --from=base /app ./

ENV NODE_ENV=production

# Run migrations then start the app
CMD ["sh", "-c", "pnpm typeorm migration:run -d dist/config/data-source.js && node dist/main"]
