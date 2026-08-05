'use client';

/**
 * lab3d/organe — pièces anatomiques réelles (modèles 3D scannés) dans les TP.
 *
 * Le reste du kit lab3d construit ses objets à partir de primitives (sphères,
 * cylindres) : c'est parfait pour un SCHÉMA, où la simplification est le but.
 * Ce fichier apporte l'autre registre : la PIÈCE RÉELLE, avec ses volumes et
 * ses reliefs, pour que l'élève relie enfin le schéma du tableau à l'organe.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ CONTRAINTES RESPECTÉES ICI                                              │
 * │                                                                          │
 * │ • Aucun CDN. `useGLTF(url, false, …)` désactive Draco, dont le décodeur  │
 * │   est sinon téléchargé depuis gstatic.com — ce qui casserait le mode     │
 * │   100 % hors-ligne. Nos modèles sont compressés en meshopt, dont le      │
 * │   décodeur est embarqué dans le bundle.                                  │
 * │ • Repère normalisé. Chaque modèle est ramené dans un cube d'arête        │
 * │   TAILLE_NORMEE centré sur l'origine, quelle que soit son échelle        │
 * │   d'origine : les points d'intérêt de `lib/anatomie/organes.ts` ont      │
 * │   donc le même sens pour les neuf organes.                               │
 * │ • Matériaux clonés par instance : le fil de fer ou la coupe d'un TP ne   │
 * │   déteint pas sur l'atlas ouvert dans un autre onglet du même cache.     │
 * │ • <Organe3D> appelle useFrame : il doit être enfant de <LabScene>.       │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * @example
 * <LabScene cameraPosition={[0, 0, 7]} groundY={null}>
 *   <Organe3D src="/anatomie/modeles/coeur.glb" autoRotate />
 * </LabScene>
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import {
  BackSide,
  Box3,
  Color,
  FrontSide,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix3,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Plane,
  SRGBColorSpace,
  Vector3,
  type Material,
  type Object3D,
  type Vector3Tuple,
} from 'three';
import { Tag3D, type Tone } from './annotations';

/**
 * Arête du cube dans lequel chaque organe est inscrit. Toutes les positions de
 * points d'intérêt sont exprimées dans ce repère : ne pas la changer sans
 * reprendre `lib/anatomie/organes.ts`.
 */
export const TAILLE_NORMEE = 3.8;

/** Orientation de départ : l'organe est vu de trois quarts, pas de face. */
const POSE_INITIALE: Vector3Tuple = [0.05, -0.28, 0];

export type PointOrgane = {
  id: string;
  label: string;
  detail: string;
  position: Vector3Tuple;
  couleur: string;
};

export type Organe3DProps = {
  /** Chemin du .glb, typiquement `modeleUrl(id)`. */
  src: string;
  /** Facteur appliqué après normalisation (1 = cube d'arête TAILLE_NORMEE). */
  echelle?: number;
  /** Rotation lente et continue, comme une pièce qu'on présente. */
  autoRotate?: boolean;
  /** Tours par minute de la rotation automatique. */
  vitesseRotation?: number;
  /** Coupe le modèle par un plan vertical pour montrer l'intérieur. */
  coupe?: boolean;
  /** Affiche le maillage : on voit la structure sous la surface. */
  filDeFer?: boolean;
  /** Rend les tissus translucides pour voir les repères situés derrière. */
  transparence?: boolean;
  /** Matière de la tranche pendant la coupe. Un ton sourd de l'organe convient. */
  couleurCoupe?: string;
  /**
   * Distance caméra ↔ organe visée. Change de valeur = la caméra s'en approche
   * ou s'en éloigne en douceur.
   */
  distance?: number;
  /** Incrémenter cette valeur remet la pièce dans sa pose de départ. */
  cleReset?: number;
  /** Points cliquables ; le libellé s'affiche à la sélection. */
  points?: readonly PointOrgane[];
  /** Point sélectionné (composant contrôlé). */
  pointActif?: string | null;
  onPointClick?: (id: string) => void;
  /** Teinte des étiquettes du kit lab3d. */
  tone?: Tone;
  position?: Vector3Tuple;
};

/**
 * Réglages repris du visualiseur d'origine. Sans eux, un modèle scanné rend
 * « plastique » et scintille dès qu'il tourne : l'anisotropie stabilise le
 * détail des textures en incidence rasante, et brider la rugosité empêche les
 * reflets de sauter d'une image à l'autre.
 */
function reglerMateriau(materiau: Material, anisotropie: number) {
  materiau.transparent = false;
  materiau.opacity = 1;
  materiau.depthWrite = true;

  if (!(materiau instanceof MeshStandardMaterial)) return;

  materiau.roughness = Math.min(Math.max(materiau.roughness ?? 0.5, 0.42), 0.62);
  materiau.metalness = 0;
  materiau.envMapIntensity = 0.32;
  materiau.emissiveIntensity = 0;
  if (materiau.map) materiau.map.colorSpace = SRGBColorSpace;
  if (materiau.normalMap) materiau.normalScale.multiplyScalar(0.62);

  for (const carte of [
    materiau.map,
    materiau.normalMap,
    materiau.roughnessMap,
    materiau.metalnessMap,
    materiau.aoMap,
    materiau.emissiveMap,
  ]) {
    if (!carte) continue;
    carte.anisotropy = anisotropie;
    carte.generateMipmaps = true;
    carte.minFilter = LinearMipmapLinearFilter;
    carte.magFilter = LinearFilter;
    carte.needsUpdate = true;
  }
  materiau.needsUpdate = true;
}

/**
 * Cônes de direction, du plus serré au plus large. Le dernier accepte tout.
 * Ils servent à garder un repère du CÔTÉ de l'organe que les données visent :
 * sans eux, le sommet le plus proche peut se trouver sur la face opposée et la
 * pastille traverse la pièce.
 */
const CONES_DIRECTION = [0.94, 0.82, 0.6, -1.1];
/**
 * De combien la pastille est décollée de la surface.
 *
 * Doit rester supérieur au rayon de la pastille (0,12 au maximum) : sinon la
 * sphère est enterrée dans le maillage et le test de profondeur n'en laisse
 * dépasser qu'une calotte à peine visible.
 */
const DECOLLEMENT = 0.14;

type Candidat = { distance: number; index: number; point: Vector3; maillage: Mesh };

/**
 * Pose chaque repère SUR la coque du modèle.
 *
 * Les coordonnées de `lib/anatomie/organes.ts` sont saisies à la main : elles
 * indiquent une intention (« vers la queue du pancréas »), pas un point exact
 * de la surface. Telles quelles, une pastille flotte à côté de l'organe ou
 * disparaît à l'intérieur — c'est très visible sur les organes allongés.
 *
 * Un seul passage linéaire sur les sommets, à l'ouverture de la pièce : bien
 * moins coûteux et bien plus stable qu'un lancer de rayon à chaque image.
 */
function poserSurLaSurface(points: readonly PointOrgane[], racine: Object3D): Vector3[] {
  const cibles = points.map((point) => new Vector3(...point.position));
  if (cibles.length === 0) return cibles;

  const directions = cibles.map((cible) => cible.clone().normalize());
  const paliers: (Candidat | null)[][] = cibles.map(() => CONES_DIRECTION.map(() => null));

  racine.updateWorldMatrix(true, true);
  const versRacine = new Matrix4().copy(racine.matrixWorld).invert();
  const locale = new Matrix4();
  const sommet = new Vector3();
  let trouve = false;

  racine.traverse((enfant) => {
    if (!(enfant instanceof Mesh)) return;
    const positions = enfant.geometry.getAttribute('position');
    if (!positions) return;
    trouve = true;
    locale.multiplyMatrices(versRacine, enfant.matrixWorld);

    for (let i = 0; i < positions.count; i += 1) {
      sommet.fromBufferAttribute(positions, i).applyMatrix4(locale);
      const rayon = sommet.length();
      for (let h = 0; h < cibles.length; h += 1) {
        const distance = sommet.distanceToSquared(cibles[h]);
        const cosinus = rayon > 1e-5 ? sommet.dot(directions[h]) / rayon : 1;
        for (let t = 0; t < CONES_DIRECTION.length; t += 1) {
          if (cosinus < CONES_DIRECTION[t]) continue;
          const meilleur = paliers[h][t];
          if (meilleur && meilleur.distance <= distance) continue;
          if (meilleur) {
            meilleur.distance = distance;
            meilleur.index = i;
            meilleur.maillage = enfant;
            meilleur.point.copy(sommet);
          } else {
            paliers[h][t] = { distance, index: i, maillage: enfant, point: sommet.clone() };
          }
        }
      }
    }
  });

  if (!trouve) return cibles;

  const normale = new Vector3();
  const matriceNormale = new Matrix3();
  return cibles.map((cible, h) => {
    const choisi = paliers[h].find(Boolean);
    if (!choisi) return cible;
    const normales = choisi.maillage.geometry.getAttribute('normal');
    if (normales) {
      locale.multiplyMatrices(versRacine, choisi.maillage.matrixWorld);
      matriceNormale.getNormalMatrix(locale);
      normale.fromBufferAttribute(normales, choisi.index).applyMatrix3(matriceNormale).normalize();
    } else {
      normale.copy(choisi.point).normalize();
    }
    // Décoller vers l'extérieur même si le triangle le plus proche regarde
    // vers l'intérieur.
    if (normale.dot(choisi.point) < 0) normale.negate();
    return choisi.point.clone().addScaledVector(normale, DECOLLEMENT);
  });
}

function pourChaqueMateriau(objet: Object3D, fn: (materiau: Material) => void) {
  objet.traverse((enfant) => {
    if (!(enfant instanceof Mesh)) return;
    const materiaux = Array.isArray(enfant.material) ? enfant.material : [enfant.material];
    materiaux.forEach(fn);
  });
}

/**
 * Charge le modèle, le clone, règle ses matériaux et l'inscrit dans le cube
 * normalisé — puis pose les repères sur sa surface.
 *
 * Les deux vont ensemble : les repères sont projetés sur CETTE pièce-là, celle
 * qui sera rendue. Les séparer ferait dériver les pastilles dès qu'on toucherait
 * à la normalisation.
 */
function usePiecePreparee(src: string, points: readonly PointOrgane[]) {
  const gl = useThree((state) => state.gl);
  const { scene } = useGLTF(src, false);

  return useMemo(() => {
    const copie = scene.clone(true);

    // Matériaux clonés : les réglages et les outils restent locaux à ce montage.
    const anisotropie = Math.min(8, gl.capabilities.getMaxAnisotropy());
    copie.traverse((enfant) => {
      if (!(enfant instanceof Mesh)) return;
      enfant.material = Array.isArray(enfant.material)
        ? enfant.material.map((m) => m.clone())
        : enfant.material.clone();
      // Un seul organe, toujours au centre du cadre : le frustum culling ne
      // peut ici que faire disparaître la pièce à tort, jamais économiser.
      enfant.frustumCulled = false;
      enfant.castShadow = false;
      enfant.receiveShadow = false;
    });
    pourChaqueMateriau(copie, (materiau) => reglerMateriau(materiau, anisotropie));

    // Normalisation dans le cube d'arête TAILLE_NORMEE, centré sur l'origine.
    const boite = new Box3().setFromObject(copie);
    const dimensions = boite.getSize(new Vector3());
    const centre = boite.getCenter(new Vector3());
    const facteur = TAILLE_NORMEE / Math.max(dimensions.x, dimensions.y, dimensions.z, 0.001);
    copie.scale.setScalar(facteur);
    copie.position.copy(centre.multiplyScalar(-facteur));

    /**
     * La projection des repères a besoin d'un parent NEUTRE.
     *
     * Les coordonnées de `organes.ts` vivent dans l'espace normalisé — celui où
     * la pièce tient dans un cube d'arête TAILLE_NORMEE. Or `copie` porte
     * elle-même la mise à l'échelle : la prendre pour repère renverrait les
     * sommets dans l'espace du modèle brut, à une tout autre échelle, et les
     * pastilles atterriraient n'importe où. Ce groupe sans transformation rétablit
     * le bon référentiel.
     */
    const racine = new Group();
    racine.add(copie);

    return { piece: racine, positions: poserSurLaSurface(points, racine) };
  }, [scene, gl, points]);
}

/**
 * Le modèle lui-même : rendu, outils, doublure de coupe.
 *
 * ⚠ Ce que ces modèles SONT, et ce qu'ils ne sont pas.
 * Chaque .glb est un maillage unique — une enveloppe extérieure, sans aucune
 * géométrie interne : ni cavités du cœur, ni lobes séparés. Deux conséquences
 * qu'aucune astuce de rendu ne lèvera :
 *   • couper la pièce ne peut pas révéler les quatre cavités : elles n'existent
 *     pas dans le fichier. La coupe montre une SECTION DE L'ENVELOPPE, et
 *     l'interface doit le dire (voir la mention dans la visionneuse).
 *   • isoler une structure nommée est impossible : il n'y a qu'un seul objet.
 * Pour l'intérieur d'un organe, la scène schématique du TP reste l'outil juste.
 */
function Piece({
  piece,
  coupe,
  filDeFer,
  transparence,
  couleurCoupe,
}: {
  piece: Object3D;
  coupe: boolean;
  filDeFer: boolean;
  transparence: boolean;
  couleurCoupe: string;
}) {
  const gl = useThree((state) => state.gl);

  /**
   * Le plan retire la moitié AVANT de la pièce et garde celle du fond : la
   * surface tranchée fait alors directement face à la caméra, et l'élève
   * regarde DANS la coupe.
   *
   * Les deux autres orientations ont été essayées et écartées : couper
   * l'arrière ne change rien à l'image (on voit toujours la façade intacte), et
   * une coupe latérale n'expose qu'une arête vue par la tranche — ce qui se lit
   * « la moitié de l'organe a disparu » plutôt que « l'organe est ouvert ».
   *
   * `constant` glisse de TAILLE_NORMEE (pièce entière) à 0 (coupe à mi-corps) :
   * c'est un scalpel qui traverse, pas une moitié qui s'éteint d'un coup.
   */
  const planCoupe = useMemo(() => new Plane(new Vector3(0, 0, -1), TAILLE_NORMEE), []);

  /**
   * Doublure interne : les mêmes faces, vues de l'intérieur, dans une matière
   * mate et sombre.
   *
   * Sans elle, une pièce coupée laisse voir sa propre surface extérieure par
   * l'intérieur — éclairée comme une surface exposée. L'élève lit alors « objet
   * creux et cassé » plutôt que « organe tranché ». La doublure donne à la
   * tranche l'aspect d'une matière, sans prétendre montrer des structures
   * internes qui n'existent pas dans le maillage.
   *
   * `clone` partage les géométries : seuls les matériaux sont nouveaux.
   */
  const doublure = useMemo(() => {
    // L'appelant fournit la couleur de l'organe ; on l'assombrit ici. Une
    // tranche rendue dans la teinte vive de la surface se lit « plastique »,
    // alors que la même teinte assombrie se lit « matière ».
    const teinte = new Color(couleurCoupe).multiplyScalar(0.45);

    const copie = piece.clone(true);
    copie.traverse((enfant) => {
      if (!(enfant instanceof Mesh)) return;
      enfant.material = new MeshStandardMaterial({
        color: teinte,
        roughness: 0.95,
        metalness: 0,
        side: BackSide,
      });
      enfant.frustumCulled = false;
    });
    return copie;
  }, [piece, couleurCoupe]);

  // Le découpage local doit être activé sur le renderer, sinon
  // `material.clippingPlanes` est ignoré silencieusement.
  useEffect(() => {
    if (coupe) gl.localClippingEnabled = true;
  }, [gl, coupe]);

  useEffect(() => {
    pourChaqueMateriau(doublure, (materiau) => {
      materiau.clippingPlanes = coupe ? [planCoupe] : null;
      materiau.needsUpdate = true;
    });
  }, [doublure, coupe, planCoupe]);

  useEffect(() => {
    pourChaqueMateriau(piece, (materiau) => {
      materiau.clippingPlanes = coupe ? [planCoupe] : null;
      if (materiau instanceof MeshStandardMaterial) materiau.wireframe = filDeFer;
      // Les faces internes sont rendues par la doublure, avec sa propre matière :
      // la pièce elle-même reste en face avant.
      materiau.side = FrontSide;
      materiau.transparent = transparence;
      materiau.opacity = transparence ? 0.42 : 1;
      // Sans cette ligne, une surface translucide masque quand même ce qui est
      // derrière elle : elle continue d'écrire dans le tampon de profondeur.
      materiau.depthWrite = !transparence;
      materiau.needsUpdate = true;
    });
  }, [piece, coupe, filDeFer, transparence, planCoupe]);

  // Glissement du plan : 0 = pièce entière, ~1,1 = coupe à mi-hauteur.
  useFrame((_, delta) => {
    const cible = coupe ? 0 : TAILLE_NORMEE;
    const pas = Math.min(1, delta * 3.2);
    planCoupe.constant += (cible - planCoupe.constant) * pas;
  });

  return (
    <>
      <primitive object={piece} />
      {/* La doublure ne coûte une passe de rendu que pendant la coupe. */}
      {coupe && <primitive object={doublure} />}
    </>
  );
}

/**
 * Rapproche ou éloigne la caméra en douceur.
 *
 * On déplace la caméra le long de sa propre direction plutôt que de piloter
 * les OrbitControls : <LabScene> ne les expose pas, et les contrôles repartent
 * de toute façon de la position réelle de la caméra à chaque image. Le geste de
 * l'élève (molette, pincement) reste donc prioritaire.
 */
function DistanceCamera({ distance }: { distance: number }) {
  const camera = useThree((state) => state.camera);

  useFrame((_, delta) => {
    const actuelle = camera.position.length();
    if (Math.abs(actuelle - distance) < 0.01) return;
    const pas = Math.min(1, delta * 4);
    camera.position.multiplyScalar(1 + ((distance / actuelle) - 1) * pas);
  });

  return null;
}

/** Pastille cliquable posée sur une structure de l'organe. */
function Point({
  point,
  position,
  actif,
  onClick,
}: {
  point: PointOrgane;
  /** Position projetée sur la surface, calculée une fois par pièce. */
  position: Vector3;
  actif: boolean;
  onClick: () => void;
}) {
  const [survol, setSurvol] = useState(false);
  const halo = useRef<Mesh>(null);

  useFrame((state) => {
    if (!halo.current) return;
    // Le point actif respire : on le retrouve du regard même quand la pièce
    // tourne et qu'il passe derrière un volume.
    const pulsation = actif ? 1 + 0.18 * Math.sin(state.clock.elapsedTime * 3) : 1;
    halo.current.scale.setScalar(pulsation);
  });

  // Assez gros pour rester touchable au doigt sur un téléphone d'entrée de gamme.
  const rayon = actif || survol ? 0.12 : 0.095;

  return (
    <group position={position}>
      {/* Pastille pleine, occultée normalement par les tissus : c'est ce qui
          indique qu'un repère est bien du côté que l'élève regarde. */}
      <mesh
        ref={halo}
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setSurvol(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setSurvol(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[rayon, 16, 12]} />
        <meshBasicMaterial color={point.couleur} toneMapped={false} />
      </mesh>

      {/* Liseré sombre : il détache la pastille des tissus, souvent de la même
          famille de couleurs qu'elle. Rendu en faces ARRIÈRE et légèrement plus
          grand, il ne se voit donc qu'au pourtour — une sphère translucide
          englobante, elle, repeindrait la pastille et la délaverait. */}
      <mesh scale={1.22}>
        <sphereGeometry args={[rayon, 16, 12]} />
        <meshBasicMaterial color="#1E293B" side={BackSide} toneMapped={false} />
      </mesh>

      {/* Rémanence : un repère situé de l'autre côté de la pièce reste visible
          en transparence. Sans elle, un point disparaît complètement dès qu'un
          volume passe devant, et l'élève croit l'avoir perdu. */}
      <mesh scale={0.8} renderOrder={999}>
        <sphereGeometry args={[rayon, 12, 8]} />
        <meshBasicMaterial
          color={point.couleur}
          transparent
          opacity={0.3}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/**
 * Une pièce anatomique réelle, prête à être posée dans n'importe quelle scène.
 * À monter DANS <LabScene>.
 */
export function Organe3D({
  src,
  echelle = 1,
  autoRotate = false,
  vitesseRotation = 3,
  coupe = false,
  filDeFer = false,
  transparence = false,
  couleurCoupe = '#7A3B3B',
  distance,
  cleReset = 0,
  points = [],
  pointActif = null,
  onPointClick,
  tone = 'svt',
  position = [0, 0, 0],
}: Organe3DProps) {
  const pivot = useRef<Group>(null);
  const { piece, positions } = usePiecePreparee(src, points);

  useEffect(() => {
    pivot.current?.rotation.set(...POSE_INITIALE);
  }, [src, cleReset]);

  useFrame((_, delta) => {
    if (!autoRotate || !pivot.current) return;
    pivot.current.rotation.y += delta * ((vitesseRotation * Math.PI * 2) / 60);
  });

  const indexSelection = points.findIndex((point) => point.id === pointActif);
  const selection = indexSelection >= 0 ? points[indexSelection] : null;
  const positionSelection = indexSelection >= 0 ? positions[indexSelection] : null;

  return (
    <group position={position} scale={echelle}>
      {distance !== undefined && <DistanceCamera distance={distance} />}
      <group ref={pivot} rotation={POSE_INITIALE}>
        <Piece
          piece={piece}
          coupe={coupe}
          filDeFer={filDeFer}
          transparence={transparence}
          couleurCoupe={couleurCoupe}
        />
        {points.map((point, index) => (
          <Point
            key={point.id}
            point={point}
            position={positions[index]}
            actif={point.id === pointActif}
            onClick={() => onPointClick?.(point.id)}
          />
        ))}
        {selection && positionSelection && (
          <Tag3D
            position={[positionSelection.x, positionSelection.y + 0.32, positionSelection.z]}
            label={selection.label}
            tone={tone}
          />
        )}
      </group>
    </group>
  );
}
