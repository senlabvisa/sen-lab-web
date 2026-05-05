'use client';

/**
 * <QcmStep> — composant générique pour rendre un QCM dans un module TP.
 *
 * Réutilisable dans tous les modules Lab Premium. Évite de copier-coller
 * le même <Qcm> dans chaque module.tsx.
 */

export type QcmOption = { key: string; label: string };

export type QcmStepProps = {
  label: string;
  options: QcmOption[];
  value: string | null;
  onChange: (next: string) => void;
  /** Couleur d'accent : 'violet' (Maths), 'science' (PC), 'action' (SVT). */
  tone?: 'violet' | 'science' | 'action' | 'amber';
  hint?: string;
};

const TONE_CLASSES: Record<NonNullable<QcmStepProps['tone']>, string> = {
  violet: 'border-violet-500 bg-violet-50 hover:border-violet-200 hover:bg-violet-50/50 accent-violet-600',
  science: 'border-blue-500 bg-blue-50 hover:border-blue-200 hover:bg-blue-50/50 accent-blue-600',
  action: 'border-emerald-500 bg-emerald-50 hover:border-emerald-200 hover:bg-emerald-50/50 accent-emerald-600',
  amber: 'border-amber-500 bg-amber-50 hover:border-amber-200 hover:bg-amber-50/50 accent-amber-600',
};

export function QcmStep({ label, options, value, onChange, tone = 'violet', hint }: QcmStepProps) {
  const tc = TONE_CLASSES[tone];
  const [selectedBorder, selectedBg, , , accent] = tc.split(' ');

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-ink">{label}</p>
      {hint && <p className="mb-2 text-xs text-ink/50">{hint}</p>}
      <div className="grid gap-2">
        {options.map((opt) => (
          <label
            key={opt.key}
            className={
              'flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ' +
              (value === opt.key
                ? `${selectedBorder} ${selectedBg}`
                : `border-ink/10 ${tc.split(' ').slice(2, 4).join(' ')}`)
            }
          >
            <input
              type="radio"
              className={`mt-0.5 ${accent}`}
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
