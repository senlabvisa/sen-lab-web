'use client';

import { useMemo, useRef } from 'react';
import { DoubleSide, Group, Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench } from '@/components/lab3d/environment';
import { Metal, GlassThin } from '@/components/lab3d/materials';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — loupe binoculaire du labo : observation d'un indice de terrain
 * rapporté du Parc National du Niokolo-Koba (SVT, 6ème).
 *
 * On n'observe PAS un animal entier : on observe **l'attribut**, c'est-à-dire
 * ce que l'être vivant possède (poil, plume, écaille cornée, rayon de
 * nageoire). C'est exactement la démarche de la classification moderne :
 * on range les êtres vivants d'après leurs attributs, pas d'après leur
 * milieu de vie.
 *
 * L'échantillon est posé sur une lame de verre, sur la platine éclairée ;
 * il tourne lentement et grossit avec le réglage de grossissement (×10 → ×40).
 */

export type SampleKey = 'poil' | 'plume' | 'ecaille' | 'nageoire';
export type ClassifSceneProps = { sample: SampleKey; zoom: number };

const TITLE: Record<SampleKey, { title: string; subtitle: string; main: string; detail: string }> = {
  poil: { title: 'Touffe de poils', subtitle: 'pelage de lion · Niokolo-Koba', main: 'Poil', detail: 'Peau (derme)' },
  plume: { title: 'Plume', subtitle: 'calao à bec rouge · Niokolo-Koba', main: 'Barbes', detail: 'Rachis (axe de la plume)' },
  ecaille: { title: 'Écailles cornées', subtitle: 'peau de crocodile · fleuve Gambie', main: 'Écaille cornée', detail: 'Carène (relief central)' },
  nageoire: { title: 'Nageoire', subtitle: 'capitaine · fleuve Gambie', main: 'Rayon osseux', detail: 'Membrane entre les rayons' },
};

// ──────────────────────────────────────────────────────────────────────
// Les quatre attributs observés (objets d'étude, pas des animaux entiers)
// ──────────────────────────────────────────────────────────────────────

/** Poils implantés dans la peau — attribut des mammifères. */
function Pelage() {
  const hairs = useMemo(() => {
    const out: { r: number; a: number; y: number; len: number; tilt: number; c: string }[] = [];
    const N = 72;
    for (let i = 0; i < N; i++) {
      const a = i * 2.399963; // angle d'or → répartition régulière
      const r = 0.58 * Math.sqrt((i + 0.5) / N);
      out.push({
        r,
        a,
        y: 0.26 * Math.sqrt(Math.max(0, 1 - (r / 0.62) ** 2)),
        len: 0.3 + 0.13 * Math.abs(Math.sin(i * 1.7)),
        tilt: 0.2 + r * 0.55,
        c: i % 3 === 0 ? '#8A5A22' : '#C08A44',
      });
    }
    return out;
  }, []);

  return (
    <group>
      <mesh scale={[1, 0.42, 1]} castShadow receiveShadow>
        <sphereGeometry args={[0.62, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#C89A63" roughness={0.95} />
      </mesh>
      {hairs.map((h, i) => (
        <group key={i} rotation={[0, -h.a, 0]}>
          <mesh
            position={[h.r + Math.sin(h.tilt) * h.len * 0.5, h.y + Math.cos(h.tilt) * h.len * 0.5, 0]}
            rotation={[0, 0, -h.tilt]}
            castShadow
          >
            <cylinderGeometry args={[0.006, 0.017, h.len, 6]} />
            <meshStandardMaterial color={h.c} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Rachis + barbes — attribut des oiseaux. */
function Plume() {
  const beta = 0.62; // ouverture des barbes par rapport au rachis
  const dx = -Math.cos(beta);
  const dz = Math.sin(beta);
  const gamma = Math.atan2(-dz, dx);

  const barbs = useMemo(() => {
    const out: { x: number; len: number; c: string }[] = [];
    const N = 34;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      out.push({
        x: -0.72 + t * 1.44,
        len: 0.06 + 0.34 * Math.sin(Math.PI * Math.min(1, t * 1.06)),
        c: t < 0.6 ? '#2B2723' : '#F0E9DB', // calao : plume noire à extrémité claire
      });
    }
    return out;
  }, []);

  return (
    <group rotation={[-0.3, 0, 0]} position={[0, 0.07, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.01, 0.03, 1.6, 10]} />
        <meshStandardMaterial color="#E8DFC9" roughness={0.45} />
      </mesh>
      {barbs.map((b, i) => (
        <group key={i}>
          <mesh position={[b.x + dx * b.len * 0.5, 0, dz * b.len * 0.5]} rotation={[0, gamma, 0]}>
            <boxGeometry args={[b.len, 0.01, 0.008]} />
            <meshStandardMaterial color={b.c} roughness={0.7} />
          </mesh>
          <mesh position={[b.x + dx * b.len * 0.5, 0, -dz * b.len * 0.5]} rotation={[0, -gamma, 0]}>
            <boxGeometry args={[b.len, 0.01, 0.008]} />
            <meshStandardMaterial color={b.c} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Plaques cornées imbriquées et carénées — attribut des reptiles. */
function EcaillesCornees() {
  const plates = useMemo(() => {
    const out: { u: number; v: number; y: number; dark: boolean }[] = [];
    for (let row = 0; row < 5; row++) {
      const u = -0.62 + row * 0.31;
      for (let col = 0; col < 5; col++) {
        const v = -0.56 + col * 0.28 + (row % 2 ? 0.14 : 0);
        const q = (u / 0.85) ** 2 + (v / 0.72) ** 2;
        if (q > 0.95) continue;
        out.push({ u, v, y: 0.3 * Math.sqrt(1 - q), dark: (row + col) % 2 === 0 });
      }
    }
    return out;
  }, []);

  return (
    <group>
      <mesh scale={[1, 0.35, 0.85]} castShadow receiveShadow>
        <sphereGeometry args={[0.85, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#4A5732" roughness={0.9} />
      </mesh>
      {plates.map((p, i) => (
        <group key={i}>
          <mesh position={[p.u, p.y, p.v]} scale={[1.25, 0.4, 1]} castShadow>
            <sphereGeometry args={[0.15, 14, 10]} />
            <meshStandardMaterial color={p.dark ? '#5F7040' : '#71844C'} roughness={0.72} />
          </mesh>
          <mesh position={[p.u, p.y + 0.048, p.v]}>
            <boxGeometry args={[0.17, 0.028, 0.022]} />
            <meshStandardMaterial color="#39462A" roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Membrane tendue sur des rayons osseux — attribut des poissons. */
function Nageoire() {
  const rays = useMemo(() => {
    const out: { th: number; len: number }[] = [];
    const N = 9;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      out.push({ th: Math.PI * 0.18 + t * Math.PI * 0.64, len: 0.72 + 0.26 * Math.sin(Math.PI * t) });
    }
    return out;
  }, []);

  return (
    <group rotation={[0, 0.4, 0]}>
      <mesh>
        <circleGeometry args={[0.95, 44, Math.PI * 0.15, Math.PI * 0.7]} />
        <meshStandardMaterial color="#BFDCEA" transparent opacity={0.55} roughness={0.25} side={DoubleSide} />
      </mesh>
      {rays.map((r, i) => (
        <mesh
          key={i}
          position={[Math.cos(r.th) * r.len * 0.5, Math.sin(r.th) * r.len * 0.5, 0.012]}
          rotation={[0, 0, r.th - Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.007, 0.02, r.len, 8]} />
          <meshStandardMaterial color="#7E93A6" roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0.02, 0]} scale={[1.35, 0.55, 1]} castShadow>
        <sphereGeometry args={[0.18, 18, 12]} />
        <meshStandardMaterial color="#9AB3C4" roughness={0.6} />
      </mesh>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Scène
// ──────────────────────────────────────────────────────────────────────

export default function ClassifScene({ sample, zoom }: ClassifSceneProps) {
  const specimen = useRef<Group>(null);
  const knob = useRef<Mesh>(null);
  const meta = TITLE[sample];
  const s = 0.32 + zoom * 0.022; // ×10 → 0,54 · ×40 → 1,20

  return (
    <LabScene cameraPosition={[0.9, 0.15, 4.9]} background="#ECFDF3" minDistance={3} maxDistance={11} groundY={-1.6}>
      <LabBench y={-1.6} color="#E4E7DE" size={20} />

      {/* ── Loupe binoculaire ── */}
      <mesh position={[0, -1.51, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 0.18, 1.9]} />
        <Metal color="#7E8794" roughness={0.5} metalness={0.6} />
      </mesh>
      <mesh position={[0, -0.05, -0.72]} castShadow>
        <cylinderGeometry args={[0.11, 0.11, 2.9, 20]} />
        <Metal color="#B4BCC7" roughness={0.28} />
      </mesh>
      <mesh position={[0, -0.68, -0.44]} castShadow>
        <boxGeometry args={[0.3, 0.16, 0.62]} />
        <Metal color="#98A2AE" />
      </mesh>
      {/* platine + lame de verre */}
      <mesh position={[0, -0.62, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.95, 0.95, 0.09, 40]} />
        <meshStandardMaterial color="#20262E" roughness={0.55} metalness={0.25} />
      </mesh>
      <mesh position={[0, -0.555, 0]}>
        <boxGeometry args={[1.7, 0.03, 1.2]} />
        <GlassThin tint="#DFF1FF" opacity={0.3} />
      </mesh>
      {/* anneau lumineux + éclairage de la platine */}
      <mesh position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.07, 12, 36]} />
        <meshStandardMaterial color="#FFF8E1" emissive="#FFE9A8" emissiveIntensity={1.4} roughness={0.3} />
      </mesh>
      <pointLight position={[0, 0.18, 0]} intensity={1.2} distance={3.2} color="#FFF3D6" />
      {/* optique */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.22, 0.36, 24]} />
        <Metal color="#2F343C" roughness={0.35} metalness={0.5} />
      </mesh>
      <mesh position={[0, 1.03, 0]} castShadow>
        <cylinderGeometry args={[0.36, 0.36, 0.66, 28]} />
        <Metal color="#39404A" roughness={0.4} metalness={0.55} />
      </mesh>
      <mesh position={[0, 1.05, -0.45]} castShadow>
        <boxGeometry args={[0.26, 0.24, 0.85]} />
        <Metal color="#98A2AE" />
      </mesh>
      {([-0.19, 0.19] as const).map((x) => (
        <group key={x}>
          <mesh position={[x, 1.48, 0.19]} rotation={[-0.5, 0, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.14, 0.6, 20]} />
            <Metal color="#39404A" roughness={0.4} metalness={0.5} />
          </mesh>
          <mesh position={[x, 1.61, 0.42]} rotation={[-0.5, 0, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.09, 20]} />
            <meshStandardMaterial color="#14181D" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* bouton de mise au point (tourne pendant l'observation) */}
      <mesh ref={knob} position={[0.32, -0.05, -0.72]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.16, 24]} />
        <Metal color="#5B646F" roughness={0.55} metalness={0.4} />
      </mesh>

      {/* ── Échantillon observé ── */}
      <group ref={specimen} position={[0, -0.53, 0]} scale={s}>
        {sample === 'poil' && <Pelage />}
        {sample === 'plume' && <Plume />}
        {sample === 'ecaille' && <EcaillesCornees />}
        {sample === 'nageoire' && <Nageoire />}
      </group>

      <Animate
        fn={(_state, delta) => {
          if (specimen.current) specimen.current.rotation.y += delta * 0.32;
          if (knob.current) knob.current.rotation.x += delta * 0.9;
        }}
      />

      <Tag3D position={[-1.35, -0.15, 0]} label={meta.main} tone="svt" />
      {zoom >= 20 && <Tag3D position={[1.4, -0.62, 0]} label={meta.detail} tone="physique" />}
      <SceneLabel position={[0, 2.15, 0]} title={meta.title} subtitle={meta.subtitle} tone="svt" />
      <Readout position={[1.95, 0.75, 0]} value={`×${zoom}`} caption="grossissement" />
    </LabScene>
  );
}
