/**
 * lab3d — kit 3D réaliste partagé par tous les TP « Lab Premium ».
 *
 * Import unique :  import { LabScene, Beaker, Wire, FunctionCurve } from '@/components/lab3d';
 *
 * Toujours monter une scène dans <LabScene> et charger le fichier scène via
 * next/dynamic({ ssr: false }) depuis le module.tsx du TP.
 */

export { LabScene } from '@/components/lab/lab-scene';

// Matériaux & données
export {
  Glass,
  GlassThin,
  Metal,
  Plastic,
  Liquid,
  CPK_COLOR,
  ATOM_RADIUS,
  SUBJECT_3D,
  useThreeColor,
  type Element,
  type GlassProps,
} from './materials';

// Annotations
export { SceneLabel, Tag3D, Readout, HotspotCoach, type Tone } from './annotations';

// Environnement
export { LabBench, GraphPaper, Segment, Stand } from './environment';

// Verrerie
export { Beaker, Erlenmeyer, TestTube, GraduatedCylinder, Burette, Drop } from './glassware';

// Électricité
export { Wire, Battery, Resistor, Rheostat, Bulb, Switch, Meter, BAND_COLORS } from './electric';

// Tracé / maths
export { Arrow3D, Axes2D, FunctionCurve, PolyLine, DataPoints, Marker, Bar } from './plot';

// Molécules / ADN
export { Atom, Bond, Molecule, DNAHelix, MOLECULES, type AtomSpec, type BondSpec } from './molecule';

// Anatomie — pièces réelles (modèles scannés) à côté des schémas en primitives.
// <Organe3D> appelle useFrame : enfant de <LabScene>.
//
// Pas de préchargement au survol ici, volontairement : chaque pièce pèse 2 à
// 6 Mo, et survoler la liste en déclencherait jusqu'à 31 Mo sur une connexion
// souvent facturée au volume. Le téléchargement reste un geste choisi
// (« Emporter hors ligne »), jamais une conséquence d'un mouvement de doigt.
export { Organe3D, TAILLE_NORMEE, type Organe3DProps, type PointOrgane } from './organe';

// Animation (useFrame sûr, à placer DANS <LabScene>)
export { Animate } from './anim';

// Mouvement réaliste — easings, amortissement, ressorts, timeline, physique, bruit.
// Les COMPOSANTS (<Spring>, <Timeline>, <Float>…) appellent useFrame : enfants de <LabScene>.
// Les FONCTIONS (easings, damp, timelineAt…) sont pures et utilisables partout.
export {
  // easings
  linear, easeIn, easeOut, easeInOut, easeInCubic, easeOutCubic, easeInOutSine,
  smoothstep, smootherstep, easeInBack, easeOutBack, easeInOutBack,
  easeInElastic, easeOutElastic, easeInBounce, easeOutBounce,
  elastic, back, bounce, EASINGS, ease, type EasingFn, type EasingName,
  // amortissement indépendant du framerate
  damp, dampHalfLife, dampAngle, damp3,
  // ressorts
  createSpring, Spring, SpringTo, SPRING_PRESETS, type Spring1D,
  // timeline
  timelineAt, Timeline, type TimelineFrame,
  // physique
  oscillate, Oscillate, pendulumPeriod, springPeriod, fallWithBounces, FallBounce, AlongPath,
  // bruit déterministe (jamais Math.random au rendu)
  GOLDEN_ANGLE, goldenPhase, hash01, noise1D, fbm1D, Float,
  // utilitaires
  MAX_DELTA, clampDelta, clamp01, mix, remap,
} from './anim';

// Pédagogie — l'animation explique au lieu de décorer.
// useStepClock/AutoNarration/ValueTrail/FocusHalo appellent useFrame : enfants de <LabScene>.
export {
  StepNarration, AutoNarration, useStepClock,
  GhostState, DimGroup,
  ValueTrail, FocusHalo, Callout,
  CompareCard, ObservationCue, LegendCard,
  type NarrationStep, type CompareValue, type LegendItem,
} from './annotations';
