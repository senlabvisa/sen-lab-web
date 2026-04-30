'use client';

import { HotDot } from '@/components/ui/hot-dot';

/**
 * Visuel SVG d'une élodée plongée dans un bécher, avec :
 *  - une lampe / soleil pilotée par lightLevel (halo qui s'intensifie)
 *  - des bulles d'O2 dont le nombre suit min(12, floor(light/8))
 *  - des hot-dots interactifs (lampe, plante, bulles, eau) pour reprendre le
 *    pattern visuel du dashboard santé qui inspire le redesign.
 *
 * Pas de logique métier ici — la sim consomme plant.tsx pour le rendu.
 */
export function PlantDiagram({
  lightLevel,
  showBubbles,
}: {
  lightLevel: number;
  showBubbles: boolean;
}) {
  const bubbleCount = showBubbles ? Math.min(12, Math.max(0, Math.floor(lightLevel / 8))) : 0;
  const bubbles = Array.from({ length: bubbleCount }, (_, i) => ({
    cx: 130 + ((i * 37) % 120),
    cy: 200 - ((i * 23) % 150) - (i % 3) * 6,
    r: 3 + (i % 4),
  }));
  const sunGlow = Math.min(1, lightLevel / 100);

  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-xl rounded-2xl bg-gradient-to-br from-action-50 via-white to-science-50 p-4 ring-1 ring-action-100">
      <svg
        viewBox="0 0 400 300"
        className="h-full w-full"
        role="img"
        aria-label="Élodée plongée dans un bécher exposée à la lumière"
      >
        <defs>
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FCD34D" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#7DD3FC" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="leafGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* Halo soleil */}
        <circle
          cx="340"
          cy="50"
          r="60"
          fill="url(#sunGlow)"
          opacity={0.3 + 0.7 * sunGlow}
        />
        {/* Soleil */}
        <g opacity={0.4 + 0.6 * sunGlow}>
          <circle cx="340" cy="50" r="22" fill="#F59E0B" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            return (
              <line
                key={angle}
                x1={340 + Math.cos(rad) * 28}
                y1={50 + Math.sin(rad) * 28}
                x2={340 + Math.cos(rad) * 38}
                y2={50 + Math.sin(rad) * 38}
                stroke="#F59E0B"
                strokeWidth="3"
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* Bécher */}
        <path
          d="M 100 80 L 100 250 Q 100 262 112 262 L 278 262 Q 290 262 290 250 L 290 80"
          fill="rgba(224, 242, 254, 0.4)"
          stroke="#0284C7"
          strokeWidth="3"
        />
        <path d="M 95 80 L 295 80" stroke="#0284C7" strokeWidth="3" strokeLinecap="round" />

        {/* Eau */}
        <path
          d="M 103 115 L 287 115 L 287 258 Q 287 260 285 260 L 105 260 Q 103 260 103 258 Z"
          fill="url(#waterGrad)"
        />
        {/* Surface ondulée */}
        <path
          d="M 103 115 Q 145 108 195 115 Q 245 122 287 115 L 287 120 L 103 120 Z"
          fill="#0284C7"
          opacity="0.25"
        />

        {/* Plante (élodée) */}
        <g>
          <path
            d="M 195 258 Q 188 220 198 180 Q 208 145 192 110"
            fill="none"
            stroke="#059669"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* feuilles */}
          {[
            { d: 'M 192 245 Q 220 240 215 230', flip: false },
            { d: 'M 197 225 Q 170 218 175 208', flip: true },
            { d: 'M 195 205 Q 222 198 218 188', flip: false },
            { d: 'M 198 180 Q 170 175 175 165', flip: true },
            { d: 'M 195 160 Q 222 155 218 145', flip: false },
            { d: 'M 195 135 Q 170 128 175 118', flip: true },
            { d: 'M 192 115 Q 215 110 210 100', flip: false },
          ].map((leaf, i) => (
            <path
              key={i}
              d={leaf.d}
              fill="url(#leafGrad)"
              stroke="#047857"
              strokeWidth="1.5"
            />
          ))}
        </g>

        {/* Bulles d'O2 */}
        {bubbles.map((b, i) => (
          <g key={i}>
            <circle
              cx={b.cx}
              cy={b.cy}
              r={b.r}
              fill="#fff"
              stroke="#0284C7"
              strokeWidth="1.2"
              opacity="0.9"
            />
            <circle cx={b.cx - b.r * 0.3} cy={b.cy - b.r * 0.3} r={b.r * 0.3} fill="#fff" />
          </g>
        ))}
      </svg>

      {/* Hot dots interactifs (positions en %) */}
      <HotDot
        label="Lampe / Soleil"
        active={showBubbles && lightLevel > 50}
        tone="alert"
        className="absolute right-[10%] top-[12%] -translate-x-1/2 -translate-y-1/2"
      />
      <HotDot
        label="Élodée (chlorophylle)"
        active={showBubbles}
        tone="action"
        className="absolute left-[42%] top-[55%] -translate-x-1/2 -translate-y-1/2"
      />
      <HotDot
        label="Bulles d'O₂"
        active={showBubbles && bubbleCount > 0}
        tone="science"
        className="absolute left-[55%] top-[40%] -translate-x-1/2 -translate-y-1/2"
      />

      {/* Stat pills (style dashboard médical) */}
      <div className="absolute left-3 top-3 rounded-xl bg-white/90 px-3 py-2 shadow-soft ring-1 ring-ink/5 backdrop-blur-sm">
        <div className="text-[10px] uppercase tracking-wider text-ink/50">Lumière</div>
        <div className="font-display text-lg font-bold text-ink">
          {lightLevel}
          <span className="ml-0.5 text-xs font-medium text-ink/50">%</span>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 rounded-xl bg-white/90 px-3 py-2 shadow-soft ring-1 ring-ink/5 backdrop-blur-sm">
        <div className="text-[10px] uppercase tracking-wider text-ink/50">Bulles / min</div>
        <div className="font-display text-lg font-bold text-action-700">
          {showBubbles ? bubbleCount : '—'}
        </div>
      </div>

      <div className="absolute bottom-3 right-3 rounded-xl bg-white/90 px-3 py-2 shadow-soft ring-1 ring-ink/5 backdrop-blur-sm">
        <div className="text-[10px] uppercase tracking-wider text-ink/50">État</div>
        <div className="font-display text-sm font-semibold text-ink">
          {showBubbles ? (
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 animate-pulse-dot rounded-full bg-action-700" />
              En cours
            </span>
          ) : (
            <span className="text-ink/50">Lampe éteinte</span>
          )}
        </div>
      </div>
    </div>
  );
}
