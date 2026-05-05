'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Leaf, RotateCcw } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import type { OrganismKey } from './chain-scene';

/**
 * TP — Alimentation animale (chaînes alimentaires) — 6ème, SVT.
 *
 * Lab Premium SVT : reconstruction d'une chaîne alimentaire dans la
 * savane sénégalaise. L'élève clique sur les organismes 3D dans le bon
 * ordre (producteur → consommateurs successifs) ; chaque clic correct
 * dessine une flèche verte dans la scène 3D.
 */

const ChainScene = dynamic(() => import('./chain-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-gradient-to-br from-amber-50 via-white to-emerald-50 text-sm text-ink/50">
      Chargement de la savane 3D…
    </div>
  ),
});

type Step = 'intro' | 'build' | 'role' | 'done';
type Role = 'producteur' | 'consommateur' | 'predateur' | null;

const ORDER: OrganismKey[] = ['herbe', 'criquet', 'lezard', 'serpent', 'faucon'];
const ORGANISM_LABELS: Record<OrganismKey, string> = {
  herbe: 'Herbe / Mil',
  criquet: 'Criquet',
  lezard: 'Lézard',
  serpent: 'Serpent',
  faucon: 'Faucon',
};

const INTRO_NARRATION =
  "Dans la savane sénégalaise, près du parc de Niokolo-Koba, tous les êtres vivants ont besoin de manger. " +
  "Mais qui mange qui ? Le criquet mange l'herbe. Le lézard mange le criquet. Le serpent mange le lézard. " +
  "Et le faucon mange le serpent. C'est ce qu'on appelle une chaîne alimentaire. " +
  "Tu vas la reconstruire toi-même : clique sur les organismes dans le bon ordre, en commençant par celui qui ne mange aucun autre animal.";

const CONCLUSION_NARRATION =
  "Bravo ! Tu as construit la chaîne alimentaire de la savane. Tout commence par les plantes : ce sont les producteurs, " +
  "elles fabriquent leur nourriture grâce au soleil. Puis viennent les consommateurs : herbivores, carnivores, et les prédateurs au sommet. " +
  "Si on retire un maillon de la chaîne, tout l'écosystème est perturbé.";

export function AlimentationAnimale6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [clicked, setClicked] = useState<OrganismKey[]>([]);
  const [errors, setErrors] = useState(0);
  const [shake, setShake] = useState(false);
  const [role, setRole] = useState<Role>(null);

  const currentIndex = clicked.length;
  const isComplete = clicked.length === ORDER.length;

  function handleClick(k: OrganismKey) {
    if (isComplete) return;
    if (k === ORDER[currentIndex]) {
      setClicked((prev) => [...prev, k]);
    } else if (!clicked.includes(k)) {
      setErrors((e) => e + 1);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  }

  function handleReset() {
    setClicked([]);
    setErrors(0);
  }

  const score = useMemo(() => {
    let s = 0;
    if (isComplete) s += 60 - Math.min(40, errors * 8);
    else s += clicked.length * 8;
    if (role === 'producteur') s += 30;
    return Math.max(0, Math.min(100, s));
  }, [isComplete, clicked, errors, role]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'alimentation-animale-6eme',
        version: '1.0',
        steps: {
          chain: clicked,
          errors,
          role,
          completed: isComplete,
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
                <Leaf className="h-5 w-5" />
              </span>
              La chaîne alimentaire de la savane
            </CardTitle>
            <Badge tone="action">SVT · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Dans la savane qui entoure le <strong>Niokolo-Koba</strong>, chaque animal a un
              rôle : certains mangent des plantes, d&apos;autres mangent des animaux, et tous
              participent à un grand équilibre.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Mission :</strong> tu vois 5 organismes dans la scène 3D. Clique sur eux dans
              le <strong>bon ordre</strong> pour reconstruire la chaîne alimentaire — commence par
              celui qui ne mange aucun animal.
            </p>
            <div className="pt-2">
              <NarrationButton text={INTRO_NARRATION} label="Écouter l'introduction" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('build')}>
              Entrer dans la savane
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'build' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-emerald-700" />
              Étape 1 — Construis la chaîne
            </CardTitle>
            <Badge tone="action">1/2</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            <strong>Astuce :</strong> commence par la plante (le producteur). Puis remonte la
            chaîne en cliquant sur celui qui mange le précédent. Les flèches apparaissent quand tu
            réussis. Une flèche dans la scène = une étape correcte.
          </p>

          <div
            className={
              'overflow-hidden rounded-2xl ring-1 ring-emerald-100 transition-transform ' +
              (shake ? 'animate-pulse-dot' : '')
            }
            style={shake ? { animation: 'shake 0.4s ease' } : undefined}
          >
            <div className="aspect-[4/3] w-full">
              <ChainScene currentIndex={currentIndex} clicked={clicked} onClick={handleClick} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5 text-xs">
              {ORDER.map((k, i) => (
                <Badge
                  key={k}
                  tone={
                    clicked.indexOf(k) === i ? 'action' : currentIndex > i ? 'maths' : 'neutral'
                  }
                  size="sm"
                >
                  {clicked.indexOf(k) >= 0 ? `${clicked.indexOf(k) + 1}. ` : ''}
                  {ORGANISM_LABELS[k]}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {errors > 0 && (
                <span className="text-xs text-alert-700">⚠ {errors} erreur(s)</span>
              )}
              {clicked.length > 0 && !isComplete && (
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Recommencer
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={!isComplete} onClick={() => setStep('role')}>
              Continuer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'role' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 2 — Le rôle de l&apos;herbe</CardTitle>
            <Badge tone="action">2/2</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            L&apos;herbe (et les plantes en général) est le <strong>premier maillon</strong> de la
            chaîne. Elle ne mange aucun animal. Comment l&apos;appelle-t-on ?
          </p>
          <Qcm
            label="Choisis le bon mot :"
            options={[
              { key: 'producteur', label: "Un producteur (elle fabrique sa nourriture grâce au soleil)." },
              { key: 'consommateur', label: 'Un consommateur (elle mange un autre être vivant).' },
              { key: 'predateur', label: 'Un prédateur (elle chasse les autres).' },
            ]}
            value={role}
            onChange={(v) => setRole(v as Role)}
          />

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('build')}>
              Revoir la chaîne
            </Button>
            <Button variant="success" disabled={!role || busy} onClick={handleValidate}>
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
              Tu as reconstruit la chaîne avec <strong>{errors} erreur(s)</strong>.
              L&apos;herbe est un <strong>producteur</strong>, elle fabrique sa nourriture grâce
              au soleil (photosynthèse). Le criquet, le lézard, le serpent et le faucon sont des{' '}
              <strong>consommateurs</strong> : ils mangent d&apos;autres êtres vivants.
            </p>
            <p>
              Si on supprime un maillon (par exemple en utilisant trop de pesticides qui tuent les
              criquets), <strong>toute la chaîne est cassée</strong> : les lézards n&apos;ont
              plus à manger, les serpents non plus, et le faucon meurt de faim.
            </p>
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
