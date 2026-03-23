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
  filterText?: string;
  ref?: Ref<HTMLDivElement>;
}

const highlightMatch = (command: string, filter: string) => {
  if (!filter) return <span style={{ color: 'var(--terminal-primary)' }}>{command}</span>;
  const matchEnd = filter.length;
  return (
    <>
      <span data-highlight="match" style={{ color: 'var(--terminal-primary)', fontWeight: 'bold' }}>
        {command.slice(0, matchEnd)}
      </span>
      <span style={{ color: 'var(--terminal-gray)' }}>
        {command.slice(matchEnd)}
      </span>
    </>
  );
};

const Suggestions = memo(({ suggestions, selectedIndex, onSelect, onMouseEnter, mode, themes, currentTheme, onBack, filterText, ref }: SuggestionsProps) => {
    return (
      <div
        ref={ref}
        id="terminal-suggestions"
        role="listbox"
        className="absolute bottom-full left-0 right-0 mb-1 z-20 overflow-y-auto rounded border scrollbar-hide"
        style={{
          maxHeight: 'min(50vh, 200px)',
          background: 'var(--terminal-bg)',
          borderColor: 'color-mix(in srgb, var(--terminal-primary) 30%, transparent)',
        }}
      >
        {mode === 'themes' && (
          <button
            className="w-full px-4 py-2 flex items-center space-x-2 text-left text-sm border-b min-h-[44px]"
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
                role="option"
                aria-label={`Run ${suggestion.command}`}
                aria-selected={index === selectedIndex}
                className="w-full px-4 py-2 flex items-center space-x-3 text-left text-sm transition-colors min-h-[44px]"
                style={{
                  background: index === selectedIndex ? 'var(--terminal-surface)' : 'transparent',
                  borderLeft: index === selectedIndex ? '2px solid var(--terminal-primary)' : '2px solid transparent',
                }}
                onClick={() => onSelect(index)}
                onMouseEnter={() => onMouseEnter(index)}
              >
                {suggestion.icon}
                <span className="font-mono shrink-0">{highlightMatch(suggestion.command, filterText ?? '')}</span>
                <span className="shrink-0" style={{ color: 'var(--terminal-primary-dark)' }}>-</span>
                <span className="truncate" style={{ color: 'var(--terminal-gray)' }}>{suggestion.description}</span>
              </button>
            ))
          : themes?.map((t, index) => (
              <button
                key={t}
                role="option"
                aria-label={`Run ${t}`}
                aria-selected={index === selectedIndex}
                className="w-full px-4 py-2 flex items-center space-x-3 text-left text-sm transition-colors min-h-[44px]"
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
