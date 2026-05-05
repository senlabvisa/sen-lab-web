'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Square } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';

/**
 * TP — Périmètres et aires (6ème, Maths)
 *
 * Lab Premium Maths : terrain de foot 3D dont l'élève ajuste longueur
 * et largeur via sliders. Périmètre et aire affichés en live, 2 défis
 * de calcul (clôture, gazon) puis QCM différence P/A.
 */

const FieldScene = dynamic(() => import('./field-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-gradient-to-br from-emerald-50 via-white to-amber-50 text-sm text-ink/50">
      Chargement du terrain 3D…
    </div>
  ),
});

type Step = 'intro' | 'observe' | 'cloture' | 'gazon' | 'qcm' | 'done';
type Confusion = 'perimetre' | 'aire' | null;

const INTRO_NARRATION =
  "Imagine que tu veux clôturer le terrain de foot du quartier avec du fil de fer. " +
  "Combien de mètres de fil te faudra-t-il ? Et si tu veux mettre du gazon partout dans le terrain, combien de mètres carrés ? " +
  "Tu vas découvrir la différence entre le périmètre et l'aire d'un rectangle.";

const CONCLUSION_NARRATION =
  "Tu sais maintenant calculer le périmètre (le tour) et l'aire (la surface) d'un rectangle. " +
  "Le périmètre se mesure en mètres, l'aire en mètres carrés. C'est utile partout : pour clôturer un champ, " +
  "carreler une chambre, ou peindre un mur.";

export function PerimetresAires6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [longueur, setLongueur] = useState(20);
  const [largeur, setLargeur] = useState(12);

  const perimetre = 2 * (longueur + largeur);
  const aire = longueur * largeur;

  // Défi clôture : périmètre du terrain courant
  const [clotureGuess, setClotureGuess] = useState('');
  const clotureNum = Number(clotureGuess.replace(/[^\d]/g, ''));
  const clotureCorrect = clotureNum === perimetre;

  // Défi gazon : aire du terrain courant
  const [gazonGuess, setGazonGuess] = useState('');
  const gazonNum = Number(gazonGuess.replace(/[^\d]/g, ''));
  const gazonCorrect = gazonNum === aire;

  const [confusion, setConfusion] = useState<Confusion>(null);

  // Compteur d'expérimentations sliders
  const [tweaks, setTweaks] = useState(0);
  function changeLong(v: number) {
    setLongueur(v);
    setTweaks((n) => n + 1);
  }
  function changeLarg(v: number) {
    setLargeur(v);
    setTweaks((n) => n + 1);
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(20, tweaks * 4); // max 20 manipulation
    if (clotureCorrect) s += 30;
    if (gazonCorrect) s += 30;
    if (confusion === 'aire') s += 20;
    return Math.max(0, Math.min(100, s));
  }, [tweaks, clotureCorrect, gazonCorrect, confusion]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'perimetres-aires-6eme',
        version: '1.0',
        steps: {
          longueur,
          largeur,
          perimetre,
          aire,
          clotureCorrect,
          gazonCorrect,
          confusion,
        },
      },
      score,
    );
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-svt" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-emerald-700 shadow-soft ring-1 ring-emerald-100">
                <Square className="h-5 w-5" />
              </span>
              Le terrain de foot du quartier
            </CardTitle>
            <Badge tone="maths">Maths · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Avec les copains du quartier, tu veux <strong>clôturer le terrain de foot</strong>{' '}
              et y mettre du <strong>gazon neuf</strong>. Combien de mètres de fil de fer ? Combien
              de mètres carrés de gazon ?
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              Tu vas voir la différence entre le <strong>périmètre</strong> (le tour, en m) et
              l&apos;<strong>aire</strong> (la surface, en m²).
            </p>
            <div className="pt-2">
              <NarrationButton text={INTRO_NARRATION} label="Écouter l'introduction" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('observe')}>
              Voir le terrain
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'observe' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Square className="h-5 w-5 text-emerald-700" />
              Étape 1 — Modifie le terrain
            </CardTitle>
            <Badge tone="maths">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Joue avec les sliders pour changer la longueur et la largeur. Observe comment le
            périmètre (P) et l&apos;aire (A) varient.
          </p>

          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <FieldScene longueur={longueur} largeur={largeur} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="long">Longueur</Label>
                <span className="font-mono text-sm font-semibold text-violet-700">{longueur} m</span>
              </div>
              <input
                id="long"
                type="range"
                min={5}
                max={40}
                step={1}
                value={longueur}
                onChange={(e) => changeLong(Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="larg">Largeur</Label>
                <span className="font-mono text-sm font-semibold text-violet-700">{largeur} m</span>
              </div>
              <input
                id="larg"
                type="range"
                min={5}
                max={30}
                step={1}
                value={largeur}
                onChange={(e) => changeLarg(Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-violet-50 p-3 text-center ring-1 ring-violet-100">
              <div className="text-xs text-ink/60">Périmètre</div>
              <div className="font-display text-2xl font-bold text-violet-700">{perimetre} m</div>
              <div className="mt-1 text-[10px] text-ink/50">P = 2 × (L + l)</div>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-center ring-1 ring-emerald-100">
              <div className="text-xs text-ink/60">Aire</div>
              <div className="font-display text-2xl font-bold text-emerald-700">{aire} m²</div>
              <div className="mt-1 text-[10px] text-ink/50">A = L × l</div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={tweaks < 3} onClick={() => setStep('cloture')}>
              Calculer la clôture
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'cloture' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 2 — Combien de fil de fer ?</CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Pour le terrain de <strong>{longueur} m × {largeur} m</strong>, combien de mètres de
            fil de fer faut-il pour faire tout le tour ?
          </p>
          <div className="space-y-2">
            <Label htmlFor="clo">Périmètre (m)</Label>
            <Input
              id="clo"
              inputMode="numeric"
              value={clotureGuess}
              onChange={(e) => setClotureGuess(e.target.value)}
              placeholder={`P = 2 × (${longueur} + ${largeur})`}
            />
            {clotureGuess && (
              <p className={'text-xs ' + (clotureCorrect ? 'text-action-700' : 'text-alert-700')}>
                {clotureCorrect ? `✓ Bravo ! ${perimetre} m de fil suffisent.` : 'Réessaie : P = 2 × (L + l)'}
              </p>
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('observe')}>
              Revoir le terrain
            </Button>
            <Button variant="gradient" disabled={!clotureCorrect} onClick={() => setStep('gazon')}>
              Calculer le gazon
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'gazon' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Combien de m² de gazon ?</CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Combien de mètres carrés de gazon faut-il pour couvrir tout l&apos;intérieur du
            terrain ({longueur} × {largeur} m) ?
          </p>
          <div className="space-y-2">
            <Label htmlFor="gaz">Aire (m²)</Label>
            <Input
              id="gaz"
              inputMode="numeric"
              value={gazonGuess}
              onChange={(e) => setGazonGuess(e.target.value)}
              placeholder={`A = ${longueur} × ${largeur}`}
            />
            {gazonGuess && (
              <p className={'text-xs ' + (gazonCorrect ? 'text-action-700' : 'text-alert-700')}>
                {gazonCorrect ? `✓ Exact ! ${aire} m² de gazon.` : 'Réessaie : A = L × l'}
              </p>
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('cloture')}>
              Revoir la clôture
            </Button>
            <Button variant="gradient" disabled={!gazonCorrect} onClick={() => setStep('qcm')}>
              Conclure
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'qcm' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 4 — Périmètre ou aire ?</CardTitle>
            <Badge tone="maths">4/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Pour acheter du <strong>carrelage</strong> et couvrir le sol d&apos;une chambre,
            qu&apos;est-ce que tu dois calculer ?
          </p>
          <Qcm
            label="Choisis la bonne réponse :"
            options={[
              { key: 'perimetre', label: 'Le périmètre (le tour de la chambre).' },
              { key: 'aire', label: "L'aire (la surface du sol)." },
            ]}
            value={confusion}
            onChange={(v) => setConfusion(v as Confusion)}
          />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('gazon')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!confusion || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" />
              {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-svt">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" />
              TP terminé !
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              <strong>Périmètre</strong> = le tour, en mètres. <strong>Aire</strong> = la surface,
              en m². Les deux ne se calculent pas pareil et ne servent pas pareil.
            </p>
            <p>Ton terrain : P = {perimetre} m, A = {aire} m².</p>
            <NarrationButton text={CONCLUSION_NARRATION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}

function Qcm({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ key: string; label: string }>;
  value: string | null;
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink">{label}</p>
      <div className="grid gap-2">
        {options.map((opt) => (
          <label
            key={opt.key}
            className={
              'flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ' +
              (value === opt.key
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-ink/10 hover:border-emerald-200 hover:bg-emerald-50/50')
            }
          >
            <input
              type="radio"
              className="mt-0.5 accent-emerald-600"
              checked={value === opt.key}
              onChange={() => onChange(opt.key)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
