FROM node:22-alpine AS builder

# Force rebuild v2
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build 2>&1 || (cat /app/node_modules/.pnpm/debug.log 2>/dev/null; exit 1)

FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3001

# Run migrations then start the app
CMD ["sh", "-c", "node node_modules/typeorm/cli.js migration:run -d dist/config/data-source.js && node dist/main"]
