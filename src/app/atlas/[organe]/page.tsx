'use client';

/**
 * Fiche d'un organe : la pièce 3D, le cours, le quiz, la comparaison — et les
 * TP qui l'étudient. C'est le point de passage entre l'atlas et le catalogue.
 *
 * Le contenu est réparti en onglets plutôt qu'empilé sur une page unique : sur
 * un téléphone, une fiche complète (leçon + fonctionnement + quiz) ferait
 * plusieurs écrans de défilement et la vue 3D disparaîtrait dès le premier
 * geste. Chaque onglet tient dans un écran ou deux.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Route } from 'next';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  CloudOff,
  Compass,
  Download,
  Droplets,
  Flag,
  HeartPulse,
  Loader2,
  MapPin,
  Microscope,
  PlayCircle,
  Ruler,
  Scale,
  Sparkles,
  Stethoscope,
  Timer,
  Trash2,
} from 'lucide-react';
import { LabShell } from '@/components/lab/lab-shell';
import { LabBadge } from '@/components/lab/lab-badge';
import { PanelCard, SectionHeader } from '@/components/lab/section';
import { LabBreadcrumb } from '@/components/lab/breadcrumb';
import { PageTransition } from '@/components/lab/motion/page-transition';
import { QuizOrgane } from './quiz-organe';
import {
  ORGANE_PAR_ID,
  imageUrl,
  type Organe,
  type OrganeId,
} from '@/lib/anatomie/organes';
import { LECONS } from '@/lib/anatomie/lecons';
import { VOCABULAIRE } from '@/lib/anatomie/vocabulaire';
import { COMPARAISONS } from '@/lib/anatomie/comparaisons';
import { QUIZ } from '@/lib/anatomie/quiz';
import {
  cacheDisponible,
  oublierOrgane,
  organeEnCache,
  telechargerOrgane,
} from '@/lib/anatomie/hors-ligne';
import { basculerARevoir, lireProgression, marquerOrganeVu } from '@/lib/anatomie/progression';
import { cn } from '@/lib/cn';

const Visionneuse = dynamic(() => import('./visionneuse'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-3xl bg-night-50 ring-1 ring-night-100 sm:h-[520px]">
      <Loader2 className="h-6 w-6 animate-spin text-night-400" />
    </div>
  ),
});

type Onglet = 'explorer' | 'lecon' | 'fonctionnement' | 'comparer' | 'quiz';

const ONGLETS: Array<{ id: Onglet; label: string; icone: typeof Compass }> = [
  { id: 'explorer', label: 'Explorer', icone: Compass },
  { id: 'lecon', label: 'Leçon', icone: BookOpen },
  { id: 'fonctionnement', label: 'Comment ça marche', icone: PlayCircle },
  { id: 'comparer', label: 'Comparer', icone: ArrowLeftRight },
  { id: 'quiz', label: 'Quiz', icone: CircleHelp },
];

export default function OrganePage({ params }: { params: { organe: string } }) {
  const organe = ORGANE_PAR_ID[params.organe as OrganeId];
  if (!organe) notFound();

  return (
    <LabShell allowedRoles={['student', 'teacher', 'admin', 'sysadmin']}>
      <OrganeContent organe={organe} />
    </LabShell>
  );
}

function OrganeContent({ organe }: { organe: Organe }) {
  const [onglet, setOnglet] = useState<Onglet>('explorer');
  const [pointActif, setPointActif] = useState<string | null>(null);
  const [aRevoir, setARevoir] = useState(false);
  const lecon = LECONS[organe.id];

  useEffect(() => {
    void marquerOrganeVu(organe.id);
    void lireProgression(organe.id).then((p) => setARevoir(Boolean(p?.aRevoir)));
  }, [organe.id]);

  return (
    <PageTransition className="space-y-5">
      <LabBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/dashboard' as Route },
          { label: 'Atlas anatomique', href: '/atlas' as Route },
          { label: organe.nom },
        ]}
      />

      {/* En-tête, visible quel que soit l'onglet : l'élève doit toujours savoir
          de quel organe on parle. */}
      <PanelCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(organe.id, 'organ')}
              alt=""
              width={84}
              height={84}
              className="h-20 w-20 shrink-0 rounded-2xl object-contain"
              style={{ backgroundColor: `${organe.accent}12` }}
            />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-lab-700">
                {organe.appareil}
              </p>
              <h1 className="font-display text-3xl font-bold text-night-900">{organe.nom}</h1>
              <p className="text-sm italic text-night-500">
                {organe.formule} · {organe.nomScientifique}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {organe.niveaux.map((niveau) => (
              <LabBadge key={niveau} tone="svt">
                {niveau}
              </LabBadge>
            ))}
            {/* Marqueur de révision, local à l'appareil : l'élève se fait une
                liste avant le contrôle, l'enseignant n'y a pas accès. */}
            <button
              type="button"
              onClick={() => void basculerARevoir(organe.id).then(setARevoir)}
              aria-pressed={aRevoir}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
                aRevoir
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-night-50 text-night-500 hover:text-amber-700',
              )}
            >
              <Flag className="h-3 w-3" />
              {aRevoir ? 'À revoir' : 'Marquer à revoir'}
            </button>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-night-600">{lecon.accroche}</p>
      </PanelCard>

      {/* Onglets */}
      <div className="flex flex-wrap gap-1.5">
        {ONGLETS.map((item) => {
          const Icone = item.icone;
          const actif = onglet === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setOnglet(item.id)}
              aria-pressed={actif}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-semibold transition',
                actif
                  ? 'bg-lab-700 text-white'
                  : 'bg-white text-night-600 ring-1 ring-night-100 hover:text-lab-700',
              )}
            >
              <Icone className="h-4 w-4" />
              {item.label}
              {item.id === 'quiz' && (
                <span className={cn('text-[11px]', actif ? 'text-white/70' : 'text-night-400')}>
                  {QUIZ[organe.id].length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {onglet === 'explorer' && (
        <OngletExplorer organe={organe} pointActif={pointActif} onPointClick={setPointActif} />
      )}
      {onglet === 'lecon' && <OngletLecon organe={organe} />}
      {onglet === 'fonctionnement' && <OngletFonctionnement organe={organe} />}
      {onglet === 'comparer' && <OngletComparer organe={organe} />}
      {onglet === 'quiz' && (
        <PanelCard>
          <SectionHeader title={`Quiz — ${organe.nom.toLowerCase()}`} />
          <p className="mb-4 mt-1 text-sm text-night-500">
            Ce quiz ne compte pas dans ta moyenne. Tu peux le refaire autant de fois que tu veux.
          </p>
          <QuizOrgane organeId={organe.id} nom={organe.nom} />
        </PanelCard>
      )}
    </PageTransition>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Onglet « Explorer » — la pièce 3D, les repères, les faits, les planches
// ══════════════════════════════════════════════════════════════════════

function OngletExplorer({
  organe,
  pointActif,
  onPointClick,
}: {
  organe: Organe;
  pointActif: string | null;
  onPointClick: (id: string | null) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Visionneuse organe={organe} pointActif={pointActif} onPointClick={onPointClick} />

        <div className="space-y-4">
          {/* Légende cliquable : les pastilles 3D sont difficiles à viser au
              doigt, et certaines sont cachées derrière un volume. */}
          <PanelCard>
            <SectionHeader title="Les repères" />
            <ul className="mt-3 space-y-1">
              {organe.pointsInteret.map((point) => {
                const actif = pointActif === point.id;
                return (
                  <li key={point.id}>
                    <button
                      type="button"
                      onClick={() => onPointClick(actif ? null : point.id)}
                      aria-pressed={actif}
                      className={cn(
                        'flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left transition',
                        actif ? 'bg-lab-50 ring-1 ring-lab-200' : 'hover:bg-night-50',
                      )}
                    >
                      <span
                        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: point.couleur }}
                      />
                      <span>
                        <b className="block text-sm font-semibold text-night-900">{point.label}</b>
                        <span className="text-xs leading-snug text-night-500">{point.detail}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </PanelCard>

          <BoutonHorsLigne organe={organe} />
        </div>
      </div>

      <PanelCard>
        <SectionHeader title="Ce qu'il faut retenir" />
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Fait icone={Ruler} terme="Taille" valeur={organe.taille} />
          <Fait icone={Scale} terme="Masse" valeur={organe.masse} />
          <Fait icone={MapPin} terme="Situation" valeur={organe.situation} />
          <Fait icone={HeartPulse} terme="Rôle" valeur={organe.role} />
          <Fait icone={Timer} terme="Chaque jour" valeur={organe.chaqueJour} />
          <Fait icone={Droplets} terme="Irrigation" valeur={organe.irrigation} />
        </dl>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-lab-50/70 p-3 ring-1 ring-lab-100">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-lab-700">
              <Sparkles className="h-3.5 w-3.5" /> Le saviez-vous
            </p>
            <p className="mt-1 text-sm text-night-700">{organe.leSaviezVous}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50/70 p-3 ring-1 ring-emerald-100">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700">
              <Stethoscope className="h-3.5 w-3.5" /> Santé au Sénégal
            </p>
            <p className="mt-1 text-sm text-night-700">{organe.sante}</p>
          </div>
        </div>
      </PanelCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <Planche
          titre="Vue microscopique"
          sousTitre={organe.tissu}
          icone={Microscope}
          src={imageUrl(organe.id, 'microscopic')}
          alt={`Coupe microscopique : ${organe.tissu.toLowerCase()}`}
        />
        <Planche
          titre="Situation dans le corps"
          sousTitre={organe.situation}
          icone={MapPin}
          src={imageUrl(organe.id, 'location')}
          alt={`${organe.nom} replacé dans le corps`}
        />
        <Planche
          titre="Comparaison d'échelle"
          sousTitre={organe.taille}
          icone={Ruler}
          src={imageUrl(organe.id, 'compare')}
          alt={`Taille du ${organe.nom.toLowerCase()} comparée à un objet courant`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard>
          <SectionHeader title="Travaux pratiques liés" />
          {organe.tpLies.length === 0 ? (
            <p className="mt-3 text-sm text-night-500">
              Aucun TP du catalogue ne porte encore sur cet organe.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {organe.tpLies.map((tp) => (
                <li key={tp.slug}>
                  <Link
                    href={`/tp/${tp.slug}` as Route}
                    className="group flex items-center justify-between gap-3 rounded-2xl bg-night-50/60 p-3 transition hover:bg-lab-50"
                  >
                    <span>
                      <b className="block text-sm font-semibold text-night-900">{tp.titre}</b>
                      <span className="text-xs text-night-500">{tp.niveau}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-night-400 transition group-hover:translate-x-0.5 group-hover:text-lab-700" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard>
          <SectionHeader title="Quand cet organe est malade" />
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {organe.affections.map((affection) => (
              <li
                key={affection}
                className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-100"
              >
                {affection}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-night-500">
            Ces repères servent la culture scientifique : ils ne remplacent pas l’avis d’un
            professionnel de santé.
          </p>
        </PanelCard>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Onglet « Leçon » — le cours + le vocabulaire
// ══════════════════════════════════════════════════════════════════════

function OngletLecon({ organe }: { organe: Organe }) {
  const lecon = LECONS[organe.id];
  const vocabulaire = VOCABULAIRE[organe.id];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        {lecon.sections.map((section, index) => (
          <PanelCard key={section.titre}>
            <div className="flex items-baseline gap-2.5">
              <span className="font-display text-2xl font-bold text-lab-200">{index + 1}</span>
              <h2 className="font-display text-lg font-bold text-night-900">{section.titre}</h2>
            </div>
            <div className="mt-2 space-y-2.5">
              {section.paragraphes.map((paragraphe, i) => (
                <p key={i} className="text-sm leading-relaxed text-night-700">
                  {paragraphe}
                </p>
              ))}
            </div>
          </PanelCard>
        ))}
      </div>

      <div className="space-y-4">
        <PanelCard className="bg-lab-50/60 ring-lab-100">
          <SectionHeader title="À retenir" />
          <ul className="mt-3 space-y-2">
            {lecon.aRetenir.map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm text-night-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lab-600" />
                {point}
              </li>
            ))}
          </ul>
        </PanelCard>

        <PanelCard>
          <SectionHeader title="Vocabulaire" />
          <dl className="mt-3 space-y-2.5">
            {vocabulaire.map((mot) => (
              <div key={mot.terme}>
                <dt className="text-sm font-semibold text-night-900">{mot.terme}</dt>
                <dd className="text-xs leading-relaxed text-night-600">{mot.definition}</dd>
              </div>
            ))}
          </dl>
        </PanelCard>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Onglet « Comment ça marche » — le fonctionnement étape par étape
// ══════════════════════════════════════════════════════════════════════

function OngletFonctionnement({ organe }: { organe: Organe }) {
  const lecon = LECONS[organe.id];

  return (
    <PanelCard>
      <SectionHeader title={`${organe.nom} : le trajet, étape par étape`} />
      <p className="mb-4 mt-1 text-sm text-night-500">
        Rejoue cette suite dans ta tête : c’est elle qu’on te demandera de restituer.
      </p>

      <ol className="relative space-y-4 border-l-2 border-lab-100 pl-6">
        {lecon.fonctionnement.map((etape, index) => (
          <li key={etape.titre} className="relative">
            <span className="absolute -left-[31px] grid h-6 w-6 place-items-center rounded-full bg-lab-700 text-[11px] font-bold text-white">
              {index + 1}
            </span>
            <b className="font-display text-sm font-bold text-night-900">{etape.titre}</b>
            <p className="mt-0.5 text-sm leading-relaxed text-night-600">{etape.texte}</p>
          </li>
        ))}
      </ol>
    </PanelCard>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Onglet « Comparer » — l'organe face à un organe de référence
// ══════════════════════════════════════════════════════════════════════

function OngletComparer({ organe }: { organe: Organe }) {
  const comparaison = COMPARAISONS[organe.id];
  const reference = ORGANE_PAR_ID[comparaison.avec];

  return (
    <PanelCard>
      <SectionHeader title={comparaison.question} />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[organe, reference].map((item, index) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-2xl p-3 ring-1 ring-night-100"
            style={{ backgroundColor: `${item.accent}0D` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(item.id, 'thumb')}
              alt=""
              width={56}
              height={56}
              loading="lazy"
              className="h-14 w-14 object-contain"
            />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-night-400">
                {index === 0 ? 'Cet organe' : 'Organe de référence'}
              </p>
              <b className="font-display text-base font-bold text-night-900">{item.nom}</b>
              <p className="text-xs text-night-500">{item.appareil}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Le tableau déborde sur un écran de téléphone : il défile seul, sans
          jamais faire défiler la page en largeur. */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-night-100 text-left">
              <th className="py-2 pr-3 text-[11px] font-bold uppercase tracking-wide text-night-400">
                Critère
              </th>
              <th className="py-2 pr-3 font-display text-sm font-bold text-night-900">
                {organe.nom}
              </th>
              <th className="py-2 font-display text-sm font-bold text-night-900">{reference.nom}</th>
            </tr>
          </thead>
          <tbody>
            {comparaison.lignes.map((ligne) => (
              <tr key={ligne.critere} className="border-b border-night-50 align-top">
                <td className="py-2.5 pr-3 text-xs font-semibold text-night-500">{ligne.critere}</td>
                <td className="py-2.5 pr-3 text-night-700">{ligne.ici}</td>
                <td className="py-2.5 text-night-700">{ligne.autre}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-2xl bg-lab-50/70 p-3 ring-1 ring-lab-100">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-lab-700">
          <Sparkles className="h-3.5 w-3.5" /> Ce qu’il faut avoir compris
        </p>
        <p className="mt-1 text-sm text-night-700">{comparaison.conclusion}</p>
      </div>

      <Link
        href={`/atlas/${reference.id}` as Route}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-lab-700 transition hover:text-lab-800"
      >
        Ouvrir la fiche du {reference.nom.toLowerCase()}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </PanelCard>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Briques partagées
// ══════════════════════════════════════════════════════════════════════

function Fait({
  icone: Icone,
  terme,
  valeur,
}: {
  icone: typeof Ruler;
  terme: string;
  valeur: string;
}) {
  return (
    <div className="rounded-2xl bg-night-50/60 p-3">
      <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-night-400">
        <Icone className="h-3.5 w-3.5" />
        {terme}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-night-800">{valeur}</dd>
    </div>
  );
}

function Planche({
  titre,
  sousTitre,
  icone: Icone,
  src,
  alt,
}: {
  titre: string;
  sousTitre: string;
  icone: typeof Microscope;
  src: string;
  alt: string;
}) {
  return (
    <PanelCard padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 p-4 pb-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-night-400">{titre}</p>
          <p className="font-display text-sm font-bold text-night-900">{sousTitre}</p>
        </div>
        <Icone className="h-4 w-4 shrink-0 text-night-400" />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" decoding="async" className="w-full object-cover" />
    </PanelCard>
  );
}

/**
 * « Emporter hors ligne » : sur le wi-fi de l'école, l'élève range la pièce
 * dans le cache du navigateur pour pouvoir la revoir en classe sans réseau.
 */
function BoutonHorsLigne({ organe }: { organe: Organe }) {
  const [disponible, setDisponible] = useState(false);
  const [enCache, setEnCache] = useState(false);
  const [progression, setProgression] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const rafraichir = useCallback(async () => {
    setEnCache(await organeEnCache(organe.id));
  }, [organe.id]);

  useEffect(() => {
    setDisponible(cacheDisponible());
    void rafraichir();
  }, [rafraichir]);

  if (!disponible) {
    return (
      <PanelCard className="flex items-start gap-2.5 text-sm text-night-500">
        <CloudOff className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Le mode hors ligne s’active sur l’application installée. Ajoute Sen Lab Visa à ton écran
          d’accueil pour emporter les organes.
        </p>
      </PanelCard>
    );
  }

  const telecharger = async () => {
    setErreur(null);
    setProgression(0);
    try {
      await telechargerOrgane(organe.id, ({ faits, total }) => setProgression(faits / total));
      await rafraichir();
    } catch {
      setErreur('Téléchargement interrompu. Vérifie ta connexion et réessaie.');
    } finally {
      setProgression(null);
    }
  };

  const oublier = async () => {
    await oublierOrgane(organe.id);
    await rafraichir();
  };

  return (
    <PanelCard className="space-y-2">
      {enCache ? (
        <>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Disponible hors ligne
          </p>
          <p className="text-xs text-night-500">
            Le {organe.nom.toLowerCase()} s’ouvre maintenant sans connexion.
          </p>
          <button
            type="button"
            onClick={oublier}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-night-500 transition hover:text-rose-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Libérer la place
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={telecharger}
            disabled={progression !== null}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-lab-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-lab-800 disabled:opacity-60"
          >
            {progression === null ? (
              <>
                <Download className="h-4 w-4" />
                Emporter hors ligne
              </>
            ) : (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Téléchargement… {Math.round(progression * 100)} %
              </>
            )}
          </button>
          <p className="text-xs text-night-500">
            À faire de préférence sur le wi-fi de l’école : la pièce et ses planches pèsent quelques
            mégaoctets.
          </p>
        </>
      )}
      {erreur ? (
        <p role="alert" className="text-xs font-medium text-rose-600">
          {erreur}
        </p>
      ) : null}
    </PanelCard>
  );
}
