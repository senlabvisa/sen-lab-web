'use client';

/**
 * « Préparer une séance hors ligne » — le panneau de l'enseignant.
 *
 * Il répond à une situation précise : la veille du cours, sur le wi-fi de
 * l'école, on veut tout embarquer d'un coup plutôt que d'ouvrir les neuf
 * fiches une par une. D'où le compteur d'organes déjà emportés et la place
 * occupée, qui disent en un coup d'œil si l'appareil est prêt.
 */

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, CloudDownload, HardDrive, Loader2 } from 'lucide-react';
import { PanelCard } from '@/components/lab/section';
import { ORGANES, ORGANE_PAR_ID, type OrganeId } from '@/lib/anatomie/organes';
import {
  cacheDisponible,
  estimerEspace,
  formaterOctets,
  organesEnCache,
  telechargerTousLesOrganes,
} from '@/lib/anatomie/hors-ligne';

export function SeanceHorsLigne() {
  const [disponible, setDisponible] = useState(false);
  const [emportes, setEmportes] = useState<OrganeId[]>([]);
  const [espace, setEspace] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<{ organeId: OrganeId; faits: number; total: number } | null>(
    null,
  );
  const [echecs, setEchecs] = useState<OrganeId[]>([]);

  const rafraichir = useCallback(async () => {
    setEmportes(await organesEnCache());
    const mesure = await estimerEspace();
    setEspace(mesure ? formaterOctets(mesure.utilise) : null);
  }, []);

  useEffect(() => {
    setDisponible(cacheDisponible());
    void rafraichir();
  }, [rafraichir]);

  // Hors application installée, le service worker n'intercepte rien : proposer
  // un téléchargement ne stockerait rien du tout.
  if (!disponible) return null;

  const tout = ORGANES.length;
  const complet = emportes.length === tout;

  const preparer = async () => {
    setEchecs([]);
    setEnCours({ organeId: 'coeur', faits: 0, total: tout - emportes.length });
    const rates = await telechargerTousLesOrganes((progression) => setEnCours(progression));
    setEchecs(rates);
    setEnCours(null);
    await rafraichir();
  };

  return (
    <PanelCard className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-display text-sm font-bold text-night-900">
          Préparer une séance hors ligne
        </p>
        <p className="mt-0.5 text-xs text-night-500">
          {complet ? (
            <>Les {tout} organes sont déjà sur cet appareil.</>
          ) : (
            <>
              {emportes.length} organe{emportes.length > 1 ? 's' : ''} sur {tout} emporté
              {emportes.length > 1 ? 's' : ''}. À faire sur le wi-fi de l’école.
            </>
          )}
          {espace ? (
            <span className="ml-1 inline-flex items-center gap-1 text-night-400">
              <HardDrive className="h-3 w-3" />
              {espace} utilisés
            </span>
          ) : null}
        </p>
        {enCours && (
          <p className="mt-1 text-xs font-medium text-lab-700">
            {ORGANE_PAR_ID[enCours.organeId]?.nom ?? '…'} — {enCours.faits} / {enCours.total}
          </p>
        )}
        {echecs.length > 0 && (
          <p role="alert" className="mt-1 text-xs font-medium text-rose-600">
            {echecs.length} organe{echecs.length > 1 ? 's' : ''} n’{echecs.length > 1 ? 'ont' : 'a'}{' '}
            pas pu être téléchargé{echecs.length > 1 ? 's' : ''} : {echecs.map((id) => ORGANE_PAR_ID[id].nom).join(', ')}.
            Réessaie avec une meilleure connexion.
          </p>
        )}
      </div>

      {complet ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">
          <CheckCircle2 className="h-4 w-4" />
          Appareil prêt
        </span>
      ) : (
        <button
          type="button"
          onClick={preparer}
          disabled={enCours !== null}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-lab-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-lab-800 disabled:opacity-60"
        >
          {enCours ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Téléchargement…
            </>
          ) : (
            <>
              <CloudDownload className="h-4 w-4" />
              Tout emporter
            </>
          )}
        </button>
      )}
    </PanelCard>
  );
}
