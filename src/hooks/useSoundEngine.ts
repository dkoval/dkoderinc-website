import { useCallback, useRef, useState, useEffect } from 'react';

type SoundType = 'keypress' | 'execute' | 'error' | 'themeSwitch' | 'boot';

const STORAGE_KEY = 'dkoder-sound-enabled';

const useSoundEngine = () => {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; }
    catch { return false; }
  });
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0'); }
    catch { /* ignore */ }
  }, [enabled]);

  const getContext = useCallback(() => {
    if (!ctxRef.current) {
      try { ctxRef.current = new AudioContext(); }
      catch { return null; }
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playTone = useCallback((
    frequency: number,
    duration: number,
    type: OscillatorType = 'square',
    volume: number = 0.04,
  ) => {
    const ctx = getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
  }, [getContext]);

  const play = useCallback((sound: SoundType) => {
    if (!enabled) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    switch (sound) {
      case 'keypress':
        playTone(1800, 15, 'square', 0.03);
        break;
      case 'execute': {
        playTone(440, 80, 'sine', 0.04);
        setTimeout(() => playTone(660, 80, 'sine', 0.04), 40);
        break;
      }
      case 'error':
        playTone(220, 100, 'square', 0.04);
        break;
      case 'themeSwitch': {
        const ctx = getContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 120;
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.1);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
        break;
      }
      case 'boot': {
        const notes = [330, 440, 660];
        notes.forEach((freq, i) => {
          setTimeout(() => playTone(freq, 60, 'sine', 0.04), i * 70);
        });
        break;
      }
    }
  }, [enabled, playTone, getContext]);

  const toggle = useCallback(() => {
    setEnabled(prev => !prev);
  }, []);

  return { enabled, toggle, setEnabled, play };
};

export default useSoundEngine;
