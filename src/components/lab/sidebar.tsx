'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Target,
  GraduationCap,
  Building2,
  KeyRound,
  Sparkles,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { LabLogo } from './logo';
import { cn } from '@/lib/cn';

type Role = 'sysadmin' | 'admin' | 'teacher' | 'student';

type NavItem = {
  href: Route;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
};

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  student: [
    { href: '/dashboard' as Route, label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/student/tps' as Route, label: 'Mes TPs', icon: BookOpen },
    { href: '/student/join' as Route, label: 'Rejoindre une classe', icon: KeyRound },
  ],
  teacher: [
    { href: '/dashboard' as Route, label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/teacher/classes' as Route, label: 'Mes classes', icon: GraduationCap },
    { href: '/teacher/attempts' as Route, label: 'Tentatives', icon: Target },
  ],
  admin: [
    { href: '/dashboard' as Route, label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/admin/users' as Route, label: 'Utilisateurs', icon: Users },
    { href: '/teacher/classes' as Route, label: 'Classes', icon: GraduationCap },
    { href: '/teacher/attempts' as Route, label: 'Tentatives', icon: Target },
  ],
  sysadmin: [
    { href: '/dashboard' as Route, label: 'Vue d’ensemble', icon: LayoutDashboard },
    { href: '/admin/schools' as Route, label: 'Écoles', icon: Building2 },
    { href: '/admin/users' as Route, label: 'Utilisateurs', icon: Users },
    { href: '/teacher/attempts' as Route, label: 'Tentatives', icon: Target },
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  sysadmin: 'Sys-admin',
  admin: 'Admin école',
  teacher: 'Enseignant·e',
  student: 'Élève',
};

export function LabSidebar({
  role,
  onLogout,
  className,
}: {
  role: Role;
  onLogout?: () => void;
  className?: string;
}) {
  const pathname = usePathname() ?? '';
  const items = NAV_BY_ROLE[role] ?? [];

  return (
    <aside
      className={cn(
        'sticky top-4 flex h-[calc(100vh-2rem)] w-[260px] flex-col rounded-3xl bg-night-900 px-4 py-5 text-white shadow-lab-card',
        'scrollbar-dark',
        className,
      )}
    >
      <Link href={'/dashboard' as Route} className="mb-1 px-2">
        <LabLogo tone="dark" />
      </Link>
      <div className="mb-5 px-2 text-[11px] font-medium uppercase tracking-wider text-white/40">
        {ROLE_LABEL[role]}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(pathname, item.href)} />
        ))}
      </nav>

      {/* Sen Lab Visa : carte info, pas commerciale */}
      <div className="my-3 rounded-2xl bg-lab-gradient p-4 text-white">
        <div className="flex items-start gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/20">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="text-sm font-semibold leading-tight">
            Sen Lab Visa
          </div>
        </div>
        <p className="mt-2 text-xs leading-snug text-white/85">
          Plateforme STEM open source · Programme sénégalais.
        </p>
      </div>

      <div className="flex flex-col gap-1 border-t border-white/10 pt-3">
        <Link
          href={'/' as Route}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
          <span>À propos</span>
        </Link>
        {onLogout ? (
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span>Déconnexion</span>
          </button>
        ) : null}
      </div>
    </aside>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(href + '/');
}

function NavLink({
  href,
  label,
  icon: Icon,
  badge,
  active,
}: NavItem & { active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
        active
          ? 'bg-white text-night-900 shadow-lab-soft'
          : 'text-white/70 hover:bg-white/5 hover:text-white',
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge ? (
        <span
          className={cn(
            'grid h-5 min-w-[20px] place-items-center rounded-full px-1.5 text-[10px] font-bold',
            active ? 'bg-lab-100 text-lab-700' : 'bg-lab-500 text-white',
          )}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
