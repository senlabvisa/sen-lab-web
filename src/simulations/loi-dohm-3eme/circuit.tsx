'use client';

import { HotDot } from '@/components/ui/hot-dot';

/**
 * Schéma SVG d'un circuit U / R / I + hot-dots interactifs et stat pills.
 * Style aligné sur le dashboard santé (cards info flottantes + dots animés).
 */
export function CircuitDiagram({
  voltage,
  current,
  resistance,
}: {
  voltage: number;
  current: number;
  resistance: number;
}) {
  const isOn = voltage > 0;

  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-xl rounded-2xl bg-gradient-to-br from-science-50 via-white to-science-50 p-4 ring-1 ring-science-100">
      <svg viewBox="0 0 400 280" className="h-full w-full" role="img" aria-label="Circuit électrique">
        <defs>
          <linearGradient id="wire" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <radialGradient id="bulb" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isOn ? '#FCD34D' : '#E5E7EB'} stopOpacity="0.9" />
            <stop offset="100%" stopColor={isOn ? '#F59E0B' : '#9CA3AF'} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Fils */}
        <line x1="80" y1="60" x2="320" y2="60" stroke="url(#wire)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="80" y1="60" x2="80" y2="200" stroke="url(#wire)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="320" y1="60" x2="320" y2="100" stroke="url(#wire)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="320" y1="160" x2="320" y2="200" stroke="url(#wire)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="80" y1="200" x2="320" y2="200" stroke="url(#wire)" strokeWidth="3.5" strokeLinecap="round" />

        {/* Pile */}
        <g>
          <line x1="60" y1="100" x2="100" y2="100" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
          <line x1="70" y1="120" x2="90" y2="120" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="60" y1="140" x2="100" y2="140" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
          <line x1="70" y1="160" x2="90" y2="160" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
          <text x="40" y="135" fontSize="14" fill="#1E40AF" fontWeight="700">U</text>
          <text x="38" y="155" fontSize="11" fill="#0F172A" fontFamily="ui-monospace">
            {voltage.toFixed(1)} V
          </text>
        </g>

        {/* Halo ampoule (effet on/off) */}
        <circle cx="220" cy="60" r="36" fill="url(#bulb)" />

        {/* Ampèremètre */}
        <g>
          <circle cx="220" cy="60" r="22" fill="#fff" stroke="#1E40AF" strokeWidth="2.5" />
          <text x="220" y="66" fontSize="14" fill="#1E40AF" fontWeight="700" textAnchor="middle">A</text>
          <text x="220" y="28" fontSize="11" fill="#0F172A" textAnchor="middle" fontFamily="ui-monospace" fontWeight="600">
            {(current * 1000).toFixed(0)} mA
          </text>
        </g>

        {/* Résistance */}
        <g>
          <rect
            x="298"
            y="100"
            width="44"
            height="60"
            rx="6"
            fill="#fff"
            stroke="#0F172A"
            strokeWidth="2.5"
          />
          <text x="320" y="135" fontSize="13" fill="#0F172A" textAnchor="middle" fontWeight="700">R</text>
          <text x="320" y="152" fontSize="10" fill="#0F172A" textAnchor="middle" fontFamily="ui-monospace">
            {resistance} Ω
          </text>
        </g>

        {/* Voltmètre en parallèle */}
        <g opacity="0.85">
          <line x1="320" y1="100" x2="370" y2="100" stroke="#1E40AF" strokeWidth="2" strokeDasharray="4 3" />
          <line x1="320" y1="160" x2="370" y2="160" stroke="#1E40AF" strokeWidth="2" strokeDasharray="4 3" />
          <line x1="370" y1="100" x2="370" y2="160" stroke="#1E40AF" strokeWidth="2" strokeDasharray="4 3" />
          <circle cx="370" cy="130" r="18" fill="#fff" stroke="#1E40AF" strokeWidth="2.5" />
          <text x="370" y="135" fontSize="13" fill="#1E40AF" fontWeight="700" textAnchor="middle">V</text>
        </g>
      </svg>

      {/* Hot dots interactifs */}
      <HotDot label="Pile (U)" active={isOn} tone="science" className="absolute left-[18%] top-[45%]" />
      <HotDot label="Ampèremètre" active={isOn} tone="science" className="absolute left-[55%] top-[18%]" />
      <HotDot label="Résistance" active={isOn} tone="alert" className="absolute right-[18%] top-[48%]" />

      {/* Stat pills */}
      <div className="absolute left-3 top-3 rounded-xl bg-white/90 px-3 py-2 shadow-soft ring-1 ring-ink/5 backdrop-blur-sm">
        <div className="text-[10px] uppercase tracking-wider text-ink/50">Tension U</div>
        <div className="font-display text-lg font-bold text-science-700">
          {voltage.toFixed(1)}
          <span className="ml-0.5 text-xs font-medium text-ink/50">V</span>
        </div>
      </div>
      <div className="absolute right-3 top-3 rounded-xl bg-white/90 px-3 py-2 shadow-soft ring-1 ring-ink/5 backdrop-blur-sm">
        <div className="text-[10px] uppercase tracking-wider text-ink/50">Courant I</div>
        <div className="font-display text-lg font-bold text-science-700">
          {(current * 1000).toFixed(0)}
          <span className="ml-0.5 text-xs font-medium text-ink/50">mA</span>
        </div>
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-xl bg-white/90 px-3 py-2 shadow-soft ring-1 ring-ink/5 backdrop-blur-sm">
        <div className="text-[10px] uppercase tracking-wider text-ink/50">Résistance R</div>
        <div className="font-display text-lg font-bold text-ink">
          {resistance}
          <span className="ml-0.5 text-xs font-medium text-ink/50">Ω</span>
        </div>
      </div>
    </div>
  );
}
