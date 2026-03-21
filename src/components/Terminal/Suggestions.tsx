import { Ref, memo } from 'react';
import { ChevronLeft, Palette } from 'lucide-react';
import { CommandSuggestion } from './types';
import { ThemeName } from '../../ThemeContext';

interface SuggestionsProps {
  suggestions: CommandSuggestion[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onMouseEnter: (index: number) => void;
  mode: 'commands' | 'themes';
  themes?: ThemeName[];
  currentTheme?: ThemeName;
  onBack?: () => void;
  ref?: Ref<HTMLDivElement>;
}

const Suggestions = memo(({ suggestions, selectedIndex, onSelect, onMouseEnter, mode, themes, currentTheme, onBack, ref }: SuggestionsProps) => {
    return (
      <div
        ref={ref}
        className="absolute bottom-full mb-2 w-full shadow-lg overflow-hidden"
        style={{ background: 'var(--terminal-bg)', border: '1px solid var(--terminal-border)' }}
      >
        {mode === 'themes' && (
          <button
            className="w-full px-4 py-2 flex items-center space-x-2 text-left text-sm border-b min-h-[44px] md:min-h-0"
            style={{ color: 'var(--terminal-gray)', borderColor: 'var(--terminal-border)' }}
            onClick={onBack}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="font-mono">Themes</span>
          </button>
        )}
        {mode === 'commands'
          ? suggestions.map((suggestion, index) => (
              <button
                key={suggestion.command}
                className="w-full px-4 py-2 flex items-center space-x-3 text-left text-sm transition-colors min-h-[44px] md:min-h-0"
                style={{
                  background: index === selectedIndex ? 'var(--terminal-surface)' : 'transparent',
                  borderLeft: index === selectedIndex ? '2px solid var(--terminal-primary)' : '2px solid transparent',
                }}
                onClick={() => onSelect(index)}
                onMouseEnter={() => onMouseEnter(index)}
              >
                {suggestion.icon}
                <span className="font-mono" style={{ color: 'var(--terminal-primary)' }}>{suggestion.command}</span>
                <span style={{ color: 'var(--terminal-primary-dark)' }}>-</span>
                <span style={{ color: 'var(--terminal-gray)' }}>{suggestion.description}</span>
              </button>
            ))
          : themes?.map((t, index) => (
              <button
                key={t}
                className="w-full px-4 py-2 flex items-center space-x-3 text-left text-sm transition-colors min-h-[44px] md:min-h-0"
                style={{
                  background: index === selectedIndex ? 'var(--terminal-surface)' : 'transparent',
                  borderLeft: index === selectedIndex ? '2px solid var(--terminal-primary)' : '2px solid transparent',
                }}
                onClick={() => onSelect(index)}
                onMouseEnter={() => onMouseEnter(index)}
              >
                <Palette className="w-4 h-4" style={{ color: 'var(--terminal-primary)' }} />
                <span className="font-mono" style={{ color: 'var(--terminal-primary)' }}>{t}</span>
                {t === currentTheme && (
                  <span className="font-mono text-xs" style={{ color: 'var(--terminal-gray)' }}>(current)</span>
                )}
              </button>
            ))}
      </div>
    );
});

Suggestions.displayName = 'Suggestions';

export default Suggestions;
