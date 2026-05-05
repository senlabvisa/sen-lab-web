'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group, Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { HotspotCoach } from '@/components/lab/hotspot-coach';

/**
 * Scène 3D — marché de Sandaga (Dakar).
 *
 * Étal en bois 3D avec 4 articles à acheter, chacun avec son prix
 * affiché en Html drei. L'élève clique pour ajouter au panier ; un
 * petit "pop" visuel signale l'action.
 *
 * Doit être chargé via next/dynamic({ ssr: false }).
 */

export type ItemKey = 'mangue' | 'papaye' | 'baguette' | 'lait';

export const ITEM_PRICES: Record<ItemKey, number> = {
  mangue: 200,
  papaye: 350,
  baguette: 150,
  lait: 500,
};

const ITEM_LABELS: Record<ItemKey, string> = {
  mangue: 'Mangue',
  papaye: 'Papaye',
  baguette: 'Baguette',
  lait: 'Lait (1L)',
};

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

// =========================================================================
// ÉTAL EN BOIS
// =========================================================================
function Stall() {
  return (
    <group>
      {/* Plateau */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[4.5, 0.1, 1.6]} />
        <meshStandardMaterial color="#8B5A2B" roughness={0.85} />
      </mesh>
      {/* 4 pieds */}
      {[
        [-2, -0.65, -0.7],
        [2, -0.65, -0.7],
        [-2, -0.65, 0.7],
        [2, -0.65, 0.7],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[0.15, 1.2, 0.15]} />
          <meshStandardMaterial color="#6B4423" roughness={0.9} />
        </mesh>
      ))}
      {/* Pancarte "Sandaga" */}
      <mesh position={[0, 1.6, -0.7]}>
        <boxGeometry args={[1.6, 0.5, 0.06]} />
        <meshStandardMaterial color="#FBBF24" />
      </mesh>
      <Html position={[0, 1.6, -0.66]} center distanceFactor={9}>
        <span className="select-none font-display text-sm font-bold text-amber-900">
          MARCHÉ SANDAGA
        </span>
      </Html>
    </group>
  );
}

// =========================================================================
// ARTICLES
// =========================================================================
function Mangue({ count, onClick }: { count: number; onClick: () => void }) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
    }
  });
  const handlers = PointerHandlers(onClick);
  return (
    <group ref={groupRef} position={[-1.6, 0.18, 0]} {...handlers}>
      {/* Mangue : ovoïde orange-vert */}
      <mesh scale={[1, 1.15, 0.85]}>
        <sphereGeometry args={[0.18, 14, 12]} />
        <meshStandardMaterial color="#F59E0B" roughness={0.6} />
      </mesh>
      {/* Tâche verte (tige) */}
      <mesh position={[0, 0.18, 0]} scale={[0.4, 0.4, 0.4]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#65A30D" />
      </mesh>
      <PriceLabel y={0.55} price={ITEM_PRICES.mangue} count={count} label={ITEM_LABELS.mangue} />
    </group>
  );
}

function Papaye({ count, onClick }: { count: number; onClick: () => void }) {
  const handlers = PointerHandlers(onClick);
  return (
    <group position={[-0.55, 0.18, 0]} {...handlers}>
      <mesh scale={[1, 1.5, 1]}>
        <sphereGeometry args={[0.2, 14, 12]} />
        <meshStandardMaterial color="#FB923C" roughness={0.65} />
      </mesh>
      <PriceLabel y={0.65} price={ITEM_PRICES.papaye} count={count} label={ITEM_LABELS.papaye} />
    </group>
  );
}

function Baguette({ count, onClick }: { count: number; onClick: () => void }) {
  const handlers = PointerHandlers(onClick);
  return (
    <group position={[0.55, 0.12, 0]} {...handlers}>
      <mesh rotation={[0, 0, Math.PI / 2]} scale={[1, 2.2, 1]}>
        <sphereGeometry args={[0.13, 14, 10]} />
        <meshStandardMaterial color="#FCD34D" roughness={0.85} />
      </mesh>
      {/* Stries dorées */}
      {[-0.18, 0, 0.18].map((x, i) => (
        <mesh key={i} position={[x, 0.13, 0]} rotation={[0, 0, Math.PI / 2 + 0.3]}>
          <boxGeometry args={[0.08, 0.005, 0.05]} />
          <meshStandardMaterial color="#92400E" />
        </mesh>
      ))}
      <PriceLabel y={0.55} price={ITEM_PRICES.baguette} count={count} label={ITEM_LABELS.baguette} />
    </group>
  );
}

function Lait({ count, onClick }: { count: number; onClick: () => void }) {
  const handlers = PointerHandlers(onClick);
  return (
    <group position={[1.7, 0.3, 0]} {...handlers}>
      {/* Bouteille (cylindre + petit cylindre étroit en haut) */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.6, 16]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.12, 12]} />
        <meshStandardMaterial color="#3B82F6" />
      </mesh>
      {/* Étiquette */}
      <mesh position={[0, 0, 0.16]}>
        <boxGeometry args={[0.22, 0.3, 0.005]} />
        <meshStandardMaterial color="#3B82F6" />
      </mesh>
      <PriceLabel y={0.7} price={ITEM_PRICES.lait} count={count} label={ITEM_LABELS.lait} />
    </group>
  );
}

function PriceLabel({ y, price, count, label }: { y: number; price: number; count: number; label: string }) {
  return (
    <Html position={[0, y, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
      <div className="select-none rounded-lg bg-white/95 px-2 py-1 text-center shadow-soft ring-1 ring-ink/10">
        <div className="text-[9px] font-medium uppercase tracking-wider text-ink/60">{label}</div>
        <div className="font-mono text-xs font-bold text-amber-700">{price} F</div>
        {count > 0 && (
          <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
            ×{count}
          </div>
        )}
      </div>
    </Html>
  );
}

// =========================================================================
// SCÈNE
// =========================================================================
export type MarketSceneProps = {
  cart: Record<ItemKey, number>;
  onAdd: (k: ItemKey) => void;
};

export default function MarketScene({ cart, onAdd }: MarketSceneProps) {
  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <LabScene
      cameraPosition={[0, 1.2, 3.8]}
      background="#FED7AA"
      minDistance={2.5}
      maxDistance={8}
      enablePan
    >
      <Stall />
      <Mangue count={cart.mangue} onClick={() => onAdd('mangue')} />
      <Papaye count={cart.papaye} onClick={() => onAdd('papaye')} />
      <Baguette count={cart.baguette} onClick={() => onAdd('baguette')} />
      <Lait count={cart.lait} onClick={() => onAdd('lait')} />

      {totalItems === 0 && (
        <HotspotCoach position={[0, 2.4, 0]} label="Clique sur les articles à acheter" tone="action" />
      )}
    </LabScene>
  );
}

export { ITEM_LABELS };
