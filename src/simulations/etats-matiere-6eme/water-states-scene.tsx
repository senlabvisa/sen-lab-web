'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Mesh, Vector3 } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { HotspotCoach } from '@/components/lab/hotspot-coach';

/**
 * Scène 3D — états de la matière (eau du Saloum).
 *
 * Bécher transparent contenant 28 particules d'eau. Selon la température
 * (mode solid/liquid/gas), les particules s'organisent en cristal vibrant,
 * en mouvement brownien borné par le liquide, ou s'échappent vers le haut
 * en vapeur.
 *
 * Doit être chargé via next/dynamic({ ssr: false }) pour garder Three.js
 * hors du bundle initial des autres TPs.
 */

export type WaterStateMode = 'solid' | 'liquid' | 'gas';

const N = 28;
const R = 1.4;
const H = 3.0;
const Y_BASE = -1.3;

type Particle = {
  pos: Vector3;
  vel: Vector3;
  basePos: Vector3;
};

function makeInitialParticles(): Particle[] {
  const ps: Particle[] = [];
  const rows = 4;
  const cols = 7;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (ps.length >= N) break;
      const offset = row % 2 === 0 ? 0 : Math.PI / cols;
      const angle = (col / cols) * Math.PI * 2 + offset;
      const r = 0.85;
      const y = Y_BASE + 0.3 + row * 0.55;
      const basePos = new Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
      ps.push({ pos: basePos.clone(), vel: new Vector3(), basePos });
    }
  }
  return ps;
}

function Beaker() {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[R, R, H, 32, 1, true]} />
        <meshStandardMaterial
          color="#BFDBFE"
          opacity={0.18}
          transparent
          side={DoubleSide}
          roughness={0.1}
          metalness={0.05}
        />
      </mesh>
      <mesh position={[0, -H / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[R, 32]} />
        <meshStandardMaterial color="#93C5FD" opacity={0.35} transparent />
      </mesh>
      {/* Lèvre / bord supérieur */}
      <mesh position={[0, H / 2, 0]}>
        <torusGeometry args={[R, 0.04, 8, 32]} />
        <meshStandardMaterial color="#93C5FD" opacity={0.6} transparent />
      </mesh>
    </group>
  );
}

function Molecules({ mode, temperature }: { mode: WaterStateMode; temperature: number }) {
  const particles = useMemo(() => makeInitialParticles(), []);
  const meshRefs = useRef<(Mesh | null)[]>([]);

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
      } else if (mode === 'liquid') {
        const speedMul = 0.6 + (temperature / 100) * 1.4;
        p.vel.x += (Math.random() - 0.5) * 0.8 * dt;
        p.vel.y += (Math.random() - 0.5) * 0.5 * dt - 0.4 * dt;
        p.vel.z += (Math.random() - 0.5) * 0.8 * dt;
        p.vel.multiplyScalar(0.94);
        p.pos.x += p.vel.x * speedMul * dt * 4;
        p.pos.y += p.vel.y * speedMul * dt * 4;
        p.pos.z += p.vel.z * speedMul * dt * 4;
        const dist = Math.sqrt(p.pos.x * p.pos.x + p.pos.z * p.pos.z);
        if (dist > R - 0.22) {
          const a = Math.atan2(p.pos.z, p.pos.x);
          p.pos.x = Math.cos(a) * (R - 0.22);
          p.pos.z = Math.sin(a) * (R - 0.22);
          p.vel.x *= -0.5;
          p.vel.z *= -0.5;
        }
        const yMin = Y_BASE + 0.2;
        const yMax = Y_BASE + H * 0.65;
        if (p.pos.y < yMin) {
          p.pos.y = yMin;
          p.vel.y *= -0.4;
        }
        if (p.pos.y > yMax) {
          p.pos.y = yMax;
          p.vel.y *= -0.5;
        }
      } else {
        const speedMul = 2.4 + Math.max(0, (temperature - 100) / 40);
        p.vel.x += (Math.random() - 0.5) * 1.6 * dt;
        p.vel.y += (Math.random() * 0.3) * dt + 0.35 * dt;
        p.vel.z += (Math.random() - 0.5) * 1.6 * dt;
        p.vel.multiplyScalar(0.92);
        p.pos.x += p.vel.x * speedMul * dt * 4;
        p.pos.y += p.vel.y * speedMul * dt * 4;
        p.pos.z += p.vel.z * speedMul * dt * 4;
        const dist = Math.sqrt(p.pos.x * p.pos.x + p.pos.z * p.pos.z);
        if (dist > R - 0.12) {
          const a = Math.atan2(p.pos.z, p.pos.x);
          p.pos.x = Math.cos(a) * (R - 0.12);
          p.pos.z = Math.sin(a) * (R - 0.12);
          p.vel.x *= -0.3;
          p.vel.z *= -0.3;
        }
        if (p.pos.y < Y_BASE) p.pos.y = Y_BASE;
        if (p.pos.y > Y_BASE + H + 0.4) {
          p.pos.y = Y_BASE + 0.3;
          p.vel.y = 0;
        }
      }
      mesh.position.copy(p.pos);
    });
  });

  const color = mode === 'solid' ? '#DBEAFE' : mode === 'liquid' ? '#3B82F6' : '#93C5FD';
  const emissive = mode === 'gas' ? '#1E3A8A' : '#0B1F4F';
  const emissiveIntensity = mode === 'gas' ? 0.18 : 0.05;
  const opacity = mode === 'gas' ? 0.78 : 1;

  return (
    <>
      {particles.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.19, 14, 14]} />
          <meshStandardMaterial
            color={color}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            opacity={opacity}
            transparent={mode === 'gas'}
            roughness={0.35}
          />
        </mesh>
      ))}
    </>
  );
}

export type WaterStatesSceneProps = {
  mode: WaterStateMode;
  temperature: number;
  showHotspot?: boolean;
  onInteract?: () => void;
};

export default function WaterStatesScene({
  mode,
  temperature,
  showHotspot = true,
  onInteract,
}: WaterStatesSceneProps) {
  const hotspotLabel =
    mode === 'solid' ? 'Glace — molécules figées' : mode === 'liquid' ? 'Liquide — agitation modérée' : 'Vapeur — agitation forte';
  const hotspotTone: 'science' | 'violet' | 'alert' =
    mode === 'solid' ? 'science' : mode === 'liquid' ? 'violet' : 'alert';

  return (
    <LabScene
      cameraPosition={[3.2, 1.6, 5.2]}
      background="#F0F9FF"
      minDistance={3.5}
      maxDistance={11}
      onInteract={onInteract}
    >
      <Beaker />
      <Molecules mode={mode} temperature={temperature} />
      {showHotspot && <HotspotCoach position={[0, H / 2 + 0.6, 0]} label={hotspotLabel} tone={hotspotTone} />}
    </LabScene>
  );
}
