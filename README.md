# sen-lab-web

> 🎨 **Frontend PWA Sen Lab Visa** — Next.js 14 + Tailwind + Framer Motion.

Laboratoire scientifique virtuel pour les collèges et lycées du Sénégal : 88 TP
de maths, physique-chimie et SVT, plus un atlas anatomique 3D, utilisables sur
téléphone d'entrée de gamme et **sans connexion**.

---

## ⚠️ À lire avant de cloner

**Ce dépôt ne fonctionne pas seul.** Sen Lab Visa est réparti sur **10 dépôts
Git** (un par microservice, plus le front et les types partagés). Cloner
`sen-lab-web` tout seul donne une interface sans serveur : l'écran de connexion
tourne dans le vide.

Deux conséquences que rencontrent tous les nouveaux arrivants :

1. Il faut cloner **tous** les dépôts **côte à côte, dans un même dossier
   parent**. Les chemins relatifs (`file:../sen-lab-shared-types`) en dépendent.
2. Le paquet `sen-lab-shared-types` doit être **compilé avant** que le front
   puisse démarrer : son dossier `dist/` est ignoré par Git, donc absent d'un
   clone frais.

Le [démarrage rapide](#démarrage-rapide-5-minutes) ci-dessous s'occupe des deux.

---

## Prérequis

| Outil | Version | Vérifier | Pourquoi |
|---|---|---|---|
| **Docker Desktop** | à jour, **lancé** | `docker ps` | base de données + les 9 services |
| **Node.js** | **≥ 20** | `node -v` | uniquement pour le mode développement |
| **pnpm** | ≥ 8 | `pnpm -v` | gestionnaire de paquets du projet |
| **Git** | — | `git --version` | |

**Ports qui doivent être libres** : `5432` (Postgres), `3010` (API),
`13050` (web Docker), `3005` (web en dev), `8080` (Traefik).

```bash
lsof -i :3010
```

---

## Démarrage rapide (5 minutes)

Tout passe par Docker : aucune installation de Node, Postgres ou pnpm n'est
nécessaire pour simplement faire tourner l'application.

```bash
mkdir senlabvisa && cd senlabvisa
```

```bash
git clone https://github.com/senlabvisa/sen-lab-infra.git
```

```bash
./sen-lab-infra/scripts/bootstrap.sh
```

`bootstrap.sh` clone les 10 dépôts côte à côte dans le dossier courant. Tu dois
obtenir cette arborescence — **c'est elle qui compte** :

```
senlabvisa/
├── sen-lab-infra/            ← docker-compose + scripts
├── sen-lab-shared-types/     ← DTO partagés (à compiler)
├── sen-lab-gateway/
├── sen-lab-auth-service/
├── sen-lab-users-service/
├── sen-lab-schools-service/
├── sen-lab-classes-service/
├── sen-lab-simulations-service/
├── sen-lab-attempts-service/
├── sen-lab-analytics-service/
└── sen-lab-web/              ← ce dépôt
```

Crée ensuite le fichier d'environnement — sans lui, `up.sh` s'arrête aussitôt :

```bash
cp sen-lab-infra/.env.example sen-lab-infra/.env
```

Puis lance tout :

```bash
./sen-lab-infra/scripts/up.sh
```

Le premier lancement construit neuf images Docker : compte **5 à 15 minutes**
selon la machine et la connexion. Les suivants prennent quelques secondes.

Le script attend que la base soit prête, crée les tables et insère les comptes
de démonstration tout seul. Quand il affiche `Tout est lance.`, ouvre :

**<http://localhost:13050>**

### Comptes de démonstration

L'identifiant contient l'école : c'est `ecole/utilisateur`, pas seulement le nom.

| Rôle | Identifiant | Mot de passe |
|---|---|---|
| Élève | `lycee-limamou/moussa` | `moussa123` |
| Enseignant | `lycee-limamou/diallo` | `diallo123` |
| Admin école | `lycee-limamou/proviseur` | `proviseur123` |
| Sysadmin | `sysadmin/root` | `sysadmin123` |

### Commandes utiles

```bash
./sen-lab-infra/scripts/up.sh logs        # suivre les logs en direct
./sen-lab-infra/scripts/up.sh status      # état des conteneurs
./sen-lab-infra/scripts/up.sh stop        # tout arrêter (données conservées)
./sen-lab-infra/scripts/up.sh seed        # recréer les comptes si la base est vide
./sen-lab-infra/scripts/up.sh users       # lister les comptes existants
./sen-lab-infra/scripts/up.sh rebuild web # reconstruire le seul conteneur web
./sen-lab-infra/scripts/up.sh nuke        # ⚠️ tout supprimer, base comprise
```

Pour taper simplement `./up.sh`, copie le script à la racine :

```bash
cp sen-lab-infra/scripts/up.sh ./up.sh && chmod +x ./up.sh
```

---

## Développer le front (rechargement à chaud)

Le mode Docker reconstruit l'image à chaque modification : trop lent pour
travailler sur l'interface. On lance donc **le back dans Docker** et **le front
en local**.

**1.** Démarre la stack, puis arrête le seul conteneur web — le port 3010 de
l'API doit rester ouvert :

```bash
./sen-lab-infra/scripts/up.sh && docker stop senlab-web
```

**2.** Compile les types partagés. ⚠️ **Étape obligatoire, et la plus souvent
oubliée.** Sans elle, le front échoue sur
`Cannot find module '@senlabvisa/shared-types'` :

```bash
cd sen-lab-shared-types && pnpm install && pnpm build
```

**3.** Lance le front :

```bash
cd ../sen-lab-web && pnpm install && pnpm dev
```

→ **<http://localhost:3005>** (et non 13050, qui est le port du conteneur).

> Si tu modifies `sen-lab-shared-types`, relance son `pnpm build` : le front lit
> son dossier `dist/`, pas ses sources.

### Vérifications avant de proposer une modification

```bash
pnpm exec tsc --noEmit     # types (doit être silencieux)
pnpm test                  # 80 tests
pnpm exec next build       # build de production
```

> `pnpm lint` est déclaré dans `package.json` mais **ESLint n'est pas encore
> configuré** dans ce dépôt : la commande ouvre un assistant interactif au lieu
> de vérifier quoi que ce soit. Ne l'utilise pas tant qu'une configuration n'a
> pas été ajoutée.

---

## En cas de problème

| Symptôme | Cause | Solution |
|---|---|---|
| `Cannot find module '@senlabvisa/shared-types'` | `dist/` absent (ignoré par Git) | `cd ../sen-lab-shared-types && pnpm install && pnpm build` |
| `Erreur : .env introuvable` | fichier d'environnement non créé | `cp sen-lab-infra/.env.example sen-lab-infra/.env` |
| `impossible de localiser docker-compose.yml` | dépôts pas côte à côte | vérifie [l'arborescence](#démarrage-rapide-5-minutes) |
| Renvoyé sans cesse vers `/login` | l'API ne répond pas | `curl http://localhost:3010/users/me`, puis `up.sh logs gateway` |
| « Identifiants incorrects » avec les comptes ci-dessus | base vide, seed échoué | `./up.sh seed` |
| `port is already allocated` | port déjà pris | `lsof -i :3010`, puis libère-le ou change le port dans `.env` |
| Le front en dev ne joint pas l'API | mauvaise URL de passerelle | crée `.env.local` avec `NEXT_PUBLIC_GATEWAY_URL=http://localhost:3010` |
| L'URL d'API ne change pas après édition du `.env` | `NEXT_PUBLIC_*` est figé **au build** | `./up.sh rebuild web` |
| Écran 3D noir ou saccadé | WebGL indisponible ou GPU faible | teste sur <https://get.webgl.org>, mets le navigateur à jour |
| `pnpm: command not found` | pnpm absent | `corepack enable && corepack prepare pnpm@latest --activate` |

Tout réinitialiser en dernier recours — ⚠️ efface la base :

```bash
./sen-lab-infra/scripts/up.sh nuke && ./sen-lab-infra/scripts/up.sh
```

---

## Stack

- **Next.js 14** (App Router) + React 18 + TypeScript strict
- **Tailwind CSS** avec design system maison (palette violet/lavande)
- **Framer Motion** pour les animations d'interface
- **React Three Fiber / three.js** pour les scènes 3D des TP et de l'atlas
- **PWA** via `@ducanh2912/next-pwa` — installable, simulations mises en cache
- **Dexie** (IndexedDB) pour le hors-ligne, essentiel au Sénégal
- **Vitest** pour les tests

---

## Pages principales

| Route | Rôle | Description |
|---|---|---|
| `/` | tous | Page d'accueil publique |
| `/login` | tous | Connexion par identifiant `ecole/utilisateur` |
| `/dashboard` | connecté | Hub principal |
| `/student/tps` | élève | Catalogue des TP, par matière et niveau |
| `/student/join` | élève | Rejoindre une classe avec un code |
| `/tp/[slug]` | élève | Page de manipulation en 5 étapes |
| `/atlas` | élève, enseignant | **Atlas anatomique** — 9 organes en 3D |
| `/atlas/[organe]` | élève, enseignant | Fiche : 3D, leçon, fonctionnement, comparaison, quiz |
| `/teacher/classes` | enseignant | Mes classes |
| `/teacher/classes/[id]/dashboard` | enseignant | Analyse d'une classe |
| `/teacher/attempts` | enseignant | Tentatives à corriger |
| `/admin/users` | admin | Gestion des utilisateurs |
| `/admin/schools` | sysadmin | Gestion des écoles |

---

## Ajouter un TP

Trois étapes, détaillées dans `src/simulations/registry.ts` :

1. créer `src/simulations/<slug>/module.tsx` exportant un composant qui reçoit
   les `SimulationModuleProps` ;
2. l'enregistrer dans `SIMULATION_MODULES` (`registry.ts`) ;
3. créer la simulation correspondante côté back
   (`sen-lab-simulations-service`), avec **le même slug**.

La scène 3D vit dans un fichier séparé, chargé via
`next/dynamic({ ssr: false })` — le WebGL n'a rien à faire côté serveur. Les
briques réutilisables sont dans `src/components/lab3d/` : verrerie, circuits,
molécules, courbes, narration pédagogique, pièces anatomiques.

---

## Atlas anatomique

Section `/atlas` : neuf organes réels (cœur, cerveau, poumons, foie, reins, œil,
intestin, pancréas, peau) à faire tourner, couper et annoter, avec pour chacun
une leçon, un déroulé de fonctionnement, un quiz et une comparaison.

Le composant `<Organe3D>` fait partie du kit `lab3d` : **n'importe quel TP peut
afficher une pièce anatomique réelle** à côté de son schéma — voir
`circulation-sanguine-5eme`, qui bascule entre les deux.

**Les modèles pèsent 31 Mo au total et sont volontairement exclus du précache**
du service worker (`publicExcludes` dans `next.config.mjs`). Sans cette
exclusion, `next-pwa` embarque tout `public/` sans plafond de taille et les
31 Mo partiraient dès l'installation de la PWA. L'élève télécharge donc les
organes à la demande, ou en bloc depuis l'atlas pour préparer une séance.

Ces pièces reproduisent la **forme extérieure** des organes : elles ne
contiennent aucune géométrie interne. La coupe montre l'épaisseur de
l'enveloppe, jamais les cavités — l'interface le dit et renvoie au schéma du TP.

---

## Mode hors-ligne

Ce que le service worker met en cache :

- les simulations (`/simulations/*`) — `NetworkFirst`, 7 jours ;
- le profil (`/users/me`) — `NetworkFirst`, 1 h ;
- les pièces et planches de l'atlas — `CacheFirst`, **à la demande seulement**.

`src/lib/sync-queue.ts` démarre une tentative de TP dans IndexedDB quand le
réseau manque, puis la rejoue contre l'API au retour de la connexion.

> Le mode hors-ligne est **désactivé en développement** (`disable: isDev`).
> Pour le tester, il faut un build de production : `pnpm build && pnpm start`.

---

## Variables d'environnement

```env
# URL de la passerelle, vue depuis le navigateur
NEXT_PUBLIC_GATEWAY_URL=http://localhost:3010
```

⚠️ Next.js fige les variables `NEXT_PUBLIC_*` **au moment du build**. Après
modification, reconstruis : `./up.sh rebuild web`.

---

## Dépôts liés

[`sen-lab-infra`](https://github.com/senlabvisa/sen-lab-infra) (docker + scripts) ·
[`sen-lab-gateway`](https://github.com/senlabvisa/sen-lab-gateway) (API) ·
[`sen-lab-shared-types`](https://github.com/senlabvisa/sen-lab-shared-types) (DTO partagés)
