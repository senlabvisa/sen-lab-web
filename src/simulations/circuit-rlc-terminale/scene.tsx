'use client';

import { useMemo, useRef } from 'react';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Animate } from '@/components/lab3d/anim';
import { LabBench } from '@/components/lab3d/environment';
import { Resistor, Wire } from '@/components/lab3d/electric';
import { Axes2D, PolyLine, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';

/**
 * Scène 3D — circuit RLC série en oscillations libres (Terminale S, Bac).
 *
 * À gauche : mini-circuit RLC réel (condensateur chargé + bobine + résistance,
 * reliés par des fils). À droite : oscillogramme u(t) tracé sur un repère,
 * avec un point courant animé qui parcourt la courbe.
 *
 * Physique juste (RLC série, régime libre) :
 *   λ = R/(2L)              coefficient d'amortissement
 *   ω₀ = 1/√(LC)            pulsation propre
 *   Rc = 2·√(L/C)           résistance critique
 *   R < Rc  → pseudo-périodique : u(t) = U₀·e^(−λt)·cos(ω·t), ω = √(ω₀²−λ²)
 *   R = Rc  → critique (retour le plus rapide sans osciller)
 *   R > Rc  → apériodique (retour lent sans osciller)
 * Quand R augmente, l'amortissement augmente ; la pseudo-période T augmente un peu.
 */

export type RlcSceneProps = { r: number };

// Constantes du circuit (valeurs réalistes de TP)
const L = 0.1; // bobine 0,1 H
const C = 1e-6; // condensateur 1 µF
const W0 = 1 / Math.sqrt(L * C); // ≈ 3162 rad/s
const RC = 2 * Math.sqrt(L / C); // ≈ 632 Ω (résistance critique)
const U0 = 1.4; // amplitude tracée (unités scène)

// Repère de l'oscillogramme (à droite)
const PLOT_X = 2.3; // décalage horizontal du repère
const PLOT_W = 2.6; // demi-largeur de l'axe des temps
const T_WINDOW = 8e-3; // fenêtre de temps affichée : 8 ms
const GROUND_Y = -1.5;

/** Réponse libre u(t) normalisée du RLC série, selon le régime. */
function uOfT(t: number, lambda: number): number {
  if (lambda < W0 - 1) {
    const w = Math.sqrt(W0 * W0 - lambda * lambda); // pseudo-pulsation
    return Math.exp(-lambda * t) * Math.cos(w * t);
  }
  if (lambda > W0 + 1) {
    // apériodique : deux exponentielles, somme = 1 en t=0, sans oscillation
    const s = Math.sqrt(lambda * lambda - W0 * W0);
    const r1 = -lambda + s;
    const r2 = -lambda - s;
    return (r1 * Math.exp(r2 * t) - r2 * Math.exp(r1 * t)) / (r1 - r2);
  }
  // critique : (1 + λt)·e^(−λt)
  return (1 + lambda * t) * Math.exp(-lambda * t);
}

export default function RlcScene({ r }: RlcSceneProps) {
  const dot = useRef<Group>(null);

  const lambda = r / (2 * L); // λ = R/(2L)
  const regime: 'pseudo' | 'critique' | 'aperiodique' =
    r < RC * 0.9 ? 'pseudo' : r > RC * 1.1 ? 'aperiodique' : 'critique';

  // Échantillonnage de la courbe u(t) → points scène (lissés par PolyLine)
  const curve = useMemo(() => {
    const pts: [number, number, number][] = [];
    const N = 200;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * T_WINDOW;
      const u = uOfT(t, lambda);
      pts.push([PLOT_X + (t / T_WINDOW) * PLOT_W, u * U0, 0]);
    }
    return pts;
  }, [lambda]);

  const regimeLabel =
    regime === 'pseudo' ? 'Pseudo-périodique' : regime === 'critique' ? 'Critique' : 'Apériodique';
  const regimeSub =
    regime === 'pseudo'
      ? 'oscillations amorties'
      : regime === 'critique'
        ? 'retour le plus rapide'
        : 'retour lent, sans osciller';
  const curveColor = regime === 'pseudo' ? '#2563EB' : regime === 'critique' ? '#D97706' : '#16A34A';

  return (
    <LabScene cameraPosition={[0.3, 0.6, 7.4]} background="#EAF1FB" minDistance={4.5} maxDistance={12} groundY={GROUND_Y}>
      <LabBench y={GROUND_Y} color="#D9C9A6" size={28} />

      {/* ───────────── Circuit RLC (à gauche), boucle fermée ───────────── */}
      <group position={[-3.1, 0, 0]}>
        {/* Condensateur : deux armatures parallèles (en bas à gauche) */}
        <group position={[0, -0.7, 0]}>
          <mesh position={[-0.12, 0, 0]} castShadow>
            <boxGeometry args={[0.06, 0.7, 0.5]} />
            <meshStandardMaterial color="#B45309" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0.12, 0, 0]} castShadow>
            <boxGeometry args={[0.06, 0.7, 0.5]} />
            <meshStandardMaterial color="#B45309" metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
        <Tag3D position={[0, -1.25, 0]} label="C = 1 µF" tone="physique" />

        {/* Bobine : solénoïde figuré par un tube enroulé */}
        <group position={[0, 0.95, 0]}>
          <Wire
            points={(() => {
              const p: [number, number, number][] = [];
              const turns = 6;
              for (let i = 0; i <= turns * 12; i++) {
                const a = (i / 12) * Math.PI * 2;
                const x = (i / (turns * 12) - 0.5) * 1.05;
                p.push([x, Math.sin(a) * 0.16, Math.cos(a) * 0.16]);
              }
              return p;
            })()}
            color="#C2700E"
            radius={0.035}
          />
        </group>
        <Tag3D position={[0, 1.45, 0]} label="L = 0,1 H" tone="physique" />

        {/* Résistance (à droite du circuit, verticale) */}
        <Resistor position={[1.05, 0.1, 0]} rotation={[0, 0, 0]} bands={['#8B5A2B', '#000000', '#DC2626']} />
        <Tag3D position={[1.65, 0.1, 0]} label={`R = ${Math.round(r)} Ω`} tone="physique" />

        {/* Fils reliant les composants en une boucle fermée */}
        <Wire
          points={[
            [0.12, -0.35, 0], // haut armature droite du condo
            [0.12, 0.3, 0],
            [-0.5, 0.95, 0], // entrée bobine (gauche)
          ]}
          color="#334155"
        />
        <Wire
          points={[
            [0.55, 0.95, 0], // sortie bobine (droite)
            [1.05, 0.95, 0],
            [1.05, 0.5, 0], // haut résistance
          ]}
          color="#334155"
        />
        <Wire
          points={[
            [1.05, -0.3, 0], // bas résistance
            [1.05, -0.7, 0],
            [-0.12, -1.05, 0],
            [-0.12, -0.35, 0], // bas armature gauche du condo
          ]}
          color="#334155"
        />
      </group>

      {/* ───────────── Oscillogramme u(t) (à droite) ───────────── */}
      <group position={[0, 0.1, 0]}>
        <Axes2D size={2.6} color="#64748B" ticks z={0} />
        {/* la courbe u(t) = e^(−λt)·cos(ωt) — lissée, JAMAIS de petites sphères */}
        <PolyLine points={curve} color={curveColor} width={3.5} />
        {/* point courant animé (Marker) qui parcourt la courbe */}
        <group ref={dot} position={[PLOT_X, U0, 0]}>
          <Marker position={[0, 0, 0]} color="#DC2626" size={0.12} />
        </group>
        <Tag3D position={[PLOT_X + PLOT_W + 0.15, 0.18, 0]} label="t (ms)" tone="maths" />
        <Tag3D position={[PLOT_X - 0.55, 2.35, 0]} label="u (V)" tone="maths" />
      </group>

      <SceneLabel
        position={[0.3, 2.6, 0]}
        title={regimeLabel}
        subtitle={`R = ${Math.round(r)} Ω · ${regimeSub}`}
        tone="physique"
      />
      <Readout position={[3.6, 1.85, 0]} value={lambda.toFixed(0)} unit="s⁻¹" caption="amortissement λ" />

      {/* Point courant qui parcourt la courbe en boucle */}
      <Animate fn={(state) => {
        const cycle = 2.6; // s : durée d'un balayage complet de la fenêtre
        const phase = (state.clock.elapsedTime % cycle) / cycle; // 0→1
        const t = phase * T_WINDOW;
        const u = uOfT(t, lambda);
        dot.current?.position.set(PLOT_X + phase * PLOT_W, u * U0, 0);
      }} />
    </LabScene>
  );
}
