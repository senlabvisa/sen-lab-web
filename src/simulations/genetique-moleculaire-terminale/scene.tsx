'use client';

import { useMemo, useRef } from 'react';
import type { Group, Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Segment } from '@/components/lab3d/environment';
import { DNAHelix } from '@/components/lab3d/molecule';
import { Marker } from '@/components/lab3d/plot';
import { Readout, SceneLabel, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — de l'ADN à la protéine (génétique moléculaire, Terminale S, Bac).
 *
 * Portion réelle du début du gène de la bêta-globine humaine (HBB) :
 *   brin codant     5' ATG GTG CAC CTG ACT CCT GAG 3'
 *   brin transcrit  3' TAC CAC GTG GAC TGA GGA CTC 5'
 *   ARNm            5' AUG GUG CAC CUG ACU CCU GAG 3'
 *
 * L'ADN est fermé en double hélice (kit <DNAHelix>) de part et d'autre d'une
 * « bulle de transcription » ouverte : l'ARN polymérase y avance et
 * l'ARNm se construit nucléotide par nucléotide (complémentarité A-U, T-A,
 * G-C, C-G). Puis le ribosome parcourt l'ARNm codon par codon et enfile les
 * acides aminés. Tout est piloté par les props (le module calcule la biologie).
 */

export type GeneSceneProps = {
  /** Étape en cours du dogme central. */
  phase: 'transcription' | 'traduction';
  /** Nucléotides d'ARNm déjà synthétisés (0 → 21). */
  nt: number;
  /** Codons déjà lus par le ribosome (0 → 7). */
  codonIndex: number;
  /** Brin transcrit de l'ADN (21 lettres). */
  template: string;
  /** ARNm correspondant, mutation comprise (21 lettres). */
  mrna: string;
  /** Acides aminés des 7 codons (code 3 lettres, 'STOP' possible). */
  aminos: string[];
  /** Position du nucléotide muté dans l'ARNm, ou null. */
  mutIndex: number | null;
};

const N = 21;
const SP = 0.3;
const X0 = -((N - 1) / 2) * SP; // -3.0
const Y_CODANT = 1.9;
const Y_TEMPLATE = 1.25;
const Y_MRNA = 0.45;
const Y_POLY = 0.88;
const Y_PROT = -0.95;

/** Couleurs des bases azotées (convention des manuels). */
const BASE: Record<string, string> = {
  A: '#3B82F6',
  T: '#F59E0B',
  G: '#10B981',
  C: '#EC4899',
  U: '#8B5CF6',
};

/** Couleurs des acides aminés — Glu (chargé) en rouge, Val (hydrophobe) en vert. */
const AA_COLOR: Record<string, string> = {
  Met: '#F59E0B',
  Val: '#16A34A',
  His: '#0EA5E9',
  Leu: '#8B5CF6',
  Thr: '#F97316',
  Pro: '#14B8A6',
  Glu: '#DC2626',
  STOP: '#334155',
};

const COMP: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G' };

const px = (i: number) => X0 + i * SP;
const aaPos = (j: number): Vector3Tuple => [px(3 * j + 1), Y_PROT - 0.16 * Math.sin(j * 1.25), 0];

export default function GeneScene({ phase, nt, codonIndex, template, mrna, aminos, mutIndex }: GeneSceneProps) {
  const helixL = useRef<Group>(null);
  const helixR = useRef<Group>(null);
  const poly = useRef<Group>(null);
  const ribo = useRef<Group>(null);

  const ntShown = Math.max(0, Math.min(N, nt));
  const codonsRead = Math.max(0, Math.min(7, codonIndex));

  /** Brin codant (non transcrit) = complémentaire du brin transcrit. */
  const codant = useMemo(() => template.split('').map((b) => COMP[b] ?? b), [template]);

  /** Chaîne polypeptidique déjà assemblée (le STOP n'apporte pas d'acide aminé). */
  const chain = useMemo(() => aminos.slice(0, codonsRead).filter((a) => a !== 'STOP'), [aminos, codonsRead]);

  /** Barreaux de complémentarité dans la bulle (les 4 derniers appariements). */
  const rungs = useMemo(() => {
    const out: number[] = [];
    for (let i = Math.max(0, ntShown - 4); i < ntShown; i++) out.push(i);
    return out;
  }, [ntShown]);

  const xPoly = px(Math.min(ntShown, N - 1));
  const xRib = px(3 * Math.min(codonsRead, 6) + 1);

  const readout =
    phase === 'transcription'
      ? ntShown > 0
        ? { value: `${template[ntShown - 1]} → ${mrna[ntShown - 1]}`, caption: 'ADN → ARNm' }
        : { value: '—', caption: 'appariement' }
      : codonsRead > 0
        ? { value: `${mrna.slice(3 * (codonsRead - 1), 3 * codonsRead)} → ${aminos[codonsRead - 1]}`, caption: `codon ${codonsRead}/7` }
        : { value: '—', caption: 'codon 0/7' };

  return (
    <LabScene cameraPosition={[0, 0.4, 11]} background="#F0FDF4" minDistance={5} maxDistance={18} groundY={null}>
      {/* ── ADN refermé en double hélice de part et d'autre de la bulle ── */}
      <group position={[-4.35, (Y_CODANT + Y_TEMPLATE) / 2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <group ref={helixL}>
          <DNAHelix turns={2} height={2.1} radius={0.33} />
        </group>
      </group>
      <group position={[4.35, (Y_CODANT + Y_TEMPLATE) / 2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <group ref={helixR}>
          <DNAHelix turns={2} height={2.1} radius={0.33} />
        </group>
      </group>

      {/* ── Squelettes sucre-phosphate des deux brins ouverts ── */}
      <Segment a={[px(0) - 0.2, Y_CODANT, 0]} b={[px(N - 1) + 0.2, Y_CODANT, 0]} color="#A78BFA" width={0.045} />
      <Segment a={[px(0) - 0.2, Y_TEMPLATE, 0]} b={[px(N - 1) + 0.2, Y_TEMPLATE, 0]} color="#C4B5FD" width={0.045} />

      {/* ── Bases du brin codant (non transcrit) ── */}
      {codant.map((b, i) => (
        <mesh key={`c${i}`} position={[px(i), Y_CODANT + 0.2, 0]} castShadow>
          <boxGeometry args={[0.19, 0.24, 0.19]} />
          <meshStandardMaterial color={BASE[b] ?? '#94A3B8'} roughness={0.4} />
        </mesh>
      ))}

      {/* ── Bases du brin transcrit (matrice) ── */}
      {template.split('').map((b, i) => (
        <mesh key={`t${i}`} position={[px(i), Y_TEMPLATE - 0.2, 0]} castShadow>
          <boxGeometry args={[0.19, 0.24, 0.19]} />
          <meshStandardMaterial
            color={BASE[b] ?? '#94A3B8'}
            roughness={0.4}
            emissive={i === mutIndex ? '#DC2626' : '#000000'}
            emissiveIntensity={i === mutIndex ? 0.55 : 0}
          />
        </mesh>
      ))}

      {/* ── ARNm en cours de synthèse ── */}
      {ntShown >= 2 && (
        <Segment a={[px(0), Y_MRNA, 0]} b={[px(ntShown - 1), Y_MRNA, 0]} color="#67E8F9" width={0.04} />
      )}
      {mrna
        .split('')
        .slice(0, ntShown)
        .map((b, i) => (
          <mesh key={`m${i}`} position={[px(i), Y_MRNA, 0]} castShadow>
            <sphereGeometry args={[i === mutIndex ? 0.17 : 0.13, 18, 14]} />
            <meshStandardMaterial
              color={BASE[b] ?? '#94A3B8'}
              roughness={0.3}
              emissive={i === mutIndex ? '#DC2626' : BASE[b] ?? '#94A3B8'}
              emissiveIntensity={i === mutIndex ? 0.6 : 0.15}
            />
          </mesh>
        ))}

      {/* ── Appariements en train de se faire (complémentarité) ── */}
      {phase === 'transcription' &&
        rungs.map((i) => (
          <Segment key={`r${i}`} a={[px(i), Y_TEMPLATE - 0.3, 0]} b={[px(i), Y_MRNA + 0.12, 0]} color="#94A3B8" width={0.018} />
        ))}

      {/* ── ARN polymérase (enzyme qui ouvre l'ADN et écrit l'ARNm) ── */}
      {phase === 'transcription' && (
        <group ref={poly} position={[xPoly, Y_POLY, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.46, 24, 18]} />
            <meshStandardMaterial color="#FB7185" roughness={0.35} transparent opacity={0.72} />
          </mesh>
          <mesh position={[0.12, 0.28, 0.1]} castShadow>
            <sphereGeometry args={[0.24, 18, 14]} />
            <meshStandardMaterial color="#F43F5E" roughness={0.35} transparent opacity={0.75} />
          </mesh>
        </group>
      )}

      {/* ── Ribosome (2 sous-unités) qui parcourt l'ARNm ── */}
      {phase === 'traduction' && (
        <group ref={ribo} position={[xRib, 0, 0]}>
          <mesh position={[0, Y_MRNA + 0.42, 0]} castShadow>
            <sphereGeometry args={[0.36, 22, 16]} />
            <meshStandardMaterial color="#C084FC" roughness={0.4} />
          </mesh>
          <mesh position={[0, Y_MRNA - 0.42, 0]} scale={[1.25, 1, 1.1]} castShadow>
            <sphereGeometry args={[0.46, 24, 18]} />
            <meshStandardMaterial color="#9333EA" roughness={0.45} />
          </mesh>
        </group>
      )}

      {/* ── Chaîne polypeptidique (protéine en construction) ── */}
      {phase === 'traduction' && (
        <>
          {chain.slice(0, -1).map((_, j) => (
            <Segment key={`pb${j}`} a={aaPos(j)} b={aaPos(j + 1)} color="#CBD5E1" width={0.05} />
          ))}
          {chain.length > 0 && (
            <Segment a={[xRib, Y_MRNA - 0.75, 0]} b={aaPos(chain.length - 1)} color="#CBD5E1" width={0.04} />
          )}
          {chain.map((a, j) => (
            <mesh key={`aa${j}`} position={aaPos(j)} castShadow>
              <sphereGeometry args={[0.22, 22, 16]} />
              <meshStandardMaterial color={AA_COLOR[a] ?? '#64748B'} roughness={0.35} metalness={0.05} />
            </mesh>
          ))}
        </>
      )}

      {/* ── Annotations ── */}
      <Tag3D position={[px(0) - 1.35, Y_CODANT + 0.2, 0]} label="ADN · brin codant" tone="svt" />
      <Tag3D position={[px(0) - 1.35, Y_TEMPLATE - 0.35, 0]} label="brin transcrit" tone="svt" />
      {ntShown > 0 && <Tag3D position={[px(0) - 1.0, Y_MRNA, 0]} label="ARNm" tone="chimie" />}
      {phase === 'transcription' && <Tag3D position={[xPoly, Y_POLY + 0.78, 0]} label="ARN polymérase" tone="neutral" />}
      {phase === 'traduction' && <Tag3D position={[xRib, Y_MRNA + 1.05, 0]} label="ribosome" tone="neutral" />}
      {phase === 'traduction' && chain.length > 0 && (
        <Tag3D position={[px(0) - 1.0, Y_PROT, 0]} label="protéine" tone="svt" />
      )}
      {mutIndex !== null && (
        <>
          <Marker position={[px(mutIndex), Y_TEMPLATE - 0.62, 0]} color="#DC2626" size={0.07} />
          <Tag3D position={[px(mutIndex), Y_MRNA - 0.7, 0]} label="mutation" tone="physique" />
        </>
      )}

      <SceneLabel
        position={[0, 2.85, 0]}
        title={phase === 'transcription' ? `Transcription — ${ntShown}/21 nucléotides` : `Traduction — ${chain.length} acide(s) aminé(s)`}
        subtitle={phase === 'transcription' ? 'ADN → ARNm · A-U, T-A, G-C, C-G' : 'ARNm → protéine · ribosome & code génétique'}
        tone="svt"
      />
      <Readout position={[px(N - 1) + 1.5, Y_MRNA, 0]} value={readout.value} caption={readout.caption} />

      <Animate
        fn={(state, delta) => {
          const t = state.clock.elapsedTime;
          if (helixL.current) helixL.current.rotation.y += delta * 0.55;
          if (helixR.current) helixR.current.rotation.y += delta * 0.55;
          if (poly.current) poly.current.position.y = Y_POLY + Math.sin(t * 2.2) * 0.05;
          if (ribo.current) {
            ribo.current.position.y = Math.sin(t * 1.7) * 0.045;
            ribo.current.scale.setScalar(1 + Math.sin(t * 3.1) * 0.025);
          }
        }}
      />
    </LabScene>
  );
}
