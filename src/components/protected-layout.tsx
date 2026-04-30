'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Atom, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/cn';

type Role = 'sysadmin' | 'admin' | 'teacher' | 'student';

type NavLink = { href: Route; label: string };

const NAV: Record<Role, NavLink[]> = {
  sysadmin: [
    { href: '/dashboard', label: 'Vue d’ensemble' },
    { href: '/admin/schools', label: 'Écoles' },
    { href: '/admin/users', label: 'Utilisateurs' },
    { href: '/teacher/attempts', label: 'Tentatives' },
  ],
  admin: [
    { href: '/dashboard', label: 'Vue d’ensemble' },
    { href: '/admin/users', label: 'Utilisateurs' },
    { href: '/teacher/classes', label: 'Classes' },
    { href: '/teacher/attempts', label: 'Tentatives' },
  ],
  teacher: [
    { href: '/dashboard', label: 'Vue d’ensemble' },
    { href: '/teacher/classes', label: 'Mes classes' },
    { href: '/teacher/attempts', label: 'Tentatives' },
  ],
  student: [
    { href: '/dashboard', label: 'Vue d’ensemble' },
    { href: '/student/tps', label: 'Mes TPs' },
    { href: '/student/join', label: 'Rejoindre' },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  sysadmin: 'Sys-admin',
  admin: 'Admin école',
  teacher: 'Enseignant·e',
  student: 'Élève',
};

export function ProtectedLayout({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: Role[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (allowedRoles && !allowedRoles.includes(user.role as Role)) {
      router.replace('/dashboard');
    }
  }, [loading, user, allowedRoles, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen flex-col bg-surface">
        <header className="flex items-center justify-between border-b border-ink/5 bg-white px-6 py-3">
          <div className="flex items-center gap-8">
            <Skeleton className="h-8 w-32" />
            <div className="hidden gap-4 md:flex">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <Skeleton className="h-9 w-28 rounded-xl" />
        </header>
        <main className="flex-1 p-6">
          <div className="mx-auto w-full max-w-5xl space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role as Role)) return null;

  const role = user.role as Role;
  const links = NAV[role] ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="sticky top-0 z-30 border-b border-ink/5 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-6 md:gap-10">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-science-gradient text-white shadow-glow">
                <Atom className="h-4 w-4" />
              </span>
              <span className="hidden font-display text-base font-bold text-ink sm:inline">
                Sen Lab Visa
              </span>
            </Link>
            <nav className="hidden gap-1 md:flex">
              {links.map((l) => {
                const active = pathname === l.href || pathname?.startsWith(l.href + '/');
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      'rounded-lg px-3 py-2 text-sm font-medium transition',
                      active
                        ? 'bg-science-50 text-science-700'
                        : 'text-ink/60 hover:bg-ink/5 hover:text-ink',
                    )}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <div className="text-sm font-medium text-ink leading-tight">{user.fullName}</div>
              <div className="text-[11px] text-ink/50 leading-tight">{ROLE_LABEL[role]}</div>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-science-50 text-sm font-semibold text-science-700 ring-1 ring-science-100">
              {initials(user.fullName)}
            </div>
            <Button variant="outline" size="sm" onClick={logout} aria-label="Déconnexion">
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Déconnexion</span>
            </Button>
          </div>
        </div>

        {/* Nav mobile */}
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {links.map((l) => {
            const active = pathname === l.href || pathname?.startsWith(l.href + '/');
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition',
                  active
                    ? 'bg-science-50 text-science-700'
                    : 'text-ink/60 hover:bg-ink/5',
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
