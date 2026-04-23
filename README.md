# @senlabvisa/web

Frontend Next.js (App Router) + Tailwind + shadcn-style components. PWA offline-first (à activer en Phase 3).

## Pages

- `/` — landing page
- `/login` — identifiant école + mot de passe
- `/dashboard` — affiche l'utilisateur connecté (consomme `/users/me`)

## Dev local

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Le gateway doit tourner sur `http://localhost:3000` (voir `sen-lab-gateway`).
