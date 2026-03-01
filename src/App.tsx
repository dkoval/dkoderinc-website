import React, { useState, useCallback, useRef, useEffect } from 'react';
import BootSplash from './components/BootSplash';
import Sidebar from './components/Sidebar';
import TerminalWindow from './components/TerminalWindow';
import Terminal, { TerminalHandle } from './components/Terminal';
import { resetPageLoadTime } from './constants';

const mobileKeys = [
  { label: 'Tab', action: 'tab' as const },
  { label: '↑', action: 'up' as const },
  { label: '↓', action: 'down' as const },
  { label: 'Enter', action: 'enter' as const },
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
  { text: 'Reboot scheduled.', color: '#888' },
  { text: 'Waiting for user input...', color: '#888' },
];

const RESTART_FINAL_DESKTOP = 'Press any key to continue... ';
const RESTART_FINAL_MOBILE = 'Tap to continue... ';

type ShutdownPhase = null | 'messages' | 'crt-off' | 'black' | 'restart-prompt';

const App: React.FC = () => {
  const [showBootSplash, setShowBootSplash] = useState(true);
  const handleBootComplete = useCallback(() => setShowBootSplash(false), []);
  const terminalRef = useRef<TerminalHandle>(null);

  const [shutdownPhase, setShutdownPhase] = useState<ShutdownPhase>(null);
  const [shutdownLines, setShutdownLines] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);

  const handleShutdown = useCallback(() => {
    setShutdownPhase('messages');
    setShutdownLines(0);
  }, []);

  const handleRestart = useCallback(() => {
    resetPageLoadTime();
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

      case 'restart-prompt': {
        const onKey = (e: KeyboardEvent) => { e.preventDefault(); handleRestart(); };
        const onTouch = (e: TouchEvent) => { e.preventDefault(); handleRestart(); };
        window.addEventListener('keydown', onKey);
        window.addEventListener('touchstart', onTouch);
        return () => {
          window.removeEventListener('keydown', onKey);
          window.removeEventListener('touchstart', onTouch);
        };
      }
    }

    return () => timers.forEach(clearTimeout);
  }, [shutdownPhase, handleRestart]);

  return (
    <div className="flex flex-col overflow-hidden" style={{ background: '#000', height: '100dvh' }}>
      {showBootSplash && <BootSplash onComplete={handleBootComplete} />}

      {/* Shutdown messages overlay */}
      {shutdownPhase === 'messages' && (
        <div
          className="fixed inset-0 z-[9000] flex flex-col justify-center items-start p-8 md:p-16"
          style={{ background: '#000' }}
        >
          {SHUTDOWN_MESSAGES.slice(0, shutdownLines).map((line, i) => (
            <p key={i} className="font-mono text-sm mb-1" style={{ color: '#00FF41' }}>
              {line}
            </p>
          ))}
        </div>
      )}

      {/* Black screen + restart prompt */}
      {(shutdownPhase === 'black' || shutdownPhase === 'restart-prompt') && (
        <div
          className="fixed inset-0 z-[9000] flex items-center justify-center"
          style={{ background: '#000' }}
        >
          {shutdownPhase === 'restart-prompt' && (
            <div className="text-center font-mono text-sm phosphor-glow">
              <p className="mb-1" style={{ color: '#888' }}>Reboot scheduled.</p>
              <p className="mb-4" style={{ color: '#888' }}>Waiting for user input...</p>
              <p style={{ color: '#00FF41' }}>
                <span className="hidden md:inline">Press any key to continue... <span className="animate-blink">&#x2588;</span></span>
                <span className="md:hidden">Tap to continue... <span className="animate-blink">&#x2588;</span></span>
              </p>
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
            <TerminalWindow>
              <Terminal key={sessionKey} ref={terminalRef} onShutdown={handleShutdown} />
            </TerminalWindow>
          </main>
        </div>
        {/* Mobile virtual keyboard shortcuts */}
        <div
          className="flex md:hidden shrink-0 gap-2 p-2 border-t"
          style={{ borderColor: '#333' }}
        >
          {mobileKeys.map(({ label, action }) => (
            <button
              key={label}
              className="flex-1 py-2 font-mono text-sm rounded"
              style={{ background: '#111', color: '#00FF41', border: '1px solid #333' }}
              data-mobile-action={action}
              onClick={() => terminalRef.current?.handleMobileAction(action)}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Copyright */}
        <div
          className="flex justify-center shrink-0 py-2 font-mono text-xs border-t"
          style={{ color: '#888', borderColor: '#333', paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          <span style={{ color: '#888' }}>$ cat /etc/copyright&nbsp;&nbsp;</span>
          <span style={{ color: '#00FF41' }}>&copy; {new Date().getFullYear()} DKoder Inc.</span>
        </div>
      </div>
    </div>
  );
};

export default App;
