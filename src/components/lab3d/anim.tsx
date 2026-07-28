'use client';

/**
 * lab3d/anim — animation sûre dans une scène.
 *
 * RÈGLE R3F : `useFrame` ne peut être appelé QUE dans un composant rendu
 * À L'INTÉRIEUR du <Canvas> (donc enfant de <LabScene>), jamais dans le
 * composant qui *retourne* <LabScene> (il est hors Canvas → crash runtime
 * « Hooks can only be used within the Canvas component »).
 *
 * <Animate> encapsule useFrame et se place comme enfant de <LabScene>.
 * Il ne rend rien : il exécute juste `fn` à chaque frame. Le callback peut
 * muter des refs définies dans la scène parente (les meshes ref={...} sont
 * eux aussi enfants de <LabScene>).
 *
 *   <LabScene>
 *     <mesh ref={ball} />
 *     <Animate fn={(state, delta) => { ball.current?.position.set(...) }} />
 *   </LabScene>
 */

import { useFrame, type RootState } from '@react-three/fiber';

export function Animate({ fn }: { fn: (state: RootState, delta: number) => void }) {
  useFrame(fn);
  return null;
}
