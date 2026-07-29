/**
 * Bilan radiatif de la Terre — modèle « une couche atmosphérique grise ».
 *
 * Modèle enseigné en Terminale : l'atmosphère est traitée comme une couche
 * unique, transparente au rayonnement solaire (visible) mais partiellement
 * opaque au rayonnement infrarouge (émissivité ε). C'est une simplification
 * assumée, mais elle donne les bons ordres de grandeur :
 *   - température d'équilibre SANS effet de serre : ≈ −18 °C ;
 *   - température réelle moyenne (280 ppm, ère préindustrielle) : ≈ +14 °C ;
 *   - effet de serre naturel : ≈ +33 °C. Il est INDISPENSABLE à la vie.
 *
 * Aucune dépendance three.js ici : ce fichier est importé à la fois par
 * module.tsx (rendu côté serveur possible) et par scene.tsx (client only).
 */

/** Constante solaire au sommet de l'atmosphère (W·m⁻²). */
export const SOLAR_CONSTANT = 1361;
/** Constante de Stefan-Boltzmann (W·m⁻²·K⁻⁴). */
export const SIGMA = 5.67e-8;
/** Concentration de CO₂ avant l'industrialisation (ppm). */
export const CO2_PREINDUSTRIEL = 280;
/** Concentration de CO₂ mesurée aujourd'hui (ppm, ordre de grandeur 2024). */
export const CO2_ACTUEL = 420;
/** Albédo planétaire moyen (part du rayonnement solaire renvoyée vers l'espace). */
export const ALBEDO_TERRE = 0.3;

/** Sensibilité climatique à l'équilibre (K par W·m⁻²) → ≈ 3 °C par doublement. */
const LAMBDA = 0.8;
/** Température moyenne de surface à 280 ppm (°C). */
const T_PREINDUSTRIEL_C = 13.8;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Forçage radiatif du CO₂ (W·m⁻²) : ΔF = 5,35 · ln(C/C₀). */
export function forcing(co2: number): number {
  return 5.35 * Math.log(Math.max(1, co2) / CO2_PREINDUSTRIEL);
}

/**
 * Émissivité infrarouge de la couche atmosphérique, calée pour que le modèle
 * reproduise exactement la loi de forçage ci-dessus à albédo standard.
 */
export function emissivity(co2: number): number {
  const teffRef = Math.pow(((SOLAR_CONSTANT / 4) * (1 - ALBEDO_TERRE)) / SIGMA, 0.25);
  const tsRef = 273.15 + T_PREINDUSTRIEL_C + LAMBDA * forcing(co2);
  return clamp(2 * (1 - Math.pow(teffRef / tsRef, 4)), 0, 0.97);
}

export type Budget = {
  /** Flux solaire moyen reçu par m² de surface terrestre (S/4). */
  incoming: number;
  /** Flux réfléchi vers l'espace (albédo). */
  reflected: number;
  /** Flux solaire réellement absorbé par le système Terre. */
  absorbed: number;
  /** Température d'équilibre SANS effet de serre (K puis °C). */
  teff: number;
  teffC: number;
  /** Opacité infrarouge de l'atmosphère (0 = transparente, 1 = corps noir). */
  eps: number;
  /** Température d'équilibre de la surface (K puis °C). */
  ts: number;
  tsC: number;
  /** Flux infrarouge émis par le sol (loi de Stefan-Boltzmann). */
  surfEmit: number;
  /** Contre-rayonnement : l'IR renvoyé vers le sol par l'atmosphère. */
  back: number;
  /** Forçage radiatif dû au CO₂ (W·m⁻²). */
  forcing: number;
  /** Intensité de l'effet de serre (°C gagnés grâce à l'atmosphère). */
  greenhouse: number;
};

export function budget(co2: number, albedo: number = ALBEDO_TERRE): Budget {
  const a = clamp(albedo, 0.05, 0.9);
  const incoming = SOLAR_CONSTANT / 4;
  const reflected = incoming * a;
  const absorbed = incoming - reflected;
  const teff = Math.pow(absorbed / SIGMA, 0.25);
  const eps = emissivity(co2);
  const ts = teff * Math.pow(1 - eps / 2, -0.25);
  const surfEmit = SIGMA * Math.pow(ts, 4);
  return {
    incoming,
    reflected,
    absorbed,
    teff,
    teffC: teff - 273.15,
    eps,
    ts,
    tsC: ts - 273.15,
    surfEmit,
    back: Math.max(0, surfEmit - absorbed),
    forcing: forcing(co2),
    greenhouse: ts - teff,
  };
}

export type ClimatePoint = { year: number; co2: number; dT: number };

/**
 * Relevés du CO₂ (carottes de glace puis Mauna Loa) et anomalie de température
 * globale par rapport à 1850-1900. Après 2024 : projection à fortes émissions.
 */
export const OBSERVED: ClimatePoint[] = [
  { year: 1850, co2: 285, dT: -0.05 },
  { year: 1880, co2: 291, dT: -0.1 },
  { year: 1900, co2: 296, dT: -0.15 },
  { year: 1920, co2: 303, dT: -0.15 },
  { year: 1940, co2: 311, dT: 0.15 },
  { year: 1960, co2: 317, dT: 0.1 },
  { year: 1980, co2: 339, dT: 0.35 },
  { year: 2000, co2: 369, dT: 0.6 },
  { year: 2010, co2: 389, dT: 0.9 },
  { year: 2020, co2: 414, dT: 1.2 },
  { year: 2024, co2: 422, dT: 1.35 },
];

export const PROJECTED: ClimatePoint[] = [
  { year: 2024, co2: 422, dT: 1.35 },
  { year: 2040, co2: 500, dT: 1.9 },
  { year: 2060, co2: 590, dT: 2.7 },
  { year: 2080, co2: 690, dT: 3.5 },
  { year: 2100, co2: 800, dT: 4.4 },
];

const ALL: ClimatePoint[] = [...OBSERVED, ...PROJECTED.slice(1)];

/** Année (approx.) à laquelle l'atmosphère atteint la concentration donnée. */
export function yearForCo2(co2: number): number {
  if (co2 <= ALL[0].co2) return ALL[0].year;
  for (let i = 1; i < ALL.length; i++) {
    const a = ALL[i - 1];
    const b = ALL[i];
    if (co2 <= b.co2) {
      const t = (co2 - a.co2) / (b.co2 - a.co2 || 1);
      return Math.round(a.year + t * (b.year - a.year));
    }
  }
  return ALL[ALL.length - 1].year;
}
