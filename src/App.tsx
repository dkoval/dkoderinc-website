import React, { useState, useCallback, useRef } from 'react';
import BootSplash from './components/BootSplash';
import Sidebar from './components/Sidebar';
import TerminalWindow from './components/TerminalWindow';
import Terminal, { TerminalHandle } from './components/Terminal';

const mobileKeys = [
  { label: 'Tab', action: 'tab' as const },
  { label: '↑', action: 'up' as const },
  { label: '↓', action: 'down' as const },
  { label: 'Enter', action: 'enter' as const },
];

const App: React.FC = () => {
  const [showBootSplash, setShowBootSplash] = useState(true);
  const handleBootComplete = useCallback(() => setShowBootSplash(false), []);
  const terminalRef = useRef<TerminalHandle>(null);

  return (
    <div className="flex flex-col overflow-hidden" style={{ background: '#000', height: '100dvh' }}>
      {showBootSplash && <BootSplash onComplete={handleBootComplete} />}
      <div
        className="flex flex-col flex-1 overflow-hidden"
        style={{ opacity: showBootSplash ? 0 : 1, transition: 'opacity 0.3s' }}
      >
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex flex-1 overflow-hidden p-3 md:p-4">
            <TerminalWindow>
              <Terminal ref={terminalRef} />
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
