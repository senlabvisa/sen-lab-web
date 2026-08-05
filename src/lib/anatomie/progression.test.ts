/**
 * Progression locale de l'élève dans l'atlas.
 *
 * On teste contre une vraie base IndexedDB (fake-indexeddb) plutôt qu'un
 * double : la règle qui compte — « ne jamais écraser un bon score par un moins
 * bon » — repose sur une lecture-écriture réelle, et une Map masquerait aussi
 * la migration de schéma v1 → v2.
 */

import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  basculerARevoir,
  effacerProgression,
  enregistrerScoreQuiz,
  lireProgression,
  lireToutesProgressions,
  marquerOrganeVu,
} from './progression';
import { getDb } from '@/lib/offline-db';

beforeEach(async () => {
  await effacerProgression();
});

describe('marquerOrganeVu', () => {
  it('enregistre la visite', async () => {
    await marquerOrganeVu('coeur');
    const progression = await lireProgression('coeur');
    expect(progression?.organeId).toBe('coeur');
    expect(progression?.vuLe).toBeGreaterThan(0);
  });

  it('ne perd pas le score déjà obtenu quand l’élève rouvre la fiche', async () => {
    await enregistrerScoreQuiz('coeur', 4, 5);
    await marquerOrganeVu('coeur');

    const progression = await lireProgression('coeur');
    expect(progression?.meilleurScore).toBe(4);
    expect(progression?.totalQuestions).toBe(5);
  });

  it('ne perd pas le marqueur « à revoir »', async () => {
    await basculerARevoir('coeur');
    await marquerOrganeVu('coeur');
    expect((await lireProgression('coeur'))?.aRevoir).toBe(true);
  });
});

describe('enregistrerScoreQuiz', () => {
  it('garde le meilleur score, jamais le dernier', async () => {
    await enregistrerScoreQuiz('cerveau', 5, 5);
    await enregistrerScoreQuiz('cerveau', 2, 5);

    // Refaire le quiz pour réviser ne doit pas dégrader son meilleur résultat :
    // l'élève a bien su répondre au moins une fois.
    expect((await lireProgression('cerveau'))?.meilleurScore).toBe(5);
  });

  it('met quand même à jour la date de la dernière tentative', async () => {
    await enregistrerScoreQuiz('cerveau', 5, 5);
    const premier = await lireProgression('cerveau');

    // On avance l'horloge par un espion sur Date.now, surtout pas par les faux
    // timers de vitest : ceux-ci gèlent aussi les promesses internes de Dexie,
    // et l'écriture n'aboutirait jamais.
    const plusTard = premier!.dernierQuizLe! + 60_000;
    const horloge = vi.spyOn(Date, 'now').mockReturnValue(plusTard);
    await enregistrerScoreQuiz('cerveau', 1, 5);
    horloge.mockRestore();

    const second = await lireProgression('cerveau');
    expect(second?.dernierQuizLe).toBe(plusTard);
    expect(second?.meilleurScore).toBe(5);
  });

  it('accepte un zéro comme premier score', async () => {
    await enregistrerScoreQuiz('foie', 0, 5);
    const progression = await lireProgression('foie');
    expect(progression?.meilleurScore).toBe(0);
    expect(progression?.totalQuestions).toBe(5);
  });

  it('marque l’organe comme vu même sans passage préalable par la fiche', async () => {
    await enregistrerScoreQuiz('reins', 3, 5);
    expect((await lireProgression('reins'))?.vuLe).toBeGreaterThan(0);
  });
});

describe('basculerARevoir', () => {
  it('bascule dans un sens puis dans l’autre', async () => {
    expect(await basculerARevoir('peau')).toBe(true);
    expect((await lireProgression('peau'))?.aRevoir).toBe(true);

    expect(await basculerARevoir('peau')).toBe(false);
    expect((await lireProgression('peau'))?.aRevoir).toBe(false);
  });
});

describe('lireToutesProgressions', () => {
  it('renvoie une table indexée par organe', async () => {
    await marquerOrganeVu('coeur');
    await enregistrerScoreQuiz('oeil', 4, 5);

    const toutes = await lireToutesProgressions();
    expect(Object.keys(toutes).sort()).toEqual(['coeur', 'oeil']);
    expect(toutes.oeil.meilleurScore).toBe(4);
  });

  it('renvoie un objet vide quand rien n’a encore été consulté', async () => {
    expect(await lireToutesProgressions()).toEqual({});
  });
});

describe('lireProgression', () => {
  it('renvoie null pour un organe jamais ouvert', async () => {
    expect(await lireProgression('pancreas')).toBeNull();
  });
});

describe('robustesse', () => {
  it('ne fait pas planter l’atlas si IndexedDB est indisponible', async () => {
    // Navigation privée, quota dépassé : la progression est un confort, elle ne
    // doit jamais empêcher de consulter une fiche.
    const atlas = getDb().atlas;
    const erreur = new Error('QuotaExceededError');
    vi.spyOn(atlas, 'get').mockRejectedValueOnce(erreur);
    vi.spyOn(atlas, 'put').mockRejectedValueOnce(erreur);

    await expect(marquerOrganeVu('intestin')).resolves.toBeUndefined();

    vi.restoreAllMocks();
  });
});

describe('schéma', () => {
  it('conserve la file de synchronisation à côté de l’atlas', async () => {
    // La migration v1 → v2 ajoute `atlas` sans toucher à `queue`, qui reste le
    // seul canal vers le serveur.
    const db = getDb();
    expect(db.tables.map((table) => table.name).sort()).toEqual(['atlas', 'queue']);
  });
});
