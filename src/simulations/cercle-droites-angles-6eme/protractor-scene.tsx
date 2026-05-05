'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

/**
 * Scène 3D — rapporteur 3D pour mesurer un angle.
 *
 * Demi-cercle gradué + 2 segments : un fixe horizontal (côté droit),
 * un mobile dont la position dépend de l'angle. Chaque graduation tous
 * les 30° avec étiquette Html.
 *
 * Doit être chargé via next/dynamic({ ssr: false }).
 */

export type ProtractorSceneProps = {
  angle: number; // en degrés (0-180)
};

const RADIUS = 2;
const ARM_LEN = 1.8;

export default function ProtractorScene({ angle }: ProtractorSceneProps) {
  const angleRad = (angle * Math.PI) / 180;

  // Bras mobile : tourne autour de l'origine
  const armX = Math.cos(angleRad) * ARM_LEN;
  const armY = Math.sin(angleRad) * ARM_LEN;

  const tone = angle < 90 ? '#7C3AED' : angle === 90 ? '#059669' : '#D97706';
  const typeLabel = angle < 90 ? 'Aigu' : angle === 90 ? 'Droit' : angle > 90 && angle < 180 ? 'Obtus' : 'Plat';

  return (
    <LabScene
      cameraPosition={[0, 1.2, 5.5]}
      background="#F5F3FF"
      minDistance={3}
      maxDistance={10}
    >
      {/* Rapporteur (demi-disque) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <ringGeometry args={[0, RADIUS, 64, 1, 0, Math.PI]} />
        <meshStandardMaterial color="#FDE68A" roughness={0.7} side={2} />
      </mesh>
      {/* Bord du rapporteur */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[RADIUS - 0.06, RADIUS - 0.04, 64, 1, 0, Math.PI]} />
        <meshStandardMaterial color="#92400E" />
      </mesh>
      {/* Diamètre (base) */}
      <mesh position={[0, 0.005, 0]}>
        <boxGeometry args={[RADIUS * 2, 0.04, 0.04]} />
        <meshStandardMaterial color="#92400E" />
      </mesh>
      {/* Graduations tous les 30° */}
      {[0, 30, 60, 90, 120, 150, 180].map((deg) => {
        const r = (deg * Math.PI) / 180;
        const innerR = RADIUS - 0.2;
        const outerR = RADIUS - 0.05;
        const x1 = Math.cos(r) * innerR;
        const z1 = -Math.sin(r) * innerR;
        const x2 = Math.cos(r) * outerR;
        const z2 = -Math.sin(r) * outerR;
        return (
          <group key={deg}>
            {/* Petite barre */}
            <mesh
              position={[(x1 + x2) / 2, 0.012, (z1 + z2) / 2]}
              rotation={[Math.PI / 2, 0, -r + Math.PI / 2]}
            >
              <boxGeometry args={[0.02, 0.16, 0.02]} />
              <meshStandardMaterial color="#1F2937" />
            </mesh>
            {/* Étiquette du degré */}
            <Html
              position={[Math.cos(r) * (RADIUS + 0.18), 0.04, -Math.sin(r) * (RADIUS + 0.18)]}
              center
              distanceFactor={9}
              style={{ pointerEvents: 'none' }}
            >
              <span className="select-none font-mono text-[10px] font-bold text-ink/70">
                {deg}°
              </span>
            </Html>
          </group>
        );
      })}

      {/* Bras fixe horizontal (vers la droite, 0°) */}
      <mesh position={[ARM_LEN / 2, 0.05, 0]}>
        <boxGeometry args={[ARM_LEN, 0.05, 0.05]} />
        <meshStandardMaterial color="#475569" />
      </mesh>

      {/* Bras mobile (rotation autour de l'origine) */}
      <group rotation={[0, -angleRad, 0]}>
        <mesh position={[ARM_LEN / 2, 0.05, 0]}>
          <boxGeometry args={[ARM_LEN, 0.05, 0.05]} />
          <meshStandardMaterial color={tone} emissive={tone} emissiveIntensity={0.35} />
        </mesh>
      </group>

      {/* Point central */}
      <mesh position={[0, 0.06, 0]}>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshStandardMaterial color="#0F172A" />
      </mesh>

      {/* Étiquette flottante : valeur + type */}
      <Html position={[0, 1.3, 0]} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
        <div
          className="select-none rounded-2xl bg-white/95 px-4 py-2 text-center shadow-card ring-1 ring-ink/10"
          style={{ borderTop: `4px solid ${tone}` }}
        >
          <div className="text-[10px] uppercase tracking-wider text-ink/50">Angle</div>
          <div className="font-display text-3xl font-bold" style={{ color: tone }}>
            {angle}°
          </div>
          <div className="text-xs font-semibold" style={{ color: tone }}>
            {typeLabel}
          </div>
        </div>
      </Html>

      {/* Arc qui matérialise l'angle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.5, 0.55, 32, 1, 0, angleRad]} />
        <meshStandardMaterial color={tone} side={2} opacity={0.7} transparent />
      </mesh>
    </LabScene>
  );
}
