/**
 * Progression de l'élève dans l'atlas.
 *
 * Tout est local (IndexedDB) et le reste : l'atlas sert à réviser, pas à être
 * noté. Aucun score n'est envoyé au serveur, contrairement aux TP qui, eux,
 * ouvrent une tentative suivie par l'enseignant.
 *
 * Toutes les fonctions sont tolérantes à l'échec : si IndexedDB est
 * indisponible (navigation privée sur certains navigateurs, quota dépassé),
 * l'atlas doit continuer de fonctionner sans progression plutôt que de planter.
 */

import { getDb, type ProgressionOrgane } from '@/lib/offline-db';
import type { OrganeId } from './organes';

/** `null` si la progression n'est pas lisible (pas de navigateur, IndexedDB HS). */
async function table() {
  try {
    return getDb().atlas;
  } catch {
    return null;
  }
}

/** Enregistre l'ouverture d'une fiche, sans écraser le reste de la progression. */
export async function marquerOrganeVu(organeId: OrganeId): Promise<void> {
  const atlas = await table();
  if (!atlas) return;
  try {
    const existant = await atlas.get(organeId);
    await atlas.put({ ...existant, organeId, vuLe: Date.now() });
  } catch {
    /* la progression est un confort : jamais bloquant */
  }
}

/**
 * Enregistre un résultat de quiz.
 *
 * On ne garde que le MEILLEUR score : un élève qui révise refait le quiz
 * plusieurs fois, et voir son meilleur résultat baisser parce qu'il s'est
 * entraîné une fois de plus serait décourageant — et faux, puisqu'il a bien
 * su répondre au moins une fois.
 */
export async function enregistrerScoreQuiz(
  organeId: OrganeId,
  score: number,
  totalQuestions: number,
): Promise<void> {
  const atlas = await table();
  if (!atlas) return;
  try {
    const existant = await atlas.get(organeId);
    await atlas.put({
      ...existant,
      organeId,
      vuLe: existant?.vuLe ?? Date.now(),
      meilleurScore: Math.max(existant?.meilleurScore ?? 0, score),
      totalQuestions,
      dernierQuizLe: Date.now(),
    });
  } catch {
    /* idem */
  }
}

/** Bascule le marqueur « à revoir » et renvoie sa nouvelle valeur. */
export async function basculerARevoir(organeId: OrganeId): Promise<boolean> {
  const atlas = await table();
  if (!atlas) return false;
  try {
    const existant = await atlas.get(organeId);
    const suivant = !existant?.aRevoir;
    await atlas.put({
      ...existant,
      organeId,
      vuLe: existant?.vuLe ?? Date.now(),
      aRevoir: suivant,
    });
    return suivant;
  } catch {
    return false;
  }
}

export async function lireProgression(organeId: OrganeId): Promise<ProgressionOrgane | null> {
  const atlas = await table();
  if (!atlas) return null;
  try {
    return (await atlas.get(organeId)) ?? null;
  } catch {
    return null;
  }
}

/** Toute la progression, indexée par organe — pour la liste de l'atlas. */
export async function lireToutesProgressions(): Promise<Record<string, ProgressionOrgane>> {
  const atlas = await table();
  if (!atlas) return {};
  try {
    const lignes = await atlas.toArray();
    return Object.fromEntries(lignes.map((ligne) => [ligne.organeId, ligne]));
  } catch {
    return {};
  }
}

/** Remet la progression à zéro (fin d'année, ou appareil partagé entre élèves). */
export async function effacerProgression(): Promise<void> {
  const atlas = await table();
  if (!atlas) return;
  try {
    await atlas.clear();
  } catch {
    /* idem */
  }
}
