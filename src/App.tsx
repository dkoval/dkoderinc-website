import React, { useState, useCallback } from 'react';
import BootSplash from './components/BootSplash';
import Sidebar from './components/Sidebar';
import TerminalWindow from './components/TerminalWindow';
import Terminal from './components/Terminal';

const App: React.FC = () => {
  const [showBootSplash, setShowBootSplash] = useState(true);
  const handleBootComplete = useCallback(() => setShowBootSplash(false), []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#000' }}>
      {showBootSplash && <BootSplash onComplete={handleBootComplete} />}
      <div
        className="flex flex-col flex-1"
        style={{ opacity: showBootSplash ? 0 : 1, transition: 'opacity 0.3s' }}
      >
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden" style={{ minHeight: '100vh' }}>
          <Sidebar />
          <main className="flex flex-1 overflow-hidden p-3 md:p-4">
            <TerminalWindow>
              <Terminal />
            </TerminalWindow>
          </main>
        </div>
        {/* Mobile virtual keyboard shortcuts */}
        <div className="flex md:hidden gap-2 p-2 border-t" style={{ borderColor: '#005500' }}>
          {['Tab', '↑', '↓', 'Enter'].map(key => (
            <button
              key={key}
              className="flex-1 py-2 font-mono text-sm rounded"
              style={{ background: '#111', color: '#00FF41', border: '1px solid #005500' }}
              onClick={() => {
                const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                if (input) {
                  input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
                }
              }}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
