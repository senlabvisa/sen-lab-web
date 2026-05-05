'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Volume2 } from 'lucide-react';

/**
 * <NarrationButton> — bouton qui lit un texte à voix haute en français.
 *
 * Utilise la Web Speech API native du navigateur (gratuit, hors-ligne,
 * disponible sur Chrome / Safari / Edge / Samsung Internet). Choisit la
 * meilleure voix française disponible. Toggle play/pause, indique l'état
 * en cours.
 *
 * Pas de fallback réseau : si le navigateur ne supporte pas, le bouton
 * est désactivé. C'est OK pour le MVP — la grande majorité des androids
 * sénégalais ont au moins une voix fr-FR via Google TTS.
 */

export type NarrationButtonProps = {
  text: string;
  label?: string;
  className?: string;
};

function pickFrenchVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const ranked = voices
    .filter((v) => v.lang?.toLowerCase().startsWith('fr'))
    .sort((a, b) => {
      const score = (v: SpeechSynthesisVoice) => {
        let s = 0;
        if (v.lang?.toLowerCase() === 'fr-fr') s += 10;
        if (v.lang?.toLowerCase() === 'fr-sn') s += 12;
        if (v.localService) s += 3;
        if (/google|microsoft|amazon|apple/i.test(v.name)) s += 2;
        return s;
      };
      return score(b) - score(a);
    });
  return ranked[0] ?? null;
}

export function NarrationButton({ text, label = 'Écouter', className }: NarrationButtonProps) {
  const [supported, setSupported] = useState(true);
  const [playing, setPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setSupported(false);
      return;
    }
    // Force le préchargement des voix sur certains navigateurs
    const handler = () => void pickFrenchVoice();
    window.speechSynthesis.addEventListener?.('voiceschanged', handler);
    handler();
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', handler);
      window.speechSynthesis.cancel();
    };
  }, []);

  function toggle() {
    if (!supported) return;
    const synth = window.speechSynthesis;
    if (playing) {
      synth.cancel();
      setPlaying(false);
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.95;
    u.pitch = 1;
    const voice = pickFrenchVoice();
    if (voice) u.voice = voice;
    u.onend = () => setPlaying(false);
    u.onerror = () => setPlaying(false);
    utteranceRef.current = u;
    synth.speak(u);
    setPlaying(true);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!supported}
      title={supported ? label : 'Lecture audio non supportée par ce navigateur'}
      className={
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ' +
        (playing
          ? 'border-violet-500 bg-violet-100 text-violet-700'
          : 'border-violet-200 bg-white text-violet-700 hover:bg-violet-50') +
        (!supported ? ' opacity-40' : '') +
        (className ? ` ${className}` : '')
      }
      aria-pressed={playing}
    >
      {playing ? <Pause className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      {playing ? 'Stopper' : label}
      {playing && (
        <span className="ml-1 inline-flex items-center gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block w-0.5 rounded-full bg-violet-700"
              style={{
                height: 8,
                animation: `narWave 0.7s ease-in-out infinite`,
                animationDelay: `${i * 0.12}s`,
              }}
            />
          ))}
        </span>
      )}
    </button>
  );
}
