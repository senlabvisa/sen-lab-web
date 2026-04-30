'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { LabSidebar, ROLE_LABEL } from './sidebar';
import { LabTopBar } from './topbar';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/cn';

type Role = 'sysadmin' | 'admin' | 'teacher' | 'student';

/**
 * LabShell — wrapper layout principal pour les pages skillzone-style.
 * Sidebar dynamique selon le rôle de l'utilisateur authentifié,
 * gère le loading et la redirection vers /login si non authentifié.
 */
export function LabShell({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: Role[];
}) {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    return <ShellSkeleton />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role as Role)) {
    return null;
  }

  const role = user.role as Role;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-lab-mesh opacity-50"
      />

      <div className="mx-auto flex max-w-[1440px] gap-4 p-4">
        <div className="hidden lg:block">
          <LabSidebar role={role} onLogout={logout} />
        </div>

        {drawerOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Fermer le menu"
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-night-900/50 backdrop-blur-sm"
            />
            <div className="absolute left-0 top-0 h-full p-3 animate-slide-in-right">
              <LabSidebar role={role} onLogout={logout} />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-full bg-white text-night-900 shadow-lab-soft"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        <main className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Ouvrir le menu"
              onClick={() => setDrawerOpen(true)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-night-700 shadow-lab-soft ring-1 ring-night-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <LabTopBar
              userName={user.fullName}
              userRoleLabel={ROLE_LABEL[role]}
              className="flex-1"
            />
          </div>

          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="mx-auto flex max-w-[1440px] gap-4 p-4">
        <div className="hidden h-[calc(100vh-2rem)] w-[260px] animate-pulse rounded-3xl bg-night-100 lg:block" />
        <div className="flex flex-1 flex-col gap-4">
          <div className="h-14 animate-pulse rounded-2xl bg-night-100" />
          <div className="h-32 animate-pulse rounded-3xl bg-night-100" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="h-40 animate-pulse rounded-3xl bg-night-100" />
            <div className="h-40 animate-pulse rounded-3xl bg-night-100" />
            <div className="h-40 animate-pulse rounded-3xl bg-night-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
