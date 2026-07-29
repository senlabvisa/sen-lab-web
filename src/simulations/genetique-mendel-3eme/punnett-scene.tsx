'use client';

import { useMemo, useRef } from 'react';
import type { Group, Mesh, Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench, Segment } from '@/components/lab3d/environment';
import { Bar } from '@/components/lab3d/plot';
import { Readout, SceneLabel, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — lois de Mendel : échiquier de Punnett manipulable (SVT, 3ème).
 *
 * Deux vues pilotées par le module (aucun tirage aléatoire ici : la scène
 * ne fait que dessiner ce qu'on lui passe) :
 *
 *  • « echiquier »   : la grille 2×2 de Punnett. Les gamètes du parent 1
 *    sont posés sur la rangée du haut, ceux du parent 2 sur la colonne de
 *    gauche. Chaque case se remplit au clic : la graine de niébé y apparaît
 *    avec sa couleur de tégument (phénotype) et son génotype en étiquette.
 *  • « proportions » : histogramme des trois génotypes. Barre grise = ce que
 *    prévoit l'échiquier (attendu), barre colorée = ce qu'on a réellement
 *    obtenu en tirant N croisements au hasard. Plus N est grand, plus les
 *    deux barres se rejoignent (loi des grands nombres).
 *
 * Le caractère étudié est végétal (couleur du tégument de la graine) : on ne
 * dessine jamais d'« individu » factice, seulement le croisement et ses
 * données.
 */

export type Geno = 'NN' | 'Nn' | 'nn';
export type MendelView = 'echiquier' | 'proportions';

export type PunnettSceneProps = {
  view: MendelView;
  /** Titre du croisement, ex. « Nn × Nn ». */
  label: string;
  sublabel: string;
  /** Génotypes des deux parents (affichés au bord de l'échiquier). */
  p1: Geno;
  p2: Geno;
  /** Gamètes du parent 1 (colonnes) et du parent 2 (lignes). */
  gam1: string[];
  gam2: string[];
  /** Les 4 cases de l'échiquier, dans l'ordre ligne par ligne. */
  cells: Geno[];
  /** Nombre de cases déjà dévoilées (0 → 4). */
  revealed: number;
  /** Fractions théoriques (0 → 1) issues de l'échiquier. */
  expected: Record<Geno, number>;
  /** Effectifs réellement tirés par le module. */
  observed: Record<Geno, number>;
  total: number;
};

const GENOS: Geno[] = ['NN', 'Nn', 'nn'];
const isDominant = (g: Geno) => g !== 'nn';

/** Couleur du tégument : noir (allèle N dominant) ou blanc crème (nn). */
const SEED_COLOR: Record<Geno, string> = { NN: '#1F2937', Nn: '#374151', nn: '#EFE2C0' };

// Échiquier
const CX = [-0.6, 0.6]; // centres de colonnes (gamètes du parent 1)
const CY = [0.6, -0.6]; // centres de lignes (gamètes du parent 2)
const HALF = 1.2; // demi-côté de la grille

// Histogramme
const BASE_Y = -1.5;
const H_SCALE = 3.0; // 100 % → 3 unités
const GX: Record<Geno, number> = { NN: -1.7, Nn: 0, nn: 1.7 };

export default function PunnettScene({
  view,
  label,
  sublabel,
  p1,
  p2,
  gam1,
  gam2,
  cells,
  revealed,
  expected,
  observed,
  total,
}: PunnettSceneProps) {
  const seeds = useRef<(Mesh | null)[]>([null, null, null, null]);
  const dice = useRef<Group>(null);

  const grid = useMemo<Vector3Tuple[][]>(() => {
    const segs: Vector3Tuple[][] = [];
    for (const x of [-HALF, 0, HALF]) segs.push([[x, -HALF, 0], [x, HALF, 0]]);
    for (const y of [-HALF, 0, HALF]) segs.push([[-HALF, y, 0], [HALF, y, 0]]);
    return segs;
  }, []);

  const domRevealed = cells.slice(0, revealed).filter(isDominant).length;
  const obsDom = total > 0 ? (observed.NN + observed.Nn) / total : 0;
  const expDom = expected.NN + expected.Nn;

  return (
    <LabScene
      cameraPosition={[0, 0.3, 7.2]}
      background="#F1F7EE"
      minDistance={4}
      maxDistance={14}
      groundY={view === 'proportions' ? BASE_Y : null}
    >
      {/* ─────────────────────── Échiquier de Punnett ─────────────────────── */}
      {view === 'echiquier' && (
        <>
          {/* plaque de fond */}
          <mesh position={[0, 0, -0.14]} receiveShadow>
            <boxGeometry args={[2 * HALF + 0.14, 2 * HALF + 0.14, 0.1]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
          </mesh>
          {grid.map((s, i) => (
            <Segment key={`g${i}`} a={s[0]} b={s[1]} color="#94A3B8" width={0.018} />
          ))}

          {/* gamètes du parent 1 : jetons posés au-dessus des colonnes */}
          {gam1.map((a, c) => (
            <group key={`c${c}`} position={[CX[c], HALF + 0.42, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.9, 0.6, 0.18]} />
                <meshStandardMaterial color={a === 'N' ? '#334155' : '#E7DCC0'} roughness={0.55} />
              </mesh>
              <Tag3D position={[0, 0, 0.22]} label={a} tone="svt" />
            </group>
          ))}

          {/* gamètes du parent 2 : jetons posés à gauche des lignes */}
          {gam2.map((a, r) => (
            <group key={`r${r}`} position={[-HALF - 0.42, CY[r], 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.6, 0.9, 0.18]} />
                <meshStandardMaterial color={a === 'N' ? '#334155' : '#E7DCC0'} roughness={0.55} />
              </mesh>
              <Tag3D position={[0, 0, 0.22]} label={a} tone="svt" />
            </group>
          ))}

          {/* cases dévoilées : la graine obtenue + son génotype */}
          {cells.map((g, i) => {
            if (i >= revealed) return null;
            const x = CX[i % 2];
            const y = CY[Math.floor(i / 2)];
            return (
              <group key={`k${i}`}>
                <mesh position={[x, y, -0.06]}>
                  <boxGeometry args={[1.06, 1.06, 0.05]} />
                  <meshStandardMaterial color={isDominant(g) ? '#E2E8F0' : '#FAF4E2'} roughness={0.9} />
                </mesh>
                <mesh
                  ref={(m) => {
                    seeds.current[i] = m;
                  }}
                  position={[x, y + 0.14, 0.2]}
                  scale={[1, 0.78, 0.6]}
                  castShadow
                >
                  <sphereGeometry args={[0.3, 24, 18]} />
                  <meshStandardMaterial color={SEED_COLOR[g]} roughness={0.42} metalness={0.05} />
                </mesh>
                <Tag3D position={[x, y - 0.36, 0.25]} label={g} tone={isDominant(g) ? 'svt' : 'neutral'} />
              </group>
            );
          })}

          <Tag3D position={[0, HALF + 1.02, 0]} label={`gamètes du parent 1 (${p1})`} tone="svt" />
          <Tag3D position={[-HALF - 1.35, 0, 0]} label={`gamètes du parent 2 (${p2})`} tone="svt" />
          {revealed > 0 && (
            <Tag3D
              position={[HALF + 1.25, -HALF - 0.1, 0]}
              label={revealed === 4 ? 'grille complète' : `encore ${4 - revealed} case(s)`}
              tone="neutral"
            />
          )}

          <SceneLabel position={[0, 2.62, 0]} title={label} subtitle={sublabel} tone="svt" />
          <Readout position={[HALF + 1.25, 1.0, 0]} value={`${revealed}/4`} caption="cases remplies" />
          {revealed === 4 && (
            <Readout position={[HALF + 1.25, 0.2, 0]} value={`${domRevealed}/4`} caption="graines noires" />
          )}
        </>
      )}

      {/* ────────────────────── Proportions observées ─────────────────────── */}
      {view === 'proportions' && (
        <>
          <LabBench y={BASE_Y} color="#E4EADF" size={20} />
          {GENOS.map((g) => {
            const e = expected[g];
            const o = total > 0 ? observed[g] / total : 0;
            return (
              <group key={g} position={[0, BASE_Y, 0]}>
                <Bar x={GX[g] - 0.33} height={Math.max(0.004, e * H_SCALE)} width={0.56} depth={0.62} color="#CBD5E1" />
                <Bar x={GX[g] + 0.33} height={Math.max(0.004, o * H_SCALE)} width={0.56} depth={0.62} color={SEED_COLOR[g]} />
              </group>
            );
          })}
          {GENOS.map((g) => (
            <Tag3D
              key={`lab-${g}`}
              position={[GX[g], BASE_Y - 0.3, 0.5]}
              label={`${g} · ${(total > 0 ? (observed[g] / total) * 100 : 0).toFixed(1)} %`}
              tone={isDominant(g) ? 'svt' : 'neutral'}
            />
          ))}
          {GENOS.map((g) => (
            <Tag3D
              key={`exp-${g}`}
              position={[GX[g] - 0.36, BASE_Y + expected[g] * H_SCALE + 0.28, 0]}
              label={`${(expected[g] * 100).toFixed(0)} % attendu`}
              tone="neutral"
            />
          ))}

          <Segment a={[-2.6, BASE_Y + 0.25 * H_SCALE, -0.6]} b={[2.6, BASE_Y + 0.25 * H_SCALE, -0.6]} color="#A7B0BF" width={0.012} />
          <Tag3D position={[-2.62, BASE_Y + 0.25 * H_SCALE + 0.2, -0.6]} label="1/4" tone="neutral" />

          <Tag3D position={[-0.85, BASE_Y + 2.75, 0]} label="phénotype : graine noire" tone="svt" />
          <Tag3D position={[1.7, BASE_Y + 2.35, 0]} label="phénotype : graine blanche" tone="neutral" />

          <group ref={dice} position={[-2.9, 1.65, 0]}>
            <mesh castShadow>
              <octahedronGeometry args={[0.26, 0]} />
              <meshStandardMaterial color="#F59E0B" emissive="#F59E0B" emissiveIntensity={0.45} roughness={0.35} />
            </mesh>
          </group>
          <Tag3D position={[-2.9, 1.15, 0]} label="hasard de la fécondation" tone="neutral" />

          <SceneLabel
            position={[0, 2.55, 0]}
            title={`${total} croisement${total > 1 ? 's' : ''} simulé${total > 1 ? 's' : ''}`}
            subtitle="gris = attendu · couleur = observé"
            tone="svt"
          />
          <Readout position={[2.95, 1.65, 0]} value={(obsDom * 100).toFixed(1)} unit="%" caption="noires observées" />
          <Readout position={[2.95, 0.85, 0]} value={(expDom * 100).toFixed(0)} unit="%" caption="noires attendues" />
        </>
      )}

      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime;
          if (view === 'echiquier') {
            for (let i = 0; i < 4; i++) {
              const m = seeds.current[i];
              if (!m) continue;
              const last = i === revealed - 1;
              const k = last ? 1 + 0.09 * Math.sin(t * 4.2) : 1;
              m.scale.set(k, 0.78 * k, 0.6 * k);
              m.rotation.y = last ? t * 0.9 : 0.3;
            }
          } else if (dice.current) {
            dice.current.rotation.y = t * 1.3;
            dice.current.rotation.x = t * 0.7;
            dice.current.position.y = 1.65 + 0.1 * Math.sin(t * 1.8);
          }
        }}
      />
    </LabScene>
  );
}
