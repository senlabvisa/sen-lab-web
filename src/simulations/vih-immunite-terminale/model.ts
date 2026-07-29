/**
 * Modèle numérique de l'infection par le VIH — partagé par `module.tsx` et `scene.tsx`.
 *
 * Aucune dépendance three.js ici : le module (hors Canvas) peut donc importer
 * les mêmes fonctions que la scène 3D, sans que les deux courbes ne divergent.
 *
 * Ordres de grandeur retenus (valeurs de référence des manuels de Terminale S) :
 *  • lymphocytes T CD4+ (T4) d'une personne non infectée : 500 à 1500 /mm³ ;
 *  • pic de charge virale de la primo-infection : ~10⁶–10⁷ copies/mL vers la
 *    4ᵉ–6ᵉ semaine ;
 *  • plateau (« set point ») après la primo-infection : ~10⁴ copies/mL, qui
 *    remonte lentement pendant la phase asymptomatique ;
 *  • perte moyenne de T4 sans traitement : ~60 à 90 /mm³ par an ; le seuil
 *    SIDA (200 T4/mm³) est franchi en moyenne au bout de 8 à 10 ans ;
 *  • sous antirétroviraux : charge virale indétectable (< 50 copies/mL) en
 *    quelques mois, et remontée progressive des T4 (jusqu'à ~+300 en 2–3 ans).
 */

export const MOIS_MAX = 120; // 10 ans de suivi
export const SEUIL_SIDA = 200; // T4/mm³ — stade SIDA
export const SEUIL_INDETECTABLE = 50; // copies/mL — seuil d'indétectabilité
export const CD4_NORMAL_MIN = 500;
export const CD4_NORMAL_MAX = 1500;

// Bornes des deux axes verticaux du graphe
export const CD4_AXE_MAX = 1200;
export const LOG_CV_MIN = 1;
export const LOG_CV_MAX = 7;
export const LOG_INDETECTABLE = Math.log10(SEUIL_INDETECTABLE); // ≈ 1,70

/** Bornes du curseur « début du traitement » (en mois). */
export const ARV_DEBUT_MIN = 6;
export const ARV_DEBUT_MAX = 108;

export type Phase = 'primo' | 'asymptomatique' | 'sida' | 'controlee';

export const PHASE_LABEL: Record<Phase, string> = {
  primo: 'Primo-infection',
  asymptomatique: 'Phase asymptomatique',
  sida: 'Stade SIDA',
  controlee: 'Infection contrôlée',
};

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

// ──────────────────────────────────────────────────────────────────────
// Évolution naturelle (aucun traitement)
// ──────────────────────────────────────────────────────────────────────

/** log₁₀ de la charge virale (copies/mL) sans traitement, `mois` après la contamination. */
export function logChargeViraleNaturelle(mois: number): number {
  if (mois <= 0) return LOG_INDETECTABLE;
  // Pic explosif de la primo-infection : montée brutale, décroissance plus lente
  // (maximum ≈ 10^6,6 copies/mL vers la 5ᵉ–6ᵉ semaine).
  const sigma = mois < 1.3 ? 0.5 : 1.15;
  const pic = Math.pow(10, 6.6 * Math.exp(-((mois - 1.3) ** 2) / (2 * sigma * sigma)));
  // Plateau viral (« set point ») ≈ 10^4,3, qui remonte lentement sur 10 ans
  const plateau = Math.pow(10, (4.3 + 0.9 * (mois / MOIS_MAX)) * (1 - Math.exp(-mois / 1.1)));
  return clamp(Math.log10(pic + plateau), LOG_INDETECTABLE, LOG_CV_MAX);
}

/** Taux de lymphocytes T4 (/mm³) sans traitement, `mois` après la contamination. */
export function cd4Naturel(mois: number): number {
  if (mois <= 0) return 1000;
  // Chute transitoire pendant la primo-infection, puis rebond partiel
  const r = mois / 1.6;
  const creux = 430 * r * r * Math.exp(2 * (1 - r));
  // Destruction lente et continue des T4 pendant la phase asymptomatique
  const declin = 6 * mois + 0.012 * mois * mois;
  return clamp(1000 - creux - declin, 15, CD4_NORMAL_MAX);
}

// ──────────────────────────────────────────────────────────────────────
// Effet des antirétroviraux (ARV)
// ──────────────────────────────────────────────────────────────────────

/** log₁₀ de la charge virale avec (ou sans) trithérapie démarrée au mois `debut`. */
export function logChargeVirale(mois: number, traitement: boolean, debut: number): number {
  const naturelle = logChargeViraleNaturelle(mois);
  if (!traitement || mois <= debut) return naturelle;
  // Les ARV bloquent la réplication : ~1 log de moins par mois jusqu'au seuil
  const base = logChargeViraleNaturelle(debut);
  return Math.max(LOG_INDETECTABLE, base - (mois - debut) * 1.1);
}

/** Taux de T4 avec (ou sans) trithérapie démarrée au mois `debut`. */
export function cd4(mois: number, traitement: boolean, debut: number): number {
  if (!traitement || mois <= debut) return cd4Naturel(mois);
  const socle = cd4Naturel(debut);
  const plafond = Math.min(1000, socle + 350); // reconstitution immunitaire
  return clamp(socle + (plafond - socle) * (1 - Math.exp(-(mois - debut) / 14)), 15, CD4_NORMAL_MAX);
}

/** Premier mois où les T4 passent sous 200/mm³ ; `null` si le seuil n'est jamais franchi. */
export function moisSida(traitement: boolean, debut: number): number | null {
  for (let m = 3; m <= MOIS_MAX; m += 0.5) {
    if (cd4(m, traitement, debut) < SEUIL_SIDA) return m;
  }
  return null;
}

/** Stade de l'infection au mois donné. */
export function phaseDe(mois: number, traitement: boolean, debut: number): Phase {
  if (mois <= 3) return 'primo';
  const t4 = cd4(mois, traitement, debut);
  if (t4 < SEUIL_SIDA) return 'sida';
  if (traitement && mois > debut) return 'controlee';
  return 'asymptomatique';
}

// ──────────────────────────────────────────────────────────────────────
// Mise en forme
// ──────────────────────────────────────────────────────────────────────

const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

function exposant(n: number): string {
  return String(n)
    .split('')
    .map((c) => SUP[Number(c)] ?? c)
    .join('');
}

/** « 4,0 × 10⁶ » ou « < 50 (indétectable) ». */
export function formatCharge(logCv: number): string {
  if (logCv <= LOG_INDETECTABLE + 0.02) return '< 50 (indétectable)';
  const e = Math.floor(logCv);
  const mantisse = Math.pow(10, logCv - e);
  return `${mantisse.toFixed(1).replace('.', ',')} × 10${exposant(e)}`;
}

/** « 3 ans 4 mois », « 8 mois », « 2 ans ». */
export function formatDuree(mois: number): string {
  const total = Math.round(mois);
  const ans = Math.floor(total / 12);
  const reste = total - ans * 12;
  if (ans === 0) return `${reste} mois`;
  const a = `${ans} an${ans > 1 ? 's' : ''}`;
  return reste === 0 ? a : `${a} ${reste} mois`;
}
