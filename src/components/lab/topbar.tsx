'use client';

import { Bell, Search, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LabAvatar } from './avatar';
import { cn } from '@/lib/cn';

export function LabTopBar({
  userName,
  userImage,
  userRoleLabel,
  className,
}: {
  userName: string;
  userImage?: string;
  userRoleLabel?: string;
  className?: string;
}) {
  const [online, setOnline] = useState(true);
  const [notifications] = useState(3);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return (
    <header
      className={cn(
        'flex items-center gap-3 rounded-2xl bg-white px-4 py-2.5 shadow-lab-soft ring-1 ring-night-100',
        className,
      )}
    >
      <div className="relative flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-night-300" />
        <input
          type="search"
          placeholder="Rechercher un labo, un encadrant…"
          className="h-10 w-full rounded-xl bg-night-50 pl-10 pr-4 text-sm text-night-900 placeholder:text-night-400 focus:bg-white focus:ring-2 focus:ring-lab-300 focus:outline-none"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Statut hors-ligne — UX critique pour Sen Lab Visa (PWA) */}
        <span
          title={online ? 'En ligne' : 'Hors-ligne (mode local)'}
          className={cn(
            'hidden h-10 w-10 place-items-center rounded-xl ring-1 sm:grid',
            online
              ? 'bg-mint text-mintInk ring-mint/50'
              : 'bg-peach text-peachInk ring-peach/60 animate-pulse-dot',
          )}
        >
          {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        </span>

        <button
          type="button"
          aria-label="Notifications"
          className="relative grid h-10 w-10 place-items-center rounded-xl bg-night-50 text-night-700 transition hover:bg-night-100"
        >
          <Bell className="h-4 w-4" />
          {notifications > 0 ? (
            <span className="absolute right-2 top-2 grid h-4 min-w-[16px] place-items-center rounded-full bg-lab-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
              {notifications}
            </span>
          ) : null}
        </button>

        <div className="hidden items-center gap-2 pl-1 md:flex">
          <div className="text-right">
            <div className="text-[13px] font-semibold leading-tight text-night-900">
              {userName}
            </div>
            {userRoleLabel ? (
              <div className="text-[11px] leading-tight text-night-400">{userRoleLabel}</div>
            ) : null}
          </div>
          <LabAvatar name={userName} src={userImage} size="md" />
        </div>
        <div className="md:hidden">
          <LabAvatar name={userName} src={userImage} size="md" />
        </div>
      </div>
    </header>
  );
}
