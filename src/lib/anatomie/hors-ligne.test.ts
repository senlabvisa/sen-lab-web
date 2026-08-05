/**
 * Disponibilité hors ligne des pièces de l'atlas.
 *
 * Le Cache Storage est simulé par une simple Map : ce qu'on vérifie ici n'est
 * pas le comportement du navigateur mais nos décisions à nous — le
 * séquencement des téléchargements (surtout pas en parallèle sur une connexion
 * lente), le refus d'annoncer un mode hors ligne inexistant, et le fait qu'un
 * organe en échec n'interrompe pas les huit autres.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cacheDisponible,
  estimerEspace,
  fichiersOrgane,
  formaterOctets,
  organeEnCache,
  organesEnCache,
  oublierOrgane,
  telechargerOrgane,
  telechargerTousLesOrganes,
} from './hors-ligne';

/** Cache Storage minimal : un ensemble d'URL rangées par nom de cache. */
function faireCaches() {
  const magasins = new Map<string, Set<string>>();
  return {
    magasins,
    api: {
      async match(url: string) {
        for (const contenu of magasins.values()) {
          if (contenu.has(url)) return { ok: true } as Response;
        }
        return undefined;
      },
      async keys() {
        return [...magasins.keys()];
      },
      async open(nom: string) {
        if (!magasins.has(nom)) magasins.set(nom, new Set());
        const contenu = magasins.get(nom)!;
        return {
          async delete(url: string) {
            return contenu.delete(url);
          },
        };
      },
    },
  };
}

let faux: ReturnType<typeof faireCaches>;
let urlsDemandees: string[];
/** URL que le réseau doit refuser, pour simuler une coupure. */
let urlsEnEchec: Set<string>;

beforeEach(() => {
  faux = faireCaches();
  urlsDemandees = [];
  urlsEnEchec = new Set();

  vi.stubGlobal('window', { caches: faux.api });
  vi.stubGlobal('caches', faux.api);
  vi.stubGlobal('navigator', {
    // Un service worker qui CONTRÔLE la page : c'est lui qui rangera les
    // réponses dans le cache.
    serviceWorker: { controller: {} },
    storage: { estimate: async () => ({ usage: 12_582_912, quota: 100_000_000 }) },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      urlsDemandees.push(url);
      if (urlsEnEchec.has(url)) return { ok: false, status: 503 } as Response;
      // Le service worker est simulé : on range nous-mêmes ce qu'il aurait rangé.
      const cache = faux.magasins.get('senlab-atlas') ?? new Set<string>();
      cache.add(url);
      faux.magasins.set('senlab-atlas', cache);
      return { ok: true, status: 200 } as Response;
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fichiersOrgane', () => {
  it('liste le modèle et les cinq planches', () => {
    const fichiers = fichiersOrgane('coeur');
    expect(fichiers).toHaveLength(6);
    expect(fichiers[0]).toBe('/anatomie/modeles/coeur.glb');
    expect(fichiers).toContain('/anatomie/images/coeur/microscopic.webp');
  });
});

describe('cacheDisponible', () => {
  it('exige un service worker qui contrôle la page', () => {
    expect(cacheDisponible()).toBe(true);

    // En développement le service worker est désactivé : promettre un mode
    // hors ligne serait un mensonge, puisque rien n'intercepterait les requêtes.
    vi.stubGlobal('navigator', { serviceWorker: { controller: null } });
    expect(cacheDisponible()).toBe(false);
  });
});

describe('telechargerOrgane', () => {
  it('demande les six fichiers et rapporte la progression', async () => {
    const etapes: Array<{ faits: number; total: number }> = [];
    await telechargerOrgane('coeur', (p) => etapes.push({ ...p }));

    expect(urlsDemandees).toHaveLength(6);
    // Une première notification à 0 pour que la barre apparaisse tout de suite.
    expect(etapes[0]).toEqual({ faits: 0, total: 6 });
    expect(etapes.at(-1)).toEqual({ faits: 6, total: 6 });
  });

  it('force le passage par le réseau, sinon le cache ne serait jamais rafraîchi', async () => {
    await telechargerOrgane('coeur');
    const appels = vi.mocked(fetch).mock.calls;
    for (const [, init] of appels) {
      expect((init as RequestInit).cache).toBe('reload');
    }
  });

  it('échoue explicitement si un fichier est refusé', async () => {
    urlsEnEchec.add('/anatomie/images/coeur/organ.webp');
    await expect(telechargerOrgane('coeur')).rejects.toThrow(/organ\.webp/);
  });

  it('rend ensuite l’organe reconnu comme disponible hors ligne', async () => {
    expect(await organeEnCache('coeur')).toBe(false);
    await telechargerOrgane('coeur');
    expect(await organeEnCache('coeur')).toBe(true);
  });
});

describe('organeEnCache', () => {
  it('reste faux tant qu’un seul fichier manque', async () => {
    await telechargerOrgane('coeur');
    await oublierOrgane('coeur');
    expect(await organeEnCache('coeur')).toBe(false);

    // Un organe partiellement téléchargé s'ouvrirait sans ses planches :
    // on ne l'annonce donc pas comme disponible.
    const cache = faux.magasins.get('senlab-atlas')!;
    fichiersOrgane('coeur')
      .slice(0, 5)
      .forEach((url) => cache.add(url));
    expect(await organeEnCache('coeur')).toBe(false);
  });
});

describe('telechargerTousLesOrganes', () => {
  it('saute les organes déjà emportés', async () => {
    await telechargerOrgane('coeur');
    urlsDemandees.length = 0;

    await telechargerTousLesOrganes();

    // Huit organes restants × six fichiers.
    expect(urlsDemandees).toHaveLength(48);
    expect(urlsDemandees).not.toContain('/anatomie/modeles/coeur.glb');
  });

  it('poursuit malgré un organe en échec et le signale', async () => {
    urlsEnEchec.add('/anatomie/modeles/cerveau.glb');

    const echecs = await telechargerTousLesOrganes();

    expect(echecs).toEqual(['cerveau']);
    // Les huit autres sont bien allés au bout.
    expect((await organesEnCache()).sort()).toEqual(
      ['coeur', 'foie', 'intestin', 'oeil', 'pancreas', 'peau', 'poumons', 'reins'].sort(),
    );
  });

  it('annonce chaque organe pendant le téléchargement', async () => {
    const vus: string[] = [];
    await telechargerTousLesOrganes((p) => vus.push(p.organeId));
    expect(vus[0]).toBe('coeur');
    expect(new Set(vus).size).toBe(9);
  });
});

describe('oublierOrgane', () => {
  it('retire les six fichiers de tous les caches', async () => {
    await telechargerOrgane('coeur');
    await telechargerOrgane('foie');

    await oublierOrgane('coeur');

    expect(await organeEnCache('coeur')).toBe(false);
    expect(await organeEnCache('foie')).toBe(true);
  });
});

describe('estimerEspace', () => {
  it('rapporte l’espace utilisé et le quota', async () => {
    expect(await estimerEspace()).toEqual({ utilise: 12_582_912, quota: 100_000_000 });
  });

  it('renvoie null quand le navigateur ne sait pas estimer', async () => {
    vi.stubGlobal('navigator', { serviceWorker: { controller: {} } });
    expect(await estimerEspace()).toBeNull();
  });
});

describe('formaterOctets', () => {
  it('choisit une unité lisible et la virgule décimale française', () => {
    expect(formaterOctets(512)).toBe('512 o');
    expect(formaterOctets(2048)).toBe('2 Ko');
    expect(formaterOctets(12_582_912)).toBe('12,0 Mo');
  });
});
