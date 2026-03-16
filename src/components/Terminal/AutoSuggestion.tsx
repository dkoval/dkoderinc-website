interface AutoSuggestionProps {
  inputCommand: string;
  suggestion: string | null;
}

const AutoSuggestion = ({ inputCommand, suggestion }: AutoSuggestionProps) => {
  if (!suggestion) return null;

  return (
    <div className="absolute inset-0 flex items-center pointer-events-none">
      <span className="font-mono opacity-0" style={{ color: 'var(--terminal-primary)' }}>{inputCommand}</span>
      <span className="font-mono" style={{ color: 'var(--terminal-primary-dark)' }}>{suggestion.slice(inputCommand.length)}</span>
    </div>
  );
};

export default AutoSuggestion;
