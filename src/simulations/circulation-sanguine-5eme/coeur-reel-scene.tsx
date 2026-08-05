'use client';

import { useState } from 'react';
import { LabScene, Organe3D, SceneLabel } from '@/components/lab3d';
import { ORGANE_PAR_ID, modeleUrl } from '@/lib/anatomie/organes';

/**
 * Scène 3D — le cœur RÉEL, en regard du schéma de `heart-scene.tsx`.
 *
 * Le schéma simplifie volontairement (deux sphères par cavité, circuits à plat)
 * : c'est ce qui le rend lisible. Mais l'élève doit aussi pouvoir reconnaître un
 * cœur quand il en voit un. Cette scène montre donc la même chose sur la pièce
 * anatomique, avec les mêmes noms de cavités aux mêmes endroits — l'aller-retour
 * entre les deux vues est tout l'intérêt.
 */
export default function CoeurReelScene({ coupe = false }: { coupe?: boolean }) {
  const coeur = ORGANE_PAR_ID.coeur;
  const [pointActif, setPointActif] = useState<string | null>(null);

  return (
    <LabScene
      cameraPosition={[0, 0, 7]}
      fov={42}
      minDistance={3.5}
      maxDistance={12}
      background="#FFE8EA"
      groundY={null}
      postFx={false}
    >
      <Organe3D
        src={modeleUrl('coeur')}
        autoRotate={pointActif === null}
        coupe={coupe}
        points={coeur.pointsInteret}
        pointActif={pointActif}
        onPointClick={(id) => setPointActif((actuel) => (actuel === id ? null : id))}
      />
      <SceneLabel
        position={[0, 2.6, 0]}
        title="Le cœur réel"
        subtitle="Touche un point pour nommer une cavité"
        tone="svt"
      />
    </LabScene>
  );
}
