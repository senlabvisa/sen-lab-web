'use client';

import { useMemo } from 'react';
import { Parser } from 'expr-eval';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const PARSER = new Parser();

export type FormulaResult = {
  raw: string;
  fn: ((x: number) => number) | null;
  error: string | null;
};

export function parseFormula(expr: string, variable: string = 'x'): FormulaResult {
  const trimmed = expr.trim();
  if (!trimmed) return { raw: expr, fn: null, error: 'Saisis une formule.' };

  // Tolère "y = " en préfixe et la convention "2x" pour "2*x"
  let cleaned = trimmed.replace(/^[a-zA-Z]\s*=\s*/, '');
  cleaned = cleaned.replace(/(\d|\))(?=[a-zA-Z(])/g, '$1*');

  try {
    const parsed = PARSER.parse(cleaned);
    const fn = (x: number) => parsed.evaluate({ [variable]: x }) as number;
    // Smoke à 0 pour détecter les variables inconnues
    fn(0);
    return { raw: expr, fn, error: null };
  } catch (err) {
    return { raw: expr, fn: null, error: (err as Error).message };
  }
}

export type FormulaInputProps = {
  value: string;
  onChange: (next: string) => void;
  variable?: string;
  placeholder?: string;
  label?: string;
  result?: FormulaResult;
  helpText?: string;
};

export function FormulaInput({
  value,
  onChange,
  variable = 'x',
  placeholder = 'ex : 2*x + 3',
  label,
  result,
  helpText,
}: FormulaInputProps) {
  const computed = useMemo<FormulaResult>(
    () => result ?? parseFormula(value, variable),
    [result, value, variable],
  );
  const ok = computed.fn !== null && value.trim().length > 0;

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-ink/60">
          {label}
        </label>
      )}
      <div
        className={
          'flex items-center gap-2 rounded-xl border bg-white px-3 py-2 transition ' +
          (ok
            ? 'border-action-500/60 ring-1 ring-action-100'
            : value.trim()
              ? 'border-alert-500/60 ring-1 ring-alert-100'
              : 'border-ink/15')
        }
      >
        <span className="font-mono text-sm font-semibold text-ink/40">y =</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-transparent font-mono text-sm text-ink placeholder:text-ink/30 focus:outline-none"
          aria-label={label ?? 'Formule'}
        />
        {ok ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-action-700" />
        ) : value.trim() ? (
          <AlertCircle className="h-4 w-4 shrink-0 text-alert-700" />
        ) : null}
      </div>
      {computed.error && value.trim() && (
        <p className="text-xs text-alert-700">{computed.error}</p>
      )}
      {helpText && !computed.error && (
        <p className="text-xs text-ink/50">{helpText}</p>
      )}
    </div>
  );
}
