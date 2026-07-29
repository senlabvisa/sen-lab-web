'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, Boxes, CheckCircle2, Ruler, Target, TrendingUp } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Puissances d'un nombre (Maths, 4ème).
 *
 * Flow Lab Premium : amorce → hypothèse (2¹⁰ ≠ 2×10) → matériel base 10 en
 * volume avec exposants positifs ET négatifs → échelle logarithmique des
 * ordres de grandeur + duel 2ⁿ / n² → QCM → bilan.
 *
 * Notions : notation aⁿ, a⁰ = 1, a⁻ⁿ = 1/aⁿ, aᵐ × aⁿ = aᵐ⁺ⁿ, (aᵐ)ⁿ = aᵐˣⁿ,
 * puissances de 10, écriture scientifique a × 10ⁿ avec 1 ≤ a < 10.
 * Contexte : population du Sénégal, sable de la plage, Dakar–Ziguinchor.
 */

const PuissancesScene = dynamic(() => import('./cubes-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type Vue = 'echelle' | 'croissance';

type Grandeur = {
  key: string;
  label: string;
  court: string;
  mantisse: string;
  exp: number;
  options: number[];
};

/** Grandeurs réelles, en MÈTRES, en écriture scientifique a × 10ⁿ (1 ≤ a < 10). */
const GRANDEURS: Grandeur[] = [
  { key: 'atome', label: "Rayon d'un atome", court: 'atome', mantisse: '1', exp: -10, options: [-10, -4, 1] },
  { key: 'cheveu', label: "Épaisseur d'un cheveu (0,1 mm)", court: 'cheveu', mantisse: '1', exp: -4, options: [-10, -4, 5] },
  { key: 'baobab', label: 'Hauteur d’un grand baobab (20 m)', court: 'baobab', mantisse: '2', exp: 1, options: [11, 1, -4] },
  { key: 'route', label: 'Dakar → Ziguinchor à vol d’oiseau (400 km)', court: 'Dakar–Ziguinchor', mantisse: '4', exp: 5, options: [1, 5, 11] },
  { key: 'soleil', label: 'Terre → Soleil (150 millions de km)', court: 'Terre–Soleil', mantisse: '1,5', exp: 11, options: [5, -10, 11] },
];

const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
function sup(n: number): string {
  const d = Math.abs(n).toString().split('').map((c) => SUP[Number(c)]).join('');
  return (n < 0 ? '⁻' : '') + d;
}
function valeur10(n: number): string {
  if (n >= 0) return Math.round(10 ** n).toLocaleString('fr-FR');
  return (10 ** n).toFixed(-n).replace('.', ',');
}

const INTRO =
  "Le Sénégal compte environ dix-huit millions d'habitants. Plutôt que d'aligner tous les zéros, " +
  "on écrit un virgule huit fois dix puissance sept. Une clé USB de trente-deux gigaoctets, c'est trois virgule deux fois dix puissance dix octets. " +
  "Et les grains de sable d'une plage se comptent en puissances de dix. Aujourd'hui tu vas voir grandir une puissance en volume : " +
  "un cube, une barre de dix, une plaque de cent, un gros cube de mille. Puis tu découperas l'unité en dixièmes pour comprendre les exposants négatifs, " +
  "et tu placeras des grandeurs réelles sur une échelle où chaque graduation vaut dix fois la précédente.";

const CONCLUSION =
  "Bravo ! Retiens d'abord le piège : deux puissance dix ne vaut pas deux fois dix, mais mille vingt-quatre. " +
  "Une puissance est une multiplication répétée, pas une multiplication. " +
  "Ensuite les règles : a puissance m fois a puissance n égale a puissance m plus n ; " +
  "a puissance moins n égale un sur a puissance n ; et a puissance zéro égale un, pour tout nombre a non nul. " +
  "Enfin, l'écriture scientifique s'écrit toujours a fois dix puissance n, avec a compris entre un et dix : " +
  "dix-huit millions s'écrit un virgule huit fois dix puissance sept, jamais dix-huit fois dix puissance six.";

export function Puissances4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');

  // Manipulation « matériel base 10 »
  const [exp, setExp] = useState(0);
  const [vus, setVus] = useState<number[]>([0]);
  const [indice, setIndice] = useState<string | null>(null);

  // Mesures
  const [vue, setVue] = useState<Vue>('echelle');
  const [place, setPlace] = useState<Record<string, number>>({});
  const [dernier, setDernier] = useState<string | null>(null);

  // Réponses
  const [hypo, setHypo] = useState<string | null>(null);
  const [qCroix, setQCroix] = useState<string | null>(null);
  const [qPuiss, setQPuiss] = useState<string | null>(null);
  const [qProduit, setQProduit] = useState<string | null>(null);
  const [qSci, setQSci] = useState<string | null>(null);

  const vuZero = vus.includes(0);
  const vuNegatif = vus.some((n) => n < 0);
  const explorationOk = vus.length >= 5 && vuZero && vuNegatif;

  function changeExp(n: number) {
    const clamped = Math.max(-3, Math.min(3, n));
    setExp(clamped);
    setVus((prev) => (prev.includes(clamped) ? prev : [...prev, clamped]));
    if (clamped === 0) setIndice('10⁰ = 1 : une seule pièce. Et c’est vrai pour tout nombre non nul : 7⁰ = 1, 2⁰ = 1.');
    else if (clamped < 0) setIndice(`10${sup(clamped)} = 1/10${sup(-clamped)} = ${valeur10(clamped)} : un exposant négatif, c’est un inverse, jamais un nombre négatif.`);
    else setIndice(`×10 à chaque marche : 10${sup(clamped)} = ${valeur10(clamped)}, soit 1 suivi de ${clamped} zéro(s).`);
  }

  const marks = useMemo(
    () =>
      GRANDEURS.filter((g) => place[g.key] !== undefined).map((g) => ({
        label: g.court,
        exp: place[g.key],
        ok: place[g.key] === g.exp,
      })),
    [place],
  );

  const notation = useMemo(() => {
    const g = GRANDEURS.find((x) => x.key === dernier);
    if (!g || place[g.key] === undefined) return undefined;
    return `${g.mantisse} × 10${sup(place[g.key])} m`;
  }, [dernier, place]);

  const placesOk = GRANDEURS.filter((g) => place[g.key] === g.exp).length;
  const toutPlace = GRANDEURS.every((g) => place[g.key] !== undefined);

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(15, vus.length * 3); // exploration du matériel
    if (vuZero) s += 5; // a vu 10⁰ = 1
    if (vuNegatif) s += 5; // a vu un exposant négatif
    if (hypo === '1024') s += 10;
    s += placesOk * 3; // 5 grandeurs × 3 = 15
    if (qCroix === '5') s += 5;
    if (qPuiss === '32') s += 15;
    if (qProduit === '-2') s += 15;
    if (qSci === '1,8e7') s += 15;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [vus, vuZero, vuNegatif, hypo, placesOk, qCroix, qPuiss, qProduit, qSci]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'puissances-4eme',
        version: '2.0',
        steps: {
          materiel: { exposantsVus: [...vus].sort((a, b) => a - b), dernier: exp },
          hypothese: hypo,
          echelle: { placements: place, correctes: placesOk, total: GRANDEURS.length },
          croissance: qCroix,
          qcm: { qPuiss, qProduit, qSci },
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
                <Boxes className="h-5 w-5" />
              </span>
              Des grains de sable aux étoiles
            </CardTitle>
            <Badge tone="maths">Maths · 4ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Le Sénégal compte environ <strong>1,8 × 10⁷ habitants</strong>. Une clé USB de 32 Go stocke{' '}
              <strong>3,2 × 10¹⁰ octets</strong>. Un atome mesure <strong>10⁻¹⁰ m</strong>. Écrire tous ces zéros serait
              interminable : les <strong>puissances</strong> sont l&apos;écriture courte des nombres très grands et très
              petits.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> comprendre que aⁿ est une <em>multiplication répétée</em> (pas a × n), manier
              les exposants négatifs (a⁻ⁿ = 1/aⁿ), et écrire n&apos;importe quelle grandeur en{' '}
              <strong>écriture scientifique a × 10ⁿ</strong> avec 1 ≤ a &lt; 10.
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
              <Target className="h-5 w-5 text-violet-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="maths">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Une information circule dans ton quartier. Le jour 1, <strong>2</strong> personnes la connaissent. Chaque
            jour, le nombre de personnes informées <strong>double</strong>. Au bout de 10 jours, on a{' '}
            <strong>2¹⁰</strong> personnes.
          </p>
          <QcmStep
            label="Mon hypothèse : 2¹⁰ vaut…"
            tone="violet"
            hint="Attention au piège le plus fréquent : 2³ n'est pas 2 × 3. On multiplie 2 par lui-même, encore et encore."
            options={[
              { key: '20', label: '20 (c’est 2 × 10)' },
              { key: '100', label: '100' },
              { key: '1024', label: '1 024' },
            ]}
            value={hypo}
            onChange={setHypo}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Voir le matériel <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-violet-700" /> Étape 2 — Fais grandir la puissance
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Déplace l&apos;exposant. Compte les rainures : <strong>10 cubes = 1 barre</strong>,{' '}
            <strong>10 barres = 1 plaque</strong>, <strong>10 plaques = 1 gros cube</strong>. Descends sous 0 : l&apos;unité
            se coupe en dixièmes. Tourne la scène avec ta souris ou ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <PuissancesScene view="materiel" exponent={exp} />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs">
              <Label htmlFor="expo">Exposant n</Label>
              <span className="font-mono text-sm font-semibold text-violet-700">
                10<sup>{exp}</sup> = {valeur10(exp)}
              </span>
            </div>
            <input
              id="expo"
              type="range"
              min={-3}
              max={3}
              step={1}
              value={exp}
              onChange={(e) => changeExp(Number(e.target.value))}
              className="slider-lab w-full"
            />
            <div className="mt-1 flex justify-between text-[10px] text-ink/40">
              <span>10⁻³</span>
              <span>10⁰</span>
              <span>10³</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="soft" size="sm" onClick={() => changeExp(exp - 1)} disabled={exp <= -3}>
              ÷ 10 (n − 1)
            </Button>
            <Button variant="soft" size="sm" onClick={() => changeExp(exp + 1)} disabled={exp >= 3}>
              × 10 (n + 1)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setIndice(
                  'Indice : multiplier par 10 ajoute 1 à l’exposant, diviser par 10 en retire 1. C’est exactement la règle 10ᵐ × 10ⁿ = 10ᵐ⁺ⁿ.',
                )
              }
            >
              Indice
            </Button>
          </div>
          {indice && (
            <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-800 ring-1 ring-amber-100">{indice}</p>
          )}

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Exposants testés" value={`${vus.length}/7`} />
            <Stat label="10⁰ observé" value={vuZero ? '✓' : '—'} />
            <Stat label="Exposant négatif" value={vuNegatif ? '✓' : '—'} />
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={!explorationOk} onClick={() => setStep('mesures')}>
              {explorationOk
                ? 'Passer aux grandeurs réelles'
                : !vuZero
                  ? 'Passe par n = 0 pour continuer'
                  : !vuNegatif
                    ? 'Descends sous 0 pour continuer'
                    : `Teste ${5 - vus.length} exposant(s) de plus`}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-violet-700" /> Étape 3 — Ordres de grandeur
            </CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Sur cette échelle, <strong>une graduation = ×10</strong>. Place chaque grandeur (en mètres) à son ordre de
            grandeur : choisis la bonne puissance de 10.
          </p>

          <div className="mb-3 flex gap-2">
            <Button variant={vue === 'echelle' ? 'gradient' : 'outline'} size="sm" onClick={() => setVue('echelle')}>
              <Ruler className="h-4 w-4" /> Échelle des grandeurs
            </Button>
            <Button variant={vue === 'croissance' ? 'gradient' : 'outline'} size="sm" onClick={() => setVue('croissance')}>
              <TrendingUp className="h-4 w-4" /> 2ⁿ contre n²
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <PuissancesScene view={vue} exponent={exp} marks={marks} notation={notation} />
            </div>
          </div>

          {vue === 'echelle' && (
            <>
              <div className="mt-4 space-y-2">
                {GRANDEURS.map((g) => {
                  const choisi = place[g.key];
                  const juste = choisi === g.exp;
                  return (
                    <div key={g.key} className="rounded-xl bg-white p-3 ring-1 ring-ink/10">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm text-ink/80">{g.label}</span>
                        <div className="flex gap-1.5">
                          {g.options.map((o) => (
                            <button
                              key={o}
                              type="button"
                              onClick={() => {
                                setPlace((p) => ({ ...p, [g.key]: o }));
                                setDernier(g.key);
                              }}
                              className={
                                'rounded-lg px-2.5 py-1 font-mono text-xs font-bold ring-1 transition ' +
                                (choisi === o
                                  ? o === g.exp
                                    ? 'bg-emerald-600 text-white ring-emerald-600'
                                    : 'bg-amber-500 text-white ring-amber-500'
                                  : 'bg-white text-ink/70 ring-ink/15 hover:bg-violet-50')
                              }
                              aria-label={`Placer ${g.court} à 10 puissance ${o}`}
                            >
                              10{sup(o)}
                            </button>
                          ))}
                        </div>
                      </div>
                      {choisi !== undefined && (
                        <p className={'mt-1.5 text-xs ' + (juste ? 'text-action-700' : 'text-alert-700')}>
                          {juste
                            ? `✓ ${g.mantisse} × 10${sup(g.exp)} m — écriture scientifique correcte (1 ≤ ${g.mantisse} < 10).`
                            : `Pas encore : 10${sup(choisi)} m = ${valeur10(choisi)} m. Compare avec la grandeur donnée.`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 rounded-xl bg-violet-50 p-3 text-xs text-ink/75 ring-1 ring-violet-100">
                <strong>Écriture scientifique :</strong> tout nombre s&apos;écrit <span className="font-mono">a × 10ⁿ</span>{' '}
                avec <strong>1 ≤ a &lt; 10</strong>. Ainsi 400 000 m = <span className="font-mono">4 × 10⁵ m</span> (et
                non 40 × 10⁴), 0,0001 m = <span className="font-mono">1 × 10⁻⁴ m</span>.
              </p>
            </>
          )}

          {vue === 'croissance' && (
            <div className="mt-4 space-y-3">
              <div className="overflow-x-auto rounded-2xl ring-1 ring-night-100">
                <table className="w-full text-sm">
                  <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                    <tr>
                      <th className="px-3 py-2 text-left">n</th>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <th key={n} className="px-3 py-2 text-right font-mono">
                          {n}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-night-100">
                      <td className="px-3 py-2 font-semibold text-violet-700">2ⁿ</td>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <td key={n} className="px-3 py-2 text-right font-mono">
                          {2 ** n}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-night-100">
                      <td className="px-3 py-2 font-semibold text-sky-700">n²</td>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <td key={n} className="px-3 py-2 text-right font-mono">
                          {n ** 2}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <QcmStep
                label="À partir de quel n la barre violette (2ⁿ) dépasse-t-elle définitivement la bleue (n²) ?"
                tone="violet"
                hint="Compare ligne par ligne : n = 3 → 8 < 9 ; n = 4 → 16 = 16 ; n = 5 → ?"
                options={[
                  { key: '2', label: 'n = 2' },
                  { key: '5', label: 'n = 5' },
                  { key: '8', label: 'n = 8' },
                ]}
                value={qCroix}
                onChange={setQCroix}
              />
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Revoir le matériel
            </Button>
            <Button variant="gradient" disabled={!toutPlace || !qCroix} onClick={() => setStep('qcm')}>
              {!toutPlace ? 'Place les 5 grandeurs' : !qCroix ? 'Réponds dans « 2ⁿ contre n² »' : 'Conclure'}
              <ArrowRight className="h-4 w-4" />
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
          <div className="mb-4 rounded-xl bg-violet-50 p-3 text-xs text-ink/75 ring-1 ring-violet-100">
            <strong>Les règles :</strong> <span className="font-mono">aᵐ × aⁿ = aᵐ⁺ⁿ</span> ·{' '}
            <span className="font-mono">aᵐ ÷ aⁿ = aᵐ⁻ⁿ</span> · <span className="font-mono">(aᵐ)ⁿ = aᵐˣⁿ</span> ·{' '}
            <span className="font-mono">a⁻ⁿ = 1/aⁿ</span> · <span className="font-mono">a⁰ = 1</span> (pour tout nombre a
            non nul).
          </div>
          <div className="space-y-5">
            <QcmStep
              label="2⁵ vaut…"
              tone="violet"
              hint="2⁵ = 2 × 2 × 2 × 2 × 2."
              options={[
                { key: '10', label: '10 (c’est 2 × 5)' },
                { key: '25', label: '25' },
                { key: '32', label: '32' },
              ]}
              value={qPuiss}
              onChange={setQPuiss}
            />
            <QcmStep
              label="10³ × 10⁻⁵ = …"
              tone="violet"
              hint="On additionne les exposants : 3 + (−5)."
              options={[
                { key: '-15', label: '10⁻¹⁵' },
                { key: '-2', label: '10⁻² (soit 0,01)' },
                { key: '8', label: '10⁸' },
              ]}
              value={qProduit}
              onChange={setQProduit}
            />
            <QcmStep
              label="La population du Sénégal, 18 000 000 habitants, s’écrit en écriture scientifique…"
              tone="violet"
              hint="Écriture scientifique : a × 10ⁿ avec 1 ≤ a < 10."
              options={[
                { key: '18e6', label: '18 × 10⁶' },
                { key: '1,8e7', label: '1,8 × 10⁷' },
                { key: '0,18e8', label: '0,18 × 10⁸' },
              ]}
              value={qSci}
              onChange={setQSci}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qPuiss || !qProduit || !qSci || busy} onClick={handleValidate}>
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
              Une puissance est une <strong>multiplication répétée</strong> : 2¹⁰ = 1 024, pas 20. Chaque marche vers la
              droite multiplie par 10 ; chaque marche vers la gauche divise par 10.
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-sm ring-1 ring-violet-100">
              <strong>À retenir :</strong> <span className="font-mono">aᵐ × aⁿ = aᵐ⁺ⁿ</span> ·{' '}
              <span className="font-mono">(aᵐ)ⁿ = aᵐˣⁿ</span> · <span className="font-mono">a⁻ⁿ = 1/aⁿ</span> ·{' '}
              <span className="font-mono">a⁰ = 1</span> pour tout nombre a non nul. Un exposant négatif donne un{' '}
              <em>inverse</em>, pas un nombre négatif : 10⁻³ = 0,001.
            </p>
            <p>
              Ton bilan sur l&apos;échelle : <strong>{placesOk}/{GRANDEURS.length}</strong> grandeurs bien placées, de
              l&apos;atome (1 × 10⁻¹⁰ m) à la distance Terre–Soleil (1,5 × 10¹¹ m) — <strong>21 graduations</strong>{' '}
              d&apos;écart, soit un facteur 10²¹.
            </p>
            <p>
              Et l&apos;exponentielle écrase le carré : dès <strong>n = 5</strong>, 2ⁿ passe devant n² et ne se retourne
              plus (2⁸ = 256 contre 8² = 64).
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-violet-50 p-2 ring-1 ring-violet-100">
      <div className="text-[10px] uppercase tracking-wider text-violet-700/70">{label}</div>
      <div className="font-mono text-sm font-bold text-violet-800">{value}</div>
    </div>
  );
}
