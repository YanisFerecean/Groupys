FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG APP_ENV=prod
ARG NEXT_PUBLIC_APP_ENV=prod
ENV APP_ENV=$APP_ENV
ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV
RUN --mount=type=cache,target=/app/.next/cache \
    --mount=type=secret,id=RESEND_API_KEY \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" \
    RESEND_API_KEY="$(cat /run/secrets/RESEND_API_KEY 2>/dev/null || echo '')" \
    APP_ENV="$APP_ENV" \
    NEXT_PUBLIC_APP_ENV="$NEXT_PUBLIC_APP_ENV" \
    npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV APP_ENV=prod
ENV NEXT_PUBLIC_APP_ENV=prod
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
