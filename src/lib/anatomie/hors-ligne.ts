/**
 * Disponibilité hors-ligne des pièces de l'atlas.
 *
 * Un organe pèse 2 à 6 Mo : bien trop pour être précaché à l'installation du
 * service worker (c'est pourquoi `next.config.mjs` exclut `public/anatomie` du
 * précache). L'élève ou l'enseignant choisit donc, organe par organe, ce qu'il
 * emporte — typiquement sur le wi-fi de l'école, avant un cours sans connexion.
 *
 * Le stockage n'est pas fait ici : on se contente de DEMANDER les fichiers. Le
 * service worker les intercepte et sa règle `CacheFirst` les range dans le
 * Cache Storage. Aucun nom de cache n'est donc codé en dur de ce côté, et
 * `caches.match()` interroge tous les caches, quel que soit leur nom.
 */

import { ORGANES, imageUrl, modeleUrl, type OrganeId } from './organes';

/** Tout ce qu'il faut pour explorer un organe sans réseau. */
export function fichiersOrgane(id: OrganeId): string[] {
  return [
    modeleUrl(id),
    imageUrl(id, 'thumb'),
    imageUrl(id, 'organ'),
    imageUrl(id, 'microscopic'),
    imageUrl(id, 'compare'),
    imageUrl(id, 'location'),
  ];
}

/**
 * Le cache est-il utilisable ?
 *
 * On exige un service worker qui CONTRÔLE la page, pas seulement une API
 * disponible : sans lui, les requêtes ne sont interceptées par personne et le
 * téléchargement ne stockerait rien — on promettrait un hors-ligne inexistant.
 * C'est le cas en développement, où le service worker est désactivé.
 */
export function cacheDisponible(): boolean {
  return (
    typeof window !== 'undefined' &&
    'caches' in window &&
    'serviceWorker' in navigator &&
    navigator.serviceWorker.controller !== null
  );
}

/** L'organe est-il déjà entièrement disponible hors ligne ? */
export async function organeEnCache(id: OrganeId): Promise<boolean> {
  if (!cacheDisponible()) return false;
  try {
    const reponses = await Promise.all(fichiersOrgane(id).map((url) => caches.match(url)));
    return reponses.every(Boolean);
  } catch {
    return false;
  }
}

export type ProgressionTelechargement = {
  /** Fichiers déjà récupérés. */
  faits: number;
  total: number;
};

/**
 * Télécharge les fichiers d'un organe pour qu'ils soient disponibles hors ligne.
 * Les requêtes sont séquentielles : sur une connexion lente, six téléchargements
 * en parallèle se gênent et la progression n'avance plus du tout pendant
 * plusieurs dizaines de secondes.
 *
 * @throws si un fichier ne peut pas être récupéré (réseau coupé en cours).
 */
export async function telechargerOrgane(
  id: OrganeId,
  onProgress?: (progression: ProgressionTelechargement) => void,
): Promise<void> {
  const fichiers = fichiersOrgane(id);
  let faits = 0;
  onProgress?.({ faits, total: fichiers.length });

  for (const url of fichiers) {
    // `cache: 'reload'` force un passage par le réseau : c'est ce passage que
    // le service worker intercepte pour ranger une copie fraîche.
    const reponse = await fetch(url, { cache: 'reload' });
    if (!reponse.ok) throw new Error(`Téléchargement impossible : ${url} (${reponse.status})`);
    faits += 1;
    onProgress?.({ faits, total: fichiers.length });
  }
}

/** Libère la place prise par un organe. */
export async function oublierOrgane(id: OrganeId): Promise<void> {
  if (!cacheDisponible()) return;
  const noms = await caches.keys();
  const cibles = fichiersOrgane(id);
  await Promise.all(
    noms.map(async (nom) => {
      const cache = await caches.open(nom);
      await Promise.all(cibles.map((url) => cache.delete(url)));
    }),
  );
}

/** Combien d'organes sont déjà emportés, sur les neuf. */
export async function organesEnCache(): Promise<OrganeId[]> {
  if (!cacheDisponible()) return [];
  const etats = await Promise.all(
    ORGANES.map(async (organe) => ((await organeEnCache(organe.id)) ? organe.id : null)),
  );
  return etats.filter((id): id is OrganeId => id !== null);
}

export type ProgressionSeance = {
  /** Organe en cours de téléchargement. */
  organeId: OrganeId;
  /** Organes terminés. */
  faits: number;
  total: number;
};

/**
 * Prépare une séance entière : tous les organes qui manquent encore.
 *
 * Pensé pour l'enseignant qui branche la tablette sur le wi-fi de l'école la
 * veille du cours. Les organes déjà en cache sont sautés, et le téléchargement
 * reste séquentiel — sur une connexion lente, neuf téléchargements simultanés
 * se gênent et aucun n'aboutit.
 *
 * @returns les organes qui ont échoué, pour pouvoir les reproposer.
 */
export async function telechargerTousLesOrganes(
  onProgress?: (progression: ProgressionSeance) => void,
): Promise<OrganeId[]> {
  const dejaLa = new Set(await organesEnCache());
  const aFaire = ORGANES.map((o) => o.id).filter((id) => !dejaLa.has(id));
  const echecs: OrganeId[] = [];

  for (const [index, organeId] of aFaire.entries()) {
    onProgress?.({ organeId, faits: index, total: aFaire.length });
    try {
      await telechargerOrgane(organeId);
    } catch {
      // Un organe manquant ne doit pas interrompre les huit autres : on note
      // l'échec et on continue.
      echecs.push(organeId);
    }
  }

  onProgress?.({ organeId: aFaire[aFaire.length - 1] ?? 'coeur', faits: aFaire.length, total: aFaire.length });
  return echecs;
}

export type EspaceDisque = {
  /** Octets utilisés par l'application entière, atlas compris. */
  utilise: number;
  /** Quota accordé par le navigateur, si connu. */
  quota: number | null;
};

/**
 * Place occupée par l'application sur l'appareil.
 *
 * Le navigateur ne détaille pas cache par cache : la valeur couvre tout le
 * stockage du site. C'est suffisant pour répondre à la seule question qui
 * compte ici — « est-ce que je peux encore emporter des organes ? ».
 */
export async function estimerEspace(): Promise<EspaceDisque | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    return { utilise: usage ?? 0, quota: quota ?? null };
  } catch {
    return null;
  }
}

/** Formate des octets pour un affichage court : « 12,4 Mo ». */
export function formaterOctets(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}
