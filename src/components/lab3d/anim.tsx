'use client';

/**
 * lab3d/anim — boîte à outils de MOUVEMENT pour les scènes de TP.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ RÈGLE R3F (à respecter partout dans ce fichier ET dans les scènes)       │
 * │                                                                          │
 * │ `useFrame` ne peut être appelé QUE dans un composant rendu À L'INTÉRIEUR │
 * │ du <Canvas> (donc enfant de <LabScene>), jamais dans le composant qui    │
 * │ *retourne* <LabScene> (il est hors Canvas → crash runtime                │
 * │ « Hooks can only be used within the Canvas component »).                 │
 * │                                                                          │
 * │ ⇒ TOUS les composants exportés ici (<Animate>, <Spring>, <Timeline>…)    │
 * │   s'utilisent comme ENFANTS de <LabScene>. Ils ne rendent rien : ils     │
 * │   mutent des refs. Les fonctions pures (easings, damp, bruit…) n'ont     │
 * │   aucune contrainte : elles s'utilisent n'importe où.                    │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 *   <LabScene>
 *     <mesh ref={ball} />
 *     <Animate fn={(state, delta) => { ball.current?.position.set(...) }} />
 *   </LabScene>
 *
 * PRINCIPES DE CE MODULE
 *  1. Zéro re-render : tout passe par des refs mutées frame par frame.
 *     (Seuls les callbacks optionnels `onDone` peuvent, si la scène le veut,
 *     déclencher un setState — une fois, pas à chaque frame.)
 *  2. Déterminisme : aucun `Math.random()`. Les variations viennent d'une
 *     graine (`seed`) ou de l'angle d'or (`goldenPhase`).
 *  3. Indépendance du framerate : `damp()` remplace `lerp(a, b, 0.1)`, et les
 *     intégrateurs (ressort, oscillateur) sous-échantillonnent le pas de temps.
 *  4. Zéro dépendance nouvelle : toutes les maths sont implémentées ici.
 *
 * SOMMAIRE
 *   §1 <Animate>                — le helper historique (signature inchangée)
 *   §2 Easings                  — easeIn/easeOut/easeInOut/elastic/back/bounce
 *   §3 Amortissement temporel   — damp / dampAngle / damp3 / dampHalfLife
 *   §4 Ressort amorti           — createSpring, <Spring>, <SpringTo>
 *   §5 Timeline / séquence      — timelineAt, <Timeline>
 *   §6 Mouvements physiques     — oscillation amortie, chute + rebonds, courbe
 *   §7 Bruit doux déterministe  — noise1D, fbm1D, <Float>
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, type RootState } from '@react-three/fiber';
import { CatmullRomCurve3, Vector3, type Object3D } from 'three';

/* ────────────────────────────────────────────────────────────────────────── */
/* §1 — <Animate> : le helper historique. NE PAS CHANGER SA SIGNATURE.        */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Exécute `fn` à chaque frame. Ne rend rien.
 *
 * @example
 * <LabScene>
 *   <mesh ref={ball} />
 *   <Animate fn={(state, delta) => {
 *     ball.current?.position.setY(Math.sin(state.clock.elapsedTime) * 0.5);
 *   }} />
 * </LabScene>
 */
export function Animate({ fn }: { fn: (state: RootState, delta: number) => void }) {
  useFrame(fn);
  return null;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* §0 — utilitaires internes                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Pas de temps maximal pris en compte (50 ms).
 *
 * Quand l'onglet passe en arrière-plan puis revient, R3F peut livrer un
 * `delta` de plusieurs secondes : sans plafond, un ressort explose et une
 * timeline saute des phases entières. On plafonne donc partout.
 */
export const MAX_DELTA = 0.05;

/** Plafonne un `delta` R3F à {@link MAX_DELTA} (et le rend positif). */
export function clampDelta(dt: number): number {
  return dt > MAX_DELTA ? MAX_DELTA : dt > 0 ? dt : 0;
}

/** Ramène `t` dans [0, 1]. */
export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Interpolation linéaire simple (sans dépendance au framerate : `t` est explicite). */
export function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Remappe `v` de l'intervalle [inMin, inMax] vers [outMin, outMax], borné.
 * Pratique pour piloter une aiguille : `remap(tension, 0, 12, -1.2, 1.2)`.
 */
export function remap(
  v: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (inMax === inMin) return outMin;
  return mix(outMin, outMax, clamp01((v - inMin) / (inMax - inMin)));
}

/** Garde la dernière valeur d'un callback sans réabonner `useFrame`. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* §2 — EASINGS                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Fonction d'easing : reçoit une progression normalisée `t ∈ [0, 1]` et
 * renvoie la progression « ressentie ». Toutes celles d'ici vérifient
 * f(0) = 0 et f(1) = 1.
 */
export type EasingFn = (t: number) => number;

/** Progression brute (aucun easing) — mouvement mécanique, à éviter. */
export const linear: EasingFn = (t) => clamp01(t);

/** Démarrage doux, arrivée lancée (quadratique). Chute, objet qu'on lâche. */
export const easeIn: EasingFn = (t) => {
  const x = clamp01(t);
  return x * x;
};

/** Départ lancé, arrivée douce (quadratique). Objet qui se pose, freinage. */
export const easeOut: EasingFn = (t) => {
  const x = clamp01(t);
  return x * (2 - x);
};

/**
 * Accélération puis décélération (cubique) — LE défaut du réalisme :
 * un objet réel ne démarre ni ne s'arrête net.
 */
export const easeInOut: EasingFn = (t) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/** Variante cubique du démarrage doux (plus marquée que {@link easeIn}). */
export const easeInCubic: EasingFn = (t) => {
  const x = clamp01(t);
  return x * x * x;
};

/** Variante cubique de l'arrivée douce (plus marquée que {@link easeOut}). */
export const easeOutCubic: EasingFn = (t) => 1 - Math.pow(1 - clamp01(t), 3);

/** Sinusoïdal doux aux deux bouts — respiration, houle, pulsation lente. */
export const easeInOutSine: EasingFn = (t) => -(Math.cos(Math.PI * clamp01(t)) - 1) / 2;

/** Interpolation lissée C¹ (dérivée nulle aux bornes). */
export const smoothstep: EasingFn = (t) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/** Interpolation lissée C² (dérivées 1re et 2de nulles aux bornes) — bruit, flottement. */
export const smootherstep: EasingFn = (t) => {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

const BACK_C1 = 1.70158;
const BACK_C2 = BACK_C1 * 1.525;
const BACK_C3 = BACK_C1 + 1;

/** Recule un peu avant de partir (élan). */
export const easeInBack: EasingFn = (t) => {
  const x = clamp01(t);
  return BACK_C3 * x * x * x - BACK_C1 * x * x;
};

/**
 * Dépasse la cible puis revient : « back ».
 * Idéal pour un objet qu'on pose fermement (bouchon, lame, curseur).
 */
export const easeOutBack: EasingFn = (t) => {
  const x = clamp01(t);
  return 1 + BACK_C3 * Math.pow(x - 1, 3) + BACK_C1 * Math.pow(x - 1, 2);
};

/** Élan au départ ET dépassement à l'arrivée. */
export const easeInOutBack: EasingFn = (t) => {
  const x = clamp01(t);
  return x < 0.5
    ? (Math.pow(2 * x, 2) * ((BACK_C2 + 1) * 2 * x - BACK_C2)) / 2
    : (Math.pow(2 * x - 2, 2) * ((BACK_C2 + 1) * (x * 2 - 2) + BACK_C2) + 2) / 2;
};

const ELASTIC_C4 = (2 * Math.PI) / 3;

/** Oscillations amorties AVANT d'arriver (rare, effet « charge »). */
export const easeInElastic: EasingFn = (t) => {
  const x = clamp01(t);
  if (x === 0) return 0;
  if (x === 1) return 1;
  return -Math.pow(2, 10 * x - 10) * Math.sin((x * 10 - 10.75) * ELASTIC_C4);
};

/**
 * Oscillations amorties APRÈS l'arrivée : « elastic ».
 * Aiguille d'un ampèremètre qui se stabilise, ressort qu'on relâche.
 */
export const easeOutElastic: EasingFn = (t) => {
  const x = clamp01(t);
  if (x === 0) return 0;
  if (x === 1) return 1;
  return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ELASTIC_C4) + 1;
};

const B_N1 = 7.5625;
const B_D1 = 2.75;

/** Rebonds décroissants à l'arrivée : « bounce ». Balle qui tombe sur la paillasse. */
export const easeOutBounce: EasingFn = (t) => {
  let x = clamp01(t);
  if (x < 1 / B_D1) return B_N1 * x * x;
  if (x < 2 / B_D1) return B_N1 * (x -= 1.5 / B_D1) * x + 0.75;
  if (x < 2.5 / B_D1) return B_N1 * (x -= 2.25 / B_D1) * x + 0.9375;
  return B_N1 * (x -= 2.625 / B_D1) * x + 0.984375;
};

/** Rebonds au départ (miroir de {@link easeOutBounce}). */
export const easeInBounce: EasingFn = (t) => 1 - easeOutBounce(1 - clamp01(t));

/** Alias court demandé par les scènes : oscillation élastique à l'arrivée. */
export const elastic = easeOutElastic;
/** Alias court : léger dépassement puis retour. */
export const back = easeOutBack;
/** Alias court : rebonds à l'arrivée. */
export const bounce = easeOutBounce;

/** Nom lisible d'un easing, pour le stocker dans des données de scène. */
export type EasingName =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutSine'
  | 'smoothstep'
  | 'smootherstep'
  | 'easeInBack'
  | 'easeOutBack'
  | 'easeInOutBack'
  | 'easeInElastic'
  | 'easeOutElastic'
  | 'easeInBounce'
  | 'easeOutBounce'
  | 'elastic'
  | 'back'
  | 'bounce';

/**
 * Table nom → fonction, pour décrire une animation en données.
 *
 * @example
 * const phases = [{ name: 'approche', duration: 1.2, easing: EASINGS.easeInOut }];
 */
export const EASINGS: Record<EasingName, EasingFn> = {
  linear,
  easeIn,
  easeOut,
  easeInOut,
  easeInCubic,
  easeOutCubic,
  easeInOutSine,
  smoothstep,
  smootherstep,
  easeInBack,
  easeOutBack,
  easeInOutBack,
  easeInElastic,
  easeOutElastic,
  easeInBounce,
  easeOutBounce,
  elastic,
  back,
  bounce,
};

/**
 * Interpole de `a` vers `b` avec un easing.
 *
 * @example
 * // 1,2 s pour ouvrir un robinet, avec accélération/décélération
 * const angle = ease(0, Math.PI / 2, t / 1.2, easeInOut);
 */
export function ease(a: number, b: number, t: number, fn: EasingFn = easeInOut): number {
  return a + (b - a) * fn(t);
}

/* ────────────────────────────────────────────────────────────────────────── */
/* §3 — AMORTISSEMENT TEMPOREL (indépendant du framerate)                     */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Rapprochement exponentiel de `current` vers `target`, INDÉPENDANT du framerate.
 *
 * ⚠️ `lerp(a, b, 0.1)` appelé une fois par frame va deux fois plus vite à
 * 120 fps qu'à 60 fps : le mouvement change de vitesse selon la machine.
 * `damp` corrige ça : l'écart restant est multiplié par `e^(−λ·dt)`, donc
 * le résultat ne dépend que du TEMPS écoulé, pas du nombre de frames.
 *
 * Cette famille de fonctions n'a PAS besoin de {@link clampDelta} : la
 * décroissance exponentielle est inconditionnellement stable, elle ne dépasse
 * jamais la cible, quel que soit `dt`. Après un retour d'onglet (dt énorme),
 * elle rend simplement la cible — ce qui est le résultat physiquement correct.
 *
 * @param lambda vitesse de rapprochement en s⁻¹ (≈ 2 très mou, 8 naturel, 20 sec).
 *
 * @example
 * <LabScene>
 *   <mesh ref={curseur} />
 *   <Animate fn={(_s, dt) => {
 *     const m = curseur.current;
 *     if (m) m.position.x = damp(m.position.x, cibleX, 8, dt);
 *   }} />
 * </LabScene>
 */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return target + (current - target) * Math.exp(-lambda * Math.max(0, dt));
}

/**
 * Variante de {@link damp} paramétrée par la DEMI-VIE : au bout de `halfLife`
 * secondes, la moitié de l'écart a été rattrapée. Plus intuitif à régler.
 *
 * @example dampHalfLife(y, cible, 0.15, dt) // « ~0,15 s pour faire la moitié du chemin »
 */
export function dampHalfLife(
  current: number,
  target: number,
  halfLife: number,
  dt: number,
): number {
  if (halfLife <= 0) return target;
  return target + (current - target) * Math.pow(0.5, Math.max(0, dt) / halfLife);
}

/**
 * Comme {@link damp} mais sur un ANGLE (radians) : passe par le plus court
 * chemin, donc pas de tour complet quand on franchit ±π.
 *
 * @example
 * // aiguille de boussole qui rejoint le nord sans faire le tour
 * aiguille.current.rotation.z = dampAngle(aiguille.current.rotation.z, cap, 6, dt);
 */
export function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  const TWO_PI = Math.PI * 2;
  let delta = (target - current) % TWO_PI;
  if (delta > Math.PI) delta -= TWO_PI;
  if (delta < -Math.PI) delta += TWO_PI;
  return current + delta * (1 - Math.exp(-lambda * Math.max(0, dt)));
}

/** Objet à trois composantes mutables : `Vector3`, `Euler`, ou un simple `{x, y, z}`. */
export type XYZ = { x: number; y: number; z: number };

/**
 * Applique {@link damp} aux trois composantes d'un `Vector3` / `Euler`
 * EN LE MUTANT (aucune allocation, aucun re-render).
 *
 * @example
 * <LabScene>
 *   <mesh ref={bille} />
 *   <Animate fn={(_s, dt) => {
 *     if (bille.current) damp3(bille.current.position, [x, y, z], 10, dt);
 *   }} />
 * </LabScene>
 */
export function damp3(
  current: XYZ,
  target: XYZ | readonly [number, number, number],
  lambda: number,
  dt: number,
): XYZ {
  const k = Math.exp(-lambda * Math.max(0, dt));
  const tuple = 'x' in target ? null : target;
  const tx = tuple ? tuple[0] : (target as XYZ).x;
  const ty = tuple ? tuple[1] : (target as XYZ).y;
  const tz = tuple ? tuple[2] : (target as XYZ).z;
  current.x = tx + (current.x - tx) * k;
  current.y = ty + (current.y - ty) * k;
  current.z = tz + (current.z - tz) * k;
  return current;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* §4 — RESSORT AMORTI                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Réglage d'un ressort amorti : m·ẍ = −k·(x − cible) − c·ẋ.
 *
 * Repère : l'amortissement CRITIQUE (retour le plus rapide sans dépassement)
 * vaut `damping = 2·√(stiffness·mass)`. En dessous → l'objet dépasse et
 * oscille (aiguille, ressort). Au-dessus → il rampe (mécanisme visqueux).
 */
export type SpringConfig = {
  /** Raideur k (défaut 170). Plus grand = plus rapide et plus « tendu ». */
  stiffness?: number;
  /** Amortissement c (défaut 26). Plus grand = moins d'oscillation. */
  damping?: number;
  /** Masse m (défaut 1). Plus grand = plus d'inertie. */
  mass?: number;
  /** Seuil d'immobilisation (défaut 1e-4, en unités de la valeur). */
  precision?: number;
};

/**
 * Réglages prêts à l'emploi.
 *  - `needle`   : aiguille d'appareil de mesure (dépasse un peu, se stabilise vite)
 *  - `gentle`   : déplacement doux d'un objet posé
 *  - `stiff`    : rejoint la cible presque sans dépassement (curseur, glissière)
 *  - `wobbly`   : franchement élastique (ressort, membrane)
 *  - `molasses` : très visqueux, lent (liquide épais, mécanisme lourd)
 */
export const SPRING_PRESETS = {
  needle: { stiffness: 220, damping: 18, mass: 1 },
  gentle: { stiffness: 120, damping: 22, mass: 1 },
  stiff: { stiffness: 300, damping: 36, mass: 1 },
  wobbly: { stiffness: 180, damping: 10, mass: 1 },
  molasses: { stiffness: 60, damping: 40, mass: 1.4 },
} as const satisfies Record<string, SpringConfig>;

/** État interne mutable d'un ressort scalaire, piloté par {@link createSpring}. */
export type Spring1D = {
  /** Position courante (lue après chaque `step`). */
  value: number;
  /** Vitesse courante (unités/s). */
  velocity: number;
  /**
   * `true` quand le dernier `step` n'avait plus rien à faire (valeur = cible et
   * vitesse nulle). Vaut `true` à la création, avant tout `step` : pour boucler
   * « jusqu'à stabilisation », faire `step` PUIS tester (`do { … } while`).
   */
  settled: boolean;
  /**
   * Avance le ressort de `dt` seconde(s) vers `target` et renvoie la nouvelle
   * valeur. Sous-échantillonne le pas pour rester stable même en cas de
   * grosse frame (intégration semi-implicite d'Euler).
   */
  step: (target: number, dt: number) => number;
  /** Repositionne instantanément (ex. au changement de manip). */
  reset: (value: number, velocity?: number) => void;
};

/** Pas d'intégration interne : 240 Hz → stable jusqu'à des ressorts très raides. */
const SPRING_SUB_DT = 1 / 240;

/**
 * Crée un ressort amorti scalaire. À mémoriser avec `useMemo` puis à faire
 * avancer depuis un `<Animate>` : plusieurs ressorts peuvent ainsi partager
 * une seule boucle de frame.
 *
 * @example
 * function SceneAmperemetre({ intensite }: { intensite: number }) {
 *   const aiguille = useRef<Mesh>(null);
 *   const spring = useMemo(() => createSpring(0, SPRING_PRESETS.needle), []);
 *   return (
 *     <LabScene>
 *       <mesh ref={aiguille} />
 *       <Animate fn={(_s, dt) => {
 *         const a = spring.step(remap(intensite, 0, 5, -1.1, 1.1), dt);
 *         if (aiguille.current) aiguille.current.rotation.z = a;
 *       }} />
 *     </LabScene>
 *   );
 * }
 */
export function createSpring(initial = 0, config: SpringConfig = {}): Spring1D {
  const stiffness = config.stiffness ?? 170;
  const damping = config.damping ?? 26;
  const mass = config.mass ?? 1;
  const precision = config.precision ?? 1e-4;

  const s: Spring1D = {
    value: initial,
    velocity: 0,
    settled: true,
    step(target, dt) {
      const step = clampDelta(dt);
      if (step <= 0) return s.value;

      // Déjà au repos ET cible inchangée → rien à intégrer (économie CPU).
      if (s.settled && Math.abs(s.value - target) <= precision) {
        s.value = target;
        s.velocity = 0;
        return s.value;
      }

      const n = Math.max(1, Math.ceil(step / SPRING_SUB_DT));
      const h = step / n;
      for (let i = 0; i < n; i++) {
        const a = (-stiffness * (s.value - target) - damping * s.velocity) / mass;
        s.velocity += a * h; // semi-implicite : vitesse d'abord…
        s.value += s.velocity * h; // …puis position avec la vitesse à jour
      }

      // Immobilisation : évite de faire tourner la scène pour du 1e-9.
      if (Math.abs(s.value - target) < precision && Math.abs(s.velocity) < precision) {
        s.value = target;
        s.velocity = 0;
        s.settled = true;
      } else {
        s.settled = false;
      }
      return s.value;
    },
    reset(value, velocity = 0) {
      s.value = value;
      s.velocity = velocity;
      s.settled = velocity === 0;
    },
  };
  return s;
}

/**
 * Ressort amorti scalaire prêt à poser dans une scène : suit `target` frame
 * par frame et transmet la valeur à `onFrame`. Aucun re-render.
 *
 * @example
 * <LabScene>
 *   <mesh ref={aiguille} />
 *   <Spring
 *     target={remap(tension, 0, 12, -1.2, 1.2)}
 *     config={SPRING_PRESETS.needle}
 *     onFrame={(a) => { if (aiguille.current) aiguille.current.rotation.z = a; }}
 *   />
 * </LabScene>
 */
export function Spring({
  target,
  initial,
  config,
  onFrame,
  restartKey,
}: {
  /** Valeur visée (peut changer à chaque render : le ressort la rattrape). */
  target: number;
  /** Valeur de départ (défaut : `target`, donc pas de saut au montage). */
  initial?: number;
  /** Raideur / amortissement / masse — voir {@link SPRING_PRESETS}. */
  config?: SpringConfig;
  /** Appelé à chaque frame avec (valeur, vitesse, immobilisé ?). */
  onFrame: (value: number, velocity: number, settled: boolean) => void;
  /** Change de valeur → le ressort repart de `initial` (ex. bouton « rejouer »). */
  restartKey?: string | number;
}) {
  const spring = useMemo(
    () => createSpring(initial ?? target, config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const cb = useLatest(onFrame);
  const key = useRef(restartKey);

  useFrame((_state, delta) => {
    if (key.current !== restartKey) {
      key.current = restartKey;
      spring.reset(initial ?? target);
    }
    spring.step(target, delta);
    cb.current(spring.value, spring.velocity, spring.settled);
  });
  return null;
}

/** Propriété de transformation pilotable par {@link SpringTo}. */
export type TransformProp = 'position' | 'rotation' | 'scale';

/** Ref acceptant n'importe quel objet de scène (`Mesh`, `Group`, `Object3D`…). */
export type Object3DRef = { readonly current: Object3D | null };

function transformOf(o: Object3D, p: TransformProp): XYZ {
  return p === 'position' ? o.position : p === 'scale' ? o.scale : o.rotation;
}

/**
 * Amène une propriété de transformation d'un objet vers `to` avec un ressort
 * amorti sur chacun des 3 axes. Le mouvement « rejoint » sa cible
 * naturellement au lieu de sauter.
 *
 * @example
 * <LabScene>
 *   <mesh ref={becher} />
 *   <SpringTo objectRef={becher} to={[posX, 0, 0]} config={SPRING_PRESETS.gentle} />
 * </LabScene>
 */
export function SpringTo({
  objectRef,
  to,
  property = 'position',
  config,
  onSettle,
}: {
  /** Ref de l'objet à déplacer (enfant de <LabScene>). */
  objectRef: Object3DRef;
  /** Cible [x, y, z] — en mètres de scène, ou en radians pour `rotation`. */
  to: readonly [number, number, number];
  /** Propriété pilotée (défaut `position`). */
  property?: TransformProp;
  /** Réglage du ressort — voir {@link SPRING_PRESETS}. */
  config?: SpringConfig;
  /** Appelé une seule fois quand les 3 axes sont immobilisés (peut faire un setState). */
  onSettle?: () => void;
}) {
  const springs = useMemo(
    () => [createSpring(to[0], config), createSpring(to[1], config), createSpring(to[2], config)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const started = useRef(false);
  const wasSettled = useRef(true);
  const settleCb = useLatest(onSettle);

  useFrame((_state, delta) => {
    const o = objectRef.current;
    if (!o) return;
    const v = transformOf(o, property);

    // Au premier passage on part de la pose réelle de l'objet dans la scène.
    if (!started.current) {
      started.current = true;
      springs[0].reset(v.x);
      springs[1].reset(v.y);
      springs[2].reset(v.z);
    }

    v.x = springs[0].step(to[0], delta);
    v.y = springs[1].step(to[1], delta);
    v.z = springs[2].step(to[2], delta);

    const settled = springs[0].settled && springs[1].settled && springs[2].settled;
    if (settled && !wasSettled.current) settleCb.current?.();
    wasSettled.current = settled;
  });
  return null;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* §5 — TIMELINE / SÉQUENCE                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

/** Une phase de {@link Timeline} : un nom, une durée (s) et un easing. */
export type TimelinePhase = {
  /** Nom lisible, retourné dans `TimelineFrame.name` (ex. `'adhesion'`). */
  name?: string;
  /** Durée en secondes (les durées ≤ 0 sont ignorées). */
  duration: number;
  /** Easing appliqué à la progression LOCALE de la phase (défaut `easeInOut`). */
  easing?: EasingFn;
};

/** Instantané d'une timeline à un temps donné. */
export type TimelineFrame = {
  /** Index de la phase courante dans le tableau fourni. */
  index: number;
  /** Nom de la phase (ou `'phase<i>'` par défaut). */
  name: string;
  /** Progression locale APRÈS easing, dans [0, 1] — c'est celle à utiliser. */
  t: number;
  /** Progression locale brute (linéaire), dans [0, 1]. */
  raw: number;
  /** Progression globale sur toute la séquence, dans [0, 1]. */
  progress: number;
  /** Temps écoulé depuis le début (secondes, replié si `loop`). */
  elapsed: number;
  /** Durée totale de la séquence (secondes). */
  total: number;
  /** Nombre de tours complets accomplis (0 si pas de `loop`). */
  loops: number;
  /** `true` quand la séquence est terminée (jamais si `loop`). */
  done: boolean;
};

/**
 * Où en est une séquence de phases au temps `elapsed` ? Fonction PURE :
 * utilisable dans un `<Animate>`, dans un test, ou pour un rendu statique.
 *
 * @example
 * const PHASES = [
 *   { name: 'contact',    duration: 0.8, easing: easeInOut },
 *   { name: 'engloutir',  duration: 1.4, easing: easeOut },
 *   { name: 'digestion',  duration: 2.0 },
 * ];
 * const f = timelineAt(PHASES, t);
 * if (f.name === 'engloutir') membrane.scale.setScalar(mix(1, 1.4, f.t));
 */
export function timelineAt(
  phases: readonly TimelinePhase[],
  elapsed: number,
  options: { loop?: boolean } = {},
): TimelineFrame {
  const total = phases.reduce((sum, p) => sum + Math.max(0, p.duration), 0);
  const last = Math.max(0, phases.length - 1);
  const nameOf = (i: number) => phases[i]?.name ?? `phase${i}`;

  if (total <= 0) {
    return {
      index: last,
      name: nameOf(last),
      t: 1,
      raw: 1,
      progress: 1,
      elapsed: 0,
      total: 0,
      loops: 0,
      done: !options.loop,
    };
  }

  const e = Math.max(0, elapsed);
  const loops = options.loop ? Math.floor(e / total) : 0;
  const time = options.loop ? e - loops * total : Math.min(e, total);
  const done = !options.loop && e >= total;

  let acc = 0;
  for (let i = 0; i < phases.length; i++) {
    const d = Math.max(0, phases[i].duration);
    if (d <= 0) continue;
    if (time < acc + d || acc + d >= total) {
      const raw = clamp01((time - acc) / d);
      const fn = phases[i].easing ?? easeInOut;
      return {
        index: i,
        name: nameOf(i),
        t: fn(raw),
        raw,
        progress: clamp01(time / total),
        elapsed: time,
        total,
        loops,
        done,
      };
    }
    acc += d;
  }

  // Inatteignable en pratique (garde-fou arrondis flottants).
  return {
    index: last,
    name: nameOf(last),
    t: 1,
    raw: 1,
    progress: 1,
    elapsed: time,
    total,
    loops,
    done,
  };
}

/**
 * Déroule une séquence de phases et appelle `onFrame` à chaque image avec
 * l'état courant. Parfait pour les processus en étapes : phagocytose, mitose,
 * digestion, titrage, montage d'un circuit…
 *
 * @example
 * const PHASES = [
 *   { name: 'approche', duration: 1.0, easing: easeInOut },
 *   { name: 'fusion',   duration: 1.5, easing: easeOutBack },
 *   { name: 'pause',    duration: 0.6, easing: linear },
 * ];
 *
 * <LabScene>
 *   <mesh ref={bacterie} />
 *   <Timeline
 *     phases={PHASES}
 *     loop
 *     playing={enCours}
 *     restartKey={runId}
 *     onFrame={(f) => {
 *       const b = bacterie.current;
 *       if (!b) return;
 *       if (f.name === 'approche') b.position.x = mix(2, 0, f.t);
 *       if (f.name === 'fusion')   b.scale.setScalar(mix(1, 0.2, f.t));
 *     }}
 *   />
 * </LabScene>
 */
export function Timeline({
  phases,
  onFrame,
  loop = false,
  playing = true,
  speed = 1,
  restartKey,
  onDone,
}: {
  /** Les phases, dans l'ordre. */
  phases: readonly TimelinePhase[];
  /** Appelé chaque frame avec l'état de la séquence (mute des refs, pas de setState). */
  onFrame: (frame: TimelineFrame, state: RootState, delta: number) => void;
  /** Rejouer indéfiniment (défaut `false`). */
  loop?: boolean;
  /** `false` met en pause sans remettre à zéro (défaut `true`). */
  playing?: boolean;
  /** Facteur de vitesse (0,5 = deux fois plus lent). */
  speed?: number;
  /** Change de valeur → la séquence repart de zéro (bouton « relancer »). */
  restartKey?: string | number;
  /** Appelé UNE fois à la fin (jamais si `loop`) : ici un setState est permis. */
  onDone?: () => void;
}) {
  const time = useRef(0);
  const key = useRef(restartKey);
  const fired = useRef(false);
  const cb = useLatest(onFrame);
  const doneCb = useLatest(onDone);

  useFrame((state, delta) => {
    if (key.current !== restartKey) {
      key.current = restartKey;
      time.current = 0;
      fired.current = false;
    }
    if (playing) time.current += clampDelta(delta) * speed;

    const frame = timelineAt(phases, time.current, { loop });
    cb.current(frame, state, delta);

    if (frame.done && !fired.current) {
      fired.current = true;
      doneCb.current?.();
    }
  });
  return null;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* §6 — MOUVEMENTS PHYSIQUES RÉUTILISABLES                                    */
/* ────────────────────────────────────────────────────────────────────────── */

/** Période d'un pendule simple de longueur `length` (m) — petites oscillations. */
export function pendulumPeriod(length: number, g = 9.81): number {
  return 2 * Math.PI * Math.sqrt(Math.max(1e-6, length) / g);
}

/** Période d'un système masse-ressort (masse en kg, raideur en N/m). */
export function springPeriod(mass: number, stiffness: number): number {
  return 2 * Math.PI * Math.sqrt(Math.max(1e-6, mass) / Math.max(1e-6, stiffness));
}

/** Réglage d'une oscillation harmonique amortie. */
export type OscillationConfig = {
  /** Amplitude initiale (m, rad… selon l'usage). Défaut 1. */
  amplitude?: number;
  /** Période en secondes. Défaut 1. Voir {@link pendulumPeriod}. */
  period?: number;
  /**
   * Taux d'amortissement λ en s⁻¹ : l'amplitude est divisée par e toutes les
   * 1/λ secondes. 0 = oscillation entretenue. Défaut 0,4.
   */
  damping?: number;
  /** Phase à t = 0, en radians. 0 = lâché à l'amplitude maximale. */
  phase?: number;
  /** Valeur de repos autour de laquelle on oscille. Défaut 0. */
  center?: number;
};

/**
 * Oscillation harmonique amortie : x(t) = centre + A·e^(−λt)·cos(ωt + φ).
 * Fonction PURE. Modélise un pendule (petites oscillations), une masse au
 * bout d'un ressort, une aiguille qu'on a tapée, un plateau de balance.
 *
 * @returns `{ value, velocity }` — la vitesse est la dérivée exacte.
 *
 * @example
 * <LabScene>
 *   <group ref={pendule} />
 *   <Animate fn={(s) => {
 *     const { value } = oscillate(s.clock.elapsedTime, {
 *       amplitude: 0.35, period: pendulumPeriod(0.8), damping: 0.15,
 *     });
 *     if (pendule.current) pendule.current.rotation.z = value;
 *   }} />
 * </LabScene>
 */
export function oscillate(
  t: number,
  config: OscillationConfig = {},
): { value: number; velocity: number } {
  const A = config.amplitude ?? 1;
  const period = Math.max(1e-6, config.period ?? 1);
  const lambda = config.damping ?? 0.4;
  const phase = config.phase ?? 0;
  const center = config.center ?? 0;

  const w = (2 * Math.PI) / period;
  const env = Math.exp(-lambda * Math.max(0, t));
  const arg = w * t + phase;
  return {
    value: center + A * env * Math.cos(arg),
    velocity: A * env * (-lambda * Math.cos(arg) - w * Math.sin(arg)),
  };
}

/**
 * Oscillation amortie prête à poser dans une scène (pendule, ressort, balance).
 *
 * @example
 * <LabScene>
 *   <group ref={tige} />
 *   <Oscillate
 *     amplitude={0.4}
 *     period={pendulumPeriod(longueur)}
 *     damping={0.12}
 *     restartKey={runId}
 *     onFrame={(angle) => { if (tige.current) tige.current.rotation.z = angle; }}
 *   />
 * </LabScene>
 */
export function Oscillate({
  onFrame,
  playing = true,
  restartKey,
  ...config
}: OscillationConfig & {
  /** Appelé chaque frame avec (valeur, vitesse, temps écoulé). */
  onFrame: (value: number, velocity: number, t: number) => void;
  /** `false` gèle l'oscillation (défaut `true`). */
  playing?: boolean;
  /** Change de valeur → on relâche à nouveau depuis l'amplitude maximale. */
  restartKey?: string | number;
}) {
  const time = useRef(0);
  const key = useRef(restartKey);
  const cb = useLatest(onFrame);
  const cfg = useLatest(config);

  useFrame((_state, delta) => {
    if (key.current !== restartKey) {
      key.current = restartKey;
      time.current = 0;
    }
    if (playing) time.current += clampDelta(delta);
    const { value, velocity } = oscillate(time.current, cfg.current);
    cb.current(value, velocity, time.current);
  });
  return null;
}

/** Réglage d'une chute avec rebonds. */
export type BounceConfig = {
  /** Hauteur de lâcher au-dessus du sol (unités de scène). Défaut 1. */
  height?: number;
  /** Pesanteur (unités/s²). Défaut 9,81. */
  gravity?: number;
  /** Coefficient de restitution ∈ [0, 1[ : part de la vitesse rendue. Défaut 0,55. */
  restitution?: number;
  /** Altitude du sol (unités de scène). Défaut 0. */
  floor?: number;
};

/** Nombre maximal de rebonds calculés avant de considérer l'objet au repos. */
const MAX_BOUNCES = 40;

/**
 * Chute libre + rebonds décroissants, résolue ANALYTIQUEMENT (pas d'intégration,
 * donc exactement reproductible et sans dérive).
 *
 * @returns `{ y, velocity, impacts, resting }` — `y` inclut déjà `floor`.
 *
 * @example
 * <LabScene>
 *   <mesh ref={bille} />
 *   <Animate fn={(s) => {
 *     const { y } = fallWithBounces(s.clock.elapsedTime, { height: 1.6, restitution: 0.6 });
 *     bille.current?.position.setY(y + RAYON);
 *   }} />
 * </LabScene>
 */
export function fallWithBounces(
  t: number,
  config: BounceConfig = {},
): { y: number; velocity: number; impacts: number; resting: boolean } {
  const h = Math.max(0, config.height ?? 1);
  const g = Math.max(1e-6, config.gravity ?? 9.81);
  const e = Math.min(0.999, Math.max(0, config.restitution ?? 0.55));
  const floor = config.floor ?? 0;

  if (t <= 0) return { y: floor + h, velocity: 0, impacts: 0, resting: false };

  const tFall = Math.sqrt((2 * h) / g);
  if (t < tFall) {
    return { y: floor + h - 0.5 * g * t * t, velocity: -g * t, impacts: 0, resting: false };
  }

  let tau = t - tFall;
  let v = Math.sqrt(2 * g * h) * e; // vitesse de remontée après le 1er impact
  let impacts = 1;

  while (impacts <= MAX_BOUNCES) {
    const flight = (2 * v) / g;
    if (flight < 1e-4) break; // rebonds devenus imperceptibles → au repos
    if (tau < flight) {
      return {
        y: floor + v * tau - 0.5 * g * tau * tau,
        velocity: v - g * tau,
        impacts,
        resting: false,
      };
    }
    tau -= flight;
    v *= e;
    impacts++;
  }
  return { y: floor, velocity: 0, impacts, resting: true };
}

/**
 * Chute avec rebonds prête à poser dans une scène.
 *
 * @example
 * <LabScene>
 *   <mesh ref={balle} />
 *   <FallBounce
 *     height={1.8}
 *     restitution={0.65}
 *     restartKey={runId}
 *     onFrame={(y) => balle.current?.position.setY(y + 0.12)}
 *     onImpact={(n, v) => jouerSon(Math.abs(v))}
 *   />
 * </LabScene>
 */
export function FallBounce({
  onFrame,
  onImpact,
  playing = true,
  restartKey,
  ...config
}: BounceConfig & {
  /** Appelé chaque frame avec (altitude, vitesse verticale, au repos ?). */
  onFrame: (y: number, velocity: number, resting: boolean) => void;
  /** Appelé à chaque contact avec le sol : (numéro du rebond, vitesse d'impact). */
  onImpact?: (index: number, velocity: number) => void;
  /** `false` gèle la chute (défaut `true`). */
  playing?: boolean;
  /** Change de valeur → on relâche l'objet à nouveau. */
  restartKey?: string | number;
}) {
  const time = useRef(0);
  const key = useRef(restartKey);
  const lastImpacts = useRef(0);
  const cb = useLatest(onFrame);
  const impactCb = useLatest(onImpact);
  const cfg = useLatest(config);

  useFrame((_state, delta) => {
    if (key.current !== restartKey) {
      key.current = restartKey;
      time.current = 0;
      lastImpacts.current = 0;
    }
    if (playing) time.current += clampDelta(delta);

    const r = fallWithBounces(time.current, cfg.current);
    cb.current(r.y, r.velocity, r.resting);

    if (r.impacts > lastImpacts.current) {
      const g = cfg.current.gravity ?? 9.81;
      const h = cfg.current.height ?? 1;
      const e = cfg.current.restitution ?? 0.55;
      // vitesse d'arrivée au sol du rebond qui vient de se produire
      const vImpact = Math.sqrt(2 * g * h) * Math.pow(e, lastImpacts.current);
      lastImpacts.current = r.impacts;
      impactCb.current?.(r.impacts, vImpact);
    }
  });
  return null;
}

/**
 * Déplace un objet le long d'une courbe lisse passant par `points`, à VITESSE
 * RÉALISTE : la courbe est reparamétrée par la longueur d'arc, donc l'objet ne
 * ralentit pas dans les virages (défaut d'un Catmull-Rom brut). L'easing gère
 * le démarrage et le freinage.
 *
 * @example
 * // globule rouge qui parcourt un vaisseau, orienté selon le trajet
 * <LabScene>
 *   <mesh ref={globule} />
 *   <AlongPath
 *     objectRef={globule}
 *     points={[[-2, 0, 0], [-0.6, 0.5, 0.2], [0.8, -0.3, 0], [2, 0.2, 0]]}
 *     duration={3.2}
 *     easing={easeInOut}
 *     loop
 *     orient
 *   />
 * </LabScene>
 */
export function AlongPath({
  objectRef,
  points,
  duration = 2,
  easing = easeInOut,
  loop = false,
  closed = false,
  orient = false,
  playing = true,
  offset = 0,
  restartKey,
  onFrame,
  onDone,
}: {
  /** Ref de l'objet déplacé (enfant de <LabScene>). */
  objectRef: Object3DRef;
  /** Points de passage [x, y, z] — au moins 2. */
  points: readonly (readonly [number, number, number])[];
  /** Durée d'un parcours complet, en secondes (défaut 2). */
  duration?: number;
  /** Easing sur la progression le long du chemin (défaut `easeInOut`). */
  easing?: EasingFn;
  /** Reboucler indéfiniment (avec `closed`, boucle sans à-coup). */
  loop?: boolean;
  /** Fermer la courbe (le dernier point rejoint le premier). */
  closed?: boolean;
  /** Orienter l'axe +Z de l'objet selon la tangente au chemin. */
  orient?: boolean;
  /** `false` met en pause (défaut `true`). */
  playing?: boolean;
  /** Décalage de départ ∈ [0, 1] — utile pour échelonner plusieurs objets. */
  offset?: number;
  /** Change de valeur → le parcours repart du début. */
  restartKey?: string | number;
  /** Optionnel : reçoit (u parcouru ∈ [0,1], position). */
  onFrame?: (u: number, position: Vector3) => void;
  /** Appelé une fois à l'arrivée (jamais si `loop`). */
  onDone?: () => void;
}) {
  // Signature stable : un tableau littéral écrit dans le JSX change d'identité à
  // chaque render, la courbe ne doit pas être reconstruite pour autant.
  const signature = points.map((p) => `${p[0]},${p[1]},${p[2]}`).join(';');
  const curve = useMemo(
    () =>
      new CatmullRomCurve3(
        signature.split(';').map((p) => {
          const [x, y, z] = p.split(',').map(Number);
          return new Vector3(x, y, z);
        }),
        closed,
        'catmullrom',
        0.5,
      ),
    [signature, closed],
  );
  // Vecteurs temporaires réutilisés : zéro allocation par frame.
  const tmp = useMemo(() => ({ pos: new Vector3(), tan: new Vector3(), look: new Vector3() }), []);
  const time = useRef(0);
  const key = useRef(restartKey);
  const fired = useRef(false);
  const cb = useLatest(onFrame);
  const doneCb = useLatest(onDone);

  useFrame((_state, delta) => {
    const o = objectRef.current;
    if (!o) return;
    if (key.current !== restartKey) {
      key.current = restartKey;
      time.current = 0;
      fired.current = false;
    }
    if (playing) time.current += clampDelta(delta);

    const d = Math.max(1e-6, duration);
    const raw = time.current / d + offset;
    const done = !loop && raw >= 1;
    const u = clamp01(loop ? raw - Math.floor(raw) : raw);
    const s = clamp01(easing(u));

    curve.getPointAt(s, tmp.pos); // getPointAt = paramétré par la LONGUEUR
    o.position.copy(tmp.pos);

    if (orient) {
      curve.getTangentAt(s, tmp.tan);
      o.lookAt(tmp.look.copy(tmp.pos).add(tmp.tan));
    }
    cb.current?.(s, tmp.pos);

    if (done && !fired.current) {
      fired.current = true;
      doneCb.current?.();
    }
  });
  return null;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* §7 — BRUIT DOUX DÉTERMINISTE (micro-mouvements)                            */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Angle d'or (≈ 2,3999 rad). Sert à répartir N objets identiques sans jamais
 * les synchroniser — et sans `Math.random()`.
 */
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Déphasage déterministe et « bien réparti » pour l'objet numéro `i`, ∈ [0, 1[.
 *
 * @example
 * // 12 bulles qui montent sans jamais être alignées
 * bulles.map((b, i) => <mesh key={i} position-y={((t + goldenPhase(i)) % 1) * 2} />)
 */
export function goldenPhase(i: number): number {
  const x = i * 0.6180339887498949; // 1/φ
  return x - Math.floor(x);
}

/** Hachage entier → [0, 1[ : déterministe, sans état, sans `Math.random()`. */
export function hash01(i: number, seed = 0): number {
  let h = Math.imul((i | 0) ^ ((seed | 0) + 0x9e3779b9), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * Bruit de valeur 1D lisse (C¹), dans [−1, 1], DÉTERMINISTE.
 * Une unité de `t` = une « bosse ». Aucune trace de `Math.random()`.
 *
 * @example
 * // frémissement d'un liquide
 * surface.position.y = base + noise1D(t * 1.5, 7) * 0.01;
 */
export function noise1D(t: number, seed = 0): number {
  const i = Math.floor(t);
  const f = t - i;
  const u = smootherstep(f);
  const a = hash01(i, seed) * 2 - 1;
  const b = hash01(i + 1, seed) * 2 - 1;
  return mix(a, b, u);
}

/**
 * Bruit fractal 1D (somme d'octaves) dans [−1, 1] : plus organique que
 * {@link noise1D}, pour un flottement crédible.
 *
 * @example
 * const y = base + fbm1D(t * 0.6, seed, 3) * 0.04; // objet qui flotte
 */
export function fbm1D(t: number, seed = 0, octaves = 3): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let freq = 1;
  const n = Math.max(1, Math.min(6, octaves | 0));
  for (let o = 0; o < n; o++) {
    sum += noise1D(t * freq, seed + o * 131) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return norm > 0 ? sum / norm : 0;
}

/**
 * Micro-mouvement continu d'un objet (flottement, frémissement, respiration)
 * à partir d'un bruit doux déterministe — aucun `Math.random()`, donc la scène
 * reste reproductible.
 *
 * ⚠️ `Float` PILOTE la position (et éventuellement la rotation) de l'objet :
 * il repart de la pose lue à la première frame, ou de `base` si fourni. Ne pas
 * écrire la même propriété ailleurs dans la scène.
 *
 * @example
 * // globule qui flotte dans le plasma, décalé pour chaque instance
 * <LabScene>
 *   <mesh ref={cellule} position={[0.4, 0.2, 0]} />
 *   <Float objectRef={cellule} amplitude={0.05} speed={0.5} seed={i} rotation={0.08} />
 * </LabScene>
 */
export function Float({
  objectRef,
  amplitude = 0.03,
  speed = 0.5,
  seed = 0,
  rotation = 0,
  base,
  octaves = 3,
}: {
  /** Ref de l'objet à faire flotter (enfant de <LabScene>). */
  objectRef: Object3DRef;
  /** Amplitude du déplacement, en unités de scène (défaut 0,03). */
  amplitude?: number;
  /** Vitesse du flottement, en « bosses » par seconde (défaut 0,5). */
  speed?: number;
  /** Graine : deux objets de graines différentes ne flottent jamais ensemble. */
  seed?: number;
  /** Amplitude de la rotation parasite, en radians (défaut 0 = pas de rotation). */
  rotation?: number;
  /** Pose de référence [x, y, z] ; par défaut celle lue à la première frame. */
  base?: readonly [number, number, number];
  /** Nombre d'octaves du bruit (1 = très lisse, 4 = plus nerveux). */
  octaves?: number;
}) {
  const anchor = useRef<[number, number, number] | null>(null);
  const rotAnchor = useRef<[number, number, number] | null>(null);
  // Un déphasage par axe ET par graine : jamais de mouvement en diagonale pure.
  const s = useMemo(() => {
    const k = Math.round(seed);
    return [k * 17 + 1, k * 17 + 977, k * 17 + 4231, k * 17 + 6151];
  }, [seed]);

  useFrame((state) => {
    const o = objectRef.current;
    if (!o) return;
    if (!anchor.current) {
      anchor.current = base
        ? [base[0], base[1], base[2]]
        : [o.position.x, o.position.y, o.position.z];
      rotAnchor.current = [o.rotation.x, o.rotation.y, o.rotation.z];
    }
    const t = state.clock.elapsedTime * speed + goldenPhase(Math.round(seed)) * 10;
    const [bx, by, bz] = anchor.current;
    o.position.set(
      bx + fbm1D(t, s[0], octaves) * amplitude,
      // l'axe vertical bouge un peu plus : c'est ce qui « lit » comme un flottement
      by + fbm1D(t * 0.83, s[1], octaves) * amplitude * 1.35,
      bz + fbm1D(t * 1.17, s[2], octaves) * amplitude,
    );
    if (rotation !== 0 && rotAnchor.current) {
      const [rx, ry, rz] = rotAnchor.current;
      o.rotation.set(
        rx + fbm1D(t * 0.7, s[3], octaves) * rotation,
        ry + fbm1D(t * 0.55, s[3] + 13, octaves) * rotation,
        rz + fbm1D(t * 0.9, s[3] + 29, octaves) * rotation,
      );
    }
  });
  return null;
}
