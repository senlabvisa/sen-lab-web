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

// Animation (useFrame sûr, à placer DANS <LabScene>)
export { Animate } from './anim';
