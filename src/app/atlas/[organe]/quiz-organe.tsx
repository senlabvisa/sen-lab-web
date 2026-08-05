'use client';

/**
 * Quiz d'un organe de l'atlas.
 *
 * Ce quiz ne compte pas dans la moyenne : il n'ouvre pas de tentative et
 * n'envoie rien au serveur, contrairement aux TP. C'est un outil de révision,
 * qu'on doit pouvoir rater sans conséquence et refaire autant de fois qu'on
 * veut — d'où le bouton « Recommencer » et l'absence de compte à rebours.
 *
 * L'explication s'affiche dès qu'une réponse est donnée, juste ou fausse :
 * celui qui a trouvé par élimination apprend autant que celui qui s'est trompé.
 */

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { QUIZ, type QuestionQuiz } from '@/lib/anatomie/quiz';
import type { OrganeId } from '@/lib/anatomie/organes';
import { enregistrerScoreQuiz } from '@/lib/anatomie/progression';
import { cn } from '@/lib/cn';

/**
 * Mélange reproductible : la même graine redonne le même ordre.
 *
 * Impossible d'utiliser Math.random ici. Le composant est rendu côté serveur
 * puis réhydraté côté client : deux tirages différents produiraient un ordre
 * différent des deux côtés, et React signalerait un décalage d'hydratation.
 * D'où la règle : série 0 = ordre d'origine (identique serveur/client), et
 * mélange seulement à partir du premier « Recommencer », côté client.
 */
function melangerAvecGraine<T>(elements: readonly T[], graine: number): T[] {
  const copie = [...elements];
  let etat = graine * 2654435761 + 1;
  const suivant = () => {
    etat = (etat * 1103515245 + 12345) & 0x7fffffff;
    return etat / 0x7fffffff;
  };
  for (let i = copie.length - 1; i > 0; i -= 1) {
    const j = Math.floor(suivant() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

export function QuizOrgane({ organeId, nom }: { organeId: OrganeId; nom: string }) {
  const [reponses, setReponses] = useState<Record<string, string>>({});
  const [serie, setSerie] = useState(0);

  // Au recommencer, questions ET options changent de place : sinon la deuxième
  // tentative teste la mémoire des positions, pas la compréhension.
  const questions: QuestionQuiz[] = useMemo(() => {
    const base = QUIZ[organeId];
    if (serie === 0) return base;
    return melangerAvecGraine(base, serie).map((question) => ({
      ...question,
      options: melangerAvecGraine(question.options, serie + question.id.length),
    }));
  }, [organeId, serie]);

  const repondues = Object.keys(reponses).length;
  const justes = useMemo(
    () => questions.filter((q) => reponses[q.id] === q.bonneReponse).length,
    [questions, reponses],
  );
  const termine = repondues === questions.length;

  // Le score n'est enregistré qu'une fois la série terminée : un abandon en
  // cours de route n'écrase pas un bon résultat précédent.
  useEffect(() => {
    if (!termine) return;
    void enregistrerScoreQuiz(organeId, justes, questions.length);
  }, [termine, justes, organeId, questions.length]);

  const repondre = (questionId: string, optionId: string) => {
    // Une question déjà répondue est verrouillée : sinon il suffit de cliquer
    // toutes les options pour « trouver » la bonne, et le score ne veut rien dire.
    if (reponses[questionId]) return;
    setReponses((actuel) => ({ ...actuel, [questionId]: optionId }));
  };

  const recommencer = () => {
    setReponses({});
    setSerie((n) => n + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-night-600">
          {termine ? (
            <>
              Score : <b className="text-night-900">{justes} / {questions.length}</b>
              {justes === questions.length
                ? ' — sans faute, tu peux passer au TP.'
                : justes >= questions.length - 1
                  ? ' — presque parfait.'
                  : ' — relis la leçon, puis recommence.'}
            </>
          ) : (
            <>
              Question {Math.min(repondues + 1, questions.length)} sur {questions.length}
            </>
          )}
        </p>
        {repondues > 0 && (
          <button
            type="button"
            onClick={recommencer}
            className="inline-flex items-center gap-1.5 rounded-full bg-night-50 px-3 py-1.5 text-xs font-semibold text-night-600 transition hover:text-lab-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Recommencer
          </button>
        )}
      </div>

      <div
        className="h-1.5 overflow-hidden rounded-full bg-night-100"
        role="progressbar"
        aria-valuenow={repondues}
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-label={`Progression du quiz sur ${nom.toLowerCase()}`}
      >
        <div
          className="h-full rounded-full bg-lab-500 transition-all duration-300"
          style={{ width: `${(repondues / questions.length) * 100}%` }}
        />
      </div>

      <ol key={serie} className="space-y-4">
        {questions.map((question, index) => {
          const donnee = reponses[question.id];
          const juste = donnee === question.bonneReponse;

          return (
            <li key={question.id} className="rounded-2xl bg-night-50/60 p-4">
              <p className="font-display text-sm font-bold text-night-900">
                {index + 1}. {question.question}
              </p>

              <div className="mt-2.5 space-y-1.5">
                {question.options.map((option) => {
                  const choisie = donnee === option.id;
                  const estBonne = option.id === question.bonneReponse;
                  // Après réponse, on montre aussi la bonne option : l'élève qui
                  // s'est trompé doit voir laquelle il fallait cocher.
                  const revele = Boolean(donnee) && (choisie || estBonne);

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => repondre(question.id, option.id)}
                      disabled={Boolean(donnee)}
                      className={cn(
                        'flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm transition',
                        !donnee && 'bg-white text-night-700 ring-1 ring-night-100 hover:ring-lab-300',
                        donnee && !revele && 'bg-white/60 text-night-400 ring-1 ring-night-100',
                        revele && estBonne && 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200',
                        revele && !estBonne && 'bg-rose-50 text-rose-900 ring-1 ring-rose-200',
                      )}
                    >
                      {revele ? (
                        estBonne ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                        )
                      ) : (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-night-300" />
                      )}
                      <span>{option.texte}</span>
                    </button>
                  );
                })}
              </div>

              {donnee && (
                <p
                  className={cn(
                    'mt-2.5 rounded-xl p-3 text-xs leading-relaxed ring-1',
                    juste
                      ? 'bg-emerald-50/70 text-emerald-900 ring-emerald-100'
                      : 'bg-amber-50/70 text-amber-900 ring-amber-100',
                  )}
                >
                  <b className="font-semibold">{juste ? 'Exact. ' : 'Pas tout à fait. '}</b>
                  {question.explication}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
