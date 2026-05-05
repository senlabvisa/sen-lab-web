'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3 } from 'three';
import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type MoleculesSceneProps = { kind: 'co2' | 'h2o' | 'nacl' };

const NAMES = { co2: 'Dioxyde de carbone (CO₂)', h2o: 'Eau (H₂O)', nacl: 'Sel (NaCl)' };

export default function MoleculesScene({ kind }: MoleculesSceneProps) {
  const groupRef = useRef<Group>(null);
  useFrame((_, delta) => { if (groupRef.current) groupRef.current.rotation.y += delta * 0.4; });

  return (
    <LabScene cameraPosition={[0, 1, 5]} background="#DBEAFE" minDistance={3} maxDistance={10}>
      <group ref={groupRef}>
        {kind === 'co2' && (
          <>
            <Atom pos={[0, 0, 0]} color="#1F2937" r={0.55} label="C" />
            <Atom pos={[-1.3, 0, 0]} color="#DC2626" r={0.45} label="O" />
            <Atom pos={[1.3, 0, 0]} color="#DC2626" r={0.45} label="O" />
            <Bond from={[0,0,0]} to={[-1.3,0,0]} />
            <Bond from={[0,0,0]} to={[1.3,0,0]} />
          </>
        )}
        {kind === 'h2o' && (
          <>
            <Atom pos={[0, 0.4, 0]} color="#DC2626" r={0.55} label="O" />
            <Atom pos={[1.1, -0.6, 0]} color="#F8FAFC" r={0.35} label="H" />
            <Atom pos={[-1.1, -0.6, 0]} color="#F8FAFC" r={0.35} label="H" />
            <Bond from={[0,0.4,0]} to={[1.1,-0.6,0]} />
            <Bond from={[0,0.4,0]} to={[-1.1,-0.6,0]} />
          </>
        )}
        {kind === 'nacl' && (
          <>
            <Atom pos={[-0.7, 0, 0]} color="#9333EA" r={0.55} label="Na" />
            <Atom pos={[0.7, 0, 0]} color="#65A30D" r={0.55} label="Cl" />
            <Bond from={[-0.7,0,0]} to={[0.7,0,0]} />
          </>
        )}
      </group>
      <Html position={[0, 1.8, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-blue-200">
          <div className="font-display text-base font-bold text-blue-700">{NAMES[kind]}</div>
        </div>
      </Html>
    </LabScene>
  );
}

function Atom({ pos, color, r, label }: { pos: [number, number, number]; color: string; r: number; label: string }) {
  return (
    <group position={pos}>
      <mesh><sphereGeometry args={[r, 24, 18]} /><meshStandardMaterial color={color} /></mesh>
      <Html position={[0, r + 0.2, 0]} center distanceFactor={8}><span className="rounded-full bg-white/95 px-2 py-0.5 text-xs font-bold text-ink shadow-soft">{label}</span></Html>
    </group>
  );
}

function Bond({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const dir = new Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const len = dir.length();
  const center: [number, number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
  const angle = Math.atan2(dir.y, dir.x);
  return (
    <mesh position={center} rotation={[0, 0, angle - Math.PI / 2]}>
      <cylinderGeometry args={[0.08, 0.08, len, 12]} />
      <meshStandardMaterial color="#9CA3AF" />
    </mesh>
  );
}
