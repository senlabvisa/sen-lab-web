'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, LineChart, Sigma, Zap } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Fonctions affines, tarif Senelec (3ème, Maths).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (droite y = ax + b
 * dans un repère réel) → application (facture Senelec) → QCM → bilan.
 * Contexte : la facture d'électricité Senelec = abonnement fixe (b) +
 * consommation × prix du kWh (a).
 */

const AffineScene = dynamic(() => import('./affine-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-sky-50 text-sm text-ink/50">Chargement de la scène 3D…</div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'application' | 'qcm' | 'done';
type HypoRep = 'monte' | 'penche' | 'rien' | null;

// Tarif Senelec d'exemple : 50 F/kWh + 3000 F d'abonnement.
const PRIX_KWH = 50;
const ABONNEMENT = 3000;
const APP_X = 250; // kWh
const APP_TRUE = PRIX_KWH * APP_X + ABONNEMENT; // 15 500 F

const INTRO =
  "Quand ta famille reçoit la facture Senelec, elle paie deux choses : un abonnement fixe chaque mois, " +
  "et la consommation en kilowattheures. Si x est le nombre de kWh et y le montant total, alors y = a fois x plus b. " +
  "Le a est le prix d'un kWh, le b est l'abonnement. C'est une fonction affine : tu vas l'explorer dans un vrai repère.";

const CONCLUSION =
  "Bravo ! Dans y = a x + b, le coefficient a est la pente : il dit de combien y monte quand x augmente de 1 (ici le prix d'un kWh). " +
  "Le nombre b est l'ordonnée à l'origine : la valeur de y quand x vaut 0 (ici l'abonnement payé même sans consommer).";

export function FonctionsAffines3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [a, setA] = useState(0.5);
  const [b, setB] = useState(1);
  const [tried, setTried] = useState<Set<string>>(new Set(['0.5|1']));

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [appAnswer, setAppAnswer] = useState('');
  const [qA, setQA] = useState<string | null>(null);
  const [qB, setQB] = useState<string | null>(null);
  const [qPente, setQPente] = useState<string | null>(null);

  function explore(nextA: number, nextB: number) {
    setA(nextA);
    setB(nextB);
    setTried((prev) => new Set(prev).add(`${nextA}|${nextB}`));
  }

  const appNum = Number(appAnswer.replace(',', '.').replace(/\s/g, ''));
  const appValid = !Number.isNaN(appNum) && appNum > 0;
  const appErr = appValid ? Math.abs(appNum - APP_TRUE) / APP_TRUE : 1;

  const score = useMemo(() => {
    let s = 0;
    if (tried.size >= 3) s += 20;
    else if (tried.size >= 2) s += 12;
    if (hypo === 'monte') s += 10;
    if (appValid) {
      if (appErr < 0.005) s += 30;
      else if (appErr < 0.05) s += 20;
      else if (appErr < 0.15) s += 10;
    }
    if (qA === 'prix') s += 15;
    if (qB === 'abo') s += 15;
    if (qPente === 'pentue') s += 10;
    return Math.max(0, Math.min(100, s));
  }, [tried, hypo, appValid, appErr, qA, qB, qPente]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'fonctions-affines-3eme',
        version: '2.0',
        steps: {
          explore: { count: tried.size, last: { a, b } },
          hypothesis: hypo,
          application: { x: APP_X, answer: appValid ? appNum : null, target: APP_TRUE },
          qcm: { qA, qB, qPente },
        },
      },
      score,
    );
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-maths" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-soft ring-1 ring-violet-100">
                <Zap className="h-5 w-5" />
              </span>
              La facture Senelec
            </CardTitle>
            <Badge tone="maths">Maths · 3ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Sur la facture <strong>Senelec</strong>, on paie un <strong>abonnement fixe</strong> chaque mois, plus la{' '}
              <strong>consommation</strong> en kilowattheures (kWh).
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-center font-mono text-base font-semibold text-violet-700 ring-1 ring-violet-100">
              y = a · x + b
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>x</strong> = kWh consommés · <strong>a</strong> = prix d&apos;un kWh · <strong>b</strong> = abonnement fixe.
              <br />
              <strong>Objectif :</strong> comprendre le rôle de <em>a</em> (la pente) et de <em>b</em> (l&apos;ordonnée à l&apos;origine).
            </p>
            <NarrationButton text={INTRO} label="Écouter l'introduction" />
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('hypo')}>
              Commencer <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'hypo' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sigma className="h-5 w-5 text-violet-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="maths">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : si on <strong>augmente l&apos;abonnement b</strong> (en gardant le prix du kWh fixe), que fait la droite
            dans le repère ?
          </p>
          <QcmStep
            label="Quand b augmente, la droite…"
            tone="violet"
            options={[
              { key: 'monte', label: 'Se décale vers le haut (sans changer de pente)' },
              { key: 'penche', label: 'Penche davantage' },
              { key: 'rien', label: 'Ne bouge pas' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Vérifier <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-violet-700" /> Étape 2 — Explore la droite
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Bouge <strong>a</strong> (la pente) et <strong>b</strong> (l&apos;ordonnée à l&apos;origine). Observe : le point violet (0 ; b)
            est là où la droite coupe l&apos;axe vertical ; le triangle vert/orange montre que si tu avances de +1, tu montes de a.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <AffineScene a={a} b={b} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="a">Pente a</Label>
                <span className="font-mono text-violet-700">{a}</span>
              </div>
              <input
                id="a"
                type="range"
                min={-2}
                max={2}
                step={0.5}
                value={a}
                onChange={(e) => explore(Number(e.target.value), b)}
                className="slider-lab w-full"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="b">Ordonnée à l&apos;origine b</Label>
                <span className="font-mono text-violet-700">{b}</span>
              </div>
              <input
                id="b"
                type="range"
                min={-2}
                max={2}
                step={0.5}
                value={b}
                onChange={(e) => explore(a, Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-violet-50 p-3 text-xs text-ink/70 ring-1 ring-violet-100">
            <strong>Observe :</strong> b déplace la droite verticalement (translation), a change son inclinaison. Combinaisons essayées : {tried.size}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={tried.size < 3} onClick={() => setStep('application')}>
              {tried.size < 3 ? `Essaie ${3 - tried.size} réglage(s) de plus` : 'Appliquer à la facture'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'application' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Calcule la facture</CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <div className="mb-4 rounded-xl bg-violet-50 p-3 text-sm text-ink/80 ring-1 ring-violet-100">
            Chez <strong>M. Diop</strong> à Pikine, le tarif Senelec est{' '}
            <span className="font-mono">y = {PRIX_KWH}·x + {ABONNEMENT}</span> (prix du kWh = {PRIX_KWH} F, abonnement = {ABONNEMENT} F).
            <p className="mt-2">
              Combien paiera-t-il pour <strong>{APP_X} kWh</strong> consommés ce mois-ci ?
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="appAns">Montant en F CFA</Label>
            <Input id="appAns" inputMode="numeric" value={appAnswer} onChange={(e) => setAppAnswer(e.target.value)} placeholder="ex : 12000" />
            {appValid && (
              <div
                className={
                  'rounded-xl p-3 text-xs ring-1 ' +
                  (appErr < 0.005
                    ? 'bg-action-50 text-action-700 ring-action-100'
                    : appErr < 0.15
                      ? 'bg-amber-50 text-amber-700 ring-amber-100'
                      : 'bg-alert-50 text-alert-700 ring-alert-100')
                }
              >
                {appErr < 0.005 ? 'Parfait — c’est exactement ça !' : `Indice : calcule ${PRIX_KWH} × ${APP_X} puis ajoute ${ABONNEMENT}.`}
              </div>
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Revoir la droite
            </Button>
            <Button variant="gradient" disabled={!appValid} onClick={() => setStep('qcm')}>
              Conclure <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'qcm' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 4 — Valide ta compréhension</CardTitle>
            <Badge tone="maths">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="Pour la facture Senelec, le coefficient a (la pente) représente…"
              tone="violet"
              options={[
                { key: 'prix', label: "Le prix d'un kWh" },
                { key: 'abo', label: "L'abonnement fixe" },
                { key: 'total', label: 'Le montant total' },
              ]}
              value={qA}
              onChange={setQA}
            />
            <QcmStep
              label="L'ordonnée à l'origine b (valeur de y quand x = 0) représente…"
              tone="violet"
              options={[
                { key: 'abo', label: "L'abonnement payé même à 0 kWh" },
                { key: 'prix', label: "Le prix d'un kWh" },
                { key: 'kwh', label: 'Le nombre de kWh' },
              ]}
              value={qB}
              onChange={setQB}
            />
            <QcmStep
              label="Si la pente a augmente, la droite devient…"
              tone="violet"
              options={[
                { key: 'pentue', label: 'Plus pentue (plus raide)' },
                { key: 'plate', label: 'Plus plate' },
                { key: 'horiz', label: 'Horizontale' },
              ]}
              value={qPente}
              onChange={setQPente}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('application')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qA || !qB || !qPente || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-maths">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Dans <span className="font-mono">y = a·x + b</span> : <strong>a</strong> est la pente (le prix d&apos;un kWh = {PRIX_KWH} F),{' '}
              <strong>b</strong> l&apos;ordonnée à l&apos;origine (l&apos;abonnement = {ABONNEMENT} F). Pour {APP_X} kWh, M. Diop paie{' '}
              <strong>{APP_TRUE.toLocaleString('fr-FR')} F CFA</strong>.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
