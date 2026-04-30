'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

const MONTH_NAMES = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

const WEEK_DAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

export type CalendarMarker = {
  date: string; // YYYY-MM-DD
  /** Couleur de pastille — slot d'event. */
  tone?: 'lab' | 'sky' | 'mint' | 'peach';
};

/** Mini-calendrier mensuel inspiré de skillzone (pastilles sous le jour). */
export function MiniCalendar({
  initialDate,
  markers = [],
  selectedDate,
  onSelect,
}: {
  initialDate?: Date;
  markers?: CalendarMarker[];
  selectedDate?: string;
  onSelect?: (date: string) => void;
}) {
  const [view, setView] = useState(() => {
    const d = initialDate ?? new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const days = useMemo(() => buildMonth(view.year, view.month), [view]);
  const todayIso = new Date().toISOString().slice(0, 10);

  const markerMap = useMemo(() => {
    const m = new Map<string, CalendarMarker[]>();
    for (const k of markers) {
      const arr = m.get(k.date) ?? [];
      arr.push(k);
      m.set(k.date, arr);
    }
    return m;
  }, [markers]);

  const goPrev = () => {
    setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
  };
  const goNext = () => {
    setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));
  };

  return (
    <div className="rounded-3xl bg-white p-4 ring-1 ring-night-100">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          aria-label="Mois précédent"
          className="grid h-8 w-8 place-items-center rounded-lg text-night-500 transition hover:bg-night-50 hover:text-night-900"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="font-display text-sm font-semibold text-night-900">
          {MONTH_NAMES[view.month]} {view.year}
        </div>
        <button
          type="button"
          onClick={goNext}
          aria-label="Mois suivant"
          className="grid h-8 w-8 place-items-center rounded-lg text-night-500 transition hover:bg-night-50 hover:text-night-900"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-2 text-center">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="text-[11px] font-medium text-night-400">
            {d}
          </div>
        ))}

        {days.map((d) => {
          const iso = formatIso(d.year, d.month, d.day);
          const dayMarkers = markerMap.get(iso) ?? [];
          const isSelected = selectedDate === iso;
          const isToday = todayIso === iso;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect?.(iso)}
              className={cn(
                'group relative mx-auto grid h-9 w-9 place-items-center rounded-full text-xs font-medium transition',
                d.outside
                  ? 'text-night-300'
                  : isSelected
                    ? 'bg-lab-500 text-white shadow-lab-glow'
                    : isToday
                      ? 'bg-lab-50 text-lab-700 ring-1 ring-lab-200'
                      : 'text-night-700 hover:bg-night-50',
              )}
            >
              {d.day}
              {dayMarkers.length > 0 && !isSelected ? (
                <span className="absolute -bottom-0.5 left-1/2 flex -translate-x-1/2 gap-0.5">
                  {dayMarkers.slice(0, 3).map((m, i) => (
                    <span
                      key={i}
                      className={cn(
                        'h-1 w-1 rounded-full',
                        m.tone === 'sky'
                          ? 'bg-skyInk'
                          : m.tone === 'mint'
                            ? 'bg-mintInk'
                            : m.tone === 'peach'
                              ? 'bg-peachInk'
                              : 'bg-lab-500',
                      )}
                    />
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type DayCell = { year: number; month: number; day: number; outside: boolean };

function buildMonth(year: number, month: number): DayCell[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startWeekday = (first.getDay() + 6) % 7; // lundi = 0
  const daysInMonth = last.getDate();
  const cells: DayCell[] = [];

  // Jours du mois précédent
  if (startWeekday > 0) {
    const prevLast = new Date(year, month, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      cells.push({ year: month === 0 ? year - 1 : year, month: (month + 11) % 12, day: prevLast - i, outside: true });
    }
  }
  // Mois courant
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ year, month, day: d, outside: false });
  }
  // Mois suivant
  while (cells.length % 7 !== 0) {
    const idx = cells.length - daysInMonth - startWeekday + 1;
    cells.push({
      year: month === 11 ? year + 1 : year,
      month: (month + 1) % 12,
      day: idx,
      outside: true,
    });
  }
  return cells;
}

function formatIso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
