# --- Production image for Google Cloud Run ---
# Uses node:20-slim (Debian/glibc) so Next.js 16 + Turbopack native binaries load
# reliably (Alpine/musl needs extra shims). Next.js standalone output keeps it small.

FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# npm install (not ci) so the Linux build machine can pull platform-specific
# optional deps (e.g. @emnapi/*, @next/swc-linux) the Windows lockfile omits.
RUN npm install --no-audit --no-fund

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN groupadd -r nodejs && useradd -r -g nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]
