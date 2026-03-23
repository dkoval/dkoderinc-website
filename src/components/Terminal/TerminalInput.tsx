import { memo, ChangeEvent, KeyboardEvent, Ref } from 'react';
import AutoSuggestion from './AutoSuggestion';

interface TerminalInputProps {
  inputCommand: string;
  autoSuggestion: string | null;
  isInputBlocked: boolean;
  isMobile: boolean;
  showSuggestions: boolean;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: KeyboardEvent) => void;
  onInputClick?: () => void;
  onFocus?: () => void;
  inputRef: Ref<HTMLInputElement>;
}

const TerminalInput = memo(({
  inputCommand,
  autoSuggestion,
  isInputBlocked,
  isMobile,
  showSuggestions,
  onInputChange,
  onKeyDown,
  onInputClick,
  onFocus,
  inputRef,
}: TerminalInputProps) => {
  return (
    <div className={`flex items-center space-x-2 w-full p-2 ${isInputBlocked ? 'input-blocked' : ''}`} style={{ border: '1px solid var(--terminal-border)' }}>
      <span className="font-mono text-sm shrink-0 select-none">
        <span style={{ color: 'var(--terminal-primary-dim)' }}>~ </span>
        <span style={{ color: 'var(--terminal-primary)' }}>$ </span>
      </span>
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={inputCommand}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          className="bg-transparent font-mono text-sm w-full focus:outline-none relative z-10 caret-transparent"
          style={{ color: 'var(--terminal-primary)' }}
          inputMode={isMobile ? "search" : undefined}
          aria-expanded={showSuggestions}
          aria-controls={showSuggestions ? "terminal-suggestions" : undefined}
          onClick={onInputClick}
          onFocus={onFocus}
          autoCapitalize="none"
          spellCheck={false}
          autoComplete="off"
        />
        <AutoSuggestion
          inputCommand={inputCommand}
          suggestion={autoSuggestion}
        />
        <span
          className="terminal-cursor font-mono text-sm pointer-events-none absolute top-0 left-0 z-0"
          style={{ color: 'var(--terminal-primary)', paddingLeft: `${inputCommand.length}ch` }}
          aria-hidden="true"
        >
          ▌
        </span>
      </div>
    </div>
  );
});

TerminalInput.displayName = 'TerminalInput';

export default TerminalInput;
