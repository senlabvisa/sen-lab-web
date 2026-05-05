'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { DoubleSide, Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

/**
 * Scène 3D — thermomètre tropical (Sénégal).
 *
 * Grand thermomètre 3D vertical (tube + bulbe + colonne de mercure
 * animée), avec affichage flottant de la température courante.
 * Le mercure est animé pour atteindre la cible avec interpolation
 * douce (lerp).
 *
 * Doit être chargé via next/dynamic({ ssr: false }).
 */

const T_MIN = 0;
const T_MAX = 50;
const COLUMN_BOTTOM = -1.2;
const COLUMN_TOP = 1.6;

function tempToHeight(t: number): number {
  const ratio = (Math.max(T_MIN, Math.min(T_MAX, t)) - T_MIN) / (T_MAX - T_MIN);
  return COLUMN_BOTTOM + ratio * (COLUMN_TOP - COLUMN_BOTTOM);
}

function MercuryColumn({ targetTemp }: { targetTemp: number }) {
  const meshRef = useRef<Mesh>(null);
  const currentRef = useRef<number>(targetTemp);

  useFrame((_state, delta) => {
    const targetHeight = tempToHeight(targetTemp);
    const currentHeight = tempToHeight(currentRef.current);
    // Lerp doux vers la cible
    const newCurrent = currentRef.current + (targetTemp - currentRef.current) * Math.min(1, delta * 3);
    currentRef.current = newCurrent;
    const h = tempToHeight(newCurrent);
    if (meshRef.current) {
      const visualHeight = h - COLUMN_BOTTOM;
      meshRef.current.scale.y = Math.max(0.01, visualHeight);
      meshRef.current.position.y = COLUMN_BOTTOM + visualHeight / 2;
    }
  });

  return (
    <mesh ref={meshRef}>
      <cylinderGeometry args={[0.16, 0.16, 1, 16]} />
      <meshStandardMaterial
        color="#DC2626"
        emissive="#7F1D1D"
        emissiveIntensity={0.25}
        roughness={0.3}
      />
    </mesh>
  );
}

function ThermometerBody() {
  return (
    <group>
      {/* Tube transparent */}
      <mesh position={[0, (COLUMN_TOP + COLUMN_BOTTOM) / 2, 0]}>
        <cylinderGeometry args={[0.22, 0.22, COLUMN_TOP - COLUMN_BOTTOM + 0.4, 24, 1, true]} />
        <meshStandardMaterial
          color="#DBEAFE"
          opacity={0.25}
          transparent
          side={DoubleSide}
          roughness={0.1}
          metalness={0.2}
        />
      </mesh>
      {/* Bouchon haut */}
      <mesh position={[0, COLUMN_TOP + 0.22, 0]}>
        <sphereGeometry args={[0.22, 16, 12]} />
        <meshStandardMaterial color="#DBEAFE" opacity={0.4} transparent />
      </mesh>
      {/* Bulbe (réservoir) */}
      <mesh position={[0, COLUMN_BOTTOM - 0.2, 0]}>
        <sphereGeometry args={[0.36, 24, 18]} />
        <meshStandardMaterial color="#DC2626" emissive="#7F1D1D" emissiveIntensity={0.25} />
      </mesh>
      {/* Graduations */}
      {Array.from({ length: 11 }).map((_, i) => {
        const t = T_MIN + (i * (T_MAX - T_MIN)) / 10;
        const y = tempToHeight(t);
        return (
          <group key={i}>
            <mesh position={[0.3, y, 0]}>
              <boxGeometry args={[0.16, 0.018, 0.018]} />
              <meshStandardMaterial color="#0F172A" />
            </mesh>
            <Html position={[0.55, y, 0]} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
              <span className="font-mono text-[10px] font-semibold text-ink/70">{t}°</span>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

export type ThermometerSceneProps = {
  temperature: number;
  cityLabel: string;
  cityTone: 'science' | 'violet' | 'action' | 'alert';
};

export default function ThermometerScene({ temperature, cityLabel, cityTone }: ThermometerSceneProps) {
  const toneColor = {
    science: '#1E40AF',
    violet: '#7C3AED',
    action: '#059669',
    alert: '#D97706',
  }[cityTone];

  return (
    <LabScene
      cameraPosition={[2.5, 0.5, 4]}
      background="#FEF3C7"
      minDistance={3}
      maxDistance={9}
      enablePan
    >
      <ThermometerBody />
      <MercuryColumn targetTemp={temperature} />

      {/* Affichage T° flottant en haut */}
      <Html position={[0, COLUMN_TOP + 0.85, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div
          className="select-none rounded-2xl bg-white/95 px-4 py-2 text-center shadow-card ring-1 ring-ink/10"
          style={{ borderTop: `4px solid ${toneColor}` }}
        >
          <div className="text-[10px] uppercase tracking-wider text-ink/50">{cityLabel}</div>
          <div className="font-display text-3xl font-bold" style={{ color: toneColor }}>
            {temperature.toFixed(1)} °C
          </div>
        </div>
      </Html>
    </LabScene>
  );
}
