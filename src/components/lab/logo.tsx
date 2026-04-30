import { cn } from '@/lib/cn';

/**
 * Logo Sen Lab — cube isométrique stylisé inspiré de skillzone,
 * adapté en violet (lab brand).
 */
export function LabLogo({
  className,
  showText = true,
  tone = 'light',
}: {
  className?: string;
  showText?: boolean;
  tone?: 'light' | 'dark';
}) {
  const text = tone === 'dark' ? 'text-white' : 'text-night-900';
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className={cn('grid h-9 w-9 place-items-center rounded-xl bg-lab-gradient text-white shadow-lab-glow')}>
        <CubeIcon className="h-5 w-5" />
      </span>
      {showText ? (
        <span className={cn('font-display text-lg font-bold tracking-tight', text)}>
          sen<span className="text-lab-500">lab</span>
        </span>
      ) : null}
    </div>
  );
}

function CubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2 3 7v10l9 5 9-5V7l-9-5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M3 7l9 5 9-5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 22V12" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
