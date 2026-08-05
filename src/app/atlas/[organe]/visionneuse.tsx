'use client';

/**
 * Visionneuse 3D d'un organe de l'atlas.
 *
 * Chargée par `next/dynamic({ ssr: false })` depuis la page : le Canvas WebGL
 * n'a rien à faire côté serveur, et le bundle three ne pèse sur la page que
 * lorsqu'on ouvre réellement une fiche.
 */

import Link from 'next/link';
import type { Route } from 'next';
import { useState } from 'react';
import { useProgress } from '@react-three/drei';
import {
  CircleDot,
  Droplet,
  Layers3,
  Loader2,
  RotateCcw,
  ScanLine,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { LabScene, Organe3D } from '@/components/lab3d';
import { modeleUrl, type Organe } from '@/lib/anatomie/organes';
import { cn } from '@/lib/cn';

/** Distance caméra ↔ organe : départ, et bornes du zoom par boutons. */
const DISTANCE_DEPART = 7.2;
const DISTANCE_MIN = 4;
const DISTANCE_MAX = 11;
const PAS_ZOOM = 1.1;

type Bascule = {
  id: 'rotation' | 'coupe' | 'filDeFer' | 'transparence';
  label: string;
  aide: string;
  icone: typeof RotateCcw;
};

const BASCULES: Bascule[] = [
  { id: 'rotation', label: 'Rotation', aide: 'Fait tourner la pièce lentement', icone: RotateCcw },
  { id: 'coupe', label: 'Coupe', aide: 'Tranche la pièce pour voir l’intérieur', icone: ScanLine },
  { id: 'transparence', label: 'Transparence', aide: 'Rend les tissus translucides', icone: Droplet },
  { id: 'filDeFer', label: 'Fil de fer', aide: 'Affiche le maillage sous la surface', icone: Layers3 },
];

export default function Visionneuse({
  organe,
  pointActif,
  onPointClick,
}: {
  organe: Organe;
  /** Repère sélectionné, piloté depuis la page (la légende y est cliquable). */
  pointActif?: string | null;
  onPointClick?: (id: string | null) => void;
}) {
  const [rotation, setRotation] = useState(true);
  const [coupe, setCoupe] = useState(false);
  const [filDeFer, setFilDeFer] = useState(false);
  const [transparence, setTransparence] = useState(false);
  const [distance, setDistance] = useState(DISTANCE_DEPART);
  const [cleReset, setCleReset] = useState(0);
  const [selectionLocale, setSelectionLocale] = useState<string | null>(null);
  const { active, progress } = useProgress();

  // Composant contrôlé si la page fournit `pointActif`, autonome sinon.
  const selectionId = pointActif !== undefined ? pointActif : selectionLocale;
  const choisirPoint = (id: string) => {
    const suivant = selectionId === id ? null : id;
    if (onPointClick) onPointClick(suivant);
    else setSelectionLocale(suivant);
  };

  const etat = { rotation, coupe, filDeFer, transparence };
  const bascule = (id: Bascule['id']) => {
    if (id === 'rotation') setRotation((v) => !v);
    if (id === 'coupe') setCoupe((v) => !v);
    if (id === 'filDeFer') setFilDeFer((v) => !v);
    if (id === 'transparence') setTransparence((v) => !v);
  };

  const zoomer = (sens: 1 | -1) =>
    setDistance((d) =>
      Math.min(DISTANCE_MAX, Math.max(DISTANCE_MIN, sens > 0 ? d / PAS_ZOOM : d * PAS_ZOOM)),
    );

  const reinitialiser = () => {
    setRotation(true);
    setCoupe(false);
    setFilDeFer(false);
    setTransparence(false);
    setDistance(DISTANCE_DEPART);
    setCleReset((n) => n + 1);
    if (onPointClick) onPointClick(null);
    else setSelectionLocale(null);
  };

  const selection = organe.pointsInteret.find((point) => point.id === selectionId) ?? null;
  // Le TP le plus proche : c'est sa scène schématique qui montre l'intérieur.
  const tpSchema = organe.tpLies[0] ?? null;

  return (
    <div className="relative overflow-hidden rounded-3xl ring-1 ring-night-100">
      <div className="h-[420px] w-full sm:h-[520px]">
        <LabScene
          cameraPosition={[0, 0, DISTANCE_DEPART]}
          fov={42}
          minDistance={3.5}
          maxDistance={13}
          background="#FBF7F4"
          groundY={null}
          postFx={false}
        >
          <Organe3D
            src={modeleUrl(organe.id)}
            autoRotate={rotation}
            coupe={coupe}
            filDeFer={filDeFer}
            transparence={transparence}
            couleurCoupe={organe.accent}
            distance={distance}
            cleReset={cleReset}
            points={organe.pointsInteret}
            pointActif={selectionId}
            onPointClick={choisirPoint}
          />
        </LabScene>
      </div>

      {/* Chargement — un modèle pèse plusieurs Mo : sur une connexion lente,
          un écran figé sans message se lit comme une panne. */}
      {active && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 backdrop-blur-sm">
          <Loader2 className="h-6 w-6 animate-spin text-lab-700" />
          <p className="text-sm font-semibold text-night-900">Préparation de la pièce…</p>
          <p className="text-xs tabular-nums text-night-500">{Math.round(progress)} %</p>
        </div>
      )}

      {/* Outils */}
      <div className="absolute left-3 top-3 flex flex-col gap-1.5">
        {BASCULES.map((outil) => {
          const Icone = outil.icone;
          const actif = etat[outil.id];
          return (
            <button
              key={outil.id}
              type="button"
              onClick={() => bascule(outil.id)}
              aria-pressed={actif}
              title={outil.aide}
              className={cn(
                'flex w-[92px] flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-[10px] font-semibold shadow-soft ring-1 transition',
                actif
                  ? 'bg-lab-700 text-white ring-lab-700'
                  : 'bg-white/95 text-night-600 ring-night-100 hover:text-lab-700',
              )}
            >
              <Icone className="h-4 w-4" strokeWidth={1.8} />
              {outil.label}
            </button>
          );
        })}

        <div className="mt-1 flex gap-1.5">
          <button
            type="button"
            onClick={() => zoomer(1)}
            title="Se rapprocher"
            aria-label="Se rapprocher"
            className="grid h-9 w-[43px] place-items-center rounded-2xl bg-white/95 text-night-600 shadow-soft ring-1 ring-night-100 transition hover:text-lab-700"
          >
            <ZoomIn className="h-4 w-4" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => zoomer(-1)}
            title="S’éloigner"
            aria-label="S’éloigner"
            className="grid h-9 w-[43px] place-items-center rounded-2xl bg-white/95 text-night-600 shadow-soft ring-1 ring-night-100 transition hover:text-lab-700"
          >
            <ZoomOut className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>

        <button
          type="button"
          onClick={reinitialiser}
          title="Tout remettre comme au départ"
          className="flex w-[92px] items-center justify-center gap-1 rounded-2xl bg-white/95 px-2 py-2 text-[10px] font-semibold text-night-500 shadow-soft ring-1 ring-night-100 transition hover:text-lab-700"
        >
          <Undo2 className="h-3.5 w-3.5" strokeWidth={1.8} />
          Réinitialiser
        </button>
      </div>

      {/* Détail du repère sélectionné */}
      {selection && (
        <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-white/95 p-3 shadow-card ring-1 ring-night-100 sm:left-auto sm:right-3 sm:max-w-xs">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: selection.couleur }}
            />
            <b className="font-display text-sm font-bold text-night-900">{selection.label}</b>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-night-600">{selection.detail}</p>
        </div>
      )}

      {/* Honnêteté du modèle : la pièce reproduit la FORME EXTÉRIEURE de
          l'organe, sans géométrie interne. Trancher ne peut donc pas révéler
          les cavités — le taire laisserait croire qu'un cœur est plein. */}
      {coupe && (
        <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-amber-50/95 p-2.5 text-[11px] leading-relaxed text-amber-900 ring-1 ring-amber-200 sm:right-auto sm:max-w-sm">
          Cette pièce reproduit la <b>forme extérieure</b> de l’organe : la coupe
          montre l’épaisseur de l’enveloppe, pas les structures internes.
          {tpSchema && (
            <>
              {' '}
              Pour l’intérieur,{' '}
              <Link href={`/tp/${tpSchema.slug}` as Route} className="font-semibold underline">
                ouvre le schéma du TP
              </Link>
              .
            </>
          )}
        </div>
      )}

      {!selection && !coupe && (
        <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-night-500 ring-1 ring-night-100">
          Fais glisser pour tourner · touche un point coloré
        </p>
      )}

      {/* Équivalent textuel des pastilles, qui vivent dans le canvas et sont
          donc invisibles pour un lecteur d'écran. */}
      <ul className="sr-only">
        {organe.pointsInteret.map((point) => (
          <li key={point.id}>
            {point.label} : {point.detail}
          </li>
        ))}
      </ul>

      <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium italic text-night-500 ring-1 ring-night-100">
        <CircleDot className="h-3 w-3" />
        {organe.nomScientifique}
      </span>
    </div>
  );
}
