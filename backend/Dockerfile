FROM node:22-alpine AS builder

# Force rebuild v2
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Increase Node memory for build
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Debug: show files and try build 
RUN echo "=== Files in /app ===" && ls -la && \
    echo "=== Checking nest CLI ===" && ./node_modules/.bin/nest --version && \
    echo "=== Starting build ===" && pnpm run build

FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3001

# Run migrations then start the app
CMD ["sh", "-c", "node node_modules/typeorm/cli.js migration:run -d dist/config/data-source.js && node dist/main"]
