'use client';

import { useMemo, useRef } from 'react';
import { DoubleSide, Group, Mesh, Quaternion, Vector3, type Vector3Tuple } from 'three';
import {
  Animate,
  Arrow3D,
  DNAHelix,
  LabScene,
  Marker,
  PolyLine,
  Readout,
  SceneLabel,
  Tag3D,
} from '@/components/lab3d';
import {
  CD4_AXE_MAX,
  LOG_CV_MAX,
  LOG_CV_MIN,
  LOG_INDETECTABLE,
  MOIS_MAX,
  SEUIL_SIDA,
  cd4,
  cd4Naturel,
  formatCharge,
  formatDuree,
  logChargeVirale,
  moisSida,
} from './model';

/**
 * Scène 3D — VIH et immunité (SVT, Terminale S).
 *
 * Trois planches, toutes centrées sur le virus, la cellule et les mesures
 * (aucun être humain n'est représenté) :
 *
 *  • « virion »  : structure du VIH — enveloppe issue de la membrane de la
 *                  cellule hôte, spicules gp120/gp41, matrice p17, capside
 *                  conique p24 caractéristique, deux brins d'ARN et la
 *                  transcriptase inverse. Diamètre réel ≈ 120 nm.
 *
 *  • « cycle »   : le cycle infectieux dans un lymphocyte T CD4+ —
 *                  1 fixation gp120/récepteur CD4 + corécepteur,
 *                  2 fusion et entrée de la capside, 3 transcription inverse
 *                  ARN → ADN, 4 intégration du provirus à l'ADN de la cellule,
 *                  5 réplication, bourgeonnement et mort de la cellule.
 *
 *  • « courbes » : LE graphe classique du Bac — charge virale (log₁₀, rouge)
 *                  et taux de T4 (vert) sur 10 ans, seuil SIDA à 200/mm³,
 *                  bandeaux des trois phases, curseur temporel, et effet des
 *                  antirétroviraux.
 */

export type VihView = 'virion' | 'cycle' | 'courbes';

export type VihSceneProps = {
  view: VihView;
  /** Mois écoulés depuis la contamination (0 → 120). */
  mois: number;
  /** Trithérapie antirétrovirale active ? */
  traitement: boolean;
  /** Mois de début du traitement. */
  debutTraitement: number;
};

const UP = new Vector3(0, 1, 0);

function radialQuat(dir: Vector3): [number, number, number, number] {
  const q = new Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  return [q.x, q.y, q.z, q.w];
}

/** Répartition régulière de n points sur une sphère (spirale de Fibonacci). */
function fibonacci(n: number): Vector3[] {
  const pts: Vector3[] = [];
  const or = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = or * i;
    pts.push(new Vector3(Math.cos(th) * r, y, Math.sin(th) * r));
  }
  return pts;
}

// ════════════════════════════════════════════════════════════════════════
// Brique réutilisable — un virion de VIH
// ════════════════════════════════════════════════════════════════════════

function Virion({ spikes = 18, detail = false }: { spikes?: number; detail?: boolean }) {
  const dirs = useMemo(() => fibonacci(spikes), [spikes]);
  const arn = useMemo(() => {
    const a: Vector3Tuple[] = [];
    const b: Vector3Tuple[] = [];
    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const y = -0.48 + t * 0.96;
      const rr = 0.32 - 0.19 * t;
      const ang = t * Math.PI * 5;
      a.push([Math.cos(ang) * rr, y, Math.sin(ang) * rr]);
      b.push([Math.cos(ang + Math.PI) * rr, y, Math.sin(ang + Math.PI) * rr]);
    }
    return { a, b };
  }, []);

  return (
    <group>
      {/* Enveloppe : bicouche lipidique volée à la membrane de la cellule hôte */}
      <mesh>
        <sphereGeometry args={[1, 40, 28]} />
        <meshStandardMaterial color="#C4B5FD" roughness={0.2} metalness={0.05} transparent opacity={0.3} />
      </mesh>
      {/* Matrice protéique p17, juste sous l'enveloppe */}
      <mesh>
        <sphereGeometry args={[0.93, 32, 24]} />
        <meshStandardMaterial color="#8B5CF6" roughness={0.55} transparent opacity={0.24} />
      </mesh>

      {/* Spicules : gp41 planté dans l'enveloppe + gp120 en tête (site de fixation) */}
      {dirs.map((d, i) => {
        const q = radialQuat(d);
        const base = d.clone().multiplyScalar(0.99);
        const tete = d.clone().multiplyScalar(1.28);
        return (
          <group key={i}>
            <mesh position={[base.x, base.y, base.z]} quaternion={q} castShadow>
              <cylinderGeometry args={[0.05, 0.065, 0.36, 10]} />
              <meshStandardMaterial color="#4C1D95" roughness={0.45} />
            </mesh>
            <mesh position={[tete.x, tete.y, tete.z]} castShadow>
              <sphereGeometry args={[0.135, 14, 12]} />
              <meshStandardMaterial color="#F59E0B" roughness={0.35} emissive="#B45309" emissiveIntensity={0.22} />
            </mesh>
          </group>
        );
      })}

      {/* Capside conique p24 — signature morphologique du VIH */}
      <group rotation={[0, 0, 0.18]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.2, 0.52, 1.15, 28, 1, true]} />
          <meshStandardMaterial
            color="#6D28D9"
            roughness={0.45}
            side={DoubleSide}
            transparent
            opacity={detail ? 0.5 : 0.92}
          />
        </mesh>
        {detail && (
          <>
            {/* Deux molécules d'ARN simple brin */}
            <PolyLine points={arn.a} color="#F97316" width={3} />
            <PolyLine points={arn.b} color="#FB923C" width={3} />
            {/* Transcriptase inverse + intégrase embarquées dans la capside */}
            <mesh position={[0.16, -0.24, 0.1]}>
              <sphereGeometry args={[0.12, 14, 12]} />
              <meshStandardMaterial color="#10B981" emissive="#047857" emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[-0.15, 0.16, -0.08]}>
              <sphereGeometry args={[0.1, 14, 12]} />
              <meshStandardMaterial color="#06B6D4" emissive="#0E7490" emissiveIntensity={0.45} />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Vue 1 — structure du virion
// ════════════════════════════════════════════════════════════════════════

function VirionView() {
  const rot = useRef<Group>(null);

  return (
    <group>
      <group ref={rot} scale={2.1}>
        <Virion spikes={20} detail />
      </group>

      <Animate
        fn={(state) => {
          rot.current?.rotation.set(0.12 * Math.sin(state.clock.elapsedTime * 0.4), state.clock.elapsedTime * 0.25, 0);
        }}
      />

      <Tag3D position={[2.95, 2.5, 0]} label="gp120 : se fixe sur le récepteur CD4" tone="physique" />
      <Tag3D position={[3.15, 1.4, 0]} label="gp41 : permet la fusion" tone="neutral" />
      <Tag3D position={[-3.35, 2.0, 0]} label="Enveloppe (bicouche lipidique)" tone="svt" />
      <Tag3D position={[-3.5, 0.6, 0]} label="Matrice p17" tone="neutral" />
      <Tag3D position={[-2.6, -1.6, 0]} label="Capside conique p24" tone="svt" />
      <Tag3D position={[0.1, -2.75, 0]} label="2 brins d'ARN viral" tone="physique" />
      <Tag3D position={[3.05, -2.15, 0]} label="Transcriptase inverse" tone="svt" />

      <SceneLabel
        position={[0, 3.5, 0]}
        title="Le VIH, un rétrovirus enveloppé"
        subtitle="son patrimoine génétique est de l'ARN, pas de l'ADN"
        tone="svt"
      />
      <Readout position={[-3.9, -2.6, 0]} value="≈ 120" unit="nm" caption="diamètre du virion" />
    </group>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Vue 2 — cycle infectieux dans un lymphocyte T CD4+
// ════════════════════════════════════════════════════════════════════════

const R_CELL = 2.75;
const NOYAU: Vector3Tuple = [1.05, -0.15, 0];
const R_NOYAU = 1.05;
const RECEPTEURS = [2.15, 2.42, 2.69, 2.96]; // angles (rad) sur l'arc supérieur gauche

/** Récepteur CD4 (bleu) accompagné de son corécepteur (cyan) sur la membrane. */
function RecepteurCD4({ angle }: { angle: number }) {
  const d = new Vector3(Math.cos(angle), Math.sin(angle), 0);
  const q = radialQuat(d);
  const base = d.clone().multiplyScalar(R_CELL - 0.02);
  const tete = d.clone().multiplyScalar(R_CELL + 0.3);
  const co = new Vector3(Math.cos(angle + 0.11), Math.sin(angle + 0.11), 0).multiplyScalar(R_CELL + 0.12);
  return (
    <group>
      <mesh position={[base.x, base.y, base.z]} quaternion={q}>
        <cylinderGeometry args={[0.055, 0.055, 0.42, 10]} />
        <meshStandardMaterial color="#1D4ED8" roughness={0.45} />
      </mesh>
      <mesh position={[tete.x, tete.y, tete.z]} quaternion={q}>
        <boxGeometry args={[0.3, 0.1, 0.16]} />
        <meshStandardMaterial color="#2563EB" roughness={0.4} />
      </mesh>
      <mesh position={[co.x, co.y, co.z]} quaternion={q}>
        <cylinderGeometry args={[0.045, 0.045, 0.3, 8]} />
        <meshStandardMaterial color="#06B6D4" roughness={0.45} />
      </mesh>
    </group>
  );
}

function CycleView() {
  const entrant = useRef<Group>(null);
  const enzyme = useRef<Mesh>(null);
  const bourgeons = useRef<Group>(null);
  const halo = useRef<Mesh>(null);

  const arnLibre = useMemo<Vector3Tuple[]>(() => {
    const pts: Vector3Tuple[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      pts.push([-2.25 + t * 1.35, 0.62 + 0.16 * Math.sin(t * Math.PI * 4), 0.1]);
    }
    return pts;
  }, []);

  const adnViral = useMemo(() => {
    const a: Vector3Tuple[] = [];
    const b: Vector3Tuple[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const x = -2.25 + t * 1.5;
      const ang = t * Math.PI * 4;
      a.push([x, -0.95 + 0.13 * Math.sin(ang), 0.13 * Math.cos(ang)]);
      b.push([x, -0.95 - 0.13 * Math.sin(ang), -0.13 * Math.cos(ang)]);
    }
    return { a, b };
  }, []);

  return (
    <group>
      {/* Membrane du lymphocyte T4 : sphère translucide + contour net */}
      <mesh>
        <sphereGeometry args={[R_CELL, 40, 28]} />
        <meshStandardMaterial color="#BFDBFE" roughness={0.5} transparent opacity={0.2} />
      </mesh>
      <mesh>
        <torusGeometry args={[R_CELL, 0.04, 12, 72]} />
        <meshStandardMaterial color="#2563EB" roughness={0.4} />
      </mesh>
      <mesh ref={halo}>
        <sphereGeometry args={[R_CELL + 0.16, 28, 20]} />
        <meshStandardMaterial color="#EF4444" emissive="#B91C1C" emissiveIntensity={0.4} transparent opacity={0.09} />
      </mesh>

      {/* Récepteurs CD4 + corécepteurs */}
      {RECEPTEURS.map((a) => (
        <RecepteurCD4 key={a} angle={a} />
      ))}

      {/* Noyau et ADN de la cellule (le provirus s'y intègre) */}
      <mesh position={NOYAU}>
        <sphereGeometry args={[R_NOYAU, 32, 24]} />
        <meshStandardMaterial color="#93C5FD" roughness={0.5} transparent opacity={0.35} />
      </mesh>
      <mesh position={NOYAU}>
        <torusGeometry args={[R_NOYAU, 0.03, 10, 56]} />
        <meshStandardMaterial color="#1D4ED8" roughness={0.4} />
      </mesh>
      <DNAHelix turns={2} height={1.55} radius={0.42} position={NOYAU} />
      {/* Segment de provirus intégré (orange = origine virale) */}
      <mesh position={[NOYAU[0], NOYAU[1] + 0.16, NOYAU[2]]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.075, 0.075, 0.86, 12]} />
        <meshStandardMaterial color="#F97316" emissive="#C2410C" emissiveIntensity={0.55} />
      </mesh>

      {/* 1 · Le virion arrive et se fixe sur un récepteur CD4 */}
      <group ref={entrant} scale={0.4}>
        <Virion spikes={12} />
      </group>

      {/* 2 · La capside est entrée dans le cytoplasme */}
      <group position={[-1.85, 1.35, 0.2]} rotation={[0, 0, -0.5]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.16, 0.4, 0.9, 22, 1, true]} />
          <meshStandardMaterial color="#6D28D9" roughness={0.45} side={DoubleSide} transparent opacity={0.6} />
        </mesh>
      </group>

      {/* 3 · Transcription inverse : l'ARN viral est copié en ADN double brin */}
      <PolyLine points={arnLibre} color="#F97316" width={4} />
      <Arrow3D from={[-1.55, 0.4, 0.1]} to={[-1.55, -0.55, 0.1]} color="#10B981" radius={0.035} headLength={0.24} />
      <PolyLine points={adnViral.a} color="#7C3AED" width={3.5} />
      <PolyLine points={adnViral.b} color="#A78BFA" width={3.5} />
      <mesh ref={enzyme}>
        <sphereGeometry args={[0.17, 16, 14]} />
        <meshStandardMaterial color="#10B981" emissive="#047857" emissiveIntensity={0.6} />
      </mesh>

      {/* 4 · Intégration du provirus dans l'ADN de la cellule */}
      <Arrow3D from={[-0.6, -0.9, 0.1]} to={[0.25, -0.45, 0.1]} color="#F97316" radius={0.035} headLength={0.24} />

      {/* 5 · Réplication puis bourgeonnement de nouveaux virions */}
      <group ref={bourgeons}>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} scale={0.34}>
            <Virion spikes={10} />
          </group>
        ))}
      </group>

      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime;

          // 1 · approche puis accostage sur le récepteur CD4
          const u = (t * 0.28) % 1;
          const e = Math.min(1, u / 0.75);
          const cible = new Vector3(Math.cos(RECEPTEURS[1]), Math.sin(RECEPTEURS[1]), 0).multiplyScalar(R_CELL + 0.62);
          entrant.current?.position.set(
            -5.4 + e * (cible.x + 5.4),
            3.3 + e * (cible.y - 3.3),
            0.3 * (1 - e),
          );
          entrant.current?.rotation.set(0, t * 0.9, 0);
          entrant.current?.scale.setScalar(0.4 * (1 - 0.25 * Math.max(0, (u - 0.75) / 0.25)));

          // 3 · l'enzyme glisse le long du brin en cours de rétrotranscription
          const v = (t * 0.32) % 1;
          enzyme.current?.position.set(-2.25 + v * 1.5, -0.95 + 0.16 * Math.sin(v * Math.PI * 4), 0.24);

          // 5 · les virions néoformés bourgeonnent puis s'éloignent
          const b = bourgeons.current;
          if (b) {
            b.children.forEach((c, i) => {
              const w = (t * 0.26 + i / 4) % 1;
              const ang = 0.32 + (i - 1.5) * 0.34;
              const d = R_CELL - 0.1 + w * 2.6;
              c.position.set(Math.cos(ang) * d, Math.sin(ang) * d, 0.2 * Math.sin(t + i));
              c.rotation.set(0, t * 0.7 + i, 0);
              c.scale.setScalar(0.34 * Math.min(1, w * 4));
            });
          }

          halo.current?.scale.setScalar(1 + 0.035 * Math.sin(t * 1.4));
        }}
      />

      <Tag3D position={[-4.35, 3.35, 0]} label="1 · gp120 se fixe sur le récepteur CD4" tone="physique" />
      <Tag3D position={[-3.45, 1.75, 0]} label="2 · Fusion : la capside entre" tone="svt" />
      <Tag3D position={[-2.55, 1.05, 0]} label="ARN viral libéré" tone="neutral" />
      <Tag3D position={[-3.15, -0.25, 0]} label="3 · Transcription inverse ARN → ADN" tone="svt" />
      <Tag3D position={[-1.6, -1.55, 0]} label="ADN viral (double brin)" tone="neutral" />
      <Tag3D position={[1.15, -1.75, 0]} label="4 · Intégration : provirus dans l'ADN" tone="physique" />
      <Tag3D position={[4.15, 2.35, 0]} label="5 · Réplication et bourgeonnement" tone="svt" />
      <Tag3D position={[3.5, -2.6, 0]} label="Le lymphocyte T4 finit par être détruit" tone="neutral" />

      <SceneLabel
        position={[-0.4, 4.3, 0]}
        title="Cycle infectieux dans un lymphocyte T CD4+"
        subtitle="le VIH détourne la machinerie de la cellule qui commande l'immunité"
        tone="svt"
      />
      <Readout position={[4.4, -0.5, 0]} value="10³–10⁴" caption="virions par cellule infectée" />
    </group>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Vue 3 — le graphe : charge virale et taux de T4 sur 10 ans
// ════════════════════════════════════════════════════════════════════════

const OX = -4.7;
const OY = -2.35;
const W = 9.4;
const H = 4.9;

function X(mois: number) {
  return OX + (mois / MOIS_MAX) * W;
}
function YC(t4: number) {
  return OY + (Math.min(t4, CD4_AXE_MAX) / CD4_AXE_MAX) * H;
}
function YV(logCv: number) {
  return OY + ((logCv - LOG_CV_MIN) / (LOG_CV_MAX - LOG_CV_MIN)) * H;
}

/** Échantillonnage fin pendant la primo-infection, plus lâche ensuite. */
const ECH = (() => {
  const arr: number[] = [];
  for (let m = 0; m <= 9; m += 0.15) arr.push(m);
  for (let m = 9.5; m <= MOIS_MAX; m += 1) arr.push(m);
  return arr;
})();

function Bandeau({ de, a, color }: { de: number; a: number; color: string }) {
  const largeur = X(a) - X(de);
  if (largeur <= 0.02) return null;
  return (
    <mesh position={[(X(de) + X(a)) / 2, OY + H / 2, -0.12]}>
      <boxGeometry args={[largeur, H, 0.01]} />
      <meshStandardMaterial color={color} transparent opacity={0.16} />
    </mesh>
  );
}

function CourbesView({ mois, traitement, debutTraitement }: Omit<VihSceneProps, 'view'>) {
  const curseur = useRef<Group>(null);

  const { courbeCd4, courbeCv, refCd4 } = useMemo(() => {
    const c: Vector3Tuple[] = [];
    const v: Vector3Tuple[] = [];
    const r: Vector3Tuple[] = [];
    for (const m of ECH) {
      c.push([X(m), YC(cd4(m, traitement, debutTraitement)), 0]);
      v.push([X(m), YV(logChargeVirale(m, traitement, debutTraitement)), 0]);
      r.push([X(m), YC(cd4Naturel(m)), -0.02]);
    }
    return { courbeCd4: c, courbeCv: v, refCd4: r };
  }, [traitement, debutTraitement]);

  const t4 = cd4(mois, traitement, debutTraitement);
  const logCv = logChargeVirale(mois, traitement, debutTraitement);
  const mSida = moisSida(traitement, debutTraitement);
  const finAsympto = mSida ?? MOIS_MAX;

  return (
    <group>
      {/* Bandeaux des phases de l'infection */}
      <Bandeau de={0} a={3} color="#F59E0B" />
      <Bandeau de={3} a={finAsympto} color="#22C55E" />
      {mSida !== null && <Bandeau de={mSida} a={MOIS_MAX} color="#EF4444" />}

      {/* Repère */}
      <Arrow3D from={[OX - 0.3, OY, 0]} to={[OX + W + 0.5, OY, 0]} color="#475569" radius={0.02} headLength={0.2} />
      <Arrow3D from={[OX, OY - 0.3, 0]} to={[OX, OY + H + 0.5, 0]} color="#16A34A" radius={0.02} headLength={0.2} />
      <Arrow3D
        from={[OX + W, OY - 0.3, 0]}
        to={[OX + W, OY + H + 0.5, 0]}
        color="#DC2626"
        radius={0.02}
        headLength={0.2}
      />
      {[2, 4, 6, 8, 10].map((an) => (
        <group key={an}>
          <mesh position={[X(an * 12), OY, 0]}>
            <boxGeometry args={[0.02, 0.16, 0.02]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          <Tag3D position={[X(an * 12), OY - 0.42, 0]} label={`${an} ans`} tone="neutral" />
        </group>
      ))}

      {/* Seuil SIDA : 200 T4/mm³ */}
      <PolyLine points={[[OX, YC(SEUIL_SIDA), 0], [OX + W, YC(SEUIL_SIDA), 0]]} color="#DC2626" width={2} dashed />
      <Tag3D position={[OX + 2.0, YC(SEUIL_SIDA) - 0.34, 0]} label="Seuil SIDA · 200 T4/mm³" tone="physique" />

      {/* Seuil d'indétectabilité de la charge virale */}
      <PolyLine
        points={[[OX, YV(LOG_INDETECTABLE), 0], [OX + W, YV(LOG_INDETECTABLE), 0]]}
        color="#94A3B8"
        width={1.5}
        dashed
      />

      {/* Courbe de référence sans traitement (comparaison) */}
      {traitement && <PolyLine points={refCd4} color="#94A3B8" width={2} dashed />}

      {/* Les deux courbes du graphe */}
      <PolyLine points={courbeCv} color="#DC2626" width={4} />
      <PolyLine points={courbeCd4} color="#16A34A" width={4} />

      {/* Début du traitement */}
      {traitement && (
        <>
          <PolyLine
            points={[[X(debutTraitement), OY, 0], [X(debutTraitement), OY + H, 0]]}
            color="#7C3AED"
            width={2}
            dashed
          />
          <Tag3D
            position={[X(debutTraitement), OY + H + 0.32, 0]}
            label={`ARV dès ${formatDuree(debutTraitement)}`}
            tone="chimie"
          />
        </>
      )}

      {/* Curseur temporel */}
      <PolyLine points={[[X(mois), OY, 0], [X(mois), OY + H, 0]]} color="#64748B" width={1.5} dashed />
      <group ref={curseur}>
        <Marker position={[X(mois), YC(t4), 0.05]} color="#15803D" size={0.14} />
      </group>
      <Marker position={[X(mois), YV(logCv), 0.05]} color="#B91C1C" size={0.14} />

      <Animate
        fn={(state) => {
          curseur.current?.scale.setScalar(1 + 0.2 * Math.sin(state.clock.elapsedTime * 3));
        }}
      />

      {/* Graduations des deux axes verticaux */}
      <Tag3D position={[OX - 0.95, YC(1200), 0]} label="1200 T4" tone="svt" />
      <Tag3D position={[OX - 0.95, YC(500), 0]} label="500 T4" tone="svt" />
      <Tag3D position={[OX + W + 1.0, YV(6), 0]} label="10⁶ copies" tone="physique" />
      <Tag3D position={[OX + W + 1.0, YV(3), 0]} label="10³ copies" tone="physique" />
      <Tag3D position={[OX + W + 0.75, OY - 0.42, 0]} label="temps" tone="neutral" />

      {/* Légende des phases */}
      <Tag3D position={[X(1.5), OY + H + 0.3, 0]} label="Primo-infection" tone="physique" />
      <Tag3D position={[X((3 + finAsympto) / 2), OY - 0.95, 0]} label="Phase asymptomatique (aucun symptôme)" tone="svt" />
      {mSida !== null && <Tag3D position={[X((mSida + MOIS_MAX) / 2), OY - 0.95, 0]} label="Stade SIDA" tone="physique" />}

      <SceneLabel
        position={[0, OY + H + 1.25, 0]}
        title={traitement ? 'Avec antirétroviraux' : 'Sans traitement'}
        subtitle="charge virale (rouge, échelle log) et lymphocytes T4 (vert) sur 10 ans"
        tone="svt"
      />
      <Readout
        position={[X(mois), YC(t4) + 0.62, 0.05]}
        value={Math.round(t4)}
        unit="T4/mm³"
        caption={formatDuree(mois)}
      />
      <Readout position={[X(mois), YV(logCv) - 0.66, 0.05]} value={formatCharge(logCv)} caption="copies/mL" />
    </group>
  );
}

// ════════════════════════════════════════════════════════════════════════

export default function VihScene({ view, mois, traitement, debutTraitement }: VihSceneProps) {
  const camera: Vector3Tuple = view === 'virion' ? [0, 0.2, 9.5] : view === 'cycle' ? [0, 0.3, 13.5] : [0.2, 0.4, 12.4];

  return (
    <LabScene
      cameraPosition={[camera[0], camera[1], camera[2]]}
      background="#F5F3FF"
      minDistance={5}
      maxDistance={22}
      groundY={null}
    >
      {view === 'virion' && <VirionView />}
      {view === 'cycle' && <CycleView />}
      {view === 'courbes' && (
        <CourbesView mois={mois} traitement={traitement} debutTraitement={debutTraitement} />
      )}
    </LabScene>
  );
}
