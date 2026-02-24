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
        style={{ background: '#000', border: '1px solid #333' }}
      >
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion.command}
            className="w-full px-4 py-2 flex items-center space-x-3 text-left text-sm transition-colors"
            style={{
              background: index === selectedIndex ? '#111' : 'transparent',
            }}
            onClick={() => onSelect(suggestion.command)}
            onMouseEnter={() => onMouseEnter(index)}
          >
            {suggestion.icon}
            <span className="font-mono text-[#00FF41]">{suggestion.command}</span>
            <span style={{ color: '#555' }}>-</span>
            <span className="text-gray-400">{suggestion.description}</span>
          </button>
        ))}
      </div>
    );
  }
);

Suggestions.displayName = 'Suggestions';

export default Suggestions;
