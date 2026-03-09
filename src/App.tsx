import React, { useState, useCallback, useRef, useEffect } from 'react';
import BootSplash from './components/BootSplash';
import Sidebar from './components/Sidebar';
import TerminalWindow from './components/TerminalWindow';
import Terminal, { TerminalHandle } from './components/Terminal';
import { resetPageLoadTime } from './constants';
import { List } from 'lucide-react';
import { useTheme } from './ThemeContext';
import useSoundEngine from './hooks/useSoundEngine';

const MOBILE_BTN_STYLE = {
  background: 'var(--terminal-surface)',
  color: 'var(--terminal-primary)',
  border: '1px solid var(--terminal-border)',
} as const;

const MOBILE_BTN_STYLE_EMPHASIZED = {
  background: 'var(--terminal-primary)',
  color: 'var(--terminal-bg)',
  border: '1px solid var(--terminal-primary)',
} as const;

const mobileKeys = [
  { label: 'Cmds', action: 'tab' as const, icon: true },
  { label: '↑', action: 'up' as const },
  { label: '↓', action: 'down' as const },
  { label: '⏎ Enter', action: 'enter' as const, emphasized: true },
];

const SHUTDOWN_MESSAGES = [
  'Broadcast message from root@dkoderinc (pts/0):',
  'The system is going down for halt NOW!',
  'Stopping all services...            [OK]',
  'Unmounting filesystems...           [OK]',
  'Flushing disk cache...              [OK]',
  'System halted.',
];

const RESTART_LINES = [
  { text: 'Reboot scheduled.' },
  { text: 'Waiting for user input...' },
];

const RESTART_FINAL_DESKTOP = 'Press any key to continue... ';
const RESTART_FINAL_MOBILE = 'Tap to continue... ';

const RESTART_ALL_TEXTS = [
  RESTART_LINES[0].text,
  RESTART_LINES[1].text,
  RESTART_FINAL_DESKTOP,
];

type ShutdownPhase = null | 'messages' | 'crt-off' | 'black' | 'restart-prompt';

const App: React.FC = () => {
  const { transitioning } = useTheme();
  const sound = useSoundEngine();
  const [showBootSplash, setShowBootSplash] = useState(true);
  const handleBootComplete = useCallback(() => {
    setShowBootSplash(false);
    sound.play('boot');
  }, [sound]);
  const terminalRef = useRef<TerminalHandle>(null);

  const [bellFlash, setBellFlash] = useState(false);
  const bellTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleBell = useCallback(() => {
    if (bellTimerRef.current) clearTimeout(bellTimerRef.current);
    setBellFlash(false);
    requestAnimationFrame(() => {
      setBellFlash(true);
      bellTimerRef.current = setTimeout(() => setBellFlash(false), 150);
    });
  }, []);

  useEffect(() => {
    return () => { if (bellTimerRef.current) clearTimeout(bellTimerRef.current); };
  }, []);

  const [isRevealing, setIsRevealing] = useState(false);

  const [shutdownPhase, setShutdownPhase] = useState<ShutdownPhase>(null);
  const [shutdownLines, setShutdownLines] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);
  const [typingLine, setTypingLine] = useState(0);
  const [typingChar, setTypingChar] = useState(0);
  const [typingDone, setTypingDone] = useState(false);

  const handleShutdown = useCallback(() => {
    setShutdownPhase('messages');
    setShutdownLines(0);
  }, []);

  const handleRestart = useCallback(() => {
    resetPageLoadTime();
    setTypingLine(0);
    setTypingChar(0);
    setTypingDone(false);
    setShutdownPhase(null);
    setShutdownLines(0);
    setSessionKey(k => k + 1);
    setShowBootSplash(true);
  }, []);

  // Shutdown sequence state machine
  useEffect(() => {
    if (!shutdownPhase) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    switch (shutdownPhase) {
      case 'messages':
        SHUTDOWN_MESSAGES.forEach((_, i) => {
          timers.push(setTimeout(() => setShutdownLines(i + 1), i * 350));
        });
        timers.push(setTimeout(() => setShutdownPhase('crt-off'), SHUTDOWN_MESSAGES.length * 350 + 500));
        break;

      case 'crt-off':
        timers.push(setTimeout(() => setShutdownPhase('black'), 1500));
        break;

      case 'black':
        timers.push(setTimeout(() => setShutdownPhase('restart-prompt'), 1000));
        break;

      case 'restart-prompt':
        break;
    }

    return () => timers.forEach(clearTimeout);
  }, [shutdownPhase]);

  // Typing animation for restart prompt
  useEffect(() => {
    if (shutdownPhase !== 'restart-prompt' || typingDone) return;

    const currentText = RESTART_ALL_TEXTS[typingLine];
    if (!currentText) return;

    if (typingChar < currentText.length) {
      const timer = setTimeout(() => setTypingChar(c => c + 1), 50);
      return () => clearTimeout(timer);
    }

    if (typingLine < RESTART_ALL_TEXTS.length - 1) {
      const timer = setTimeout(() => {
        setTypingLine(l => l + 1);
        setTypingChar(0);
      }, 400);
      return () => clearTimeout(timer);
    }

    setTypingDone(true);
  }, [shutdownPhase, typingLine, typingChar]);

  // Attach restart listener only after typing completes
  useEffect(() => {
    if (shutdownPhase !== 'restart-prompt' || !typingDone) return;

    const onKey = (e: KeyboardEvent) => { e.preventDefault(); handleRestart(); };
    const onTouch = (e: TouchEvent) => { e.preventDefault(); handleRestart(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouch);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onTouch);
    };
  }, [shutdownPhase, typingDone, handleRestart]);

  return (
    <div className="flex flex-col overflow-hidden" style={{ background: 'var(--terminal-bg)', height: '100dvh' }}>
      {/* Theme transition overlay */}
      <div
        className="fixed inset-0 z-[9500] pointer-events-none"
        style={{
          background: 'var(--terminal-bg)',
          opacity: transitioning ? 0.7 : 0,
          transition: transitioning ? 'opacity 0.15s ease-in' : 'opacity 0.25s ease-out',
        }}
      />
      {showBootSplash && <BootSplash onComplete={handleBootComplete} />}

      {/* Shutdown messages overlay */}
      {shutdownPhase === 'messages' && (
        <div
          className="fixed inset-0 z-[9000] flex flex-col justify-center items-start p-8 md:p-16"
          style={{ background: 'var(--terminal-bg)' }}
        >
          {SHUTDOWN_MESSAGES.slice(0, shutdownLines).map((line, i) => (
            <p key={i} className="font-mono text-sm mb-1" style={{ color: 'var(--terminal-primary)' }}>
              {line}
            </p>
          ))}
        </div>
      )}

      {/* Black screen + restart prompt */}
      {(shutdownPhase === 'black' || shutdownPhase === 'restart-prompt') && (
        <div
          className="fixed inset-0 z-[9000] flex items-center justify-center"
          style={{ background: 'var(--terminal-bg)' }}
        >
          {shutdownPhase === 'restart-prompt' && (
            <div className="text-center font-mono text-sm phosphor-glow">
              {/* Completed lines */}
              {RESTART_LINES.slice(0, typingLine).map((line, i) => (
                <p key={i} className={i === 0 ? 'mb-1' : 'mb-4'} style={{ color: 'var(--terminal-gray)' }}>
                  {line.text}
                </p>
              ))}

              {/* Currently typing line (lines 0-1: gray) */}
              {typingLine < RESTART_LINES.length && (
                <p className={typingLine === 0 ? 'mb-1' : 'mb-4'} style={{ color: 'var(--terminal-gray)' }}>
                  {RESTART_LINES[typingLine].text.slice(0, typingChar)}
                  <span>&#x2588;</span>
                </p>
              )}

              {/* Final line: green, responsive. On mobile the shorter text finishes
                  before the desktop-driven timer, causing a brief solid-cursor pause. */}
              {typingLine >= RESTART_LINES.length && (
                <p style={{ color: 'var(--terminal-primary)' }}>
                  <span className="hidden md:inline">
                    {RESTART_FINAL_DESKTOP.slice(0, typingChar)}
                  </span>
                  <span className="md:hidden">
                    {RESTART_FINAL_MOBILE.slice(0, Math.min(typingChar, RESTART_FINAL_MOBILE.length))}
                  </span>
                  <span className={typingDone ? 'cursor-afterglow' : ''}>&#x2588;</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div
        className={`flex flex-col flex-1 overflow-hidden ${shutdownPhase === 'crt-off' ? 'crt-shutdown' : ''}`}
        style={{
          opacity: showBootSplash ? 0 : 1,
          transition: shutdownPhase ? undefined : 'opacity 0.3s',
        }}
      >
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          <Sidebar key={sessionKey} />
          <main className="flex flex-1 overflow-hidden p-3 md:p-4">
            <TerminalWindow bellFlash={bellFlash} onSoundToggle={sound.toggle} soundEnabled={sound.enabled}>
              <Terminal
                key={sessionKey}
                ref={terminalRef}
                onShutdown={handleShutdown}
                onBell={handleBell}
                playSound={sound.play}
                soundEnabled={sound.enabled}
                onSoundSet={sound.setEnabled}
                onRevealStateChange={setIsRevealing}
              />
            </TerminalWindow>
          </main>
        </div>
        {/* Mobile virtual keyboard shortcuts */}
        <div
          className="flex md:hidden shrink-0 gap-2 p-2 border-t"
          style={{ borderColor: 'var(--terminal-border)' }}
        >
          {mobileKeys.map(({ label, action, icon, emphasized }) => (
            <button
              key={label}
              className={`flex-1 py-2 font-mono text-sm rounded inline-flex items-center justify-center gap-1 ${isRevealing ? 'opacity-50 pointer-events-none' : ''}`}
              style={emphasized ? MOBILE_BTN_STYLE_EMPHASIZED : MOBILE_BTN_STYLE}
              data-mobile-action={action}
              onClick={() => {
                navigator.vibrate?.(10);
                terminalRef.current?.handleMobileAction(action);
              }}
            >
              {icon && <List className="w-3.5 h-3.5" />}
              {label}
            </button>
          ))}
        </div>
        {/* Copyright */}
        <div
          className="flex justify-center shrink-0 py-2 font-mono text-xs border-t"
          style={{ color: 'var(--terminal-gray)', borderColor: 'var(--terminal-border)', paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          <span style={{ color: 'var(--terminal-gray)' }}>$ cat /etc/copyright&nbsp;&nbsp;</span>
          <span style={{ color: 'var(--terminal-primary)' }}>&copy; {new Date().getFullYear()} DKoder Inc.</span>
        </div>
      </div>
    </div>
  );
};

export default App;
