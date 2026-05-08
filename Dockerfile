# Build context attendu : parent senlabvisa/

FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /workspace

# Shared-types — copie + build (créé le dist/ requis)
COPY sen-lab-shared-types ./sen-lab-shared-types
WORKDIR /workspace/sen-lab-shared-types
RUN pnpm install --no-frozen-lockfile
RUN pnpm build

# Frontend
COPY sen-lab-web /workspace/sen-lab-web
WORKDIR /workspace/sen-lab-web
RUN pnpm install --no-frozen-lockfile

# NEXT_PUBLIC_* doivent être présents au build (Next.js bake les vars publiques)
ARG NEXT_PUBLIC_GATEWAY_URL=http://localhost:3010
ENV NEXT_PUBLIC_GATEWAY_URL=$NEXT_PUBLIC_GATEWAY_URL
RUN pnpm build

FROM node:20-alpine
WORKDIR /workspace/sen-lab-web

COPY --from=builder /workspace/sen-lab-shared-types /workspace/sen-lab-shared-types
COPY --from=builder /workspace/sen-lab-web/.next ./.next
COPY --from=builder /workspace/sen-lab-web/node_modules ./node_modules
COPY --from=builder /workspace/sen-lab-web/public ./public
COPY --from=builder /workspace/sen-lab-web/package.json ./
COPY --from=builder /workspace/sen-lab-web/next.config.mjs ./

# Pas de corepack/pnpm au runtime : on lance directement next via node_modules/.bin
# (évite l'erreur ERR_UNKNOWN_BUILTIN_MODULE node:sqlite avec pnpm 11+ sur Node 20)
ENV PORT=3005
EXPOSE 3005
CMD ["node_modules/.bin/next", "start", "-p", "3005"]
