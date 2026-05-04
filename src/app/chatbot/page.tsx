'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDown,
  Bot,
  ExternalLink,
  Lightbulb,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { LabShell } from '@/components/lab/lab-shell';
import { LabBreadcrumb } from '@/components/lab/breadcrumb';
import { PanelCard } from '@/components/lab/section';
import { ParticleField } from '@/components/lab/motion/particle-field';
import { PulseDot } from '@/components/lab/motion/pulse-dot';
import { LabAvatar } from '@/components/lab/avatar';
import { fadeInUp, EASE } from '@/lib/motion';
import { generateBotReply, STARTER_SUGGESTIONS, type ChatMessage, type SuggestionChip } from '@/lib/chatbot';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/cn';

// ============================================================
// Page
// ============================================================

export default function ChatbotPage() {
  return (
    <LabShell>
      <ChatbotContent />
    </LabShell>
  );
}

function ChatbotContent() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | SuggestionChip['category']>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Auto-scroll vers le bas à chaque nouveau message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Détection si on a scrollé vers le haut (afficher bouton "scroll bottom")
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const onScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollDown(distFromBottom > 100);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: Date.now(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simule une latence "réflexion" du bot
    setTimeout(() => {
      const reply = generateBotReply(trimmed);
      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        role: 'bot',
        text: reply.text,
        tpSuggestions: reply.tpSuggestions,
        timestamp: Date.now(),
      };
      setMessages((m) => [...m, botMsg]);
      setIsTyping(false);
    }, 800 + Math.random() * 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const clear = () => setMessages([]);

  const filteredSuggestions =
    activeCategory === 'all'
      ? STARTER_SUGGESTIONS
      : STARTER_SUGGESTIONS.filter((s) => s.category === activeCategory);

  return (
    <div className="space-y-3">
      <LabBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/dashboard' as Route },
          { label: 'Tuteur virtuel' },
        ]}
      />

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        {/* === Colonne principale : conversation === */}
        <PanelCard padding="none" className="relative flex h-[calc(100vh-12rem)] flex-col overflow-hidden">
          {/* Header tuteur */}
          <header className="relative flex items-center gap-3 overflow-hidden rounded-t-3xl bg-night-900 px-4 py-3 text-white">
            <ParticleField count={10} variant="dark" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="relative">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lab-gradient text-white shadow-lab-glow">
                  <Bot className="h-5 w-5" />
                </span>
                <PulseDot color="emerald" size={10} className="absolute -bottom-0.5 -right-0.5" />
              </div>
              <div>
                <div className="font-display text-base font-semibold">Tuteur Sen Lab Visa</div>
                <div className="flex items-center gap-1.5 text-[11px] text-white/70">
                  <span>En ligne</span>
                  <span>·</span>
                  <span>Spécialisé STEM 🇸🇳</span>
                </div>
              </div>
            </div>
            {messages.length > 0 ? (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={clear}
                className="relative z-10 ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-medium text-white backdrop-blur transition hover:bg-white/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Nouvelle conversation
              </motion.button>
            ) : null}
          </header>

          {/* Zone messages */}
          <div ref={scrollAreaRef} className="relative flex-1 overflow-y-auto px-4 py-5">
            {messages.length === 0 ? (
              <WelcomeScreen
                userFirstName={user?.fullName.split(' ')[0] ?? 'Élève'}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
                suggestions={filteredSuggestions}
                onPickSuggestion={(prompt) => send(prompt)}
              />
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} userName={user?.fullName ?? 'Toi'} />
                  ))}
                </AnimatePresence>
                {isTyping ? <TypingIndicator /> : null}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Bouton scroll-bottom */}
            <AnimatePresence>
              {showScrollDown ? (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.08 }}
                  onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="absolute bottom-4 left-1/2 grid h-9 w-9 -translate-x-1/2 place-items-center rounded-full bg-lab-500 text-white shadow-lab-glow"
                  aria-label="Aller en bas"
                >
                  <ArrowDown className="h-4 w-4" />
                </motion.button>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-night-100 px-3 py-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pose ta question (ex: 'explique-moi la photosynthèse')…"
              className="h-11 flex-1 rounded-xl bg-night-50 px-3 text-sm ring-1 ring-night-100 placeholder:text-night-400 focus:bg-white focus:ring-2 focus:ring-lab-300 focus:outline-none"
            />
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              type="submit"
              disabled={!input.trim() || isTyping}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lab-gradient text-white shadow-lab-glow transition hover:opacity-95 disabled:opacity-40"
              aria-label="Envoyer"
            >
              <Send className="h-4 w-4" />
            </motion.button>
          </form>
        </PanelCard>

        {/* === Colonne droite : suggestions par thème === */}
        <aside className="space-y-3">
          <PanelCard padding="md" className="bg-lab-mesh">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-lab-gradient text-white shadow-lab-glow">
                <Lightbulb className="h-4 w-4" />
              </span>
              <div>
                <div className="font-display text-sm font-bold text-night-900">Astuces</div>
                <div className="text-[11px] text-night-500">Comment bien me parler</div>
              </div>
            </div>
            <ul className="mt-3 space-y-2 text-xs text-night-700">
              <li className="flex gap-2">
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-lab-100 text-[10px] font-bold text-lab-700">1</span>
                Sois précis : « explique la loi d'Ohm » est mieux que « aide-moi en physique ».
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-lab-100 text-[10px] font-bold text-lab-700">2</span>
                Demande des exemples : je donne souvent un exemple sénégalais.
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-lab-100 text-[10px] font-bold text-lab-700">3</span>
                Si tu ne comprends pas, dis « explique-moi plus simplement ».
              </li>
            </ul>
          </PanelCard>

          <PanelCard padding="md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-lab-100 text-lab-700">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <h3 className="font-display text-sm font-semibold text-night-900">Limites</h3>
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-night-600">
              Ce tuteur est en version démo : il connaît bien les TP pilotes (Pythagore, loi d'Ohm,
              photosynthèse) et les concepts du programme sénégalais 6ème → Terminale.
              <br />
              <br />
              Pour des questions très pointues, demande à ton enseignant·e via la messagerie.
            </p>
          </PanelCard>

          <PanelCard padding="md" className="bg-night-900 text-white ring-night-800">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white">
                <Bot className="h-3.5 w-3.5" />
              </span>
              <h3 className="font-display text-sm font-semibold">À propos</h3>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-white/70">
              Tuteur virtuel Sen Lab Visa — assistant pédagogique spécialisé STEM, ancré dans le
              programme officiel du Sénégal et illustré par des contextes locaux concrets.
            </p>
          </PanelCard>
        </aside>
      </div>
    </div>
  );
}

// ============================================================
// Composants
// ============================================================

function WelcomeScreen({
  userFirstName,
  activeCategory,
  onCategoryChange,
  suggestions,
  onPickSuggestion,
}: {
  userFirstName: string;
  activeCategory: 'all' | SuggestionChip['category'];
  onCategoryChange: (cat: 'all' | SuggestionChip['category']) => void;
  suggestions: SuggestionChip[];
  onPickSuggestion: (prompt: string) => void;
}) {
  const categories = [
    { id: 'all' as const, label: 'Toutes' },
    { id: 'maths' as const, label: 'Maths' },
    { id: 'physique-chimie' as const, label: 'Physique-Chimie' },
    { id: 'svt' as const, label: 'SVT' },
    { id: 'general' as const, label: 'Méthodologie' },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.05 } },
      }}
      className="mx-auto max-w-2xl space-y-6 py-8"
    >
      <motion.div variants={fadeInUp} className="text-center">
        <motion.span
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...EASE.spring, delay: 0.1 }}
          className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-3xl bg-lab-gradient text-white shadow-lab-glow"
        >
          <Bot className="h-8 w-8" />
        </motion.span>
        <h2 className="font-display text-2xl font-bold text-night-900">
          Salut {userFirstName} !
        </h2>
        <p className="mt-1 text-sm text-night-500">
          Je suis ton <strong className="text-lab-700">tuteur virtuel</strong> en STEM.
          Pose-moi une question ou clique sur une suggestion ci-dessous.
        </p>
      </motion.div>

      {/* Filtres catégorie */}
      <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-center gap-1.5">
        {categories.map((c) => {
          const isActive = activeCategory === c.id;
          return (
            <motion.button
              key={c.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => onCategoryChange(c.id)}
              className={cn(
                'relative inline-flex h-8 items-center rounded-full px-3 text-xs font-medium transition',
                isActive
                  ? 'text-white'
                  : 'bg-white text-night-600 ring-1 ring-night-100 hover:bg-night-50',
              )}
            >
              {isActive ? (
                <motion.span
                  layoutId="active-cat-bg"
                  className="absolute inset-0 -z-0 rounded-full bg-night-900"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              ) : null}
              <span className="relative z-10">{c.label}</span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Grille de suggestions */}
      <motion.div
        variants={fadeInUp}
        className="grid gap-2 sm:grid-cols-2"
      >
        <AnimatePresence mode="popLayout">
          {suggestions.map((s) => (
            <motion.button
              key={s.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={EASE.snappy}
              onClick={() => onPickSuggestion(s.prompt)}
              className="rounded-2xl bg-white p-3 text-left ring-1 ring-night-100 transition hover:ring-lab-200 hover:shadow-lab-card"
            >
              <div className="text-sm font-semibold text-night-900">{s.label}</div>
              <div className="mt-0.5 line-clamp-2 text-xs text-night-500">{s.prompt}</div>
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function MessageBubble({ message, userName }: { message: ChatMessage; userName: string }) {
  const isUser = message.role === 'user';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={EASE.smooth}
      className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {isUser ? (
        <LabAvatar size="sm" name={userName} className="mt-1" />
      ) : (
        <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lab-gradient text-white shadow-lab-glow">
          <Bot className="h-4 w-4" />
        </span>
      )}
      <div className={cn('flex max-w-[80%] flex-col gap-1.5', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-lab-500 text-white'
              : 'bg-white text-night-900 ring-1 ring-night-100',
          )}
        >
          <FormattedText text={message.text} />
        </div>
        {message.tpSuggestions && message.tpSuggestions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {message.tpSuggestions.map((tp) => (
              <Link
                key={tp.slug}
                href={`/tp/${tp.slug}` as Route}
                className="inline-flex h-7 items-center gap-1 rounded-lg bg-lab-100 px-2 text-[11px] font-semibold text-lab-700 transition hover:bg-lab-200"
              >
                <ExternalLink className="h-3 w-3" />
                {tp.title}
              </Link>
            ))}
          </div>
        ) : null}
        <span className="px-1 text-[10px] text-night-400">
          {new Date(message.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2.5"
    >
      <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lab-gradient text-white shadow-lab-glow">
        <Bot className="h-4 w-4" />
      </span>
      <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-night-100">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
              className="h-1.5 w-1.5 rounded-full bg-lab-500"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/** Rendu basique markdown-ish : **gras**, listes simples, sauts de ligne. */
function FormattedText({ text }: { text: string }) {
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        // Bold inline : **xxx**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="whitespace-pre-wrap">
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={j} className="font-semibold">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return <span key={j}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}
