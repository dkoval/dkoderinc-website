import React from 'react';
import { CommandSuggestion } from './types';

interface SuggestionsProps {
  suggestions: CommandSuggestion[];
  selectedIndex: number;
  onSelect: (command: string) => void;
  onMouseEnter: (index: number) => void;
}

const Suggestions = React.forwardRef<HTMLDivElement, SuggestionsProps>(
  ({ suggestions, selectedIndex, onSelect, onMouseEnter }, ref) => {
    return (
      <div
        ref={ref}
        className="absolute bottom-full mb-2 w-full shadow-lg overflow-hidden"
        style={{ background: 'var(--terminal-bg)', border: '1px solid var(--terminal-border)' }}
      >
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion.command}
            className="w-full px-4 py-2 flex items-center space-x-3 text-left text-sm transition-colors min-h-[44px] md:min-h-0"
            style={{
              background: index === selectedIndex ? 'var(--terminal-surface)' : 'transparent',
            }}
            onClick={() => onSelect(suggestion.command)}
            onMouseEnter={() => onMouseEnter(index)}
          >
            {suggestion.icon}
            <span className="font-mono" style={{ color: 'var(--terminal-primary)' }}>{suggestion.command}</span>
            <span style={{ color: 'var(--terminal-primary-dark)' }}>-</span>
            <span style={{ color: 'var(--terminal-gray)' }}>{suggestion.description}</span>
          </button>
        ))}
      </div>
    );
  }
);

Suggestions.displayName = 'Suggestions';

export default Suggestions;
