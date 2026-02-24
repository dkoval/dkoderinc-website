import React from 'react';

interface AutoSuggestionProps {
  inputCommand: string;
  suggestion: string | null;
}

const AutoSuggestion: React.FC<AutoSuggestionProps> = ({ inputCommand, suggestion }) => {
  if (!suggestion) return null;

  return (
    <div className="absolute inset-0 flex items-center pointer-events-none">
      <span className="font-mono opacity-0" style={{ color: '#00FF41' }}>{inputCommand}</span>
      <span className="font-mono" style={{ color: '#005500' }}>{suggestion.slice(inputCommand.length)}</span>
    </div>
  );
};

export default AutoSuggestion;
