import { cn } from '@/lib/cn';

const sizeMap = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
} as const;

const dotSize = {
  xs: 'h-1.5 w-1.5 ring-1',
  sm: 'h-2 w-2 ring-2',
  md: 'h-2.5 w-2.5 ring-2',
  lg: 'h-3 w-3 ring-2',
  xl: 'h-3.5 w-3.5 ring-2',
} as const;

export type AvatarSize = keyof typeof sizeMap;

export function LabAvatar({
  name,
  src,
  size = 'md',
  online,
  verified,
  className,
}: {
  name: string;
  src?: string;
  size?: AvatarSize;
  online?: boolean;
  verified?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('relative inline-block shrink-0', className)}>
      <span
        className={cn(
          'grid place-items-center overflow-hidden rounded-full bg-lab-100 font-semibold text-lab-700 ring-1 ring-night-100',
          sizeMap[size],
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span aria-hidden>{initials(name)}</span>
        )}
      </span>

      {online !== undefined ? (
        <span
          aria-label={online ? 'En ligne' : 'Hors-ligne'}
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-white',
            dotSize[size],
            online ? 'bg-emerald-500' : 'bg-night-300',
          )}
        />
      ) : null}

      {verified ? (
        <span
          aria-label="Vérifié"
          className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-lab-500 text-white ring-2 ring-white"
        >
          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="currentColor" aria-hidden>
            <path d="M9 16.17 4.83 12l-1.42 1.41L9 19l12-12-1.41-1.41L9 16.17Z" />
          </svg>
        </span>
      ) : null}
    </div>
  );
}

export function AvatarGroup({
  avatars,
  max = 4,
  size = 'sm',
  totalCount,
}: {
  avatars: { name: string; src?: string }[];
  max?: number;
  size?: AvatarSize;
  totalCount?: number;
}) {
  const visible = avatars.slice(0, max);
  const overflow = (totalCount ?? avatars.length) - visible.length;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((a, i) => (
        <LabAvatar
          key={`${a.name}-${i}`}
          name={a.name}
          src={a.src}
          size={size}
          className="ring-2 ring-white"
        />
      ))}
      {overflow > 0 ? (
        <span
          className={cn(
            'grid place-items-center rounded-full bg-lab-500 font-semibold text-white ring-2 ring-white',
            sizeMap[size],
          )}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
