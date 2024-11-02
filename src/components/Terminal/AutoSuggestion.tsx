import React from 'react';

interface AutoSuggestionProps {
  inputCommand: string;
  suggestion: string | null;
}

const AutoSuggestion: React.FC<AutoSuggestionProps> = ({ inputCommand, suggestion }) => {
  if (!suggestion) return null;

  return (
    <div className="absolute inset-0 flex items-center pointer-events-none">
      <span className="text-white font-mono font-argon opacity-0">{inputCommand}</span>
      <span className="text-gray-500 font-mono font-argon">{suggestion.slice(inputCommand.length)}</span>
    </div>
  );
};

export default AutoSuggestion;
