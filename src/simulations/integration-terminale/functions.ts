/**
 * Modèles mathématiques du TP « Intégration » (Terminale S).
 *
 * Fichier PUR (aucune dépendance three/react) : il est importé à la fois par
 * `module.tsx` (rendu SSR) et par `scene.tsx` (chargé via next/dynamic,
 * ssr:false). Une seule source de vérité pour f, sa primitive F et les
 * sommes de Riemann — impossible que le module et la scène divergent.
 *
 * Convention : toutes les primitives F choisies ici vérifient F(0) = 0,
 * donc ∫₀^b f(x)dx = F(b) − F(0) = F(b) (théorème fondamental).
 */

export type FnKey = 'car' | 'canal' | 'pirogue';

export type LabFunction = {
  key: FnKey;
  /** Nom court du scénario (bouton). */
  label: string;
  /** Situation sénégalaise concrète. */
  context: string;
  /** Écriture de f. */
  expr: string;
  /** Écriture d'une primitive de f (celle qui s'annule en 0). */
  primExpr: string;
  /** Ce que représente l'aire sous la courbe. */
  quantity: string;
  /** Unité de l'intégrale. */
  unit: string;
  /** Unité de l'abscisse. */
  xUnit: string;
  /** Unité de l'ordonnée. */
  yUnit: string;
  /** f prend-elle des valeurs négatives sur [0 ; 3] ? */
  hasNegative: boolean;
  f: (x: number) => number;
  /** Primitive de f telle que F(0) = 0. */
  F: (x: number) => number;
};

export const FUNCTIONS: Record<FnKey, LabFunction> = {
  car: {
    key: 'car',
    label: 'Car rapide',
    context:
      "Un car rapide démarre à la gare de Pikine. Sa vitesse augmente : v(t) = t²/3 (en m/s). L'aire sous la courbe de vitesse donne la distance parcourue.",
    expr: 'f(x) = x²/3',
    primExpr: 'F(x) = x³/9',
    quantity: 'distance parcourue',
    unit: 'm',
    xUnit: 's',
    yUnit: 'm/s',
    hasNegative: false,
    f: (x) => (x * x) / 3,
    F: (x) => (x * x * x) / 9,
  },
  canal: {
    key: 'canal',
    label: 'Canal de Richard-Toll',
    context:
      "On ouvre puis on referme la vanne d'un canal d'irrigation : le débit vaut d(t) = t(3 − t)/2 (en m³/min). L'aire sous la courbe donne le volume d'eau écoulé.",
    expr: 'f(x) = x(3 − x)/2',
    primExpr: 'F(x) = 3x²/4 − x³/6',
    quantity: "volume d'eau écoulé",
    unit: 'm³',
    xUnit: 'min',
    yUnit: 'm³/min',
    hasNegative: false,
    f: (x) => (x * (3 - x)) / 2,
    F: (x) => (3 * x * x) / 4 - (x * x * x) / 6,
  },
  pirogue: {
    key: 'pirogue',
    label: 'Pirogue du Saloum',
    context:
      "Portée par la marée, une pirogue recule d'abord (v < 0) puis repart en avant : v(t) = t² − 2t (en m/s). Ici l'aire est ALGÉBRIQUE : le déplacement peut être négatif.",
    expr: 'f(x) = x² − 2x',
    primExpr: 'F(x) = x³/3 − x²',
    quantity: 'déplacement algébrique',
    unit: 'm',
    xUnit: 's',
    yUnit: 'm/s',
    hasNegative: true,
    f: (x) => x * x - 2 * x,
    F: (x) => (x * x * x) / 3 - x * x,
  },
};

export const FN_KEYS: FnKey[] = ['car', 'canal', 'pirogue'];

/** Valeurs de n proposées à l'élève (convergence visible : 4 → 200). */
export const N_VALUES = [4, 10, 25, 50, 100, 200];

/** Somme de Riemann à gauche : Σ f(a + i·Δx)·Δx, Δx = (b − a)/n. */
export function riemannLeft(f: (x: number) => number, a: number, b: number, n: number): number {
  const dx = (b - a) / n;
  let s = 0;
  for (let i = 0; i < n; i++) s += f(a + i * dx) * dx;
  return s;
}

/** Somme de Riemann à droite : Σ f(a + (i+1)·Δx)·Δx. Encadre l'intégrale avec la somme à gauche. */
export function riemannRight(f: (x: number) => number, a: number, b: number, n: number): number {
  const dx = (b - a) / n;
  let s = 0;
  for (let i = 1; i <= n; i++) s += f(a + i * dx) * dx;
  return s;
}

/** Valeur exacte de ∫ₐ^b f, par le théorème fondamental : F(b) − F(a). */
export function exactIntegral(spec: LabFunction, a: number, b: number): number {
  return spec.F(b) - spec.F(a);
}
