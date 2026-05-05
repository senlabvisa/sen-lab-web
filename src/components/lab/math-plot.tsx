'use client';

import { useMemo } from 'react';

export type PlotCurve = {
  fn: (x: number) => number;
  color: string;
  label?: string;
  dashed?: boolean;
};

export type PlotPoint = {
  x: number;
  y: number;
  color: string;
  label?: string;
};

export type MathPlotProps = {
  curves: PlotCurve[];
  points?: PlotPoint[];
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  xLabel?: string;
  yLabel?: string;
  step?: number;
  className?: string;
};

const W = 480;
const H = 320;
const PAD_L = 44;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 36;

function niceStep(range: number): number {
  const exp = Math.floor(Math.log10(range));
  const base = range / Math.pow(10, exp);
  let step;
  if (base < 2) step = 0.2;
  else if (base < 5) step = 0.5;
  else step = 1;
  return step * Math.pow(10, exp);
}

export function MathPlot({
  curves,
  points = [],
  xMin = -10,
  xMax = 10,
  yMin = -10,
  yMax = 10,
  xLabel = 'x',
  yLabel = 'y',
  step = 0.25,
  className,
}: MathPlotProps) {
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const sx = (x: number) => PAD_L + ((x - xMin) / (xMax - xMin)) * innerW;
  const sy = (y: number) => PAD_T + (1 - (y - yMin) / (yMax - yMin)) * innerH;

  const xStep = niceStep((xMax - xMin) / 10);
  const yStep = niceStep((yMax - yMin) / 8);
  const xTicks = useMemo(() => {
    const arr: number[] = [];
    const start = Math.ceil(xMin / xStep) * xStep;
    for (let v = start; v <= xMax + 1e-9; v += xStep) arr.push(Number(v.toFixed(4)));
    return arr;
  }, [xMin, xMax, xStep]);
  const yTicks = useMemo(() => {
    const arr: number[] = [];
    const start = Math.ceil(yMin / yStep) * yStep;
    for (let v = start; v <= yMax + 1e-9; v += yStep) arr.push(Number(v.toFixed(4)));
    return arr;
  }, [yMin, yMax, yStep]);

  const paths = curves.map((c) => {
    let d = '';
    let prevValid = false;
    for (let x = xMin; x <= xMax; x += step) {
      let y: number;
      try {
        y = c.fn(x);
      } catch {
        prevValid = false;
        continue;
      }
      if (!Number.isFinite(y) || y < yMin - 1e3 || y > yMax + 1e3) {
        prevValid = false;
        continue;
      }
      const px = sx(x);
      const py = sy(Math.max(yMin - 0.2, Math.min(yMax + 0.2, y)));
      d += `${prevValid ? 'L' : 'M'} ${px.toFixed(2)} ${py.toFixed(2)} `;
      prevValid = true;
    }
    return d;
  });

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-full w-full"
        role="img"
        aria-label="Graphe mathématique"
      >
        <rect x={PAD_L} y={PAD_T} width={innerW} height={innerH} fill="#FAFAFB" stroke="#E4E4E7" />

        {xTicks.map((t) => (
          <g key={`xg-${t}`}>
            <line x1={sx(t)} x2={sx(t)} y1={PAD_T} y2={PAD_T + innerH} stroke="#E4E4E7" />
            <text
              x={sx(t)}
              y={PAD_T + innerH + 14}
              fontSize="10"
              fill="#71717A"
              textAnchor="middle"
            >
              {t}
            </text>
          </g>
        ))}
        {yTicks.map((t) => (
          <g key={`yg-${t}`}>
            <line x1={PAD_L} x2={PAD_L + innerW} y1={sy(t)} y2={sy(t)} stroke="#E4E4E7" />
            <text
              x={PAD_L - 6}
              y={sy(t) + 3}
              fontSize="10"
              fill="#71717A"
              textAnchor="end"
            >
              {t}
            </text>
          </g>
        ))}

        {xMin <= 0 && xMax >= 0 && (
          <line x1={sx(0)} x2={sx(0)} y1={PAD_T} y2={PAD_T + innerH} stroke="#0F172A" strokeWidth={1.2} />
        )}
        {yMin <= 0 && yMax >= 0 && (
          <line x1={PAD_L} x2={PAD_L + innerW} y1={sy(0)} y2={sy(0)} stroke="#0F172A" strokeWidth={1.2} />
        )}

        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={curves[i].color}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={curves[i].dashed ? '4 4' : undefined}
          />
        ))}

        {points.map((p, i) => (
          <g key={`pt-${i}`}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r={5} fill={p.color} stroke="#fff" strokeWidth={2} />
            {p.label && (
              <text
                x={sx(p.x) + 8}
                y={sy(p.y) - 8}
                fontSize="11"
                fill={p.color}
                fontWeight={600}
              >
                {p.label}
              </text>
            )}
          </g>
        ))}

        <text
          x={PAD_L + innerW - 4}
          y={PAD_T + innerH - 6}
          fontSize="11"
          fill="#0F172A"
          textAnchor="end"
          fontWeight={600}
        >
          {xLabel}
        </text>
        <text
          x={PAD_L + 6}
          y={PAD_T + 12}
          fontSize="11"
          fill="#0F172A"
          fontWeight={600}
        >
          {yLabel}
        </text>
      </svg>

      {curves.some((c) => c.label) && (
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          {curves.map(
            (c, i) =>
              c.label && (
                <span key={i} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-ink/70">{c.label}</span>
                </span>
              ),
          )}
        </div>
      )}
    </div>
  );
}
