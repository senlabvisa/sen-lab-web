'use client';

/**
 * Atlas anatomique — la liste des pièces explorables en 3D.
 *
 * L'atlas n'est pas un TP : il n'ouvre pas de tentative et ne produit pas de
 * note. C'est le référentiel que l'élève consulte avant, pendant ou après un
 * TP, et que l'enseignant projette au tableau. Chaque organe renvoie donc vers
 * les TP du catalogue qui le mettent en jeu.
 */

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Boxes, CircleHelp, Download, Eye, Flag, Search, Sparkles, Trophy } from 'lucide-react';
import { LabShell } from '@/components/lab/lab-shell';
import { LabBadge } from '@/components/lab/lab-badge';
import { PanelCard } from '@/components/lab/section';
import { LabBreadcrumb } from '@/components/lab/breadcrumb';
import { ParticleField } from '@/components/lab/motion/particle-field';
import { PageTransition } from '@/components/lab/motion/page-transition';
import { fadeInUp, staggerContainer, EASE } from '@/lib/motion';
import { ORGANES, imageUrl, type Niveau } from '@/lib/anatomie/organes';
import { LECONS } from '@/lib/anatomie/lecons';
import { QUIZ } from '@/lib/anatomie/quiz';
import { lireToutesProgressions } from '@/lib/anatomie/progression';
import type { ProgressionOrgane } from '@/lib/offline-db';
import { SeanceHorsLigne } from './seance-hors-ligne';
import { cn } from '@/lib/cn';

const NIVEAUX: Array<{ id: Niveau | 'tous'; label: string }> = [
  { id: 'tous', label: 'Tous niveaux' },
  { id: '6ème', label: '6ème' },
  { id: '5ème', label: '5ème' },
  { id: '4ème', label: '4ème' },
  { id: '3ème', label: '3ème' },
  { id: 'Seconde', label: 'Seconde' },
  { id: 'Première', label: 'Première' },
  { id: 'Terminale', label: 'Terminale' },
];

export default function AtlasPage() {
  return (
    <LabShell allowedRoles={['student', 'teacher', 'admin', 'sysadmin']}>
      <AtlasContent />
    </LabShell>
  );
}

function AtlasContent() {
  const [niveau, setNiveau] = useState<Niveau | 'tous'>('tous');
  const [recherche, setRecherche] = useState('');
  const [progressions, setProgressions] = useState<Record<string, ProgressionOrgane>>({});

  // Lue après le montage : IndexedDB n'existe pas côté serveur, et une liste
  // sans badges reste parfaitement utilisable si la lecture échoue.
  useEffect(() => {
    void lireToutesProgressions().then(setProgressions);
  }, []);

  const organes = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return ORGANES.filter((organe) => niveau === 'tous' || organe.niveaux.includes(niveau)).filter(
      (organe) =>
        !q ||
        `${organe.nom} ${organe.appareil} ${organe.nomScientifique} ${organe.role}`
          .toLowerCase()
          .includes(q),
    );
  }, [niveau, recherche]);

  return (
    <PageTransition className="space-y-5">
      <LabBreadcrumb
        items={[{ label: 'Tableau de bord', href: '/dashboard' as Route }, { label: 'Atlas anatomique' }]}
      />

      <PanelCard padding="lg" className="relative overflow-hidden bg-lab-mesh">
        <ParticleField count={12} variant="lab" />
        <div className="relative z-10">
          <h1 className="font-display text-3xl font-bold text-night-900 md:text-4xl">
            Atlas anatomique
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-night-600">
            Neuf organes réels à faire tourner, couper et annoter. Touche un point coloré pour
            découvrir une structure, puis enchaîne sur le TP qui l’étudie.
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-night-600 ring-1 ring-night-100">
            <Download className="h-3.5 w-3.5" />
            Chaque organe peut être emporté hors ligne depuis sa fiche.
          </p>
        </div>
      </PanelCard>

      <SeanceHorsLigne />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-night-400" />
          <input
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Chercher un organe, un appareil…"
            className="w-full rounded-2xl bg-white py-2.5 pl-9 pr-3 text-sm text-night-900 ring-1 ring-night-100 outline-none transition focus:ring-2 focus:ring-lab-400"
          />
        </label>

        <div className="flex flex-wrap gap-1.5">
          {NIVEAUX.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setNiveau(item.id)}
              aria-pressed={niveau === item.id}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                niveau === item.id
                  ? 'bg-lab-700 text-white'
                  : 'bg-white text-night-600 ring-1 ring-night-100 hover:text-lab-700',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {organes.length === 0 ? (
        <PanelCard padding="lg" className="text-center text-sm text-night-500">
          Aucun organe ne correspond à cette recherche.
        </PanelCard>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {organes.map((organe) => {
            const progression = progressions[organe.id];
            return (
            <motion.div key={organe.id} variants={fadeInUp} whileHover={{ y: -4 }} transition={EASE.snappy}>
              <Link
                href={`/atlas/${organe.id}` as Route}
                className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-night-100 transition hover:ring-lab-300"
              >
                <div
                  className="relative flex items-center justify-center p-6"
                  style={{ background: `linear-gradient(160deg, ${organe.accent}1A, ${organe.accent}05)` }}
                >
                  {/* Repères de révision : où j'en suis, sans ouvrir la fiche. */}
                  <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
                    {progression?.aRevoir && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        <Flag className="h-3 w-3" />
                        À revoir
                      </span>
                    )}
                    {progression?.meilleurScore !== undefined && progression.totalQuestions ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-night-600 ring-1 ring-night-100">
                        <Trophy className="h-3 w-3 text-lab-600" />
                        {progression.meilleurScore}/{progression.totalQuestions}
                      </span>
                    ) : progression?.vuLe ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-night-500 ring-1 ring-night-100">
                        <Eye className="h-3 w-3" />
                        Vu
                      </span>
                    ) : null}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl(organe.id, 'thumb')}
                    alt=""
                    width={112}
                    height={112}
                    loading="lazy"
                    decoding="async"
                    className="h-28 w-28 object-contain transition duration-300 group-hover:scale-105"
                  />
                </div>

                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-display text-lg font-bold text-night-900">{organe.nom}</h2>
                      <p className="text-xs italic text-night-400">{organe.nomScientifique}</p>
                    </div>
                    <LabBadge tone="svt">{organe.appareil.replace(/^(Appareil|Système) /, '')}</LabBadge>
                  </div>

                  <p className="line-clamp-2 text-sm text-night-600">{LECONS[organe.id].accroche}</p>

                  {/* Ce que la fiche contient réellement : sans ce résumé, une
                      carte d'atlas laisse croire qu'il n'y a qu'une image. */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-night-500">
                    <span className="inline-flex items-center gap-1">
                      <Boxes className="h-3.5 w-3.5 text-lab-600" />
                      {organe.pointsInteret.length} repères 3D
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5 text-lab-600" />
                      {LECONS[organe.id].sections.length} parties de cours
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CircleHelp className="h-3.5 w-3.5 text-lab-600" />
                      {QUIZ[organe.id].length} questions
                    </span>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
                    {organe.niveaux.map((n) => (
                      <span
                        key={n}
                        className="rounded-full bg-night-50 px-2 py-0.5 text-[11px] font-semibold text-night-600"
                      >
                        {n}
                      </span>
                    ))}
                    {organe.tpLies.length > 0 && (
                      <span className="ml-auto text-[11px] font-semibold text-lab-700">
                        {organe.tpLies.length} TP lié{organe.tpLies.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
            );
          })}
        </motion.div>
      )}

      <PanelCard className="flex items-start gap-3 bg-lab-50/60">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-lab-700" />
        <p className="text-sm text-night-600">
          <b className="font-semibold text-night-900">Pour l’enseignant·e :</b> l’atlas se projette
          tel quel. La coupe et le mode fil de fer montrent l’intérieur d’un organe sans dissection,
          et fonctionnent sans connexion une fois la pièce téléchargée.
        </p>
      </PanelCard>
    </PageTransition>
  );
}
