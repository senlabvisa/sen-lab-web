'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Beaker, Cpu, Leaf, Sigma, Wifi } from 'lucide-react';
import { LabLogo } from '@/components/lab/logo';
import { ParticleField } from '@/components/lab/motion/particle-field';
import { fadeInUp, staggerContainer, EASE } from '@/lib/motion';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FAFAFA]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-lab-mesh opacity-50" />
      <ParticleField count={28} variant="lab" className="-z-10" />
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-40 h-[420px] w-[420px] rounded-full bg-lab-200/60 blur-3xl"
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-32 h-[360px] w-[360px] rounded-full bg-mint/60 blur-3xl"
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <LabLogo />
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-white px-4 text-sm font-semibold text-night-900 shadow-lab-soft ring-1 ring-night-100 transition hover:shadow-lab-card"
        >
          Se connecter
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-10 pb-16 md:pt-20 md:pb-24">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid items-center gap-12 md:grid-cols-2"
        >
          <motion.div variants={fadeInUp}>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-lab-700 ring-1 ring-lab-100 backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-lab-700" />
              Plateforme STEM · Programme sénégalais · Open source
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-night-900 md:text-5xl">
              Le laboratoire <span className="text-lab-600">virtuel</span> qui rentre dans la poche.
            </h1>
            <p className="mt-5 max-w-lg text-base text-night-600 md:text-lg">
              Maths, Physique-Chimie, SVT — des TPs interactifs, conçus pour le programme sénégalais,
              accessibles hors-ligne sur n&apos;importe quel téléphone.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-lab-gradient px-6 text-base font-semibold text-white shadow-lab-glow transition hover:opacity-95"
              >
                Commencer un TP
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-night-900 shadow-lab-soft ring-1 ring-night-200 transition hover:bg-night-50"
              >
                Espace enseignant
              </Link>
            </div>

            <ul className="mt-10 grid grid-cols-3 gap-3 max-w-md">
              <Feature icon={<Wifi className="h-4 w-4" />} label="100% hors-ligne" />
              <Feature icon={<Cpu className="h-4 w-4" />} label="Bas-débit OK" />
              <Feature icon={<Beaker className="h-4 w-4" />} label="TPs interactifs" />
            </ul>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <HeroAtom />
          </motion.div>
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="font-display text-2xl font-semibold text-night-900"
        >
          Des TPs concrets, ancrés au Sénégal
        </motion.h2>
        <p className="mt-1 text-sm text-night-500">Trois exemples disponibles dès la phase pilote.</p>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="mt-6 grid gap-4 md:grid-cols-3"
        >
          <SubjectCard
            tone="physique"
            icon={<Cpu className="h-5 w-5" />}
            title="Loi d'Ohm"
            level="3ème · Physique-Chimie"
            tagline="Compteur Woyofal et résistance d'une LED"
          />
          <SubjectCard
            tone="svt"
            icon={<Leaf className="h-5 w-5" />}
            title="Photosynthèse"
            level="4ème · SVT"
            tagline="Élodée, lumière et bulles d'oxygène"
          />
          <SubjectCard
            tone="maths"
            icon={<Sigma className="h-5 w-5" />}
            title="Théorème de Pythagore"
            level="4ème · Maths"
            tagline="La corde 3-4-5 du maçon de Thiès"
          />
        </motion.div>
      </section>
    </main>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <motion.li
      whileHover={{ y: -3, scale: 1.04 }}
      transition={EASE.snappy}
      className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-lab-soft ring-1 ring-night-100"
    >
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-lab-100 text-lab-700">{icon}</span>
      <span className="text-xs font-medium text-night-900">{label}</span>
    </motion.li>
  );
}

function SubjectCard({
  tone,
  icon,
  title,
  level,
  tagline,
}: {
  tone: 'maths' | 'physique' | 'svt';
  icon: React.ReactNode;
  title: string;
  level: string;
  tagline: string;
}) {
  const styles = {
    maths: { bg: 'bg-violet-50 ring-violet-200', chip: 'bg-violet-100 text-violet-700' },
    physique: { bg: 'bg-blue-50 ring-blue-200', chip: 'bg-blue-100 text-blue-700' },
    svt: { bg: 'bg-emerald-50 ring-emerald-200', chip: 'bg-emerald-100 text-emerald-700' },
  }[tone];

  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={EASE.snappy}
      className={`group relative overflow-hidden rounded-3xl ${styles.bg} p-5 ring-1 transition hover:shadow-lab-card`}
    >
      <motion.span
        whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
        transition={{ duration: 0.4 }}
        className={`grid h-9 w-9 place-items-center rounded-xl ${styles.chip}`}
      >
        {icon}
      </motion.span>
      <span className="ml-2 text-xs font-medium text-night-500">{level}</span>
      <h3 className="mt-3 font-display text-xl font-semibold text-night-900">{title}</h3>
      <p className="mt-1 text-sm text-night-600">{tagline}</p>
    </motion.div>
  );
}

function HeroAtom() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <motion.div
        animate={{ scale: [1, 1.05, 1], opacity: [0.7, 0.9, 0.7] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 -z-10 rounded-[2rem] bg-lab-mesh blur-2xl"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...EASE.spring, delay: 0.2 }}
        whileHover={{ rotate: [0, 5, -5, 0] }}
        className="relative aspect-square rounded-[2rem] bg-white p-6 shadow-lab-card ring-1 ring-night-100"
      >
        <svg viewBox="0 0 320 320" className="h-full w-full" role="img" aria-label="Atome stylisé">
          <defs>
            <radialGradient id="nucleus" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#6D28D9" />
            </radialGradient>
          </defs>
          {/* Orbites tournantes — 3 vitesses différentes */}
          <motion.ellipse
            cx="160" cy="160" rx="130" ry="48"
            fill="none" stroke="#8B5CF6" strokeWidth="1.5" opacity="0.5"
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '160px 160px' }}
          />
          <motion.ellipse
            cx="160" cy="160" rx="130" ry="48"
            fill="none" stroke="#8B5CF6" strokeWidth="1.5" opacity="0.5"
            initial={{ rotate: 60 }}
            animate={{ rotate: 60 + 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '160px 160px' }}
          />
          <motion.ellipse
            cx="160" cy="160" rx="130" ry="48"
            fill="none" stroke="#8B5CF6" strokeWidth="1.5" opacity="0.5"
            initial={{ rotate: 120 }}
            animate={{ rotate: 120 + 360 }}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '160px 160px' }}
          />
          {/* Noyau pulsant */}
          <motion.circle
            cx="160" cy="160" r="32" fill="url(#nucleus)"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '160px 160px' }}
          />
          <circle cx="160" cy="160" r="32" fill="none" stroke="#fff" strokeWidth="2" opacity="0.6" />
          {/* Électrons en orbite (cx animé via une rotation autour du centre) */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '160px 160px' }}
          >
            <circle cx="290" cy="160" r="6" fill="#8B5CF6" />
            <circle cx="290" cy="160" r="11" fill="none" stroke="#8B5CF6" strokeWidth="1" opacity="0.4" />
          </motion.g>
          <motion.g
            initial={{ rotate: 60 }}
            animate={{ rotate: 60 + 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '160px 160px' }}
          >
            <circle cx="290" cy="160" r="6" fill="#10B981" />
            <circle cx="290" cy="160" r="11" fill="none" stroke="#10B981" strokeWidth="1" opacity="0.4" />
          </motion.g>
          <motion.g
            initial={{ rotate: 120 }}
            animate={{ rotate: 120 + 360 }}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '160px 160px' }}
          >
            <circle cx="290" cy="160" r="6" fill="#F59E0B" />
            <circle cx="290" cy="160" r="11" fill="none" stroke="#F59E0B" strokeWidth="1" opacity="0.4" />
          </motion.g>
        </svg>

        <div className="absolute left-4 top-4 rounded-xl bg-white/90 px-3 py-2 shadow-lab-soft ring-1 ring-night-100 backdrop-blur-sm">
          <div className="text-[10px] uppercase tracking-wider text-night-400">Matières</div>
          <div className="font-display text-lg font-bold text-night-900">3</div>
        </div>
        <div className="absolute right-4 top-4 rounded-xl bg-white/90 px-3 py-2 shadow-lab-soft ring-1 ring-night-100 backdrop-blur-sm">
          <div className="text-[10px] uppercase tracking-wider text-night-400">TPs</div>
          <div className="font-display text-lg font-bold text-night-900">3+</div>
        </div>
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-xl bg-lab-gradient px-4 py-2 text-white shadow-lab-glow"
        >
          <div className="text-[10px] uppercase tracking-wider opacity-80">Niveaux</div>
          <div className="font-display text-base font-semibold">6ème → Terminale</div>
        </motion.div>
      </motion.div>
    </div>
  );
}
