'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { DoubleSide, Mesh, Vector3 } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

/**
 * Scène 3D — chauffage progressif de l'eau (changements d'état).
 *
 * Bécher avec 26 particules animées qui passent par les 5 phases :
 * solide vibrant → fusion → liquide brownien → vaporisation → gaz dispersé,
 * pilotées par la température courante. Affichage T° et état flottant.
 */

export type HeatingSceneProps = {
  temperature: number; // -20 à 130 °C
};

const N = 26;
const R = 1.3;
const H = 2.8;
const Y_BASE = -1.2;

type Particle = { pos: Vector3; vel: Vector3; basePos: Vector3 };

function makeParticles(): Particle[] {
  const ps: Particle[] = [];
  const rows = 4;
  const cols = 7;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (ps.length >= N) break;
      const offset = row % 2 === 0 ? 0 : Math.PI / cols;
      const angle = (col / cols) * Math.PI * 2 + offset;
      const r = 0.78;
      const y = Y_BASE + 0.3 + row * 0.5;
      const basePos = new Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
      ps.push({ pos: basePos.clone(), vel: new Vector3(), basePos });
    }
  }
  return ps;
}

function FlameUnder({ active }: { active: boolean }) {
  const meshRef = useRef<Mesh>(null);
  useFrame((state) => {
    if (meshRef.current && active) {
      const t = state.clock.elapsedTime * 5;
      meshRef.current.scale.y = 1 + Math.sin(t) * 0.15;
    }
  });
  if (!active) return null;
  return (
    <group position={[0, Y_BASE - 0.6, 0]}>
      <mesh ref={meshRef} position={[0, 0.3, 0]}>
        <coneGeometry args={[0.4, 0.7, 12]} />
        <meshStandardMaterial
          color="#F97316"
          emissive="#EA580C"
          emissiveIntensity={0.8}
          opacity={0.85}
          transparent
        />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <coneGeometry args={[0.55, 0.5, 12]} />
        <meshStandardMaterial color="#FBBF24" emissive="#F59E0B" emissiveIntensity={0.6} opacity={0.55} transparent />
      </mesh>
    </group>
  );
}

function Beaker() {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[R, R, H, 32, 1, true]} />
        <meshStandardMaterial color="#BFDBFE" opacity={0.18} transparent side={DoubleSide} />
      </mesh>
      <mesh position={[0, -H / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[R, 32]} />
        <meshStandardMaterial color="#94A3B8" opacity={0.5} transparent />
      </mesh>
      <mesh position={[0, H / 2, 0]}>
        <torusGeometry args={[R, 0.04, 8, 32]} />
        <meshStandardMaterial color="#93C5FD" opacity={0.6} transparent />
      </mesh>
    </group>
  );
}

function Particles({ temperature }: { temperature: number }) {
  const particles = useMemo(() => makeParticles(), []);
  const meshRefs = useRef<(Mesh | null)[]>([]);

  // Mode dérivé de T°
  const mode: 'solid' | 'fusion' | 'liquid' | 'vap' | 'gas' =
    temperature < 0
      ? 'solid'
      : temperature < 5
        ? 'fusion'
        : temperature < 95
          ? 'liquid'
          : temperature < 105
            ? 'vap'
            : 'gas';

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.05);
    particles.forEach((p, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;

      if (mode === 'solid') {
        const t = (Date.now() / 1000) * 4;
        p.pos.x = p.basePos.x + Math.sin(t + i * 1.7) * 0.04;
        p.pos.y = p.basePos.y + Math.cos(t * 1.3 + i * 0.9) * 0.04;
        p.pos.z = p.basePos.z + Math.sin(t * 0.7 + i * 2.3) * 0.04;
      } else if (mode === 'fusion') {
        // Mix : moitié vibrant, moitié liquide
        if (i < N / 2) {
          const t = (Date.now() / 1000) * 4;
          p.pos.x = p.basePos.x + Math.sin(t + i * 1.7) * 0.06;
          p.pos.y = p.basePos.y + Math.cos(t * 1.3 + i * 0.9) * 0.06;
          p.pos.z = p.basePos.z + Math.sin(t * 0.7 + i * 2.3) * 0.06;
        } else {
          liquidStep(p, dt, 0.5, R, Y_BASE, H * 0.6);
        }
      } else if (mode === 'liquid') {
        liquidStep(p, dt, 1 + (temperature / 100) * 0.5, R, Y_BASE, H * 0.65);
      } else if (mode === 'vap') {
        // Mix liquide + vapeur
        if (i < N / 2) {
          liquidStep(p, dt, 1.5, R, Y_BASE, H * 0.5);
        } else {
          gasStep(p, dt, 2, R, Y_BASE, H);
        }
      } else {
        gasStep(p, dt, 2.4, R, Y_BASE, H);
      }
      mesh.position.copy(p.pos);
    });
  });

  const color =
    mode === 'solid'
      ? '#DBEAFE'
      : mode === 'fusion'
        ? '#A5C8F5'
        : mode === 'liquid'
          ? '#3B82F6'
          : mode === 'vap'
            ? '#7CA9F0'
            : '#93C5FD';
  const opacity = mode === 'gas' || mode === 'vap' ? 0.78 : 1;

  return (
    <>
      {particles.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshStandardMaterial
            color={color}
            opacity={opacity}
            transparent={mode === 'gas' || mode === 'vap'}
            roughness={0.4}
          />
        </mesh>
      ))}
    </>
  );
}

function liquidStep(p: Particle, dt: number, mul: number, R: number, yBase: number, surfaceOffset: number) {
  p.vel.x += (Math.random() - 0.5) * 0.8 * dt;
  p.vel.y += (Math.random() - 0.5) * 0.5 * dt - 0.4 * dt;
  p.vel.z += (Math.random() - 0.5) * 0.8 * dt;
  p.vel.multiplyScalar(0.94);
  p.pos.x += p.vel.x * mul * dt * 4;
  p.pos.y += p.vel.y * mul * dt * 4;
  p.pos.z += p.vel.z * mul * dt * 4;
  const dist = Math.sqrt(p.pos.x * p.pos.x + p.pos.z * p.pos.z);
  if (dist > R - 0.22) {
    const a = Math.atan2(p.pos.z, p.pos.x);
    p.pos.x = Math.cos(a) * (R - 0.22);
    p.pos.z = Math.sin(a) * (R - 0.22);
    p.vel.x *= -0.5;
    p.vel.z *= -0.5;
  }
  const yMin = yBase + 0.2;
  const yMax = yBase + surfaceOffset;
  if (p.pos.y < yMin) {
    p.pos.y = yMin;
    p.vel.y *= -0.4;
  }
  if (p.pos.y > yMax) {
    p.pos.y = yMax;
    p.vel.y *= -0.5;
  }
}

function gasStep(p: Particle, dt: number, mul: number, R: number, yBase: number, height: number) {
  p.vel.x += (Math.random() - 0.5) * 1.6 * dt;
  p.vel.y += Math.random() * 0.3 * dt + 0.35 * dt;
  p.vel.z += (Math.random() - 0.5) * 1.6 * dt;
  p.vel.multiplyScalar(0.92);
  p.pos.x += p.vel.x * mul * dt * 4;
  p.pos.y += p.vel.y * mul * dt * 4;
  p.pos.z += p.vel.z * mul * dt * 4;
  const dist = Math.sqrt(p.pos.x * p.pos.x + p.pos.z * p.pos.z);
  if (dist > R - 0.12) {
    const a = Math.atan2(p.pos.z, p.pos.x);
    p.pos.x = Math.cos(a) * (R - 0.12);
    p.pos.z = Math.sin(a) * (R - 0.12);
    p.vel.x *= -0.3;
    p.vel.z *= -0.3;
  }
  if (p.pos.y < yBase) p.pos.y = yBase;
  if (p.pos.y > yBase + height + 0.4) {
    p.pos.y = yBase + 0.3;
    p.vel.y = 0;
  }
}

export default function HeatingScene({ temperature }: HeatingSceneProps) {
  const stateLabel =
    temperature < 0
      ? 'Glace (solide)'
      : temperature < 5
        ? 'Fusion en cours'
        : temperature < 95
          ? 'Eau liquide'
          : temperature < 105
            ? 'Vaporisation en cours'
            : 'Vapeur (gaz)';
  const tone =
    temperature < 0
      ? '#1E40AF'
      : temperature < 95
        ? '#7C3AED'
        : '#D97706';
  const flameOn = temperature > -19; // toujours on tant qu'on chauffe

  return (
    <LabScene
      cameraPosition={[3.2, 1.6, 5.2]}
      background="#FEF3C7"
      minDistance={3.5}
      maxDistance={11}
      onInteract={undefined}
    >
      <Beaker />
      <Particles temperature={temperature} />
      <FlameUnder active={flameOn} />

      <Html position={[0, H / 2 + 0.8, 0]} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
        <div
          className="select-none rounded-2xl bg-white/95 px-4 py-2 text-center shadow-card ring-1 ring-ink/10"
          style={{ borderTop: `4px solid ${tone}` }}
        >
          <div className="text-[10px] uppercase tracking-wider text-ink/50">{stateLabel}</div>
          <div className="font-display text-3xl font-bold" style={{ color: tone }}>
            {temperature.toFixed(0)} °C
          </div>
        </div>
      </Html>
    </LabScene>
  );
}
