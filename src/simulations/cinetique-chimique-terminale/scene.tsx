'use client';

import { useMemo, useRef } from 'react';
import { Mesh, Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench } from '@/components/lab3d/environment';
import { Erlenmeyer } from '@/components/lab3d/glassware';
import { Axes2D, PolyLine, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — cinétique chimique (Terminale S, Bac).
 *
 * À gauche : un erlenmeyer où une réaction se déroule (couleur qui s'éclaircit
 * au fur et à mesure que les réactifs s'épuisent, bulles d'effervescence dont
 * la fréquence augmente avec la vitesse). À droite : la courbe d'avancement
 * x(t) en PolyLine sur un repère fléché, tendant vers un palier x_max.
 *
 * Modèle : réactif [A](t) = C0·exp(−k·t) ; avancement x(t) = C0·(1 − e^{−k·t}).
 * k croît avec la température (loi d'Arrhenius) et la vitesse v = k·[A] croît
 * avec la concentration initiale. La vitesse diminue au cours du temps.
 */

export type KineticSceneProps = {
  /** k effectif (s⁻¹·échelle) — pilote la rapidité de la réaction. */
  rate: number;
  /** concentration initiale relative C0 ∈ [0,1] (teinte + palier). */
  conc: number;
};

// Repère de la courbe (à droite)
const PLOT_X = 1.7; // décalage horizontal du repère
const PLOT_W = 2.4; // largeur (axe des temps)
const PLOT_H = 1.9; // hauteur (axe de l'avancement)
const T_MAX = 30; // fenêtre temporelle (s)
const GROUND_Y = -1.5;

export default function KineticScene({ rate, conc }: KineticSceneProps) {
  const current = useRef<Mesh>(null); // point courant sur la courbe
  const bubbles = useRef<Group>(null); // colonne de bulles dans l'erlenmeyer
  const tref = useRef(0);

  // Courbe d'avancement x(t)/C0_max → tend vers `conc` (palier).
  const curve = useMemo(() => {
    const pts: [number, number, number][] = [];
    const N = 80;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * T_MAX;
      const adv = conc * (1 - Math.exp(-rate * t)); // avancement relatif
      pts.push([PLOT_X + (t / T_MAX) * PLOT_W, GROUND_Y + adv * PLOT_H, 0]);
    }
    return pts;
  }, [rate, conc]);

  // Couleur du milieu : foncée au départ (réactif), s'éclaircit (produit).
  // Teinte chimie violacée → on module la saturation par `conc`.
  const startColor = useMemo(() => {
    // plus concentré = plus foncé/saturé
    const sat = 0.35 + 0.5 * conc;
    return `hsl(270, ${Math.round(sat * 100)}%, ${Math.round(62 - 18 * conc)}%)`;
  }, [conc]);

  const tHalf = useMemo(() => Math.log(2) / Math.max(rate, 1e-4), [rate]);

  return (
    <LabScene cameraPosition={[0.4, 0.4, 6.4]} background="#F4ECFF" minDistance={4} maxDistance={11} groundY={GROUND_Y}>
      <LabBench y={GROUND_Y} color="#D9C9F0" size={26} />

      {/* ── GAUCHE : l'erlenmeyer où la réaction se déroule ── */}
      <group position={[-2.6, 0.05, 0]}>
        <Erlenmeyer position={[0, 0, 0]} fill={0.55} liquidColor={startColor} height={2.6} />

        {/* colonne de bulles (effervescence) — animée via <Animate> */}
        <group ref={bubbles}>
          {Array.from({ length: 9 }, (_, i) => (
            <mesh key={i} position={[((i % 3) - 1) * 0.18, -1, ((i % 2) - 0.5) * 0.18]}>
              <sphereGeometry args={[0.05, 10, 8]} />
              <meshStandardMaterial color="#FFFFFF" transparent opacity={0.7} roughness={0.1} />
            </mesh>
          ))}
        </group>

        <Tag3D position={[0, -1.55, 0]} label="réaction" tone="chimie" />
      </group>

      {/* ── DROITE : courbe d'avancement x(t) sur repère fléché ── */}
      <group>
        {/* repère : origine au coin bas-gauche du tracé */}
        <group position={[PLOT_X, GROUND_Y, 0]}>
          <Axes2D size={1} ticks={false} color="#6D28D9" />
        </group>
        {/* axes dimensionnés manuellement (le repère du kit est carré) */}
        <PolyLine points={curve} color="#7C3AED" width={4} />

        {/* palier x_max (asymptote pointillée) */}
        <PolyLine
          points={[
            [PLOT_X, GROUND_Y + conc * PLOT_H, 0],
            [PLOT_X + PLOT_W + 0.2, GROUND_Y + conc * PLOT_H, 0],
          ]}
          color="#A78BFA"
          width={2}
          dashed
        />
        <Tag3D position={[PLOT_X + PLOT_W + 0.05, GROUND_Y + conc * PLOT_H + 0.2, 0]} label="x max" tone="chimie" />
        <Tag3D position={[PLOT_X + PLOT_W * 0.5, GROUND_Y - 0.32, 0]} label="temps →" tone="neutral" />

        {/* point courant qui parcourt la courbe */}
        <Marker position={[PLOT_X, GROUND_Y, 0]} color="#DB2777" size={0.1} />
        <mesh ref={current}>
          <sphereGeometry args={[0.11, 18, 14]} />
          <meshStandardMaterial color="#DB2777" emissive="#9D174D" emissiveIntensity={0.4} />
        </mesh>
      </group>

      {/* ── Animation : bulles montantes + point courant ── */}
      <Animate
        fn={(state) => {
          if (tref.current === 0) tref.current = state.clock.elapsedTime;
          const elapsed = state.clock.elapsedTime - tref.current;
          // vitesse d'animation des bulles ∝ vitesse de réaction (rate·conc)
          const speed = 0.4 + rate * conc * 26;

          // bulles : montée cyclique dans le corps de l'erlenmeyer
          const kids = bubbles.current?.children ?? [];
          for (let i = 0; i < kids.length; i++) {
            const phase = (elapsed * speed + i * 0.7) % 2.4;
            const y = -1.05 + phase * 0.6; // remonte du fond vers la surface
            kids[i].position.setY(y);
            kids[i].visible = y < 0.45; // disparaît à la surface
          }

          // point courant : balaye la courbe d'avancement en boucle
          const cycle = T_MAX + 4; // pause avant relance
          const tc = Math.min((elapsed * 3) % cycle, T_MAX);
          const adv = conc * (1 - Math.exp(-rate * tc));
          current.current?.position.set(PLOT_X + (tc / T_MAX) * PLOT_W, GROUND_Y + adv * PLOT_H, 0);
        }}
      />

      <SceneLabel
        position={[0, 2.45, 0]}
        title="Avancement x(t) → palier"
        subtitle="Cinétique · la vitesse diminue avec le temps"
        tone="chimie"
      />
      <Readout position={[PLOT_X + PLOT_W * 0.5, GROUND_Y + PLOT_H + 0.5, 0]} value={tHalf.toFixed(1)} unit="s" caption="temps de demi-réaction t½" />
    </LabScene>
  );
}
