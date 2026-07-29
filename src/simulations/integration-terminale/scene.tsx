'use client';

import { useMemo, useRef } from 'react';
import { Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Axes2D, Bar, FunctionCurve, Marker, PolyLine } from '@/components/lab3d/plot';
import { Readout, SceneLabel, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';
import { FUNCTIONS, exactIntegral, riemannLeft, type FnKey } from './functions';

/**
 * Scène 3D — sommes de Riemann et primitive (Terminale S, Bac).
 *
 * mode « riemann » : n rectangles (hauteur = f du bord gauche) posés sous la
 * courbe de f. Les rectangles au-dessus de l'axe sont violets (aire comptée
 * positivement), ceux en dessous sont rouges (aire comptée NÉGATIVEMENT) :
 * l'aire algébrique n'est pas l'aire géométrique. La somme affichée est
 * réellement calculée (riemannLeft), pas approximée à l'œil.
 *
 * mode « primitive » : on trace f ET F(x) = ∫₀^x f. Un point glisse le long
 * de F ; le segment vert qui l'accompagne est la tangente à F, de pente
 * f(x) — on VOIT que F′ = f. Courbes en FunctionCurve (lignes lisses),
 * jamais en petites sphères.
 */

export type IntegSceneProps = {
  fnKey: FnKey;
  /** Borne supérieure (la borne inférieure vaut toujours 0). */
  b: number;
  /** Nombre de rectangles de la somme de Riemann. */
  n: number;
  mode: 'riemann' | 'primitive';
};

const X_MIN = -0.25;
const X_MAX = 3.3;
const CLAMP_Y = 3.5;
/** Recentrage du repère dans le champ de la caméra. */
const OX = -1.25;
const OY = -0.4;

export default function IntegScene({ fnKey, b, n, mode }: IntegSceneProps) {
  const spec = FUNCTIONS[fnKey];
  const { f, F } = spec;

  const sum = useMemo(() => riemannLeft(f, 0, b, n), [f, b, n]);
  const exact = useMemo(() => exactIntegral(spec, 0, b), [spec, b]);

  // Rectangles de Riemann à gauche : base [xᵢ ; xᵢ+Δx], hauteur f(xᵢ).
  const rects = useMemo(() => {
    const dx = b / n;
    const arr: { cx: number; h: number }[] = [];
    for (let i = 0; i < n; i++) arr.push({ cx: i * dx + dx / 2, h: f(i * dx) });
    return arr;
  }, [f, b, n]);
  const barW = (b / n) * 0.94;

  // Bornes verticales a = 0 et b (pointillés jusqu'à la courbe).
  const bLine = useMemo<[number, number, number][]>(
    () => [
      [b, 0, 0.05],
      [b, f(b), 0.05],
    ],
    [f, b],
  );

  // Refs animées (mutées par <Animate>, jamais de useFrame ici).
  const scan = useRef<Mesh>(null); // point courant sur f (mode riemann)
  const onF = useRef<Mesh>(null); // point courant sur F (mode primitive)
  const onf = useRef<Mesh>(null); // point de même abscisse sur f
  const tan = useRef<Mesh>(null); // tangente à F, de pente f(x)
  const link = useRef<Mesh>(null); // trait vertical reliant les deux points

  return (
    <LabScene
      cameraPosition={[0, 0, 9]}
      background="#F5F3FF"
      minDistance={4}
      maxDistance={14}
      groundY={null}
    >
      <group position={[OX, OY, 0]}>
        <Axes2D size={3} color="#64748B" />
        <Tag3D position={[3.35, -0.32, 0]} label={`x (${spec.xUnit})`} tone="maths" />
        <Tag3D position={[-0.55, 3.2, 0]} label={spec.yUnit} tone="maths" />

        {mode === 'riemann' ? (
          <>
            {/* Rectangles : violets si f ≥ 0 (aire ajoutée), rouges si f < 0 (aire retranchée) */}
            {rects.map((r, i) =>
              r.h >= 0 ? (
                <Bar key={i} x={r.cx} height={r.h} width={barW} depth={0.32} color="#A78BFA" />
              ) : (
                <mesh key={i} position={[r.cx, r.h / 2, 0]}>
                  <boxGeometry args={[barW, -r.h, 0.32]} />
                  <meshStandardMaterial color="#FB7185" roughness={0.5} />
                </mesh>
              ),
            )}

            {/* Courbe de f par-dessus les rectangles */}
            <FunctionCurve fn={f} from={X_MIN} to={X_MAX} samples={160} color="#0EA5E9" width={4} clampY={CLAMP_Y} z={0.2} />
            <PolyLine points={bLine} color="#7C3AED" width={2} dashed />
            <Marker position={[0, 0, 0.25]} color="#7C3AED" size={0.09} />
            <Marker position={[b, 0, 0.25]} color="#7C3AED" size={0.09} />
            <Tag3D position={[0, -0.36, 0]} label="a = 0" tone="maths" />
            <Tag3D position={[b, -0.36, 0]} label={`b = ${b.toFixed(1)}`} tone="maths" />

            {/* Point qui balaie la courbe : c'est lui qui donne la hauteur de chaque rectangle */}
            <mesh ref={scan}>
              <sphereGeometry args={[0.09, 18, 14]} />
              <meshStandardMaterial color="#F59E0B" emissive="#B45309" emissiveIntensity={0.35} />
            </mesh>
            <Animate
              fn={(state) => {
                const u = 0.5 * (1 - Math.cos(state.clock.elapsedTime * 0.8)); // 0 → 1 → 0
                const x = u * b;
                scan.current?.position.set(x, f(x), 0.3);
              }}
            />

            <SceneLabel
              position={[1.5, 3.55, 0]}
              title={`Sₙ = ${sum.toFixed(3)} ${spec.unit}`}
              subtitle={`${spec.expr} · n = ${n} rectangles`}
              tone="maths"
            />
            <Readout position={[3.3, 2.5, 0]} value={sum.toFixed(3)} unit={spec.unit} caption={`somme Sₙ (n = ${n})`} />
            <Readout position={[3.3, 1.75, 0]} value={exact.toFixed(3)} unit={spec.unit} caption="intégrale exacte" />
            <Readout position={[3.3, 1.0, 0]} value={Math.abs(sum - exact).toFixed(3)} unit={spec.unit} caption="écart |Sₙ − I|" />
          </>
        ) : (
          <>
            {/* Aire de 0 à b, esquissée par 48 fines bandes (repère visuel) */}
            {Array.from({ length: 48 }).map((_, i) => {
              const dx = b / 48;
              const h = f(i * dx + dx / 2);
              return h >= 0 ? (
                <Bar key={i} x={i * dx + dx / 2} height={h} width={dx * 0.96} depth={0.2} color="#C4B5FD" />
              ) : (
                <mesh key={i} position={[i * dx + dx / 2, h / 2, 0]}>
                  <boxGeometry args={[dx * 0.96, -h, 0.2]} />
                  <meshStandardMaterial color="#FDA4AF" roughness={0.5} />
                </mesh>
              );
            })}

            <FunctionCurve fn={f} from={X_MIN} to={X_MAX} samples={160} color="#0EA5E9" width={4} clampY={CLAMP_Y} z={0.2} />
            <FunctionCurve fn={F} from={0} to={X_MAX} samples={160} color="#7C3AED" width={4} clampY={CLAMP_Y} z={0.25} />
            <Tag3D position={[2.2, f(2.2) + 0.38, 0]} label="f" tone="maths" />
            <Tag3D position={[3.0, F(3.0) + 0.38, 0]} label="F : aire cumulée" tone="chimie" />

            {/* Point courant sur F, son jumeau sur f, et la tangente à F (pente = f) */}
            <mesh ref={link}>
              <boxGeometry args={[0.03, 1, 0.03]} />
              <meshStandardMaterial color="#94A3B8" />
            </mesh>
            <mesh ref={tan}>
              <boxGeometry args={[1.5, 0.045, 0.045]} />
              <meshStandardMaterial color="#16A34A" emissive="#166534" emissiveIntensity={0.25} />
            </mesh>
            <mesh ref={onF}>
              <sphereGeometry args={[0.11, 20, 16]} />
              <meshStandardMaterial color="#7C3AED" emissive="#4C1D95" emissiveIntensity={0.35} />
            </mesh>
            <mesh ref={onf}>
              <sphereGeometry args={[0.09, 18, 14]} />
              <meshStandardMaterial color="#F59E0B" emissive="#B45309" emissiveIntensity={0.35} />
            </mesh>
            <Animate
              fn={(state) => {
                const u = 0.5 * (1 - Math.cos(state.clock.elapsedTime * 0.7));
                const x = u * b;
                const yF = F(x);
                const yf = f(x);
                onF.current?.position.set(x, yF, 0.4);
                onf.current?.position.set(x, yf, 0.4);
                link.current?.position.set(x, (yF + yf) / 2, 0.35);
                link.current?.scale.set(1, Math.max(0.001, Math.abs(yF - yf)), 1);
                tan.current?.position.set(x, yF, 0.45);
                tan.current?.rotation.set(0, 0, Math.atan(yf)); // pente de la tangente à F = f(x)
              }}
            />

            <SceneLabel
              position={[1.5, 3.55, 0]}
              title={`F(${b.toFixed(1)}) = ${F(b).toFixed(3)} ${spec.unit}`}
              subtitle={`${spec.primExpr} · la tangente à F a pour pente f(x)`}
              tone="maths"
            />
            <Readout position={[3.3, 2.2, 0]} value={F(b).toFixed(3)} unit={spec.unit} caption="aire cumulée F(b)" />
            <Readout position={[3.3, 1.45, 0]} value={f(b).toFixed(3)} caption="pente en b = f(b)" />
          </>
        )}
      </group>
    </LabScene>
  );
}
