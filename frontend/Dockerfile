FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies first (cache-friendly)
COPY package.json package-lock.json ./
RUN npm install

# Copy source
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

FROM node:22-alpine AS runner

RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production

COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
