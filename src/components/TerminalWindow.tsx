import React from 'react';

type Props = { children: React.ReactNode };

const TerminalWindow: React.FC<Props> = ({ children }) => (
  <div
    className="flex flex-col flex-1 rounded overflow-hidden"
    style={{
      border: '1px solid #333',
      boxShadow: '0 0 20px #00FF4133, inset 0 0 20px #00FF4111',
    }}
  >
    {/* Title bar */}
    <div
      className="flex items-center px-3 py-2 shrink-0"
      style={{ background: '#111', borderBottom: '1px solid #333' }}
    >
      {/* Decorative dots */}
      <div className="flex gap-1.5 mr-3">
        <div className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#FEBC2E' }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#28C840' }} />
      </div>
      {/* Title */}
      <span className="flex-1 text-center font-mono text-xs" style={{ color: '#00FF41' }}>
        dkoderinc.com — bash — 80×24
      </span>
      {/* Activity LED */}
      <div className="w-2 h-2 rounded-full animate-blink" style={{ background: '#00FF41' }} />
    </div>
    {/* Terminal content */}
    <div className="flex-1 overflow-hidden flex flex-col">
      {children}
    </div>
  </div>
);

export default TerminalWindow;
