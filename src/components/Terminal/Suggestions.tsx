import React from 'react';
import { CommandSuggestion } from './types';

interface SuggestionsProps {
  suggestions: CommandSuggestion[];
  selectedIndex: number;
  onSelect: (command: string) => void;
  onMouseEnter: (index: number) => void;
}

const Suggestions: React.FC<SuggestionsProps> = ({
  suggestions,
  selectedIndex,
  onSelect,
  onMouseEnter,
}) => {
  return (
    <div className="absolute bottom-full mb-2 w-full bg-gray-950 rounded-lg shadow-lg border border-gray-800 overflow-hidden">
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion.command}
          className={`w-full px-4 py-2 flex items-center space-x-3 text-left transition-colors ${
            index === selectedIndex ? 'bg-gray-800' : 'hover:bg-gray-900'
          }`}
          onClick={() => onSelect(suggestion.command)}
          onMouseEnter={() => onMouseEnter(index)}
        >
          {suggestion.icon}
          <span className="text-green-400 font-mono">{suggestion.command}</span>
          <span className="text-gray-400">-</span>
          <span className="text-gray-300">{suggestion.description}</span>
        </button>
      ))}
    </div>
  );
};

export default Suggestions;
