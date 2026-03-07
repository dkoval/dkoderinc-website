import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { ChevronRight } from 'lucide-react';
import DOMPurify from 'dompurify';
import { suggestions, commands } from './commands';
import { TerminalLine } from './types';
import Suggestions from './Suggestions';
import AutoSuggestion from './AutoSuggestion';
import { PAGE_LOAD_TIME, formatUptime } from '../../constants';
import { useTheme, ThemeName, VALID_THEMES } from '../../ThemeContext';

const MAX_HISTORY = 50;
const PURIFY_CONFIG = { ADD_ATTR: ['target', 'style'], ADD_TAGS: ['svg', 'path', 'rect', 'circle', 'polyline'] };

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
  const { theme, setTheme } = useTheme();
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
  const spinnerTimeouts = useRef(new Set<ReturnType<typeof setTimeout>>());
  const spinnerIdRef = useRef(0);
  const touchStartY = useRef<number | null>(null);

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
      { content: 'Available commands:', type: 'output' as const },
      ...suggestions.map((_, i) => ({
        content: '',
        type: 'output' as const,
        helpEntry: { commandIndex: i },
      })),
      { content: '', type: 'output' as const },
      { content: 'Tips:', type: 'output' as const },
      { content: '  • Use ↑↓ arrows to navigate command history', type: 'output' as const },
      { content: '  • Tab for autocomplete', type: 'output' as const },
      { content: '  • Ctrl+L to clear', type: 'output' as const },
    ];
  };

  const updateAutoSuggestion = (input: string) => {
    if (!input) {
      setAutoSuggestion(null);
      return;
    }

    // Suggest theme arguments: "theme gr" → "theme gruvbox"
    const lower = input.toLowerCase();
    if (lower.startsWith('theme ') && lower.length > 6) {
      const partial = lower.slice(6);
      const match = VALID_THEMES.find(t => t.startsWith(partial));
      if (match) {
        setAutoSuggestion(`theme ${match}`);
        return;
      }
    }

    const matchingCommand = suggestions
      .map(s => s.command)
      .find(cmd => cmd.toLowerCase().startsWith(lower));

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

    // Add input line + spinner with unique ID
    const currentSpinnerId = ++spinnerIdRef.current;
    const inputLine: TerminalLine = {
      content: `$ ${trimmedCmd}`,
      type: 'input',
      timestamp: getCurrentTime(),
    };
    const spinnerLine: TerminalLine = {
      content: 'processing query...',
      type: 'spinner',
      spinnerId: currentSpinnerId,
    };

    setTerminalOutput(prev => [...prev, inputLine, spinnerLine]);
    setCommandHistory(prev => [...prev, trimmedCmd].slice(-MAX_HISTORY));
    setHistoryIndex(-1);
    setInputCommand('');
    setAutoSuggestion(null);

    // After delay, replace this specific spinner with real output
    const timeoutId = setTimeout(() => {
      spinnerTimeouts.current.delete(timeoutId);
      let outputLines: TerminalLine[];

      if (trimmedCmd === 'whoami') {
        const key = isMobile ? 'whoami' : 'whoamiDesktop';
        outputLines = commands[key].map(line => ({
          content: line,
          type: 'output' as const,
        }));
      } else if (trimmedCmd === 'uptime') {
        const seconds = Math.floor((Date.now() - PAGE_LOAD_TIME) / 1000);
        const timeStr = getCurrentTime();
        const base = (Date.now() % 100) / 100;
        const load1 = (0.3 + base * 0.4).toFixed(2);
        const load5 = (0.2 + base * 0.25).toFixed(2);
        const load15 = (0.05 + base * 0.15).toFixed(2);
        outputLines = [
          { content: ` ${timeStr} up ${formatUptime(seconds)},  1 user,  load average: ${load1}, ${load5}, ${load15}`, type: 'output' },
        ];
      } else if (trimmedCmd === 'theme' || trimmedCmd.startsWith('theme ')) {
        const arg = trimmedCmd.replace('theme', '').trim();
        if (!arg) {
          outputLines = [
            { content: `Current theme: ${theme}`, type: 'output' },
            { content: `Available: ${VALID_THEMES.join(', ')}`, type: 'output' },
            { content: `Usage: theme <name>`, type: 'output' },
          ];
        } else if (VALID_THEMES.includes(arg as ThemeName)) {
          const isGruvboxFirstTime = arg === 'gruvbox' && !localStorage.getItem('dkoder-gruvbox-seen');
          setTheme(arg as ThemeName);
          if (isGruvboxFirstTime) {
            localStorage.setItem('dkoder-gruvbox-seen', '1');
            outputLines = [
              { content: 'Monitor upgrade detected. Welcome to the 21st century.', type: 'output' },
            ];
          } else {
            outputLines = [
              { content: `Theme switched to ${arg}.`, type: 'output' },
            ];
          }
        } else {
          outputLines = [
            { content: `Unknown theme: ${arg}. Available: ${VALID_THEMES.join(', ')}`, type: 'error' },
          ];
        }
      } else {
        const output = commands[trimmedCmd as keyof typeof commands] || `Command not found: ${cmd}`;
        outputLines = Array.isArray(output)
          ? output.map(line => ({
              content: line,
              type: 'output' as const,
              isHtml: trimmedCmd === 'contact' || trimmedCmd === 'man dmytro',
            }))
          : [{
              content: output,
              type: output.startsWith('Command not found') ? 'error' as const : 'output' as const,
            }];
      }

      // Replace this specific spinner line with real output
      setTerminalOutput(prev => {
        const spinnerIndex = prev.findIndex(l => l.type === 'spinner' && l.spinnerId === currentSpinnerId);
        if (spinnerIndex === -1) return [...prev, ...outputLines];
        return [...prev.slice(0, spinnerIndex), ...outputLines, ...prev.slice(spinnerIndex + 1)];
      });
    }, 600);
    spinnerTimeouts.current.add(timeoutId);
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
      spinnerTimeouts.current.forEach(clearTimeout);
      spinnerTimeouts.current.clear();
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    touchStartY.current = null;
    if (Math.abs(deltaY) < 50) return;
    if (deltaY > 0) {
      actionUp();
    } else {
      actionDown();
    }
  };

  return (
    <section className="w-full flex flex-col flex-1 overflow-hidden p-4 terminal-glow crt-flicker" style={{ background: 'var(--terminal-bg)' }}>
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto overflow-x-hidden mb-4 text-sm terminal-scroll"
        style={{ background: 'var(--terminal-bg)' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {terminalOutput.map((line, index) => (
          <div key={index} className="group flex items-start hover:bg-white/5 px-2 py-0.5 -mx-2 rounded">
            <p
              className="font-mono flex-1 break-words"
              style={
                line.type === 'input' ? { color: 'var(--terminal-primary)' } :
                line.type === 'error' ? { color: 'var(--terminal-error)' } :
                { color: 'var(--terminal-output)' }
              }
            >
              {line.type === 'spinner' ? (
                <span className="inline-flex items-center gap-2">
                  <span className="ai-spinner" />
                  <span style={{ color: 'var(--terminal-gray)' }}>{line.content}</span>
                </span>
              ) : line.helpEntry ? (
                <span className="inline-flex items-center gap-3">
                  {suggestions[line.helpEntry.commandIndex].icon}
                  <span style={{ color: 'var(--terminal-primary)' }}>{suggestions[line.helpEntry.commandIndex].command}</span>
                  <span style={{ color: 'var(--terminal-primary-dark)' }}>-</span>
                  <span style={{ color: 'var(--terminal-gray)' }}>{suggestions[line.helpEntry.commandIndex].description}</span>
                </span>
              ) : line.isHtml ? (
                <span
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(line.content, PURIFY_CONFIG),
                  }}
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
      </div>
      <div className="relative">
        <div className="flex items-center space-x-2 w-full p-2" style={{ background: 'var(--terminal-bg)', border: '1px solid var(--terminal-border)' }}>
          <ChevronRight className="w-5 h-5" style={{ color: 'var(--terminal-primary)' }} />
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputCommand}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="bg-transparent font-mono text-sm w-full focus:outline-none relative z-10"
              style={{ color: 'var(--terminal-primary)' }}
              placeholder={isMobile ? "Tap Cmds for suggestions..." : "Type a command or press Tab for suggestions..."}
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

Terminal.displayName = 'Terminal';

export default Terminal;
