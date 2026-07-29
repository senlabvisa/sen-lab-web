/**
 * Géométrie dans l'espace — noyau de calcul EXACT partagé par le module et la scène.
 *
 * Repère orthonormé (A ; i, j, k) attaché au cube unité ABCDEFGH :
 *   A(0;0;0) B(1;0;0) C(1;1;0) D(0;1;0)   (face du bas ABCD)
 *   E(0;0;1) F(1;0;1) G(1;1;1) H(0;1;1)   (face du haut EFGH, E au-dessus de A)
 *
 * Plan (P) : a·x + b·y + c·z + d = 0, de vecteur normal n(a ; b ; c).
 * La section du cube par (P) est calculée en cherchant l'intersection RÉELLE
 * du plan avec chacune des 12 arêtes, puis en ordonnant les points obtenus
 * dans le plan (la section d'un solide convexe est un polygone convexe).
 */

export type V3 = [number, number, number];

export const VERTEX_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

export const CUBE_VERTICES: V3[] = [
  [0, 0, 0], // A
  [1, 0, 0], // B
  [1, 1, 0], // C
  [0, 1, 0], // D
  [0, 0, 1], // E
  [1, 0, 1], // F
  [1, 1, 1], // G
  [0, 1, 1], // H
];

/** Les 12 arêtes du cube (indices de sommets). */
export const CUBE_EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0], // face ABCD
  [4, 5], [5, 6], [6, 7], [7, 4], // face EFGH
  [0, 4], [1, 5], [2, 6], [3, 7], // arêtes verticales
];

const EPS = 1e-7;

/** Valeur de a·x + b·y + c·z + d au point p. */
export function planeValue(a: number, b: number, c: number, d: number, p: V3): number {
  return a * p[0] + b * p[1] + c * p[2] + d;
}

/** Norme du vecteur normal ‖n‖ = √(a² + b² + c²). */
export function normalLength(a: number, b: number, c: number): number {
  return Math.sqrt(a * a + b * b + c * c);
}

/** Distance d'un point M au plan : |a·x₀ + b·y₀ + c·z₀ + d| / √(a² + b² + c²). */
export function distanceToPlane(a: number, b: number, c: number, d: number, m: V3): number {
  const n = normalLength(a, b, c);
  if (n < EPS) return Number.NaN;
  return Math.abs(planeValue(a, b, c, d, m)) / n;
}

/**
 * Intervalle des valeurs de d pour lesquelles le plan coupe réellement le cube.
 * min/max de a·x + b·y + c·z sur [0;1]³ = somme des min/max de chaque terme.
 */
export function cuttingRange(a: number, b: number, c: number): { dMin: number; dMax: number } {
  const lo = Math.min(0, a) + Math.min(0, b) + Math.min(0, c);
  const hi = Math.max(0, a) + Math.max(0, b) + Math.max(0, c);
  return { dMin: -hi, dMax: -lo };
}

function sub(p: V3, q: V3): V3 {
  return [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
}
function cross(p: V3, q: V3): V3 {
  return [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
}
function dot(p: V3, q: V3): number {
  return p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
}
function norm(p: V3): number {
  return Math.hypot(p[0], p[1], p[2]);
}
function unit(p: V3): V3 {
  const n = norm(p) || 1;
  return [p[0] / n, p[1] / n, p[2] / n];
}

/**
 * Section du cube unité par le plan a·x + b·y + c·z + d = 0.
 * Retourne les sommets du polygone DANS L'ORDRE (tour du polygone),
 * ou [] si le plan ne coupe pas le cube (ou si n est nul).
 */
export function sectionPolygon(a: number, b: number, c: number, d: number): V3[] {
  if (normalLength(a, b, c) < EPS) return [];

  const pts: V3[] = [];
  const add = (p: V3) => {
    for (const q of pts) {
      if (Math.abs(q[0] - p[0]) < 1e-6 && Math.abs(q[1] - p[1]) < 1e-6 && Math.abs(q[2] - p[2]) < 1e-6) return;
    }
    pts.push(p);
  };

  for (const [i, j] of CUBE_EDGES) {
    const P = CUBE_VERTICES[i];
    const Q = CUBE_VERTICES[j];
    const fp = planeValue(a, b, c, d, P);
    const fq = planeValue(a, b, c, d, Q);
    const pOn = Math.abs(fp) < EPS;
    const qOn = Math.abs(fq) < EPS;
    if (pOn) add([...P] as V3);
    if (qOn) add([...Q] as V3);
    if (!pOn && !qOn && fp * fq < 0) {
      const t = fp / (fp - fq); // point où la valeur s'annule sur [P;Q]
      add([P[0] + t * (Q[0] - P[0]), P[1] + t * (Q[1] - P[1]), P[2] + t * (Q[2] - P[2])]);
    }
  }

  if (pts.length < 3) return [];

  // Base orthonormée (u, v) du plan pour trier les points par angle autour du centre.
  const n = unit([a, b, c]);
  let u = cross(n, [0, 0, 1]);
  if (norm(u) < 1e-6) u = cross(n, [0, 1, 0]);
  u = unit(u);
  const v = cross(n, u);

  const g: V3 = [
    pts.reduce((s, p) => s + p[0], 0) / pts.length,
    pts.reduce((s, p) => s + p[1], 0) / pts.length,
    pts.reduce((s, p) => s + p[2], 0) / pts.length,
  ];

  return pts
    .map((p) => {
      const w = sub(p, g);
      return { p, ang: Math.atan2(dot(w, v), dot(w, u)) };
    })
    .sort((x, y) => x.ang - y.ang)
    .map((x) => x.p);
}

/** Aire d'un polygone plan (triangulation en éventail depuis le premier sommet). */
export function polygonArea(poly: V3[]): number {
  if (poly.length < 3) return 0;
  let s = 0;
  for (let i = 1; i + 1 < poly.length; i++) {
    s += norm(cross(sub(poly[i], poly[0]), sub(poly[i + 1], poly[0]))) / 2;
  }
  return s;
}

export function shapeName(k: number): string {
  if (k === 3) return 'triangle';
  if (k === 4) return 'quadrilatère';
  if (k === 5) return 'pentagone';
  if (k === 6) return 'hexagone';
  return 'aucune section';
}

export type LineVsPlane =
  | { kind: 'secante'; t: number; point: V3 }
  | { kind: 'parallele'; t: null; point: null }
  | { kind: 'incluse'; t: null; point: null };

/**
 * Position relative de la grande diagonale (AG) et du plan.
 * (AG) : x = t, y = t, z = t (t ∈ ℝ), vecteur directeur u(1 ; 1 ; 1).
 * n·u = a + b + c : nul ⟺ la droite est parallèle au plan.
 */
export function lineAGvsPlane(a: number, b: number, c: number, d: number): LineVsPlane {
  const nu = a + b + c;
  if (Math.abs(nu) < EPS) {
    return Math.abs(d) < EPS
      ? { kind: 'incluse', t: null, point: null }
      : { kind: 'parallele', t: null, point: null };
  }
  const t = -d / nu;
  return { kind: 'secante', t, point: [t, t, t] };
}

/**
 * Position relative du plan et de la base (ABC) : z = 0, de normale k(0 ; 0 ; 1).
 * L'angle entre deux plans est l'angle aigu entre leurs normales.
 */
export function planeVsBase(a: number, b: number, c: number): { angle: number; parallel: boolean } {
  const n = normalLength(a, b, c);
  if (n < EPS) return { angle: Number.NaN, parallel: false };
  const angle = (Math.acos(Math.min(1, Math.abs(c) / n)) * 180) / Math.PI;
  return { angle, parallel: Math.abs(a) < EPS && Math.abs(b) < EPS };
}

function fmtNum(v: number): string {
  return (Math.round(v * 100) / 100)
    .toFixed(2)
    .replace(/\.?0+$/, '')
    .replace('.', ',');
}

/** Équation cartésienne mise en forme : « 2x − y + z − 1,5 = 0 ». */
export function planeEquation(a: number, b: number, c: number, d: number): string {
  const parts: string[] = [];
  const push = (coef: number, name: string) => {
    if (Math.abs(coef) < EPS) return;
    const abs = Math.abs(coef);
    const num = name && Math.abs(abs - 1) < EPS ? '' : fmtNum(abs);
    if (parts.length === 0) parts.push(`${coef < 0 ? '−' : ''}${num}${name}`);
    else parts.push(` ${coef < 0 ? '−' : '+'} ${num}${name}`);
  };
  push(a, 'x');
  push(b, 'y');
  push(c, 'z');
  push(d, '');
  if (parts.length === 0) return '0 = 0';
  return `${parts.join('')} = 0`;
}

/** Écriture d'un vecteur : « n(1 ; −2 ; 0) ». */
export function fmtVector(name: string, a: number, b: number, c: number): string {
  return `${name}(${fmtNum(a)} ; ${fmtNum(b)} ; ${fmtNum(c)})`;
}

export { fmtNum };
