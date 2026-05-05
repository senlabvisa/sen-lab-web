'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group, Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

/**
 * Scène 3D — graphique des précipitations mensuelles à Dakar.
 *
 * 12 barres bleues volumétriques alignées sur l'axe X. La hauteur
 * encode la pluie (mm). Au clic, la barre est sélectionnée et son
 * étiquette devient saillante. Soleil + sol jaune en décor.
 *
 * Doit être chargé via next/dynamic({ ssr: false }).
 */

export type MeteoSceneProps = {
  data: Array<{ month: string; rain: number; temp: number }>;
  selectedIndex: number | null;
  onSelect: (i: number) => void;
};

const BAR_WIDTH = 0.45;
const BAR_GAP = 0.6;
const HEIGHT_SCALE = 0.012; // mm → unités 3D
const N = 12;

function PointerHandlers(onClick?: () => void) {
  return {
    onClick: (e: any) => {
      e.stopPropagation();
      onClick?.();
    },
    onPointerOver: (e: any) => {
      e.stopPropagation();
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      document.body.style.cursor = 'auto';
    },
  };
}

function Sun() {
  const meshRef = useRef<Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.2;
    }
  });
  return (
    <group position={[5, 4, -3]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.7, 16, 12]} />
        <meshStandardMaterial color="#FBBF24" emissive="#F59E0B" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function Bar({
  index,
  rain,
  selected,
  onClick,
}: {
  index: number;
  rain: number;
  selected: boolean;
  onClick: () => void;
}) {
  const handlers = PointerHandlers(onClick);
  const height = Math.max(0.04, rain * HEIGHT_SCALE);
  const x = -((N - 1) / 2) * BAR_GAP + index * BAR_GAP;

  // Couleur graduée bleue selon la pluie
  const intensity = Math.min(1, rain / 250);
  const baseColor = `rgb(${Math.round(186 - intensity * 150)}, ${Math.round(230 - intensity * 100)}, ${Math.round(253 - intensity * 50)})`;
  const color = selected ? '#7C3AED' : baseColor;

  return (
    <group position={[x, 0, 0]} {...handlers}>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[BAR_WIDTH, height, BAR_WIDTH]} />
        <meshStandardMaterial
          color={color}
          emissive={selected ? '#5B21B6' : '#000'}
          emissiveIntensity={selected ? 0.4 : 0}
          roughness={0.45}
        />
      </mesh>
      {/* Petit "chapeau" pour rebord */}
      <mesh position={[0, height + 0.005, 0]}>
        <boxGeometry args={[BAR_WIDTH + 0.04, 0.01, BAR_WIDTH + 0.04]} />
        <meshStandardMaterial color="#1E40AF" />
      </mesh>
    </group>
  );
}

export default function MeteoScene({ data, selectedIndex, onSelect }: MeteoSceneProps) {
  const totalWidth = (N - 1) * BAR_GAP;
  const selectedData = selectedIndex !== null ? data[selectedIndex] : null;

  return (
    <LabScene
      cameraPosition={[0, 3.5, 7]}
      background="#FEF3C7"
      minDistance={4}
      maxDistance={16}
      enablePan
    >
      <fog attach="fog" args={['#FEF3C7', 12, 24]} />

      <Sun />

      {/* Sol */}
      <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[totalWidth + 4, 6]} />
        <meshStandardMaterial color="#FCD34D" roughness={0.95} />
      </mesh>

      {/* Axe horizontal */}
      <mesh position={[0, 0, BAR_WIDTH / 2 + 0.05]}>
        <boxGeometry args={[totalWidth + 1, 0.02, 0.02]} />
        <meshStandardMaterial color="#0F172A" />
      </mesh>

      {/* Barres */}
      {data.map((d, i) => (
        <Bar
          key={d.month}
          index={i}
          rain={d.rain}
          selected={selectedIndex === i}
          onClick={() => onSelect(i)}
        />
      ))}

      {/* Étiquettes mois sous chaque barre */}
      {data.map((d, i) => {
        const x = -((N - 1) / 2) * BAR_GAP + i * BAR_GAP;
        return (
          <Html
            key={d.month + '-lbl'}
            position={[x, -0.35, BAR_WIDTH / 2]}
            center
            distanceFactor={11}
            style={{ pointerEvents: 'none' }}
          >
            <span
              className={
                'select-none font-mono text-[10px] font-bold ' +
                (selectedIndex === i ? 'text-violet-700' : 'text-ink/60')
              }
            >
              {d.month}
            </span>
          </Html>
        );
      })}

      {/* Affichage mois sélectionné */}
      {selectedData && (
        <Html
          position={[0, 4.5, 0]}
          center
          distanceFactor={9}
          style={{ pointerEvents: 'none' }}
        >
          <div className="select-none rounded-2xl bg-white/95 px-4 py-2 text-center shadow-card ring-1 ring-violet-200">
            <div className="text-[10px] uppercase tracking-wider text-ink/50">Dakar — {selectedData.month}</div>
            <div className="mt-1 flex items-center justify-center gap-3">
              <div>
                <div className="text-[9px] text-ink/50">Pluie</div>
                <div className="font-display text-xl font-bold text-blue-700">
                  {selectedData.rain} <span className="text-xs">mm</span>
                </div>
              </div>
              <div className="text-ink/30">·</div>
              <div>
                <div className="text-[9px] text-ink/50">T°</div>
                <div className="font-display text-xl font-bold text-amber-700">
                  {selectedData.temp}°C
                </div>
              </div>
            </div>
          </div>
        </Html>
      )}
    </LabScene>
  );
}
