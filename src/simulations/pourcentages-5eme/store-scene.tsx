'use client';

import { useMemo, useRef } from 'react';
import { Mesh, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench } from '@/components/lab3d/environment';
import { Bar, PolyLine } from '@/components/lab3d/plot';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — le pourcentage rendu visible (Maths, 5ème).
 *
 * À gauche : une grille de 10 × 10 = 100 carreaux. « Pour cent » se voit
 * littéralement : t carreaux coloriés sur 100, c'est la fraction t/100.
 * Pour une hausse, les carreaux ajoutés apparaissent en plus, à côté des 100.
 *
 * À droite : des barres de prix (F CFA) à la même échelle, avec un trait
 * pointillé au niveau du prix de départ. En mode « chaîne », les trois barres
 * montrent que +t % puis −t % ne ramène PAS au prix de départ :
 * ×(1 + t/100) × (1 − t/100) = 1 − t²/10 000.
 *
 * Doit être chargé via next/dynamic({ ssr: false }).
 */

export type PercentMode = 'part' | 'hausse' | 'remise' | 'chaine';
export type StoreSceneProps = { price: number; rate: number; mode: PercentMode };

const STEP = 0.195; // pas de la grille
const TILE = 0.168; // côté d'un carreau
const GX = -2.45; // centre de la grille (x)
const GY = 0.2; // centre de la grille (y)
const GROUND = -1.5;
const BAR_X0 = 1.25;
const BAR_DX = 0.95;
const BAR_MAX_H = 2.5;

const EMPTY = '#CBD5E1';
const START_COLOR = '#0EA5E9';

const MODE_COLOR: Record<PercentMode, string> = {
  part: '#7C3AED',
  hausse: '#F59E0B',
  remise: '#16A34A',
  chaine: '#DC2626',
};

function tilePos(i: number): Vector3Tuple {
  const row = Math.floor(i / 10);
  const col = i % 10;
  return [GX + (col - 4.5) * STEP, GY + (row - 4.5) * STEP, 0];
}

/** Carreaux ajoutés par une hausse : rangés en colonnes de 10, à droite des 100. */
function extraPos(j: number): Vector3Tuple {
  const col = Math.floor(j / 10);
  const row = j % 10;
  return [GX + 1.3 + col * STEP, GY + (row - 4.5) * STEP, 0];
}

const fmt = (v: number) => Math.round(v).toLocaleString('fr-FR');

export default function StoreScene({ price, rate, mode }: StoreSceneProps) {
  const cursor = useRef<Mesh>(null);
  const color = MODE_COLOR[mode];

  const bars = useMemo(() => {
    const k = rate / 100;
    if (mode === 'part') {
      return [
        { label: 'Le tout (100 %)', value: price, color: START_COLOR },
        { label: `${rate} % du tout`, value: price * k, color },
      ];
    }
    if (mode === 'hausse') {
      return [
        { label: 'Prix de départ', value: price, color: START_COLOR },
        { label: `+${rate} %`, value: price * (1 + k), color },
      ];
    }
    if (mode === 'remise') {
      return [
        { label: 'Prix affiché', value: price, color: START_COLOR },
        { label: `−${rate} % : prix payé`, value: price * (1 - k), color },
      ];
    }
    return [
      { label: 'Prix de départ', value: price, color: START_COLOR },
      { label: `après +${rate} %`, value: price * (1 + k), color: '#F59E0B' },
      { label: `puis −${rate} %`, value: price * (1 + k) * (1 - k), color },
    ];
  }, [price, rate, mode, color]);

  const maxValue = useMemo(() => Math.max(price, ...bars.map((b) => b.value)) || 1, [bars, price]);
  const scale = BAR_MAX_H / maxValue;
  const refH = price * scale; // niveau du prix de départ

  const showExtra = mode === 'hausse' || mode === 'chaine';
  const title = useMemo(() => {
    const k = rate / 100;
    if (mode === 'part') return `${rate} % de ${fmt(price)} = ${fmt(price)} × ${rate}/100 = ${fmt(price * k)} F`;
    if (mode === 'hausse') return `${fmt(price)} × (1 + ${rate}/100) = ${fmt(price * (1 + k))} F`;
    if (mode === 'remise') return `${fmt(price)} × (1 − ${rate}/100) = ${fmt(price * (1 - k))} F`;
    return `${fmt(price)} × (1 + ${rate}/100) × (1 − ${rate}/100) = ${fmt(price * (1 - k * k))} F`;
  }, [price, rate, mode]);

  const caption = useMemo(() => {
    if (mode === 'part') return `${rate} carreaux coloriés sur 100 = ${rate}/100`;
    if (mode === 'remise') return `on enlève ${rate} carreaux : il en reste ${100 - rate} sur 100`;
    return `on ajoute ${rate} carreaux aux 100 de départ`;
  }, [mode, rate]);

  return (
    <LabScene cameraPosition={[0.2, 0.4, 8.6]} background="#F0F9FF" minDistance={5} maxDistance={16} groundY={GROUND}>
      <LabBench y={GROUND} color="#E2D3B4" size={26} />

      {/* Plaque support de la grille des 100 carreaux */}
      <mesh position={[GX, GY, -0.06]} receiveShadow>
        <boxGeometry args={[10 * STEP + 0.12, 10 * STEP + 0.12, 0.05]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
      </mesh>

      {/* Les 100 carreaux : « pour cent » = « sur cent » */}
      {Array.from({ length: 100 }, (_, i) => {
        const p = tilePos(i);
        const on = i < rate;
        return (
          <mesh key={i} position={p} castShadow>
            <boxGeometry args={[TILE, TILE, on ? 0.075 : 0.04]} />
            <meshStandardMaterial
              color={on ? color : EMPTY}
              roughness={on ? 0.35 : 0.85}
              metalness={on ? 0.15 : 0}
              emissive={on ? color : '#000000'}
              emissiveIntensity={on ? 0.18 : 0}
            />
          </mesh>
        );
      })}

      {/* Carreaux ajoutés par la hausse (au-delà des 100) */}
      {showExtra &&
        Array.from({ length: rate }, (_, j) => (
          <mesh key={`x${j}`} position={extraPos(j)} castShadow>
            <boxGeometry args={[TILE, TILE, 0.075]} />
            <meshStandardMaterial color="#F59E0B" roughness={0.35} emissive="#F59E0B" emissiveIntensity={0.22} />
          </mesh>
        ))}
      {showExtra && rate > 0 && (
        <Tag3D position={[GX + 1.75, GY + 1.15, 0]} label={`+ ${rate} carreaux`} tone="physique" />
      )}

      {/* Compteur animé : il parcourt les carreaux coloriés, un par un */}
      <mesh ref={cursor} position={[GX, GY, 0.14]}>
        <torusGeometry args={[TILE * 0.72, 0.017, 8, 26]} />
        <meshStandardMaterial color="#0F172A" emissive="#0F172A" emissiveIntensity={0.35} />
      </mesh>
      <Animate
        fn={(state) => {
          if (!cursor.current) return;
          if (rate <= 0) {
            cursor.current.scale.setScalar(0.001);
            return;
          }
          cursor.current.scale.setScalar(1);
          const i = Math.floor(state.clock.elapsedTime * 7) % rate;
          const p = tilePos(i);
          cursor.current.position.set(p[0], p[1], 0.14);
        }}
      />

      <Tag3D position={[GX, GY - 1.28, 0]} label={caption} tone="maths" distanceFactor={10} />
      <Tag3D position={[GX, GY + 1.28, 0]} label="100 carreaux = le tout = 100 %" tone="neutral" distanceFactor={10} />

      {/* Barres de prix (F CFA), toutes à la même échelle */}
      <group position={[0, GROUND, 0]}>
        {bars.map((b, i) => (
          <Bar key={b.label} x={BAR_X0 + i * BAR_DX} height={Math.max(0.02, b.value * scale)} width={0.52} depth={0.52} color={b.color} />
        ))}
      </group>

      {/* Trait pointillé au niveau du prix de départ : on voit l'écart */}
      <PolyLine
        points={[
          [BAR_X0 - 0.45, GROUND + refH, 0],
          [BAR_X0 + (bars.length - 1) * BAR_DX + 0.45, GROUND + refH, 0],
        ]}
        color="#0EA5E9"
        width={2}
        dashed
      />

      {bars.map((b, i) => (
        <Readout
          key={`r${b.label}`}
          position={[BAR_X0 + i * BAR_DX, GROUND + Math.max(0.02, b.value * scale) + 0.34, 0]}
          value={fmt(b.value)}
          unit="F"
          caption={b.label}
          distanceFactor={9}
        />
      ))}

      {mode === 'chaine' && rate > 0 && (
        <Tag3D
          position={[BAR_X0 + BAR_DX, GROUND - 0.42, 0]}
          label={`Au total : ×${(1 - (rate * rate) / 10000).toFixed(4)} soit −${((rate * rate) / 100).toFixed(2)} %`}
          tone="maths"
          distanceFactor={10}
        />
      )}

      <SceneLabel position={[0.1, 2.35, 0]} title={title} subtitle="Marché HLM · F CFA" tone="maths" distanceFactor={11} />
    </LabScene>
  );
}
