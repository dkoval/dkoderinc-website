import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Code2, ChevronRight } from 'lucide-react';
import DOMPurify from 'dompurify';
import { suggestions, commands } from './commands';
import { TerminalLine } from './types';
import Suggestions from './Suggestions';
import AutoSuggestion from './AutoSuggestion';
import { PAGE_LOAD_TIME, formatUptime } from '../../constants';

const MAX_HISTORY = 50;

export type TerminalHandle = {
  handleMobileAction: (action: 'tab' | 'up' | 'down' | 'enter') => void;
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && !window.matchMedia('(min-width: 768px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(!e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
};

type TerminalProps = {
  onShutdown?: () => void;
};

const Terminal = forwardRef<TerminalHandle, TerminalProps>(({ onShutdown }, ref) => {
  const isMobile = useIsMobile();
  const [terminalOutput, setTerminalOutput] = useState<TerminalLine[]>([]);
  const [inputCommand, setInputCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [autoSuggestion, setAutoSuggestion] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const spinnerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const displayHelp = () => {
    return [
      { content: '$ help', type: 'input' as const, timestamp: getCurrentTime() },
      ...commands.help.map((line) => ({
        content: line,
        type: 'output' as const,
      })),
      ...suggestions.map((_, i) => ({
        content: '',
        type: 'output' as const,
        helpEntry: { commandIndex: i },
      })),
      ...commands._helpFooter.map((line) => ({
        content: line,
        type: 'output' as const,
      })),
    ];
  };

  const updateAutoSuggestion = (input: string) => {
    if (!input) {
      setAutoSuggestion(null);
      return;
    }

    const matchingCommand = suggestions
      .map(s => s.command)
      .find(cmd => cmd.toLowerCase().startsWith(input.toLowerCase()));

    setAutoSuggestion(matchingCommand || null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputCommand(value);
    updateAutoSuggestion(value);
    setShowSuggestions(false);
  };

  const handleCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim().toLowerCase();

    if (trimmedCmd === '') return;

    if (trimmedCmd === 'clear') {
      setTerminalOutput(displayHelp());
      setInputCommand('');
      setAutoSuggestion(null);
      return;
    }

    if (trimmedCmd === 'exit') {
      setTerminalOutput(prev => [
        ...prev,
        { content: `$ ${trimmedCmd}`, type: 'input', timestamp: getCurrentTime() },
      ]);
      setInputCommand('');
      setAutoSuggestion(null);
      onShutdown?.();
      return;
    }

    // Add input line + spinner
    const inputLine: TerminalLine = {
      content: `$ ${trimmedCmd}`,
      type: 'input',
      timestamp: getCurrentTime(),
    };
    const spinnerLine: TerminalLine = {
      content: 'processing query...',
      type: 'spinner',
    };

    setTerminalOutput(prev => [...prev, inputLine, spinnerLine]);
    setCommandHistory(prev => [...prev, trimmedCmd].slice(-MAX_HISTORY));
    setHistoryIndex(-1);
    setInputCommand('');
    setAutoSuggestion(null);

    // After delay, replace spinner with real output
    spinnerTimeoutRef.current = setTimeout(() => {
      let outputLines: TerminalLine[];

      if (trimmedCmd === 'uptime') {
        const seconds = Math.floor((Date.now() - PAGE_LOAD_TIME) / 1000);
        outputLines = [
          { content: ` up ${formatUptime(seconds)} (this session)`, type: 'output' },
          { content: ` up 15+ years (career)`, type: 'output' },
          { content: ` load average: 0.42, 0.15, 0.07`, type: 'output' },
        ];
      } else {
        const output = commands[trimmedCmd as keyof typeof commands] || `Command not found: ${cmd}`;
        outputLines = Array.isArray(output)
          ? output.map(line => ({
              content: line,
              type: 'output' as const,
              isHtml: trimmedCmd === 'contact',
            }))
          : [{
              content: output,
              type: output.startsWith('Command not found') ? 'error' as const : 'output' as const,
            }];
      }

      // Replace spinner line with real output
      setTerminalOutput(prev => {
        const lastSpinnerIndex = prev.findLastIndex(l => l.type === 'spinner');
        if (lastSpinnerIndex === -1) return [...prev, ...outputLines];
        return [...prev.slice(0, lastSpinnerIndex), ...outputLines];
      });
    }, 600);
  };

  const selectSuggestion = () => {
    const selectedCommand = suggestions[selectedSuggestionIndex].command;
    setShowSuggestions(false);
    handleCommand(selectedCommand);
    inputRef.current?.focus();
  };

  const completeAutoSuggestion = () => {
    if (autoSuggestion) {
      setInputCommand(autoSuggestion);
      setAutoSuggestion(null);
      inputRef.current?.focus();
    }
  };

  // Extracted action handlers for both keyboard and mobile button use
  const actionTab = () => {
    if (showSuggestions) {
      selectSuggestion();
    } else if (autoSuggestion) {
      completeAutoSuggestion();
    } else {
      setShowSuggestions(true);
      setSelectedSuggestionIndex(0);
    }
  };

  const actionUp = () => {
    if (showSuggestions) {
      setSelectedSuggestionIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (commandHistory.length > 0) {
      const newIndex = historyIndex + 1 >= commandHistory.length ? 0 : historyIndex + 1;
      setHistoryIndex(newIndex);
      setInputCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      setAutoSuggestion(null);
    }
  };

  const actionDown = () => {
    if (showSuggestions) {
      setSelectedSuggestionIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (commandHistory.length > 0) {
      const newIndex = historyIndex <= 0 ? commandHistory.length - 1 : historyIndex - 1;
      setHistoryIndex(newIndex);
      setInputCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      setAutoSuggestion(null);
    }
  };

  const actionEnter = () => {
    if (showSuggestions) {
      selectSuggestion();
    } else {
      handleCommand(inputCommand);
    }
  };

  useImperativeHandle(ref, () => ({
    handleMobileAction: (action: 'tab' | 'up' | 'down' | 'enter') => {
      switch (action) {
        case 'tab': actionTab(); break;
        case 'up': actionUp(); break;
        case 'down': actionDown(); break;
        case 'enter': actionEnter(); break;
      }
      inputRef.current?.focus();
    },
  }));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        actionTab();
        return;
      case 'ArrowUp':
        e.preventDefault();
        actionUp();
        return;
      case 'ArrowDown':
        e.preventDefault();
        actionDown();
        return;
      case 'Enter':
        actionEnter();
        return;
      case 'ArrowRight':
        if (autoSuggestion) {
          e.preventDefault();
          completeAutoSuggestion();
        }
        return;
      case 'Escape':
        if (showSuggestions) {
          setShowSuggestions(false);
        } else {
          setInputCommand('');
          setAutoSuggestion(null);
        }
        return;
    }

    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      handleCommand('clear');
    }
  };

  useEffect(() => {
    setTerminalOutput(displayHelp());
    if (inputRef.current) {
      inputRef.current.focus();
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(target) &&
        !inputRef.current?.contains(target) &&
        !target.closest('[data-mobile-action]')
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      const { scrollHeight, clientHeight } = terminalRef.current;
      if (scrollHeight > clientHeight) {
        terminalRef.current.scrollTop = scrollHeight - clientHeight;
      }
    }
  }, [terminalOutput]);

  useEffect(() => {
    return () => {
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
      }
    };
  }, []);

  return (
    <section className="w-full bg-black flex flex-col flex-1 overflow-hidden p-4">
      <div
        ref={terminalRef}
        className="bg-black flex-1 overflow-y-auto overflow-x-hidden mb-4 text-sm terminal-scroll"
      >
        {terminalOutput.map((line, index) => (
          <div key={index} className="group flex items-start hover:bg-white/5 px-2 py-0.5 -mx-2 rounded">
            <p className={`font-mono ${getLineColor(line.type)} flex-1 break-words`}>
              {line.type === 'spinner' ? (
                <span className="inline-flex items-center gap-2">
                  <span className="ai-spinner" />
                  <span style={{ color: '#888' }}>{line.content}</span>
                </span>
              ) : line.helpEntry ? (
                <span className="inline-flex items-center gap-3">
                  {suggestions[line.helpEntry.commandIndex].icon}
                  <span style={{ color: '#00FF41' }}>{suggestions[line.helpEntry.commandIndex].command}</span>
                  <span style={{ color: '#555' }}>-</span>
                  <span className="text-gray-400">{suggestions[line.helpEntry.commandIndex].description}</span>
                </span>
              ) : line.isHtml ? (
                <span
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(line.content, { ADD_ATTR: ['target'] }),
                  }}
                />
              ) : (
                line.content
              )}
            </p>
            <span className="text-xs mr-2 opacity-0 group-hover:opacity-100 select-none" style={{ color: '#555' }}>
              {line.timestamp}
            </span>
          </div>
        ))}
      </div>
      <div className="relative">
        <div className="flex items-center space-x-2 w-full bg-black p-2" style={{ border: '1px solid #333' }}>
          <ChevronRight className="w-5 h-5" style={{ color: '#00FF41' }} />
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputCommand}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="bg-transparent font-mono text-sm w-full focus:outline-none relative z-10"
              style={{ color: '#00FF41' }}
              placeholder={isMobile ? "Press Tab for suggestions..." : "Type a command or press Tab for suggestions..."}
              inputMode={isMobile ? "none" : undefined}
              autoCapitalize="none"
              spellCheck={false}
              autoComplete="off"
            />
            <AutoSuggestion
              inputCommand={inputCommand}
              suggestion={autoSuggestion}
            />
          </div>
          <button
            onClick={() => handleCommand(inputCommand)}
            className="p-1.5 rounded hover:opacity-80 transition-opacity"
            style={{ background: '#222', color: '#00FF41' }}
          >
            <Code2 className="w-4 h-4" />
          </button>
        </div>
        {showSuggestions && (
          <Suggestions
            ref={suggestionsRef}
            suggestions={suggestions}
            selectedIndex={selectedSuggestionIndex}
            onSelect={(command) => {
              setShowSuggestions(false);
              handleCommand(command);
              inputRef.current?.focus();
            }}
            onMouseEnter={setSelectedSuggestionIndex}
          />
        )}
      </div>
    </section>
  );
});

const getLineColor = (type: string): string => {
  switch (type) {
    case 'input': return 'text-[#00FF41]';
    case 'output': return 'text-gray-200';
    case 'error': return 'text-red-400';
    case 'spinner': return 'text-[#00FF41]';
    default: return 'text-white';
  }
};

Terminal.displayName = 'Terminal';

export default Terminal;
