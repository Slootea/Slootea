FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies first (cache-friendly)
COPY package.json package-lock.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

FROM node:22-alpine AS runner

RUN apk add --no-cache curl

WORKDIR /app

COPY --from=base /app ./

ENV NODE_ENV=production

# Run migrations then start the app
CMD ["sh", "-c", "npx typeorm migration:run -d dist/config/data-source.js && node dist/main"]
