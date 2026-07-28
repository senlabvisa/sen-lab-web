'use client';

/**
 * lab3d/glassware — verrerie de laboratoire réaliste.
 *
 * Chaque pièce = paroi en verre physique (Glass) + liquide teinté (Liquid)
 * dont le niveau est piloté par `fill` ∈ [0,1]. Sert pour tous les TP de
 * chimie (dissolution, dosage, pH, mélanges, réactions).
 */

import { DoubleSide, type Vector3Tuple } from 'three';
import { Glass, Liquid } from './materials';

// ──────────────────────────────────────────────────────────────────────
// Bécher
// ──────────────────────────────────────────────────────────────────────

export function Beaker({
  position = [0, 0, 0],
  radius = 1.1,
  height = 2.2,
  fill = 0.55,
  liquidColor = '#7CC4FF',
  graduations = true,
}: {
  position?: Vector3Tuple;
  radius?: number;
  height?: number;
  fill?: number;
  liquidColor?: string;
  graduations?: boolean;
}) {
  const liquidH = Math.max(0, Math.min(1, fill)) * (height - 0.12);
  return (
    <group position={position}>
      {/* paroi */}
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius * 0.98, height, 48, 1, true]} />
        <Glass tint="#EAF2FF" />
      </mesh>
      {/* fond */}
      <mesh position={[0, -height / 2 + 0.02, 0]}>
        <cylinderGeometry args={[radius * 0.98, radius * 0.98, 0.05, 48]} />
        <Glass tint="#EAF2FF" thickness={0.6} />
      </mesh>
      {/* bec verseur */}
      <mesh position={[radius * 0.92, height / 2 - 0.12, 0]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.12, 0.16, 0.3, 16, 1, true]} />
        <Glass tint="#EAF2FF" />
      </mesh>
      {/* liquide */}
      {fill > 0.001 && (
        <mesh position={[0, -height / 2 + 0.04 + liquidH / 2, 0]}>
          <cylinderGeometry args={[radius * 0.94, radius * 0.94, liquidH, 48]} />
          <Liquid color={liquidColor} />
        </mesh>
      )}
      {/* ménisque (disque supérieur du liquide) */}
      {fill > 0.001 && (
        <mesh position={[0, -height / 2 + 0.04 + liquidH, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[radius * 0.94, 48]} />
          <Liquid color={liquidColor} opacity={0.55} />
        </mesh>
      )}
      {/* graduations */}
      {graduations &&
        [0.25, 0.5, 0.75].map((g) => (
          <mesh key={g} position={[radius, -height / 2 + g * height, 0]}>
            <boxGeometry args={[0.04, 0.012, 0.012]} />
            <meshStandardMaterial color="#64748B" />
          </mesh>
        ))}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Erlenmeyer (fiole conique)
// ──────────────────────────────────────────────────────────────────────

export function Erlenmeyer({
  position = [0, 0, 0],
  fill = 0.4,
  liquidColor = '#FFD0E0',
  height = 2.4,
}: {
  position?: Vector3Tuple;
  fill?: number;
  liquidColor?: string;
  height?: number;
}) {
  const baseR = 0.95;
  const neckR = 0.28;
  const bodyH = height * 0.62;
  const neckH = height * 0.38;
  const liquidH = Math.max(0, Math.min(1, fill)) * bodyH * 0.9;
  return (
    <group position={position}>
      {/* corps conique */}
      <mesh position={[0, -height / 2 + bodyH / 2, 0]} castShadow>
        <cylinderGeometry args={[neckR, baseR, bodyH, 48, 1, true]} />
        <Glass tint="#EAFBF0" />
      </mesh>
      {/* fond */}
      <mesh position={[0, -height / 2 + 0.02, 0]}>
        <circleGeometry args={[baseR, 48]} />
        <meshStandardMaterial color="#EAFBF0" transparent opacity={0.25} side={DoubleSide} />
      </mesh>
      {/* col */}
      <mesh position={[0, -height / 2 + bodyH + neckH / 2, 0]}>
        <cylinderGeometry args={[neckR, neckR, neckH, 32, 1, true]} />
        <Glass tint="#EAFBF0" />
      </mesh>
      {/* liquide (cône) */}
      {fill > 0.001 && (
        <mesh position={[0, -height / 2 + 0.04 + liquidH / 2, 0]}>
          <cylinderGeometry args={[baseR * 0.6, baseR * 0.92, liquidH, 48]} />
          <Liquid color={liquidColor} />
        </mesh>
      )}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Tube à essai
// ──────────────────────────────────────────────────────────────────────

export function TestTube({
  position = [0, 0, 0],
  fill = 0.5,
  liquidColor = '#9AE6B4',
  radius = 0.32,
  height = 2,
  rotation = [0, 0, 0],
}: {
  position?: Vector3Tuple;
  fill?: number;
  liquidColor?: string;
  radius?: number;
  height?: number;
  rotation?: Vector3Tuple;
}) {
  const tubeH = height - radius;
  const liquidH = Math.max(0, Math.min(1, fill)) * (tubeH - 0.1);
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, radius / 2, 0]} castShadow>
        <cylinderGeometry args={[radius, radius, tubeH, 32, 1, true]} />
        <Glass tint="#EAF2FF" />
      </mesh>
      {/* fond hémisphérique */}
      <mesh position={[0, -tubeH / 2 + radius / 2, 0]}>
        <sphereGeometry args={[radius, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <Glass tint="#EAF2FF" />
      </mesh>
      {fill > 0.001 && (
        <mesh position={[0, -tubeH / 2 + radius / 2 + liquidH / 2, 0]}>
          <cylinderGeometry args={[radius * 0.88, radius * 0.88, liquidH, 32]} />
          <Liquid color={liquidColor} />
        </mesh>
      )}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Éprouvette graduée
// ──────────────────────────────────────────────────────────────────────

export function GraduatedCylinder({
  position = [0, 0, 0],
  fill = 0.6,
  liquidColor = '#86C5FF',
  radius = 0.42,
  height = 3,
}: {
  position?: Vector3Tuple;
  fill?: number;
  liquidColor?: string;
  radius?: number;
  height?: number;
}) {
  const liquidH = Math.max(0, Math.min(1, fill)) * (height - 0.3);
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius, height, 40, 1, true]} />
        <Glass tint="#EAF2FF" />
      </mesh>
      {/* socle hexagonal */}
      <mesh position={[0, -height / 2 - 0.02, 0]}>
        <cylinderGeometry args={[radius * 1.5, radius * 1.6, 0.18, 6]} />
        <Glass tint="#EAF2FF" thickness={0.7} />
      </mesh>
      {fill > 0.001 && (
        <mesh position={[0, -height / 2 + 0.06 + liquidH / 2, 0]}>
          <cylinderGeometry args={[radius * 0.92, radius * 0.92, liquidH, 40]} />
          <Liquid color={liquidColor} />
        </mesh>
      )}
      {Array.from({ length: 9 }, (_, i) => (i + 1) / 10).map((g) => (
        <mesh key={g} position={[radius, -height / 2 + g * height, 0]}>
          <boxGeometry args={[g % 0.5 < 1e-6 || Math.abs(g - 0.5) < 1e-6 ? 0.12 : 0.06, 0.01, 0.01]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
      ))}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Burette (dosage) : tube + robinet
// ──────────────────────────────────────────────────────────────────────

export function Burette({
  position = [0, 0, 0],
  fill = 0.7,
  liquidColor = '#FBBF77',
  open = false,
}: {
  position?: Vector3Tuple;
  fill?: number;
  liquidColor?: string;
  open?: boolean;
}) {
  const height = 3.4;
  const radius = 0.18;
  const liquidH = Math.max(0, Math.min(1, fill)) * (height - 0.4);
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius, height, 32, 1, true]} />
        <Glass tint="#EAF2FF" />
      </mesh>
      {fill > 0.001 && (
        <mesh position={[0, height / 2 - 0.2 - liquidH / 2, 0]}>
          <cylinderGeometry args={[radius * 0.85, radius * 0.85, liquidH, 32]} />
          <Liquid color={liquidColor} />
        </mesh>
      )}
      {/* robinet */}
      <mesh position={[0, -height / 2, 0]}>
        <sphereGeometry args={[0.16, 20, 16]} />
        <meshStandardMaterial color="#E2E8F0" transparent opacity={0.4} roughness={0.1} />
      </mesh>
      <mesh position={[0.18, -height / 2, 0]} rotation={[0, 0, open ? 0 : Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.4, 12]} />
        <meshStandardMaterial color="#3B82F6" />
      </mesh>
      {/* pointe */}
      <mesh position={[0, -height / 2 - 0.28, 0]}>
        <cylinderGeometry args={[0.03, 0.06, 0.35, 16, 1, true]} />
        <Glass tint="#EAF2FF" />
      </mesh>
    </group>
  );
}

/** Goutte tombante (animer la position Y côté scène). */
export function Drop({ position, color = '#FBBF77', size = 0.07 }: { position: Vector3Tuple; color?: string; size?: number }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[size, 14, 12]} />
      <Liquid color={color} opacity={0.9} />
    </mesh>
  );
}
