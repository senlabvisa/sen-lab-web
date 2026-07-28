'use client';

import { useMemo, useRef } from 'react';
import { Mesh } from 'three';
import type { Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Animate } from '@/components/lab3d/anim';
import { PolyLine, Marker, Arrow3D } from '@/components/lab3d/plot';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';

/**
 * Scène 3D — miroirs sphériques (optique, Première S, Bac).
 *
 * Calotte métallique réfléchissante (meshStandardMaterial metalness élevé),
 * axe optique, centre C et foyer F, un objet et les rayons réfléchis qui
 * forment l'image. Optique juste : f = R/2 ; relation de conjugaison
 * 1/OA' = 1/f - 1/OA, grandissement γ = -OA'/OA. Construit sur le kit lab3d.
 */

export type MirrorSceneProps = { kind: 'concave' | 'convexe'; objDist: number };

const R = 4; // rayon de courbure (unités scène) → f = R/2 = 2
const SCALE_X = 0.5; // m optique → x scène le long de l'axe
const OBJ_H = 0.9; // hauteur de l'objet (scène)
const MIRROR_X = 0; // sommet S du miroir à l'origine

/** Conjugaison + grandissement. Distances algébriques positives = devant le miroir. */
function optics(kind: 'concave' | 'convexe', objDist: number) {
  const f = kind === 'concave' ? R / 2 : -R / 2; // foyer réel (concave) ou virtuel (convexe)
  // 1/di = 1/f - 1/do  →  di = (do·f)/(do - f)
  const di = (objDist * f) / (objDist - f);
  const gamma = -di / objDist; // grandissement transversal
  return { f, di, gamma };
}

export default function MirrorScene({ kind, objDist }: MirrorSceneProps) {
  const isConcave = kind === 'concave';
  const dot = useRef<Mesh>(null);

  const { f, di, gamma } = useMemo(() => optics(kind, objDist), [kind, objDist]);

  // Positions le long de l'axe (l'objet est DEVANT le miroir, côté gauche → x négatif)
  const objX = MIRROR_X - objDist * SCALE_X;
  const objTop: Vector3Tuple = [objX, OBJ_H, 0];
  const focusX = MIRROR_X - f * SCALE_X; // F réel (gauche) si concave, virtuel (droite) si convexe
  const centerX = MIRROR_X - R * SCALE_X * (isConcave ? 1 : -1); // C
  // Image : di > 0 → réelle devant (gauche) ; di < 0 → virtuelle derrière (droite)
  const imgX = MIRROR_X - di * SCALE_X;
  const imgH = gamma * OBJ_H;
  const imgTop: Vector3Tuple = [imgX, imgH, 0];
  const real = di > 0;

  // Rayons incidents (vers le sommet S et parallèle à l'axe) puis réfléchis
  const rays = useMemo(() => {
    const sommet: Vector3Tuple = [MIRROR_X, 0, 0];
    const focus: Vector3Tuple = [focusX, 0, 0];
    // Rayon 1 : du sommet de l'objet vers S, réfléchi symétriquement par rapport à l'axe.
    const ray1Inc: Vector3Tuple[] = [objTop, sommet];
    const ray1Slope = (0 - OBJ_H) / (MIRROR_X - objX);
    const ray1ReflEnd: Vector3Tuple = [imgX, -ray1Slope * (imgX - MIRROR_X), 0];
    const ray1Refl: Vector3Tuple[] = real
      ? [sommet, imgTop]
      : [sommet, ray1ReflEnd];
    // Rayon 2 : parallèle à l'axe, frappe le miroir à hauteur OBJ_H puis passe par F.
    const hit: Vector3Tuple = [MIRROR_X, OBJ_H, 0];
    const ray2Inc: Vector3Tuple[] = [objTop, hit];
    const ray2Refl: Vector3Tuple[] = real
      ? [hit, imgTop]
      : [hit, focus]; // semble venir de F (virtuel) → on trace vers F
    // Prolongements virtuels (pointillés) côté arrière du miroir
    const virt1: Vector3Tuple[] = real ? [] : [sommet, imgTop];
    const virt2: Vector3Tuple[] = real ? [] : [hit, imgTop];
    return { ray1Inc, ray1Refl, ray2Inc, ray2Refl, virt1, virt2 };
  }, [objTop, objX, imgX, imgTop, focusX, real]);

  // Profil de la calotte sphérique : arc échantillonné (rendu en disque réfléchissant).
  const arcRot: Vector3Tuple = isConcave ? [0, 0, 0] : [0, Math.PI, 0];

  return (
    <LabScene cameraPosition={[0, 0.8, 8]} background="#E8F0FB" minDistance={4} maxDistance={14} groundY={null}>
      {/* Axe optique */}
      <PolyLine points={[[MIRROR_X - 6, 0, 0], [MIRROR_X + 2.5, 0, 0]]} color="#94A3B8" width={2} dashed />

      {/* Miroir sphérique : calotte métallique réfléchissante */}
      <group position={[MIRROR_X, 0, 0]} rotation={arcRot}>
        <mesh castShadow>
          <sphereGeometry args={[R, 48, 32, 0, Math.PI * 2, Math.PI * 0.5 - 0.42, 0.84]} />
          <meshStandardMaterial color="#AEB8C7" metalness={0.95} roughness={0.08} side={2} />
        </mesh>
        {/* dos opaque de la calotte (fine coque sombre) */}
        <mesh>
          <sphereGeometry args={[R + 0.06, 48, 32, 0, Math.PI * 2, Math.PI * 0.5 - 0.42, 0.84]} />
          <meshStandardMaterial color="#475569" metalness={0.3} roughness={0.6} side={1} />
        </mesh>
      </group>

      {/* Centre C et foyer F */}
      <Marker position={[centerX, 0, 0]} color="#7C3AED" size={0.1} />
      <Tag3D position={[centerX, -0.4, 0]} label="C (centre)" tone="chimie" />
      <Marker position={[focusX, 0, 0]} color="#F59E0B" size={0.1} />
      <Tag3D position={[focusX, 0.42, 0]} label={`F · f = ${(f >= 0 ? f : -f).toFixed(1)} (R/2)`} tone="physique" />

      {/* Objet (flèche dressée sur l'axe) */}
      <Arrow3D from={[objX, 0, 0]} to={objTop} color="#DC2626" radius={0.035} headLength={0.2} />
      <Tag3D position={[objX, -0.4, 0]} label="Objet" tone="neutral" />

      {/* Rayons incidents + réfléchis */}
      <PolyLine points={rays.ray1Inc} color="#F97316" width={2.5} />
      <PolyLine points={rays.ray1Refl} color="#F97316" width={2.5} />
      <PolyLine points={rays.ray2Inc} color="#0EA5E9" width={2.5} />
      <PolyLine points={rays.ray2Refl} color="#0EA5E9" width={2.5} />
      {rays.virt1.length > 0 && <PolyLine points={rays.virt1} color="#F97316" width={1.5} dashed />}
      {rays.virt2.length > 0 && <PolyLine points={rays.virt2} color="#0EA5E9" width={1.5} dashed />}

      {/* Image formée */}
      <Arrow3D
        from={[imgX, 0, 0]}
        to={imgTop}
        color={real ? '#16A34A' : '#22D3EE'}
        radius={0.03}
        headLength={0.16}
      />
      <Tag3D
        position={[imgX, imgH > 0 ? imgH + 0.32 : imgH - 0.32, 0]}
        label={real ? 'Image réelle' : 'Image virtuelle'}
        tone={real ? 'svt' : 'maths'}
      />

      {/* Photon animé sur le rayon parallèle */}
      <mesh ref={dot}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshStandardMaterial color="#FDE047" emissive="#FACC15" emissiveIntensity={0.8} />
      </mesh>

      <SceneLabel
        position={[MIRROR_X - 1.5, 2.5, 0]}
        title={isConcave ? 'Miroir concave (convergent)' : 'Miroir convexe (divergent)'}
        subtitle={real ? 'image réelle · renversée' : 'image virtuelle · droite · réduite'}
        tone="physique"
      />
      <Readout
        position={[MIRROR_X + 1.6, 1.9, 0]}
        value={gamma.toFixed(2)}
        unit="×"
        caption="grandissement γ"
      />

      {/* Petite lumière qui descend le rayon parallèle → met l'optique en mouvement. */}
      <Animate fn={(state) => {
        const t = (state.clock.elapsedTime % 2.4) / 2.4;
        const x = objX + (MIRROR_X - objX) * t;
        dot.current?.position.set(x, OBJ_H, 0);
      }} />
    </LabScene>
  );
}
