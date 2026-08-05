/**
 * Cohérence des données de l'atlas.
 *
 * Ces tests n'ont pas d'intérêt algorithmique : ils protègent d'erreurs de
 * SAISIE, qui sont ici les plus coûteuses et les plus silencieuses. Une bonne
 * réponse qui ne correspond à aucune option rend la question impossible sans
 * qu'aucune exception ne soit levée ; un slug de TP mal orthographié produit un
 * lien qui mène à une page vide. Personne ne s'en aperçoit avant un élève.
 */

import { readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ORGANES, ORGANE_PAR_ID, organesDuTp, type OrganeId } from './organes';
import { LECONS } from './lecons';
import { QUIZ } from './quiz';
import { VOCABULAIRE } from './vocabulaire';
import { COMPARAISONS } from './comparaisons';

const IDS = ORGANES.map((organe) => organe.id);

describe('catalogue des organes', () => {
  it('expose neuf organes aux identifiants uniques', () => {
    expect(ORGANES).toHaveLength(9);
    expect(new Set(IDS).size).toBe(9);
  });

  it('donne à chaque organe au moins un niveau et trois repères', () => {
    for (const organe of ORGANES) {
      expect(organe.niveaux.length, organe.id).toBeGreaterThan(0);
      expect(organe.pointsInteret.length, organe.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('n’emploie jamais deux fois le même identifiant de repère dans un organe', () => {
    for (const organe of ORGANES) {
      const ids = organe.pointsInteret.map((point) => point.id);
      expect(new Set(ids).size, organe.id).toBe(ids.length);
    }
  });

  it('place les repères dans le cube normalisé de la visionneuse', () => {
    // <Organe3D> inscrit chaque modèle dans un cube d'arête 3,8 centré sur
    // l'origine : un repère au-delà flotterait visiblement à côté de la pièce.
    const demiArete = 3.8 / 2;
    for (const organe of ORGANES) {
      for (const point of organe.pointsInteret) {
        for (const coordonnee of point.position) {
          expect(Math.abs(coordonnee), `${organe.id}/${point.id}`).toBeLessThanOrEqual(demiArete);
        }
      }
    }
  });
});

describe('liens vers les TP', () => {
  // La source de vérité est le dossier des simulations : le registre importe
  // les 88 modules (JSX + three), bien trop lourd à charger dans un test.
  const slugsExistants = new Set(
    readdirSync(path.resolve(__dirname, '../../simulations'), { withFileTypes: true })
      .filter((entree) => entree.isDirectory())
      .map((entree) => entree.name),
  );

  it('ne référence que des TP réellement présents dans le catalogue', () => {
    for (const organe of ORGANES) {
      for (const tp of organe.tpLies) {
        expect(slugsExistants.has(tp.slug), `${organe.id} → ${tp.slug}`).toBe(true);
      }
    }
  });

  it('retrouve les organes d’un TP dans les deux sens', () => {
    const organes = organesDuTp('circulation-sanguine-5eme');
    expect(organes.map((organe) => organe.id)).toContain('coeur');
    expect(organesDuTp('slug-qui-nexiste-pas')).toEqual([]);
  });
});

describe('leçons', () => {
  it('couvre les neuf organes', () => {
    expect(Object.keys(LECONS).sort()).toEqual([...IDS].sort());
  });

  it('fournit accroche, sections rédigées, étapes et points à retenir', () => {
    for (const id of IDS) {
      const lecon = LECONS[id];
      expect(lecon.accroche.length, id).toBeGreaterThan(30);
      expect(lecon.sections.length, id).toBeGreaterThanOrEqual(3);
      expect(lecon.fonctionnement.length, id).toBeGreaterThanOrEqual(4);
      expect(lecon.aRetenir.length, id).toBeGreaterThanOrEqual(3);
      for (const section of lecon.sections) {
        expect(section.paragraphes.length, `${id}/${section.titre}`).toBeGreaterThan(0);
        for (const paragraphe of section.paragraphes) {
          expect(paragraphe.trim().length, `${id}/${section.titre}`).toBeGreaterThan(40);
        }
      }
    }
  });
});

describe('quiz', () => {
  it('couvre les neuf organes avec cinq questions chacun', () => {
    expect(Object.keys(QUIZ).sort()).toEqual([...IDS].sort());
    for (const id of IDS) {
      expect(QUIZ[id].length, id).toBe(5);
    }
  });

  it('associe toujours la bonne réponse à une option existante', () => {
    for (const id of IDS) {
      for (const question of QUIZ[id]) {
        const options = question.options.map((option) => option.id);
        expect(options, `${id}/${question.id}`).toContain(question.bonneReponse);
      }
    }
  });

  it('propose au moins trois options distinctes par question', () => {
    for (const id of IDS) {
      for (const question of QUIZ[id]) {
        expect(question.options.length, `${id}/${question.id}`).toBeGreaterThanOrEqual(3);
        const ids = question.options.map((option) => option.id);
        expect(new Set(ids).size, `${id}/${question.id}`).toBe(ids.length);
        const textes = question.options.map((option) => option.texte);
        expect(new Set(textes).size, `${id}/${question.id}`).toBe(textes.length);
      }
    }
  });

  it('explique chaque réponse', () => {
    for (const id of IDS) {
      for (const question of QUIZ[id]) {
        expect(question.explication.trim().length, `${id}/${question.id}`).toBeGreaterThan(30);
      }
    }
  });

  it('n’emploie jamais deux fois le même identifiant de question', () => {
    for (const id of IDS) {
      const ids = QUIZ[id].map((question) => question.id);
      expect(new Set(ids).size, id).toBe(ids.length);
    }
  });
});

describe('vocabulaire', () => {
  it('définit au moins cinq termes par organe, sans doublon', () => {
    expect(Object.keys(VOCABULAIRE).sort()).toEqual([...IDS].sort());
    for (const id of IDS) {
      const mots = VOCABULAIRE[id];
      expect(mots.length, id).toBeGreaterThanOrEqual(5);
      const termes = mots.map((mot) => mot.terme);
      expect(new Set(termes).size, id).toBe(termes.length);
      for (const mot of mots) {
        expect(mot.definition.trim().length, `${id}/${mot.terme}`).toBeGreaterThan(20);
      }
    }
  });
});

describe('comparaisons', () => {
  it('couvre les neuf organes', () => {
    expect(Object.keys(COMPARAISONS).sort()).toEqual([...IDS].sort());
  });

  it('renvoie vers un organe de référence qui existe et qui n’est pas lui-même', () => {
    for (const id of IDS) {
      const comparaison = COMPARAISONS[id];
      expect(ORGANE_PAR_ID[comparaison.avec], id).toBeDefined();
      expect(comparaison.avec, id).not.toBe(id);
    }
  });

  it('remplit les deux colonnes de chaque ligne', () => {
    for (const id of IDS) {
      const comparaison = COMPARAISONS[id];
      expect(comparaison.lignes.length, id).toBeGreaterThanOrEqual(4);
      for (const ligne of comparaison.lignes) {
        expect(ligne.ici.trim(), `${id}/${ligne.critere}`).not.toBe('');
        expect(ligne.autre.trim(), `${id}/${ligne.critere}`).not.toBe('');
      }
      expect(comparaison.conclusion.trim().length, id).toBeGreaterThan(40);
    }
  });
});

describe('chemins des ressources', () => {
  it('dérive un chemin de modèle et d’image pour chaque organe', async () => {
    const { modeleUrl, imageUrl } = await import('./organes');
    for (const id of IDS as OrganeId[]) {
      expect(modeleUrl(id)).toBe(`/anatomie/modeles/${id}.glb`);
      expect(imageUrl(id, 'thumb')).toBe(`/anatomie/images/${id}/thumb.webp`);
    }
  });
});
