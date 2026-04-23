FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY package.json ./
EXPOSE 3003
CMD ["pnpm", "start"]
