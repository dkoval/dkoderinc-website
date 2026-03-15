import React, { useState, useEffect } from 'react';
import { useTheme } from '../ThemeContext';
import useIsMobile from '../hooks/useIsMobile';

type StatusBarProps = {
  onThemeClick?: () => void;
  onSoundToggle?: () => void;
  soundEnabled?: boolean;
};

const StatusBar: React.FC<StatusBarProps> = ({ onThemeClick, onSoundToggle, soundEnabled = false }) => {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = clock.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    ...(isMobile ? {} : { second: '2-digit' }),
  });

  return (
    <div className="status-bar flex items-center justify-between px-3 py-1 font-mono shrink-0 select-none">
      <span style={{ color: 'var(--terminal-primary-dim)' }}>
        [0] bash
      </span>
      <div className="flex items-center gap-2">
        <button
          className="status-bar-item flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 font-mono"
          style={{ color: 'var(--terminal-gray)', fontSize: 'inherit' }}
          onClick={onThemeClick}
          title="Switch theme"
        >
          <span style={{ color: 'var(--terminal-primary)' }}>●</span>
          <span>{theme}</span>
        </button>
        {!isMobile && (
          <>
            <span style={{ color: 'var(--terminal-border)' }}>│</span>
            <button
              className="status-bar-item cursor-pointer bg-transparent border-none p-0 font-mono"
              style={{
                color: soundEnabled ? 'var(--terminal-primary)' : 'var(--terminal-gray)',
                fontSize: 'inherit',
                textDecoration: soundEnabled ? 'none' : 'line-through',
              }}
              onClick={onSoundToggle}
              title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            >
              ♪ {soundEnabled ? 'on' : 'off'}
            </button>
          </>
        )}
        <span style={{ color: 'var(--terminal-border)' }}>│</span>
        <span>{timeStr}</span>
      </div>
    </div>
  );
};

export default StatusBar;
