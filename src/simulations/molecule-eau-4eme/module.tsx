'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Droplets, RotateCcw } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * TP — Molécule d'eau (4ème, Chimie)
 *
 * Premier TP en 3D : l'élève manipule la molécule H₂O dans l'espace,
 * identifie les atomes, comprend la composition et la formule chimique.
 *
 * Three.js + React Three Fiber + drei sont chargés via next/dynamic
 * (ssr: false) — ils ne tombent dans le bundle de l'app QUE pour ce TP.
 */

const WaterScene = dynamic(() => import('./water-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-gradient-to-br from-violet-50 via-white to-science-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'explore' | 'qcm' | 'formule' | 'done';
type AtomCount = 1 | 2 | 3 | 4;
type Angle = '90' | '104' | '120' | '180';

export function MoleculeEau4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [interactions, setInteractions] = useState(0);
  const [spinning, setSpinning] = useState(true);

  const [totalAtoms, setTotalAtoms] = useState<AtomCount | null>(null);
  const [hCount, setHCount] = useState<AtomCount | null>(null);
  const [angle, setAngle] = useState<Angle | null>(null);

  const [formula, setFormula] = useState('');

  const formulaOk = useMemo(() => {
    const cleaned = formula.trim().toLowerCase().replace(/[\s₀-₉]/g, (c) => {
      const subscripts = '₀₁₂₃₄₅₆₇₈₉';
      const idx = subscripts.indexOf(c);
      return idx >= 0 ? String(idx) : c;
    });
    return cleaned === 'h2o';
  }, [formula]);

  const score = useMemo(() => {
    let s = 0;
    if (interactions >= 3) s += 20;
    else if (interactions >= 1) s += 10;
    if (totalAtoms === 3) s += 20;
    if (hCount === 2) s += 20;
    if (angle === '104') s += 20;
    if (formulaOk) s += 20;
    return Math.max(0, Math.min(100, s));
  }, [interactions, totalAtoms, hCount, angle, formulaOk]);

  function handleInteract() {
    setSpinning(false);
    setInteractions((n) => n + 1);
  }

  async function handleValidate() {
    await onComplete(
      {
        shell: 'molecule-eau-4eme',
        version: '1.0',
        steps: {
          interactions,
          qcm: { totalAtoms, hCount, angle },
          formula: { input: formula, correct: formulaOk },
        },
      },
      score,
    );
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-physique" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-soft ring-1 ring-violet-100">
                <Droplets className="h-5 w-5" />
              </span>
              La molécule d&apos;eau — H₂O en 3D
            </CardTitle>
            <Badge tone="science">Chimie · 4ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Au Sénégal, l&apos;eau du Lac de Guiers alimente Dakar, et chacun apprend très tôt
              qu&apos;elle est précieuse. Mais à l&apos;échelle invisible, qu&apos;est-ce que
              <strong> l&apos;eau </strong>?
            </p>
            <p>
              C&apos;est une <strong>molécule</strong>, l&apos;assemblage de quelques atomes liés
              entre eux. Tu vas pouvoir la <strong>tourner et l&apos;observer en 3D</strong> comme
              si tu la tenais dans la main.
            </p>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('explore')}>
              Voir la molécule
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'explore' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 1 — Explore la molécule</CardTitle>
            <Badge tone="science">1/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Fais glisser avec ta souris ou ton doigt pour tourner la molécule. Pince ou utilise la
            molette pour zoomer. Identifie les atomes <span className="font-mono text-red-600">
            rouges</span> et <span className="font-mono text-ink/60">blancs</span>.
          </p>

          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <WaterScene spinning={spinning} onInteract={handleInteract} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-3 text-xs text-ink/70">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full bg-[#DC2626]" />
                Oxygène (O)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full bg-[#F4F4F5] ring-1 ring-ink/20" />
                Hydrogène (H)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-1 rounded-sm bg-[#9CA3AF]" />
                Liaison
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={interactions >= 3 ? 'action' : 'neutral'} size="sm">
                {interactions >= 3
                  ? 'Bien exploré'
                  : `Encore ${Math.max(0, 3 - interactions)} interaction(s)`}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSpinning((s) => !s)}
                aria-label="Animation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {spinning ? 'Stopper' : 'Animer'}
              </Button>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              variant="gradient"
              disabled={interactions < 1}
              onClick={() => setStep('qcm')}
            >
              Répondre aux questions
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'qcm' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 2 — Questions sur la molécule</CardTitle>
            <Badge tone="science">2/3</Badge>
          </CardHeader>

          <div className="space-y-5">
            <QcmGroup
              label="Combien d'atomes au total dans la molécule d'eau ?"
              options={[
                { key: '1', label: '1 atome' },
                { key: '2', label: '2 atomes' },
                { key: '3', label: '3 atomes' },
                { key: '4', label: '4 atomes' },
              ]}
              value={totalAtoms ? String(totalAtoms) : null}
              onChange={(v) => setTotalAtoms(Number(v) as AtomCount)}
            />

            <QcmGroup
              label="Combien d'atomes d'hydrogène (H, en blanc) ?"
              options={[
                { key: '1', label: '1' },
                { key: '2', label: '2' },
                { key: '3', label: '3' },
              ]}
              value={hCount ? String(hCount) : null}
              onChange={(v) => setHCount(Number(v) as AtomCount)}
            />

            <QcmGroup
              label="Quel est l'angle entre les deux liaisons O-H ?"
              hint="Bonus : observe bien la molécule avant de répondre."
              options={[
                { key: '90', label: '90° (angle droit)' },
                { key: '104', label: '≈ 104,5°' },
                { key: '120', label: '120°' },
                { key: '180', label: '180° (alignés)' },
              ]}
              value={angle}
              onChange={(v) => setAngle(v as Angle)}
            />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('explore')}>
              Revoir la molécule
            </Button>
            <Button
              variant="gradient"
              disabled={!totalAtoms || !hCount || !angle}
              onClick={() => setStep('formule')}
            >
              Continuer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'formule' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — La formule chimique</CardTitle>
            <Badge tone="science">3/3</Badge>
          </CardHeader>
          <p className="mb-4 text-ink/80">
            En chimie, on note une molécule par sa <strong>formule</strong>. Elle indique combien
            d&apos;atomes de chaque sorte la composent, en utilisant un chiffre (en indice) après
            le symbole. Écris la formule chimique de la molécule d&apos;eau.
          </p>

          <div className="space-y-2">
            <Label htmlFor="formula">Formule chimique</Label>
            <Input
              id="formula"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="ex : H2O"
              autoCapitalize="characters"
              spellCheck={false}
              className="font-mono"
            />
            {formula && (
              <p className={'text-xs ' + (formulaOk ? 'text-action-700' : 'text-alert-700')}>
                {formulaOk ? 'Bonne formule !' : 'Pas tout à fait — réessaie.'}
              </p>
            )}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('qcm')}>
              Revoir les questions
            </Button>
            <Button variant="success" disabled={!formulaOk || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" />
              {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-physique">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" />
              TP terminé !
            </CardTitle>
          </CardHeader>
          <p className="text-ink/70">
            Bien joué ! La molécule d&apos;eau s&apos;écrit <strong>H₂O</strong> : 2 atomes
            d&apos;hydrogène (H) liés à 1 atome d&apos;oxygène (O), avec un angle d&apos;environ
            104,5°. Tu retrouves ton score et tes badges sur le tableau de bord.
          </p>
        </Card>
      )}
    </div>
  );
}

function QcmGroup({
  label,
  options,
  value,
  onChange,
  hint,
}: {
  label: string;
  options: Array<{ key: string; label: string }>;
  value: string | null;
  onChange: (next: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-ink">{label}</p>
      {hint && <p className="mb-2 text-xs text-ink/50">{hint}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt) => (
          <label
            key={opt.key}
            className={
              'flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ' +
              (value === opt.key
                ? 'border-violet-500 bg-violet-50'
                : 'border-ink/10 hover:border-violet-200 hover:bg-violet-50/50')
            }
          >
            <input
              type="radio"
              className="accent-violet-700"
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
