FROM node:22-alpine AS builder

# Force rebuild v4
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Increase Node memory for build
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Debug with semicolons - runs all commands regardless of exit status
RUN echo "=== Files in /app ===" ; \
    ls -la ; \
    echo "=== node version ===" ; \
    node -v ; \
    echo "=== pnpm version ===" ; \
    pnpm -v ; \
    echo "=== node_modules ===" ; \
    ls -la node_modules || echo "node_modules missing" ; \
    echo "=== checking nest ===" ; \
    ./node_modules/.bin/nest --version || echo "nest NOT FOUND" ; \
    echo "=== starting build ===" ; \
    pnpm run build 2>&1 ; \
    BUILD_EXIT=$? ; \
    echo "=== BUILD EXIT CODE: $BUILD_EXIT ===" ; \
    echo "=== AFTER BUILD - finding dist ===" ; \
    find /app -type d -name dist ; \
    echo "=== ls /app after build ===" ; \
    ls -la /app ; \
    echo "=== ls /app/dist ===" ; \
    ls -la /app/dist || echo "dist NOT FOUND" ; \
    exit $BUILD_EXIT

FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3001

# Run migrations then start the app
CMD ["sh", "-c", "node node_modules/typeorm/cli.js migration:run -d dist/config/data-source.js && node dist/main"]
