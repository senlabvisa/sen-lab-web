'use client';

import { useMemo, useRef } from 'react';
import type { Mesh, Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench, GraphPaper, Segment } from '@/components/lab3d/environment';
import { Arrow3D, Bar, PolyLine, DataPoints } from '@/components/lab3d/plot';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — sélection naturelle quantifiée chez Anopheles gambiae
 * (résistance aux insecticides, SVT Première).
 *
 * On n'affiche PAS des moustiques en boules : on affiche les DONNÉES du
 * laboratoire d'entomologie, comme au Service de Lutte Antiparasitaire.
 *
 *  • vue « population »  : histogramme des génotypes RR / RS / SS,
 *    rangée arrière = population avant épandage, rangée avant = survivants.
 *  • vue « fréquences »  : courbes p(R) et q(S) sur N générations.
 *  • vue « arbre »       : généalogie de la population — la mutation kdr
 *    apparaît AVANT l'épandage, puis sa descendance envahit la population.
 *
 * Les fréquences sont calculées par le module (modèle de Hardy-Weinberg
 * avec sélection) et passées en props : la scène ne fait que les tracer.
 */

export type EvolView = 'population' | 'frequences' | 'arbre';

export type EvolSceneProps = {
  view: EvolView;
  /** Fréquence de l'allèle R (résistance), de la génération 0 à N. */
  pR: number[];
  /** Génération observée. */
  generation: number;
  /** Pression de sélection s ∈ [0,1] : part des sensibles éliminés. */
  pression: number;
};

const BASE_Y = -1.45; // sol de l'histogramme
const H_SCALE = 3.1; // 100 % de la population → 3,1 unités
const N_POP = 1000; // effectif de la cage d'élevage

// Repère de la vue « fréquences »
const GX0 = -2.6;
const GX1 = 2.6;
const GY0 = -1.6;
const GH = 3.2;

export default function EvolScene({ view, pR, generation, pression }: EvolSceneProps) {
  const mist = useRef<Mesh>(null); // nuage d'insecticide
  const cursor = useRef<Mesh>(null); // point courant sur la courbe
  const star = useRef<Mesh>(null); // étoile « mutation kdr »

  const N = Math.max(1, pR.length - 1);
  const g = Math.min(Math.max(Math.round(generation), 0), N);
  const p = pR[g] ?? 0;
  const q = 1 - p;

  // ── Génotypes (proportions de Hardy-Weinberg avant sélection) ─────────
  const geno = useMemo(
    () => [
      { key: 'RR', x: -1.7, before: p * p, after: p * p, color: '#B91C1C', pale: '#FCA5A5' },
      { key: 'RS', x: 0, before: 2 * p * q, after: 2 * p * q, color: '#F59E0B', pale: '#FDE68A' },
      { key: 'SS', x: 1.7, before: q * q, after: q * q * (1 - pression), color: '#0EA5E9', pale: '#BAE6FD' },
    ],
    [p, q, pression],
  );
  const survivants = Math.round((1 - pression * q * q) * N_POP);

  // ── Courbes de fréquences alléliques ─────────────────────────────────
  const { curveR, curveS, cursorPos } = useMemo(() => {
    const px = (i: number) => GX0 + (i / N) * (GX1 - GX0);
    const py = (v: number) => GY0 + v * GH;
    return {
      curveR: pR.map((v, i) => [px(i), py(v), 0] as Vector3Tuple),
      curveS: pR.map((v, i) => [px(i), py(1 - v), 0] as Vector3Tuple),
      cursorPos: [px(g), py(p), 0] as Vector3Tuple,
    };
  }, [pR, N, g, p]);

  // ── Arbre généalogique (cladogramme en équerre) ──────────────────────
  const tree = useMemo(() => {
    const W = 5;
    const yOf = (d: number) => -1.5 + d * 0.8;
    const xOf = (d: number, i: number) => ((i + 0.5) / 2 ** d) * W - W / 2;
    // clade issu du moustique muté = nœud (niveau 1, indice 1)
    const inClade = (d: number, i: number) => d >= 1 && Math.floor(i / 2 ** (d - 1)) === 1;

    const edgesR: Vector3Tuple[][] = [];
    const edgesS: Vector3Tuple[][] = [];
    const stubs: Vector3Tuple[][] = [];
    const dotsR: Vector3Tuple[] = [];
    const dotsS: Vector3Tuple[] = [];
    const dead: Vector3Tuple[] = [];
    const yTreat = (yOf(2) + yOf(3)) / 2;

    for (let d = 0; d < 4; d++) {
      for (let i = 0; i < 2 ** d; i++) {
        const a: Vector3Tuple = [xOf(d, i), yOf(d), 0];
        for (const j of [2 * i, 2 * i + 1]) {
          const child = d + 1;
          const inC = inClade(child, j);
          if (child >= 3 && !inC) continue; // lignées sensibles éliminées
          const b: Vector3Tuple = [xOf(child, j), yOf(child), 0];
          const path: Vector3Tuple[] = [a, [b[0], a[1], 0], b];
          // l'arête qui mène au moustique muté est encore « sensible »
          (inC && child >= 2 ? edgesR : edgesS).push(path);
        }
      }
    }
    for (let i = 0; i < 4; i++) {
      if (inClade(2, i)) continue;
      const x = xOf(2, i);
      stubs.push([
        [x, yOf(2), 0],
        [x, yTreat + 0.12, 0],
      ]);
      dead.push([x, yTreat + 0.18, 0]);
    }
    for (let d = 0; d <= 4; d++) {
      for (let i = 0; i < 2 ** d; i++) {
        const inC = inClade(d, i);
        if (d >= 3 && !inC) continue;
        if (d === 1 && i === 1) continue; // remplacé par l'étoile
        (inC ? dotsR : dotsS).push([xOf(d, i), yOf(d), 0]);
      }
    }
    return {
      edgesR,
      edgesS,
      stubs,
      dotsR,
      dotsS,
      dead,
      mut: [xOf(1, 1), yOf(1), 0] as Vector3Tuple,
      yTreat,
    };
  }, []);

  return (
    <LabScene
      cameraPosition={[0, 0.35, 7.4]}
      background="#ECFDF3"
      minDistance={4}
      maxDistance={15}
      groundY={view === 'population' ? BASE_Y : null}
    >
      {/* ───────────────────────── Vue population ───────────────────────── */}
      {view === 'population' && (
        <>
          <LabBench y={BASE_Y} color="#DCE7DC" size={20} />
          {geno.map((b) => (
            <group key={b.key} position={[0, BASE_Y, 0]}>
              <group position={[0, 0, -0.62]}>
                <Bar x={b.x} height={Math.max(0.004, b.before * H_SCALE)} width={0.82} depth={0.7} color={b.pale} />
              </group>
              <group position={[0, 0, 0.62]}>
                <Bar x={b.x} height={Math.max(0.004, b.after * H_SCALE)} width={0.82} depth={0.7} color={b.color} />
              </group>
            </group>
          ))}
          {geno.map((b) => (
            <Tag3D
              key={`t-${b.key}`}
              position={[b.x, BASE_Y - 0.3, 0.7]}
              label={`${b.key} · ${Math.round(b.after * N_POP)}`}
              tone={b.key === 'SS' ? 'physique' : 'svt'}
            />
          ))}
          <Tag3D position={[-1.7, BASE_Y + geno[0].before * H_SCALE + 0.45, -0.6]} label="phénotype résistant" tone="svt" />
          <Tag3D position={[1.7, BASE_Y + geno[2].before * H_SCALE + 0.45, -0.6]} label="phénotype sensible" tone="physique" />

          {/* Nuage d'insecticide qui balaie la cage d'élevage */}
          {pression > 0 && (
            <mesh ref={mist} position={[0, 1.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[5.6, 2.6]} />
              <meshStandardMaterial color="#A3E635" transparent opacity={0.1 + 0.28 * pression} depthWrite={false} />
            </mesh>
          )}

          <SceneLabel
            position={[0, 2.3, 0]}
            title={`Génération ${g} · ${N_POP} moustiques`}
            subtitle="pâle = avant épandage · vif = survivants"
            tone="svt"
          />
          <Readout position={[2.9, 0.9, 0]} value={((1 - q * q) * 100).toFixed(1)} unit="%" caption="phénotype résistant" />
          <Readout position={[-2.9, 0.9, 0]} value={survivants} caption="survivants / 1000" />
        </>
      )}

      {/* ──────────────────────── Vue fréquences ───────────────────────── */}
      {view === 'frequences' && (
        <>
          <group position={[0.1, 0, -0.08]}>
            <GraphPaper width={6} height={3.8} step={0.4} color="#D9E7DE" />
          </group>
          <Arrow3D from={[GX0 - 0.25, GY0, 0]} to={[GX1 + 0.35, GY0, 0]} color="#475569" radius={0.016} headLength={0.18} />
          <Arrow3D from={[GX0, GY0 - 0.25, 0]} to={[GX0, GY0 + GH + 0.35, 0]} color="#475569" radius={0.016} headLength={0.18} />
          <Segment a={[GX0, GY0 + GH / 2, 0]} b={[GX1, GY0 + GH / 2, 0]} color="#CBD5E1" width={0.008} />

          <PolyLine points={curveR} color="#DC2626" width={4} />
          <PolyLine points={curveS} color="#0EA5E9" width={3} dashed />

          <mesh ref={cursor} position={cursorPos}>
            <sphereGeometry args={[0.11, 20, 16]} />
            <meshStandardMaterial color="#DC2626" emissive="#DC2626" emissiveIntensity={0.45} />
          </mesh>

          <Tag3D position={[GX1 + 0.1, GY0 - 0.34, 0]} label="générations" tone="neutral" />
          <Tag3D position={[GX0 - 0.05, GY0 + GH + 0.55, 0]} label="fréquence de l'allèle" tone="neutral" />
          <Tag3D position={[GX0 - 0.42, GY0 + GH / 2, 0]} label="0,5" tone="neutral" />
          <Tag3D position={[GX0 + 1.9, GY0 + pR[Math.min(N, Math.round(N * 0.6))] * GH + 0.32, 0]} label="allèle R (résistance)" tone="svt" />
          <Tag3D position={[GX0 + 1.9, GY0 + (1 - pR[Math.min(N, Math.round(N * 0.6))]) * GH - 0.34, 0]} label="allèle S (sensible)" tone="physique" />

          <SceneLabel
            position={[0, GY0 + GH + 1.05, 0]}
            title={`Pression de sélection s = ${pression.toFixed(1)}`}
            subtitle={`dérive de la fréquence allélique sur ${N} générations`}
            tone="svt"
          />
          <Readout position={[GX1 + 0.75, GY0 + GH - 0.3, 0]} value={(p * 100).toFixed(1)} unit="%" caption={`p(R) à G${g}`} />
        </>
      )}

      {/* ─────────────────────────── Vue arbre ─────────────────────────── */}
      {view === 'arbre' && (
        <>
          {tree.edgesS.map((e, i) => (
            <PolyLine key={`s${i}`} points={e} color="#94A3B8" width={2.5} />
          ))}
          {tree.edgesR.map((e, i) => (
            <PolyLine key={`r${i}`} points={e} color="#DC2626" width={3.5} />
          ))}
          {tree.stubs.map((e, i) => (
            <PolyLine key={`x${i}`} points={e} color="#94A3B8" width={2} dashed />
          ))}
          <DataPoints points={tree.dotsS} color="#64748B" size={0.075} />
          <DataPoints points={tree.dotsR} color="#DC2626" size={0.085} />
          <DataPoints points={tree.dead} color="#334155" size={0.06} />

          <Segment a={[-2.9, tree.yTreat, 0]} b={[2.9, tree.yTreat, 0]} color="#0F766E" width={0.017} />
          <Tag3D position={[-2.35, tree.yTreat + 0.26, 0]} label="épandage d'insecticide" tone="physique" />
          <Tag3D position={[2.05, tree.yTreat - 0.28, 0]} label="lignées sensibles éteintes" tone="neutral" />

          <mesh ref={star} position={tree.mut}>
            <octahedronGeometry args={[0.17, 0]} />
            <meshStandardMaterial color="#F59E0B" emissive="#F59E0B" emissiveIntensity={0.6} roughness={0.3} />
          </mesh>
          <Tag3D position={[tree.mut[0] + 0.15, tree.mut[1] - 0.34, 0]} label="mutation kdr : au hasard, AVANT le traitement" tone="svt" />
          <Tag3D position={[0.9, 2.05, 0]} label="descendants du moustique muté" tone="svt" />

          <SceneLabel
            position={[0, 2.75, 0]}
            title="Généalogie de la population"
            subtitle="la mutation précède la sélection"
            tone="svt"
          />
        </>
      )}

      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime;
          if (mist.current) mist.current.position.y = 1.55 + 0.35 * Math.sin(t * 1.1);
          if (cursor.current) {
            const k = 1 + 0.22 * Math.sin(t * 3.4);
            cursor.current.scale.set(k, k, k);
          }
          if (star.current) {
            star.current.rotation.y = t * 1.1;
            star.current.rotation.x = t * 0.5;
          }
        }}
      />
    </LabScene>
  );
}
