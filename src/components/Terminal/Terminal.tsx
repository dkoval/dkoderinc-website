import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import DOMPurify from 'dompurify';
import { suggestions, commands } from './commands';
import { TerminalLine } from './types';
import Suggestions from './Suggestions';
import AutoSuggestion from './AutoSuggestion';
import { PAGE_LOAD_TIME, formatUptime } from '../../constants';
import { useTheme, ThemeName, VALID_THEMES } from '../../ThemeContext';
import useIsMobile from '../../hooks/useIsMobile';

const MAX_HISTORY = 50;
const PURIFY_CONFIG = { ADD_ATTR: ['target', 'style'], ADD_TAGS: ['svg', 'path', 'rect', 'circle', 'polyline'] };
const THEME_EASTER_EGGS: Partial<Record<ThemeName, string>> = {
  'tokyo-night': 'Welcome to Neo-Tokyo. The night shift begins.',
  'one-dark-pro': 'Dark mode activated. Your eyes will thank you.',
};

export type TerminalHandle = {
  handleMobileAction: (action: 'tab' | 'up' | 'down' | 'enter') => void;
};

type TerminalProps = {
  onShutdown?: () => void;
  onBell?: () => void;
  playSound?: (sound: 'keypress' | 'execute' | 'error' | 'themeSwitch' | 'boot') => void;
  soundEnabled?: boolean;
  onSoundSet?: (enabled: boolean) => void;
  onRevealStateChange?: (isRevealing: boolean) => void;
};

const Terminal = forwardRef<TerminalHandle, TerminalProps>(({ onShutdown, onBell, playSound, soundEnabled, onSoundSet, onRevealStateChange }, ref) => {
  const isMobile = useIsMobile();
  const promptPrefix = '~ $ ';
  const { theme, setTheme } = useTheme();
  const [terminalOutput, setTerminalOutput] = useState<TerminalLine[]>([]);
  const [inputCommand, setInputCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [suggestionMode, setSuggestionMode] = useState<'commands' | 'themes'>('commands');
  const [autoSuggestion, setAutoSuggestion] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const suppressHoverRef = useRef(false);
  const spinnerTimeouts = useRef(new Set<ReturnType<typeof setTimeout>>());
  const spinnerIdRef = useRef(0);
  const touchStartY = useRef<number | null>(null);
  const pendingExecuteRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [revealingLines, setRevealingLines] = useState<TerminalLine[] | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const revealRafRef = useRef<number>(0);
  const revealLastTimeRef = useRef<number>(0);
  const revealStartIndexRef = useRef<number>(0);
  const isInputBlocked = revealingLines !== null;

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
      { content: `${promptPrefix}help`, type: 'input' as const, timestamp: getCurrentTime() },
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

    // Suggest theme arguments: "theme tok" → "theme tokyo-night"
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
    if (isInputBlocked) return;
    if (pendingExecuteRef.current) {
      clearTimeout(pendingExecuteRef.current);
      pendingExecuteRef.current = null;
    }
    const value = e.target.value;
    setInputCommand(value);
    playSound?.('keypress');
    updateAutoSuggestion(value);
    setShowSuggestions(false);
    setSuggestionMode('commands');
  };

  const handleCommand = (cmd: string) => {
    if (isInputBlocked) return;
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
        { content: `${promptPrefix}${trimmedCmd}`, type: 'input', timestamp: getCurrentTime() },
      ]);
      setInputCommand('');
      setAutoSuggestion(null);
      onShutdown?.();
      return;
    }

    // Add input line + spinner with unique ID
    const currentSpinnerId = ++spinnerIdRef.current;
    const inputLine: TerminalLine = {
      content: `${promptPrefix}${trimmedCmd}`,
      type: 'input',
      timestamp: getCurrentTime(),
    };
    const spinnerLine: TerminalLine = {
      content: 'processing query...',
      type: 'spinner',
      spinnerId: currentSpinnerId,
    };

    setTerminalOutput(prev => [...prev, inputLine, spinnerLine]);
    playSound?.('execute');
    setCommandHistory(prev => [...prev, trimmedCmd].slice(-MAX_HISTORY));
    setHistoryIndex(-1);
    setInputCommand('');
    setAutoSuggestion(null);

    const startTime = performance.now();

    // After delay, replace this specific spinner with real output
    const timeoutId = setTimeout(() => {
      spinnerTimeouts.current.delete(timeoutId);
      let outputLines: TerminalLine[];

      // Commands with mobile/desktop output variants
      const RESPONSIVE_COMMANDS: Record<string, { mobile: string; desktop: string }> = {
        whoami: { mobile: 'whoami', desktop: 'whoamiDesktop' },
        skills: { mobile: 'skillsMobile', desktop: 'skills' },
      };

      if (trimmedCmd in RESPONSIVE_COMMANDS) {
        const variant = RESPONSIVE_COMMANDS[trimmedCmd];
        const key = isMobile ? variant.mobile : variant.desktop;
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
          const eggMessage = THEME_EASTER_EGGS[arg as ThemeName];
          const eggKey = `dkoder-${arg}-seen`;
          const isFirstTime = eggMessage && !localStorage.getItem(eggKey);
          setTheme(arg as ThemeName);
          playSound?.('themeSwitch');
          if (isFirstTime) {
            localStorage.setItem(eggKey, '1');
            outputLines = [
              { content: eggMessage, type: 'output' },
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
      } else if (trimmedCmd === 'sound' || trimmedCmd === 'sound on' || trimmedCmd === 'sound off') {
        const wantOn = trimmedCmd === 'sound' ? !soundEnabled : trimmedCmd === 'sound on';
        onSoundSet?.(wantOn);
        outputLines = [
          { content: `Sound ${wantOn ? 'enabled' : 'disabled'}.`, type: 'output' },
        ];
      } else {
        const output = commands[trimmedCmd as keyof typeof commands] || `Command not found: ${cmd}`;
        if (typeof output === 'string' && output.startsWith('Command not found')) {
          onBell?.();
          playSound?.('error');
        }
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

      // Append timing line (exclude theme commands — they have phosphor transition feedback)
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
      const showTiming = !trimmedCmd.startsWith('theme');
      const timingLine: TerminalLine = { content: `took ${elapsed}s`, type: 'timing' };
      const newLines = showTiming ? [...outputLines, timingLine] : outputLines;

      // Progressive reveal for multi-line outputs
      const shouldAnimate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        && newLines.length > 1;

      if (shouldAnimate) {
        // Remove spinner, then start reveal
        setTerminalOutput(prev => {
          const spinnerIndex = prev.findIndex(l => l.type === 'spinner' && l.spinnerId === currentSpinnerId);
          if (spinnerIndex === -1) return prev;
          const withoutSpinner = [...prev.slice(0, spinnerIndex), ...prev.slice(spinnerIndex + 1)];
          revealStartIndexRef.current = withoutSpinner.length;
          return withoutSpinner;
        });
        setRevealingLines(newLines);
        setRevealedCount(0);
      } else {
        // Instant reveal (single-line outputs, reduced motion)
        setTerminalOutput(prev => {
          const spinnerIndex = prev.findIndex(l => l.type === 'spinner' && l.spinnerId === currentSpinnerId);
          if (spinnerIndex === -1) return [...prev, ...newLines];
          return [...prev.slice(0, spinnerIndex), ...newLines, ...prev.slice(spinnerIndex + 1)];
        });
      }
    }, 600);
    spinnerTimeouts.current.add(timeoutId);
  };

  const executeWithPreview = (command: string) => {
    setShowSuggestions(false);
    setSelectedSuggestionIndex(0);
    setInputCommand(command);
    setAutoSuggestion(null);
    inputRef.current?.focus();
    if (pendingExecuteRef.current) {
      clearTimeout(pendingExecuteRef.current);
      pendingExecuteRef.current = null;
    }
    pendingExecuteRef.current = setTimeout(() => {
      pendingExecuteRef.current = null;
      handleCommand(command);
    }, 300);
  };

  const backToCommands = () => {
    setSuggestionMode('commands');
    setSelectedSuggestionIndex(suggestions.findIndex(s => s.command === 'theme'));
  };

  const selectSuggestion = (index: number) => {
    if (suggestionMode === 'commands') {
      const selectedCommand = suggestions[index].command;
      if (selectedCommand === 'theme') {
        setSuggestionMode('themes');
        setSelectedSuggestionIndex(0);
        return;
      }
      executeWithPreview(selectedCommand);
    } else {
      const selectedTheme = VALID_THEMES[index];
      setSuggestionMode('commands');
      setSelectedSuggestionIndex(0);
      executeWithPreview(`theme ${selectedTheme}`);
    }
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
      selectSuggestion(selectedSuggestionIndex);
    } else if (autoSuggestion) {
      completeAutoSuggestion();
    } else {
      setSuggestionMode('commands');
      setShowSuggestions(true);
      setSelectedSuggestionIndex(0);
      suppressHoverRef.current = true;
      setTimeout(() => { suppressHoverRef.current = false; }, 100);
    }
  };

  const actionUp = () => {
    if (showSuggestions) {
      const len = suggestionMode === 'themes' ? VALID_THEMES.length : suggestions.length;
      setSelectedSuggestionIndex((prev) =>
        prev > 0 ? prev - 1 : len - 1
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
      const len = suggestionMode === 'themes' ? VALID_THEMES.length : suggestions.length;
      setSelectedSuggestionIndex((prev) =>
        prev < len - 1 ? prev + 1 : 0
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
      selectSuggestion(selectedSuggestionIndex);
    } else {
      handleCommand(inputCommand);
    }
  };

  useImperativeHandle(ref, () => ({
    handleMobileAction: (action: 'tab' | 'up' | 'down' | 'enter') => {
      if (isInputBlocked) return;
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
    if (isInputBlocked) { e.preventDefault(); return; }
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
        if (showSuggestions && suggestionMode === 'themes') {
          backToCommands();
        } else if (showSuggestions) {
          setShowSuggestions(false);
          setSelectedSuggestionIndex(0);
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
        setSuggestionMode('commands');
        setSelectedSuggestionIndex(0);
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
    const sentinel = sentinelRef.current;
    const container = terminalRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShowScrollIndicator(!entry.isIntersecting),
      { root: container, threshold: 0, rootMargin: '20px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [terminalOutput]);

  useEffect(() => {
    return () => {
      spinnerTimeouts.current.forEach(clearTimeout);
      spinnerTimeouts.current.clear();
      if (pendingExecuteRef.current) clearTimeout(pendingExecuteRef.current);
      cancelAnimationFrame(revealRafRef.current);
    };
  }, []);

  // Progressive reveal animation
  useEffect(() => {
    if (!revealingLines || revealingLines.length === 0) return;

    if (revealedCount >= revealingLines.length) {
      setRevealingLines(null);
      return;
    }

    revealLastTimeRef.current = 0;

    const step = (timestamp: number) => {
      if (!revealLastTimeRef.current) revealLastTimeRef.current = timestamp;
      if (timestamp - revealLastTimeRef.current >= 10) {
        revealLastTimeRef.current = timestamp;
        setRevealedCount(prev => prev + 1);
        setTerminalOutput(prev => [...prev, revealingLines[revealedCount]]);
        return; // State change will re-trigger this effect for the next line
      }
      // Keep polling until 10ms elapses
      revealRafRef.current = requestAnimationFrame(step);
    };

    revealRafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(revealRafRef.current);
  }, [revealingLines, revealedCount]);

  // Notify parent of reveal state changes
  useEffect(() => {
    onRevealStateChange?.(isInputBlocked);
  }, [revealingLines, onRevealStateChange]);

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
    <section className="w-full flex flex-col flex-1 overflow-hidden p-4 terminal-glow crt-breathe" style={{ background: 'var(--terminal-bg)' }}>
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto overflow-x-hidden mb-4 text-sm terminal-scroll"
        style={{ background: 'var(--terminal-bg)' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {terminalOutput.map((line, index) => (
          <div key={index} className={`group flex items-start hover:bg-white/5 px-2 py-0.5 -mx-2 rounded ${
            isInputBlocked && index >= revealStartIndexRef.current ? 'line-reveal' : ''
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
        <div ref={sentinelRef} className="h-px" />
        <div
          className="scroll-indicator font-mono"
          style={{
            color: 'var(--terminal-primary-dim)',
            opacity: showScrollIndicator ? 0.6 : 0,
            fontSize: '0.75rem',
            padding: '2px 0',
            background: 'var(--terminal-bg)',
          }}
        >
          ▼ more
        </div>
      </div>
      <div className="relative">
        <div className={`flex items-center space-x-2 w-full p-2 ${isInputBlocked ? 'input-blocked' : ''}`} style={{ background: 'var(--terminal-bg)', border: '1px solid var(--terminal-border)' }}>
          <span className="font-mono text-sm shrink-0 select-none">
            <span style={{ color: 'var(--terminal-primary-dim)' }}>~ </span>
            <span style={{ color: 'var(--terminal-primary)' }}>$ </span>
          </span>
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputCommand}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="bg-transparent font-mono text-sm w-full focus:outline-none relative z-10 caret-transparent"
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
            <span
              className="terminal-cursor font-mono text-sm pointer-events-none absolute top-0 left-0 z-0"
              style={{ color: 'var(--terminal-primary)', paddingLeft: `${inputCommand.length}ch` }}
              aria-hidden="true"
            >
              ▌
            </span>
          </div>
        </div>
        {showSuggestions && (
          <Suggestions
            ref={suggestionsRef}
            suggestions={suggestions}
            selectedIndex={selectedSuggestionIndex}
            onSelect={selectSuggestion}
            onMouseEnter={(i) => { if (!suppressHoverRef.current) setSelectedSuggestionIndex(i); }}
            mode={suggestionMode}
            themes={VALID_THEMES}
            currentTheme={theme}
            onBack={backToCommands}
          />
        )}
      </div>
    </section>
  );
});

Terminal.displayName = 'Terminal';

export default Terminal;
