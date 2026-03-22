import { memo, Ref } from 'react';
import { TerminalLine } from './types';

interface TerminalOutputProps {
  terminalOutput: TerminalLine[];
  isInputBlocked: boolean;
  revealStartIndex: number;
  showScrollIndicator: boolean;
  rainVisible: boolean;
  scrollRef: Ref<HTMLDivElement>;
  sentinelRef: Ref<HTMLDivElement>;
}

const TerminalOutput = memo(({
  terminalOutput,
  isInputBlocked,
  revealStartIndex,
  showScrollIndicator,
  rainVisible,
  scrollRef,
  sentinelRef,
}: TerminalOutputProps) => {
  return (
    <div
      role="log"
      aria-live="polite"
      ref={scrollRef}
      className="h-full overflow-y-auto overflow-x-hidden text-sm terminal-scroll relative z-[1]"
      style={{
        opacity: rainVisible ? 0 : 1,
        transition: 'opacity 400ms ease-in-out',
      }}
    >
      {terminalOutput.map((line, index) => (
        <div key={index} className={`group flex items-start hover:bg-white/5 px-2 py-0.5 -mx-2 rounded ${
          isInputBlocked && index >= revealStartIndex ? 'line-reveal' : ''
        }`}>
          <p
            className="font-mono flex-1 break-words"
            style={
              line.type === 'input' ? { color: 'var(--terminal-primary)' } :
              line.type === 'error' ? { color: 'var(--terminal-error)' } :
              { color: 'var(--terminal-output)' }
            }
          >
            {line.type === 'timing' ? (
              <span className="block text-right" style={{ color: 'var(--terminal-gray)', fontSize: '0.75rem' }}>
                {line.content}
              </span>
            ) : line.type === 'spinner' ? (
              <span className="inline-flex items-center gap-2">
                <span className="ai-spinner" />
                <span style={{ color: 'var(--terminal-gray)' }}>{line.content}</span>
              </span>
            ) : line.helpEntry ? (
              <span className="inline-flex items-center gap-3">
                {line.helpEntry.icon}
                <span style={{ color: 'var(--terminal-primary)' }}>{line.helpEntry.command}</span>
                <span style={{ color: 'var(--terminal-primary-dark)' }}>-</span>
                <span style={{ color: 'var(--terminal-gray)' }}>{line.helpEntry.description}</span>
              </span>
            ) : line.isHtml ? (
              <span
                dangerouslySetInnerHTML={{ __html: line.content }}
              />
            ) : (
              <span style={{ whiteSpace: 'pre' }}>{line.content}</span>
            )}
          </p>
          <span className="text-xs mr-2 opacity-0 group-hover:opacity-100 select-none" style={{ color: 'var(--terminal-primary-dark)' }}>
            {line.timestamp}
          </span>
        </div>
      ))}
      <div ref={sentinelRef} className="h-px" />
      <div
        className="scroll-indicator font-mono"
        style={{
          color: 'var(--terminal-primary-dim)',
          opacity: showScrollIndicator ? 0.6 : 0,
          fontSize: '0.75rem',
          padding: '2px 0',
        }}
      >
        ▼ more
      </div>
    </div>
  );
});

TerminalOutput.displayName = 'TerminalOutput';

export default TerminalOutput;
