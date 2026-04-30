# sen-lab-web

> 🎨 **Frontend PWA Sen Lab Visa** — Next.js 14 + Tailwind + Framer Motion.

**Port** : `13050` (mappé sur 3005 dans le container) · Connexion au backend via [`sen-lab-gateway`](https://github.com/senlabvisa/sen-lab-gateway) sur `:3010`.

---

## Stack

- **Next.js 14** (App Router) + React 18
- **Tailwind CSS** avec design system custom (palette violet/lavender skillzone-style)
- **Framer Motion** pour les animations fluides (particules atomiques, stagger, transitions de routes)
- **PWA** via `@ducanh2912/next-pwa` — installable + cache des simulations
- **Dexie** (IndexedDB) pour le mode hors-ligne (essentiel au Sénégal)
- **Lucide-React** pour les icônes
- **TypeScript strict**

---

## Pages principales

| Route | Rôle | Description |
|---|---|---|
| `/` | tous | Landing page avec atome rotatif animé |
| `/login` | tous | Connexion par identifiant + mot de passe |
| `/dashboard` | tous (auth) | Hub principal avec stats animées + top TPs |
| `/student/tps` | élève | Catalogue des TPs assignés et libres |
| `/student/join` | élève | Rejoindre une classe avec code |
| `/tp/[slug]` | élève | **Page de manip 3 colonnes** (étapes / simu / chat encadrant) |
| `/teacher/classes` | enseignant | Mes classes |
| `/teacher/classes/[id]` | enseignant | Détail classe + assignations + élèves |
| `/teacher/classes/[id]/dashboard` | enseignant | Analytics de la classe |
| `/teacher/attempts` | enseignant | Tentatives à corriger |
| `/teacher/attempts/[id]` | enseignant | Évaluation détaillée d'une tentative |
| `/admin/users` | admin/sysadmin | Gestion des utilisateurs |
| `/admin/schools` | sysadmin | Gestion des écoles |

---

## Design system (`tailwind.config.ts`)

- **Palette** : `lab-*` (violet/lavender), `night-*` (sidebar dark), accents `peach`/`lilac`/`sky`/`mint`/`rose`/`gold`
- **Gradients** : `lab-gradient`, `lab-mesh`, `lab-page`
- **Ombres** : `lab-card`, `lab-glow`, `lab-soft`
- **Typo** : Outfit (display) + Inter (corps) + JetBrains Mono (data)
- **Animations** : `motion.ts` avec variants standardisés (spring, snappy, smooth, stagger, pageTransition…)

## Composants animés (`src/components/lab/motion/`)

- `<ParticleField>` — atomes/électrons flottants (signature STEM)
- `<StaggerGrid>` + `<StaggerItem>` — apparition en cascade
- `<CounterUp>` — chiffre 0→cible animé en spring
- `<MoleculeLoader>` — noyau pulsant + 3 électrons en orbite
- `<PageTransition>` — fade-up entre routes
- `<AnimatedTabs>` — slide `layoutId` + AnimatePresence
- `<PulseDot>` — double anneau pulsant pour statuts online

---

## Variables d'environnement

```env
# URL gateway accessible depuis le navigateur de l'hôte
NEXT_PUBLIC_GATEWAY_URL=http://localhost:3010
```

⚠️ Cette variable est **bakée au build** (Next.js bake les `NEXT_PUBLIC_*` à la compilation). Il faut donc rebuilder le container web si on change l'URL gateway.

## Lancement local (dev)

```bash
pnpm install
pnpm dev                     # Next dev sur port 3005 (→ http://localhost:3005)
```

## Lancement via Docker (recommandé)

```bash
# Depuis senlabvisa/
./up.sh                      # tout lance, web sur http://localhost:13050
```

---

## Mode hors-ligne (PWA)

Le service worker (configuré dans `next.config.mjs`) cache :
- Les simulations (`/simulations/*`) avec stratégie `NetworkFirst` (7 jours)
- Le profil utilisateur (`/users/me`) avec `NetworkFirst` (1h)

Le `sync-queue` (`src/lib/sync-queue.ts`) :
1. Démarre une tentative TP **localement en IndexedDB** si pas de réseau
2. La rejoue contre l'API au retour de la connexion (Background Sync)

Critique pour le Sénégal où la connectivité est parfois intermittente.

## Lien parent

🔗 [`sen-lab-infra`](https://github.com/senlabvisa/sen-lab-infra) · [`sen-lab-gateway`](https://github.com/senlabvisa/sen-lab-gateway)
