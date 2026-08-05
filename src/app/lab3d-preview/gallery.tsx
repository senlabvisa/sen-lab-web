'use client';

import { LabScene } from '@/components/lab/lab-scene';
import { LabBench, Stand } from '@/components/lab3d/environment';
import { Beaker, Erlenmeyer, TestTube, GraduatedCylinder, Burette } from '@/components/lab3d/glassware';
import { Battery, Resistor, Bulb, Wire, Switch, Meter } from '@/components/lab3d/electric';
import { Axes2D, FunctionCurve, Arrow3D, DataPoints } from '@/components/lab3d/plot';
import { Molecule, MOLECULES, DNAHelix } from '@/components/lab3d/molecule';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';
import { Organe3D } from '@/components/lab3d/organe';
import { ORGANE_PAR_ID, modeleUrl } from '@/lib/anatomie/organes';

function Tile({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow ring-1 ring-slate-200">
      <div className="bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white">{title}</div>
      <div className="aspect-[4/3] w-full">{children}</div>
    </div>
  );
}

export default function Gallery() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Tile title="Verrerie (verre physique + liquides)">
        <LabScene cameraPosition={[0, 1, 7]} background="#EAF2FF" groundY={-1.6}>
          <LabBench y={-1.6} />
          <Beaker position={[-2.4, -0.5, 0]} fill={0.5} liquidColor="#7CC4FF" />
          <Erlenmeyer position={[0, -0.4, 0]} fill={0.45} liquidColor="#FFC2D6" />
          <TestTube position={[1.8, -0.4, 0]} fill={0.6} liquidColor="#9AE6B4" />
          <GraduatedCylinder position={[3, -0.1, 0]} fill={0.5} />
          <SceneLabel position={[0, 2.3, 0]} title="Verrerie réaliste" tone="chimie" />
        </LabScene>
      </Tile>

      <Tile title="Burette + statif (dosage)">
        <LabScene cameraPosition={[0, 0.4, 7]} background="#F3EEFF" groundY={-1.8}>
          <LabBench y={-1.8} />
          <Stand position={[1, -0.2, 0]} />
          <Burette position={[0, 0.4, 0]} fill={0.7} open liquidColor="#FBBF77" />
          <Erlenmeyer position={[0, -1.4, 0]} fill={0.3} liquidColor="#F9A8D4" height={1.4} />
          <SceneLabel position={[0, 2.4, 0]} title="Montage de dosage" tone="chimie" />
        </LabScene>
      </Tile>

      <Tile title="Circuit électrique (loi d'Ohm)">
        <LabScene cameraPosition={[0, 1.5, 7]} background="#EAF2FF" groundY={-1.6}>
          <LabBench y={-1.6} />
          <Battery position={[-2, -0.5, 0]} rotation={[0, 0, Math.PI / 2]} />
          <Resistor position={[0, 1, 0]} />
          <Bulb position={[2, 0, 0]} on brightness={0.9} />
          <Meter position={[0, -0.9, 0]} kind="A" value={2.4} max={5} />
          <Switch position={[-2, 1, 0]} closed />
          <Wire
            points={[
              [-2, 0.2, 0],
              [-2, 1, 0],
              [0, 1, 0],
              [2, 0.6, 0],
              [2, -0.9, 0],
              [0, -0.9, 0],
              [-2, -1.2, 0],
              [-2, -0.5, 0],
            ]}
          />
          <SceneLabel position={[0, 2.3, 0]} title="Circuit série" tone="physique" />
        </LabScene>
      </Tile>

      <Tile title="Tracé de fonction + tangente">
        <LabScene cameraPosition={[0, 0, 7]} background="#EAF6FF" groundY={null} postFx={false}>
          <Axes2D size={3} />
          <FunctionCurve fn={(x) => 0.5 * x * x - 1.5} from={-3} to={3} color="#0EA5E9" />
          <Arrow3D from={[0, 0, 0]} to={[1.5, 1.2, 0]} color="#F43F5E" />
          <DataPoints points={[[-2, 0.5, 0], [-1, -1, 0], [1, -1, 0], [2, 0.5, 0]]} />
          <Tag3D position={[1.7, 1.4, 0]} label="vecteur" tone="maths" />
          <Readout position={[2.4, 2, 0]} value="y = ½x²" caption="parabole" />
        </LabScene>
      </Tile>

      <Tile title="Molécules (CPK boules-bâtonnets)">
        <LabScene cameraPosition={[0, 0, 6]} background="#F3EEFF" groundY={null}>
          <group position={[-1.6, 0.6, 0]}>
            <Molecule atoms={MOLECULES.H2O.atoms} bonds={MOLECULES.H2O.bonds} scale={0.9} />
          </group>
          <group position={[1.4, 0.6, 0]}>
            <Molecule atoms={MOLECULES.CH4.atoms} bonds={MOLECULES.CH4.bonds} scale={0.9} />
          </group>
          <group position={[0, -1.4, 0]}>
            <Molecule atoms={MOLECULES.CO2.atoms} bonds={MOLECULES.CO2.bonds} scale={0.8} />
          </group>
          <Tag3D position={[-1.6, 1.6, 0]} label="H₂O" tone="chimie" />
          <Tag3D position={[1.4, 1.7, 0]} label="CH₄" tone="chimie" />
        </LabScene>
      </Tile>

      <Tile title="ADN double hélice (SVT)">
        <LabScene cameraPosition={[0, 0, 6]} background="#ECFDF3" groundY={null}>
          <DNAHelix turns={3} height={4} radius={0.8} />
          <SceneLabel position={[0, 2.6, 0]} title="Molécule d'ADN" tone="svt" />
        </LabScene>
      </Tile>

      <Tile title="Organe réel — cœur (atlas anatomique)">
        <LabScene cameraPosition={[0, 0, 7]} fov={42} background="#FFF1F2" groundY={null} postFx={false}>
          <Organe3D
            src={modeleUrl('coeur')}
            autoRotate
            points={ORGANE_PAR_ID.coeur.pointsInteret}
          />
        </LabScene>
      </Tile>

      <Tile title="Organe réel en coupe — cerveau">
        <LabScene cameraPosition={[0, 0, 7]} fov={42} background="#FDF2F8" groundY={null} postFx={false}>
          <Organe3D src={modeleUrl('cerveau')} coupe points={ORGANE_PAR_ID.cerveau.pointsInteret} />
          <SceneLabel position={[0, 2.6, 0]} title="Coupe du cerveau" tone="svt" />
        </LabScene>
      </Tile>
    </div>
  );
}
