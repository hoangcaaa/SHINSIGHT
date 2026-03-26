FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# NEXT_PUBLIC_* vars must be present at build time (inlined by Next.js)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APTOS_NETWORK
ARG NEXT_PUBLIC_MODULE_ADDRESS
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APTOS_NETWORK=$NEXT_PUBLIC_APTOS_NETWORK
ENV NEXT_PUBLIC_MODULE_ADDRESS=$NEXT_PUBLIC_MODULE_ADDRESS

RUN npm run build

FROM node:20-slim
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy standalone output and static/public assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
