# Stage 1: Dependencies using node:22-alpine
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && rm -rf /root/.npm

# Stage 2: Minimal runtime image using alpine 3.21 + Node 22 (<150MB)
FROM alpine:3.21 AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install minimal Node 22 runtime without npm/yarn build tools
RUN apk add --no-cache nodejs \
    && addgroup -S appgroup \
    && adduser -S appuser -G appgroup

# Copy application artifacts with non-root ownership
COPY --from=deps --chown=appuser:appgroup /app/package*.json ./
COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --chown=appuser:appgroup dist ./dist

USER appuser

EXPOSE 3000

CMD ["node", "dist/main"]
