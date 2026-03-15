import React from 'react';
import StatusBar from './StatusBar';

type Props = {
  children: React.ReactNode;
  bellFlash?: boolean;
  onSoundToggle?: () => void;
  soundEnabled?: boolean;
};

const TerminalWindow: React.FC<Props> = ({ children, bellFlash, onSoundToggle, soundEnabled }) => (
  <div
    className={`flex flex-col flex-1 rounded overflow-hidden ${bellFlash ? 'bell-flash' : ''}`}
    style={{
      border: '1px solid var(--terminal-border)',
      boxShadow: '0 0 20px var(--terminal-glow), inset 0 0 20px var(--terminal-glow-soft)',
    }}
  >
    {/* Title bar */}
    <div
      className="flex items-center px-3 py-2 shrink-0"
      style={{ background: 'var(--terminal-surface)', borderBottom: '1px solid var(--terminal-border)' }}
    >
      {/* Decorative dots */}
      <div className="flex gap-1.5 mr-3">
        <div className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#FEBC2E' }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#28C840' }} />
      </div>
      {/* Title */}
      <span className="flex-1 text-center font-mono text-xs" style={{ color: 'var(--terminal-primary)' }}>
        dkoderinc.com — bash — 80×24
      </span>
      {/* Activity LED */}
      <div className="w-2 h-2 rounded-full animate-blink" style={{ background: 'var(--terminal-primary)' }} />
    </div>
    {/* Terminal content */}
    <div className="flex-1 overflow-hidden flex flex-col">
      {children}
    </div>
    {/* Status bar */}
    <StatusBar
      onSoundToggle={onSoundToggle}
      soundEnabled={soundEnabled}
    />
  </div>
);

export default TerminalWindow;
