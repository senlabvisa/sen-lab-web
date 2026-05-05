'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type HistoSceneProps = { data: number[]; selected: number | null; onSelect: (i: number) => void };

export default function HistoScene({ data, selected, onSelect }: HistoSceneProps) {
  const max = Math.max(...data, 1);
  const N = data.length;

  return (
    <LabScene cameraPosition={[2, 3, 4]} background="#F5F3FF" minDistance={3} maxDistance={10}>
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[N + 1, 2]} />
        <meshStandardMaterial color="#FAF5FF" />
      </mesh>
      {data.map((v, i) => {
        const h = (v / max) * 2.5;
        const x = -((N - 1) / 2) * 0.6 + i * 0.6;
        return (
          <mesh
            key={i}
            position={[x, h / 2, 0]}
            onClick={(e) => { e.stopPropagation(); onSelect(i); }}
            onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
          >
            <boxGeometry args={[0.45, Math.max(0.05, h), 0.45]} />
            <meshStandardMaterial color={selected === i ? '#7C3AED' : '#A78BFA'} emissive={selected === i ? '#5B21B6' : '#000'} emissiveIntensity={selected === i ? 0.4 : 0} />
          </mesh>
        );
      })}
      {data.map((_, i) => {
        const x = -((N - 1) / 2) * 0.6 + i * 0.6;
        return (
          <Html key={i + '-l'} position={[x, -0.2, 0.25]} center distanceFactor={10}>
            <span className="font-mono text-[10px] font-bold text-ink/70">{i + 1}</span>
          </Html>
        );
      })}
    </LabScene>
  );
}
