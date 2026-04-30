'use client';

import { HotDot } from '@/components/ui/hot-dot';

/**
 * Triangle rectangle avec les trois carrés sur chaque côté + hot-dots et stat
 * pills façon dashboard santé.
 */
export function TriangleDiagram({ a, b }: { a: number; b: number }) {
  const c = Math.sqrt(a * a + b * b);
  const scale = Math.min(180 / Math.max(a, b, c), 18);
  const A = a * scale;
  const B = b * scale;
  const C = c * scale;

  const ox = 220;
  const oy = 230;

  const pRight = { x: ox, y: oy };
  const pTop = { x: ox, y: oy - B };
  const pLeft = { x: ox + A, y: oy };

  const sqA = { x: ox, y: oy, w: A };
  const sqB = { x: ox - B, y: oy - B, w: B };

  const dx = pLeft.x - pTop.x;
  const dy = pLeft.y - pTop.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len;
  const uy = dy / len;
  const px = uy;
  const py = -ux;
  const sqCP1 = pTop;
  const sqCP2 = pLeft;
  const sqCP3 = { x: pLeft.x + px * C, y: pLeft.y + py * C };
  const sqCP4 = { x: pTop.x + px * C, y: pTop.y + py * C };

  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-2xl rounded-2xl bg-gradient-to-br from-violet-50 via-white to-science-50 p-4 ring-1 ring-violet-100">
      <svg
        viewBox="0 0 480 360"
        className="h-full w-full"
        role="img"
        aria-label="Triangle rectangle avec les trois carrés"
      >
        <defs>
          <linearGradient id="sqAGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#DBE7FE" />
            <stop offset="100%" stopColor="#BFD3FD" />
          </linearGradient>
          <linearGradient id="sqBGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FED7AA" />
            <stop offset="100%" stopColor="#FDBA74" />
          </linearGradient>
          <linearGradient id="sqCGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#BBF7D0" />
            <stop offset="100%" stopColor="#86EFAC" />
          </linearGradient>
        </defs>

        {/* Carré sur a */}
        <rect
          x={sqA.x}
          y={sqA.y}
          width={sqA.w}
          height={sqA.w}
          fill="url(#sqAGrad)"
          stroke="#1E40AF"
          strokeWidth="2"
        />
        <text
          x={sqA.x + sqA.w / 2}
          y={sqA.y + sqA.w / 2 + 5}
          fontSize="14"
          fill="#1E40AF"
          textAnchor="middle"
          fontWeight="700"
        >
          a² = {a * a}
        </text>

        {/* Carré sur b */}
        <rect
          x={sqB.x}
          y={sqB.y}
          width={sqB.w}
          height={sqB.w}
          fill="url(#sqBGrad)"
          stroke="#D97706"
          strokeWidth="2"
        />
        <text
          x={sqB.x + sqB.w / 2}
          y={sqB.y + sqB.w / 2 + 5}
          fontSize="14"
          fill="#D97706"
          textAnchor="middle"
          fontWeight="700"
        >
          b² = {b * b}
        </text>

        {/* Carré sur c */}
        <polygon
          points={`${sqCP1.x},${sqCP1.y} ${sqCP2.x},${sqCP2.y} ${sqCP3.x},${sqCP3.y} ${sqCP4.x},${sqCP4.y}`}
          fill="url(#sqCGrad)"
          stroke="#059669"
          strokeWidth="2"
        />
        <text
          x={(sqCP1.x + sqCP3.x) / 2}
          y={(sqCP1.y + sqCP3.y) / 2 + 5}
          fontSize="14"
          fill="#059669"
          textAnchor="middle"
          fontWeight="700"
        >
          c² = {(c * c).toFixed(1)}
        </text>

        {/* Triangle */}
        <polygon
          points={`${pRight.x},${pRight.y} ${pTop.x},${pTop.y} ${pLeft.x},${pLeft.y}`}
          fill="none"
          stroke="#0F172A"
          strokeWidth="3"
        />

        {/* Angle droit */}
        <path
          d={`M ${ox + 14} ${oy} L ${ox + 14} ${oy - 14} L ${ox} ${oy - 14}`}
          fill="none"
          stroke="#0F172A"
          strokeWidth="2"
        />

        {/* Étiquettes */}
        <text x={pRight.x + A / 2} y={oy + A + 18} fontSize="13" fill="#0F172A" textAnchor="middle" fontWeight="600">
          a = {a}
        </text>
        <text x={ox - B - 12} y={pTop.y + B / 2} fontSize="13" fill="#0F172A" textAnchor="end" fontWeight="600">
          b = {b}
        </text>
        <text
          x={(pTop.x + pLeft.x) / 2 + 10}
          y={(pTop.y + pLeft.y) / 2 - 8}
          fontSize="13"
          fill="#0F172A"
          fontWeight="600"
        >
          c = {c.toFixed(2)}
        </text>
      </svg>

      {/* Hot dots */}
      <HotDot label="Côté a" tone="science" active className="absolute left-[58%] bottom-[8%]" />
      <HotDot label="Côté b" tone="alert" active className="absolute left-[42%] top-[20%]" />
      <HotDot label="Hypoténuse c" tone="action" active className="absolute right-[12%] top-[18%]" />

      {/* Stat pills */}
      <div className="absolute left-3 top-3 rounded-xl bg-white/90 px-3 py-2 shadow-soft ring-1 ring-ink/5 backdrop-blur-sm">
        <div className="text-[10px] uppercase tracking-wider text-ink/50">a²</div>
        <div className="font-display text-lg font-bold text-science-700">{a * a}</div>
      </div>
      <div className="absolute right-3 top-3 rounded-xl bg-white/90 px-3 py-2 shadow-soft ring-1 ring-ink/5 backdrop-blur-sm">
        <div className="text-[10px] uppercase tracking-wider text-ink/50">b²</div>
        <div className="font-display text-lg font-bold text-alert-700">{b * b}</div>
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-xl bg-white/90 px-3 py-2 shadow-soft ring-1 ring-ink/5 backdrop-blur-sm">
        <div className="text-[10px] uppercase tracking-wider text-ink/50">a² + b² = c²</div>
        <div className="font-display text-base font-bold text-action-700">
          {a * a + b * b} = {(c * c).toFixed(1)}
        </div>
      </div>
    </div>
  );
}
