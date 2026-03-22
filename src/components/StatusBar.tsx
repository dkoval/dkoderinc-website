import { useTheme } from '../ThemeContext';
import useIsMobile from '../hooks/useIsMobile';
import Clock from './Clock';

type StatusBarProps = {
  onSoundToggle?: () => void;
  soundEnabled?: boolean;
};

const StatusBar = ({ onSoundToggle, soundEnabled = false }: StatusBarProps) => {
  const { theme } = useTheme();
  const isMobile = useIsMobile();

  return (
    <div className="status-bar flex items-center justify-between px-3 py-1 font-mono shrink-0 select-none">
      <span style={{ color: 'var(--terminal-primary-dim)' }}>
        [0] bash
      </span>
      <div className="flex items-center gap-2">
        <span
          className="status-bar-item flex items-center gap-1 font-mono"
          style={{ color: 'var(--terminal-gray)', fontSize: 'inherit' }}
        >
          <span style={{ color: 'var(--terminal-primary)' }}>●</span>
          <span>{theme}</span>
        </span>
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
        <Clock />
      </div>
    </div>
  );
};

export default StatusBar;
