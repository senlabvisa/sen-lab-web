'use client';

/**
 * Page de validation visuelle du kit lab3d (DEV uniquement, sans auth).
 * Sert à vérifier que la verrerie, les circuits, les courbes et les
 * molécules rendent du « 3D réel ». À supprimer avant la prod.
 */

import dynamic from 'next/dynamic';

const Gallery = dynamic(() => import('./gallery'), { ssr: false, loading: () => <div className="p-8">Chargement 3D…</div> });

export default function Lab3dPreviewPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <h1 className="mb-4 font-bold text-slate-800">Kit lab3d — validation visuelle</h1>
      <Gallery />
    </main>
  );
}
