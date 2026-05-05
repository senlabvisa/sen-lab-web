'use client';

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

/**
 * Scène 3D — terrain de foot 3D avec dimensions ajustables.
 *
 * Le sol est un gazon vert avec lignes blanches. Le rectangle est
 * dimensionné selon les paramètres, et 4 cubes de "ballon" sont placés
 * pour rendre vivante la scène. Affichage des dimensions, périmètre et
 * aire en flottant via Html drei.
 *
 * Doit être chargé via next/dynamic({ ssr: false }).
 */

export type FieldSceneProps = {
  longueur: number; // m
  largeur: number; // m
};

const SCALE = 0.3; // 1m = 0.3 unité 3D

export default function FieldScene({ longueur, largeur }: FieldSceneProps) {
  const W = longueur * SCALE;
  const D = largeur * SCALE;
  const perimetre = 2 * (longueur + largeur);
  const aire = longueur * largeur;

  const lineColor = '#FFFFFF';
  const lineThickness = 0.04;

  return (
    <LabScene
      cameraPosition={[W * 0.9, Math.max(4, (W + D) * 0.5), D * 1.4]}
      background="#BBF7D0"
      minDistance={3}
      maxDistance={Math.max(20, (W + D) * 2)}
      enablePan
    >
      {/* Sol gazon */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W + 2, D + 2]} />
        <meshStandardMaterial color="#15803D" roughness={0.95} />
      </mesh>

      {/* Rectangle de jeu (vert plus clair) */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#22C55E" roughness={0.8} />
      </mesh>

      {/* Lignes blanches (4 bords) */}
      <mesh position={[0, 0.012, D / 2]}>
        <boxGeometry args={[W, lineThickness, lineThickness]} />
        <meshStandardMaterial color={lineColor} />
      </mesh>
      <mesh position={[0, 0.012, -D / 2]}>
        <boxGeometry args={[W, lineThickness, lineThickness]} />
        <meshStandardMaterial color={lineColor} />
      </mesh>
      <mesh position={[W / 2, 0.012, 0]}>
        <boxGeometry args={[lineThickness, lineThickness, D]} />
        <meshStandardMaterial color={lineColor} />
      </mesh>
      <mesh position={[-W / 2, 0.012, 0]}>
        <boxGeometry args={[lineThickness, lineThickness, D]} />
        <meshStandardMaterial color={lineColor} />
      </mesh>

      {/* Ligne médiane */}
      <mesh position={[0, 0.012, 0]}>
        <boxGeometry args={[lineThickness, lineThickness, D]} />
        <meshStandardMaterial color={lineColor} />
      </mesh>

      {/* Rond central */}
      <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.min(W, D) * 0.12 - 0.04, Math.min(W, D) * 0.12, 32]} />
        <meshStandardMaterial color={lineColor} />
      </mesh>

      {/* Ballon */}
      <mesh position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.18, 16, 12]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, 0.18, 0]} scale={1.001}>
        <icosahedronGeometry args={[0.18, 1]} />
        <meshStandardMaterial color="#0F172A" wireframe />
      </mesh>

      {/* Buts (2 cubes simplifiés aux extrémités) */}
      {[-W / 2, W / 2].map((x, i) => (
        <group key={i} position={[x, 0.4, 0]}>
          <mesh>
            <boxGeometry args={[0.05, 0.8, 1]} />
            <meshStandardMaterial color="#F1F5F9" />
          </mesh>
        </group>
      ))}

      {/* Étiquettes flottantes : longueur, largeur, périmètre, aire */}
      <Html position={[0, 0.05, D / 2 + 0.6]} center distanceFactor={Math.max(8, W * 0.7)} style={{ pointerEvents: 'none' }}>
        <span className="select-none rounded bg-white/95 px-2 py-0.5 text-[10px] font-bold text-ink shadow-soft">
          Longueur : {longueur} m
        </span>
      </Html>
      <Html position={[W / 2 + 0.6, 0.05, 0]} center distanceFactor={Math.max(8, W * 0.7)} style={{ pointerEvents: 'none' }}>
        <span className="select-none rounded bg-white/95 px-2 py-0.5 text-[10px] font-bold text-ink shadow-soft">
          Largeur : {largeur} m
        </span>
      </Html>
      <Html position={[0, Math.max(2, (W + D) * 0.18), 0]} center distanceFactor={Math.max(10, W * 0.8)} style={{ pointerEvents: 'none' }}>
        <div className="select-none rounded-2xl bg-white/95 px-4 py-2 text-center shadow-card ring-1 ring-ink/10">
          <div className="text-[10px] uppercase tracking-wider text-ink/50">Périmètre × Aire</div>
          <div className="mt-1 flex items-center gap-3">
            <div>
              <div className="text-[9px] text-ink/50">P (m)</div>
              <div className="font-display text-xl font-bold text-violet-700">{perimetre}</div>
            </div>
            <div className="text-ink/30">·</div>
            <div>
              <div className="text-[9px] text-ink/50">A (m²)</div>
              <div className="font-display text-xl font-bold text-emerald-700">{aire}</div>
            </div>
          </div>
        </div>
      </Html>
    </LabScene>
  );
}
