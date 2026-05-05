'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { BufferGeometry, Float32BufferAttribute, Group, Vector3 } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

export type TriangleSceneProps = { a: number; b: number; c: number; type: string };

export default function TriangleScene({ a, b, c, type }: TriangleSceneProps) {
  const groupRef = useRef<Group>(null);
  useFrame((_state, delta) => { if (groupRef.current) groupRef.current.rotation.y += delta * 0.3; });

  // Calcul des sommets : sommet A en haut, B en bas-gauche, C en bas-droite
  // Avec côtés a (BC), b (AC), c (AB)
  const valid = a + b > c && a + c > b && b + c > a;

  const geometry = useMemo(() => {
    if (!valid) return null;
    // B au sol gauche
    const Bx = -a / 2;
    const Bz = 0;
    // C au sol droite
    const Cx = a / 2;
    const Cz = 0;
    // A : intersection des cercles (B, c) et (C, b)
    const cosB = (a * a + c * c - b * b) / (2 * a * c);
    const angleB = Math.acos(Math.max(-1, Math.min(1, cosB)));
    const Ax = Bx + c * Math.cos(angleB);
    const Az = Bz + c * Math.sin(angleB);

    const verts = [Bx, 0, Bz, Cx, 0, Cz, Ax, 0, Az];
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(verts, 3));
    geo.setIndex([0, 1, 2]);
    geo.computeVertexNormals();
    return geo;
  }, [a, b, c, valid]);

  return (
    <LabScene cameraPosition={[0, 4, 4]} background="#F5F3FF" minDistance={3} maxDistance={10}>
      <group ref={groupRef}>
        {valid && geometry ? (
          <>
            <mesh geometry={geometry}>
              <meshStandardMaterial color="#A78BFA" side={2} />
            </mesh>
            <mesh geometry={geometry} position={[0, 0.02, 0]}>
              <meshStandardMaterial color="#7C3AED" wireframe />
            </mesh>
          </>
        ) : (
          <Html position={[0, 0.5, 0]} center>
            <span className="rounded bg-red-100 px-3 py-1 text-sm font-bold text-red-700">⚠ Triangle impossible</span>
          </Html>
        )}
      </group>
      <Html position={[0, 2.5, 0]} center distanceFactor={8}>
        <div className="rounded-2xl bg-white/95 px-4 py-2 text-center shadow-card ring-1 ring-violet-200">
          <div className="text-[10px] uppercase text-ink/50">Type</div>
          <div className="font-display text-xl font-bold text-violet-700">{type}</div>
        </div>
      </Html>
    </LabScene>
  );
}
