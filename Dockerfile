FROM node:20-alpine AS base
RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Build Next.js
FROM deps AS builder
ARG GIT_COMMIT=dev
ARG GIT_BUILT_AT=unknown
ENV NEXT_PUBLIC_GIT_COMMIT=$GIT_COMMIT
ENV NEXT_PUBLIC_GIT_BUILT_AT=$GIT_BUILT_AT
COPY . .
RUN npx next build
RUN npx tsc --project tsconfig.server.json

# Production image
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
# node_modules needed for custom server (node-cron, telegram, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

RUN mkdir -p /data && chown nextjs:nodejs /data

USER nextjs
EXPOSE 3000

CMD ["node", "dist/server.js"]
