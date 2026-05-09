'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Lock, User, Wifi } from 'lucide-react';
import { LabLogo } from '@/components/lab/logo';
import { ParticleField } from '@/components/lab/motion/particle-field';
import { MoleculeLoader } from '@/components/lab/motion/molecule-loader';
import { fadeInUp, staggerContainer, EASE } from '@/lib/motion';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await api.login({ identifier, password });
      await signIn(tokens.accessToken, tokens.refreshToken);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FAFAFA] p-4">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-lab-mesh opacity-60" />
      <ParticleField count={24} variant="lab" className="-z-10" />
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 h-[420px] w-[420px] rounded-full bg-lab-200/60 blur-3xl"
      />
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-40 h-[360px] w-[360px] rounded-full bg-mint/60 blur-3xl"
      />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:items-center"
      >
        {/* Visual side — uniquement desktop */}
        <motion.div variants={fadeInUp} className="hidden flex-col gap-6 lg:flex">
          <LabLogo />
          <h1 className="font-display text-4xl font-bold leading-tight text-night-900">
            Le laboratoire <span className="text-lab-600">virtuel</span> qui rentre
            dans la poche.
          </h1>
          <p className="text-base text-night-600">
            Maths, Physique-Chimie, SVT — des TPs interactifs conçus pour le programme sénégalais,
            accessibles hors-ligne sur n&apos;importe quel téléphone.
          </p>
          <motion.ul variants={staggerContainer} className="grid grid-cols-3 gap-3 text-xs">
            <Feature emoji="📡" label="100% hors-ligne" />
            <Feature emoji="📱" label="Bas-débit OK" />
            <Feature emoji="🧪" label="TPs interactifs" />
          </motion.ul>
        </motion.div>

        {/* Form side */}
        <motion.div variants={fadeInUp} className="w-full max-w-md justify-self-center">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1 text-sm text-night-500 transition hover:text-lab-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l&apos;accueil
          </Link>

          <div className="rounded-3xl bg-white p-8 shadow-lab-card ring-1 ring-night-100">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <LabLogo />
            </div>
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-night-900">Connexion</h2>
              <p className="text-sm text-night-500">Accède à tes laboratoires virtuels.</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="identifier" className="block text-sm font-medium text-night-700">
                  Identifiant
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-night-400" />
                  <input
                    id="identifier"
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="lycee-limamou/moussa"
                    required
                    className="h-12 w-full rounded-xl bg-white pl-10 pr-4 text-sm ring-1 ring-night-200 placeholder:text-night-300 focus:ring-2 focus:ring-lab-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-night-700">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-night-400" />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 w-full rounded-xl bg-white pl-10 pr-4 text-sm ring-1 ring-night-200 placeholder:text-night-300 focus:ring-2 focus:ring-lab-300 focus:outline-none"
                  />
                </div>
              </div>

              {error ? (
                <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
                  {error}
                </div>
              ) : null}

              <motion.button
                whileHover={!loading ? { scale: 1.02, y: -1 } : undefined}
                whileTap={!loading ? { scale: 0.98 } : undefined}
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-lab-gradient text-sm font-semibold text-white shadow-lab-glow transition hover:opacity-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="inline-block h-4 w-4">
                      <MoleculeLoader size={16} label="" />
                    </span>
                    Connexion…
                  </>
                ) : (
                  <>
                    Se connecter
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </motion.button>
            </form>

            <p className="mt-6 text-center text-xs text-night-400">
              Identifiant fourni par ton école.
            </p>
            <div className="mt-4 border-t border-night-100 pt-4 text-center">
              <p className="text-xs text-night-500">Pas encore de compte ?</p>
              <Link
                href="/register"
                className="mt-1 inline-block text-sm font-semibold text-lab-700 hover:underline"
              >
                Créer un compte démo →
              </Link>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </main>
  );
}

function Feature({ emoji, label }: { emoji: string; label: string }) {
  return (
    <motion.li
      variants={fadeInUp}
      whileHover={{ y: -2, scale: 1.04 }}
      transition={EASE.snappy}
      className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-lab-soft ring-1 ring-night-100"
    >
      <span className="text-base">{emoji}</span>
      <span className="text-xs font-medium text-night-700">{label}</span>
    </motion.li>
  );
}
