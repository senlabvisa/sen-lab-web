'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, User } from 'lucide-react';
import { LabLogo } from '@/components/lab/logo';
import { ParticleField } from '@/components/lab/motion/particle-field';
import { MoleculeLoader } from '@/components/lab/motion/molecule-loader';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function RegisterPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdIdentifier, setCreatedIdentifier] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (fullName.trim().length < 2) {
      setError('Entre ton nom complet (au moins 2 caractères).');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      // 1. Création du compte
      const user = await api.register({ fullName: fullName.trim(), password });
      setCreatedIdentifier(user.identifier);

      // 2. Login automatique
      const tokens = await api.login({ identifier: user.identifier, password });
      await signIn(tokens.accessToken, tokens.refreshToken);

      // 3. Redirection après 2s pour laisser le temps de voir l'identifier
      setTimeout(() => router.push('/dashboard'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'inscription");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FAFAFA] p-4">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-lab-mesh opacity-60" />
      <ParticleField count={24} variant="lab" className="-z-10" />

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="relative w-full max-w-md">
        <Link
          href="/login"
          className="mb-4 inline-flex items-center gap-1 text-sm text-night-500 transition hover:text-lab-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la connexion
        </Link>

        <motion.div variants={fadeInUp} className="rounded-3xl bg-white p-8 shadow-lab-card ring-1 ring-night-100">
          <div className="mb-6 flex items-center gap-3">
            <LabLogo />
          </div>

          {createdIdentifier ? (
            <SuccessState identifier={createdIdentifier} />
          ) : (
            <>
              <div className="mb-6">
                <h2 className="font-display text-2xl font-bold text-night-900">Créer un compte démo</h2>
                <p className="text-sm text-night-500">
                  Mode démo public — accès immédiat à tous les TPs. Pas d&apos;email requis.
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="fullName" className="block text-sm font-medium text-night-700">
                    Nom complet
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-night-400" />
                    <input
                      id="fullName"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Aïssatou Diallo"
                      required
                      className="h-12 w-full rounded-xl bg-white pl-10 pr-4 text-sm ring-1 ring-night-200 placeholder:text-night-300 focus:ring-2 focus:ring-lab-300 focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-night-400">
                    Ton identifiant sera généré automatiquement (ex : <code className="font-mono">demo/aissatou-diallo-a3f7</code>).
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-night-700">
                    Mot de passe (min 6)
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-night-400" />
                    <input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-12 w-full rounded-xl bg-white pl-10 pr-4 text-sm ring-1 ring-night-200 placeholder:text-night-300 focus:ring-2 focus:ring-lab-300 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirm" className="block text-sm font-medium text-night-700">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-night-400" />
                    <input
                      id="confirm"
                      type="password"
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      minLength={6}
                      className="h-12 w-full rounded-xl bg-white pl-10 pr-4 text-sm ring-1 ring-night-200 placeholder:text-night-300 focus:ring-2 focus:ring-lab-300 focus:outline-none"
                    />
                  </div>
                </div>

                {error && (
                  <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
                    {error}
                  </div>
                )}

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
                      Création…
                    </>
                  ) : (
                    <>
                      Créer mon compte
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </motion.button>
              </form>

              <p className="mt-6 text-center text-xs text-night-400">
                En créant un compte, tu obtiens un accès <strong>élève</strong> à tous les TPs Sen Lab Visa.
              </p>
            </>
          )}
        </motion.div>
      </motion.div>
    </main>
  );
}

function SuccessState({ identifier }: { identifier: string }) {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-mint text-mintInk">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <h2 className="font-display text-2xl font-bold text-night-900">Compte créé !</h2>
      <p className="text-sm text-night-500">
        Voici ton identifiant à conserver pour les prochaines connexions :
      </p>
      <div className="rounded-2xl bg-lab-50 p-4 ring-2 ring-lab-300">
        <div className="text-[10px] uppercase tracking-wider text-lab-700/60">Identifiant</div>
        <div className="mt-1 break-all font-mono text-base font-bold text-lab-700">{identifier}</div>
      </div>
      <p className="text-xs text-night-500">
        Connexion automatique en cours… Redirection vers ton tableau de bord.
      </p>
      <div className="mx-auto h-1 w-12 overflow-hidden rounded-full bg-lab-100">
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 2, ease: 'easeInOut' }}
          className="h-full w-1/2 bg-lab-500"
        />
      </div>
    </div>
  );
}
