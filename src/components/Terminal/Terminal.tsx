import { useState, useEffect, useRef, useImperativeHandle, useMemo, useCallback, ChangeEvent, KeyboardEvent, Ref } from 'react';
import type DOMPurifyType from 'dompurify';
import { suggestions, commands } from './commands';
import { Volume2, VolumeX } from 'lucide-react';
import { TerminalLine } from './types';
import Suggestions from './Suggestions';
import TerminalOutput from './TerminalOutput';
import TerminalInput from './TerminalInput';
import { PAGE_LOAD_TIME, formatUptime, hexToRgba } from '../../constants';
import { useTheme, ThemeName, VALID_THEMES } from '../../ThemeContext';
import useIsMobile from '../../hooks/useIsMobile';
import { SoundType } from '../../hooks/useSoundEngine';
import useIdleTimer from '../../hooks/useIdleTimer';
import MatrixRain, { RainColors } from './MatrixRain';

const MAX_HISTORY = 50;
export const MAX_OUTPUT = 500;

export const appendOutput = (prev: TerminalLine[], ...lines: TerminalLine[]): TerminalLine[] =>
  [...prev, ...lines].slice(-MAX_OUTPUT);
const PURIFY_CONFIG = { ADD_ATTR: ['target', 'style'], ADD_TAGS: ['svg', 'path', 'rect', 'circle', 'polyline'] };
const THEME_EASTER_EGGS: Partial<Record<ThemeName, string>> = {
  'tokyo-night': 'Welcome to Neo-Tokyo. The night shift begins.',
  'one-dark-pro': 'Dark mode activated. Your eyes will thank you.',
};

const THEME_HEX_COLORS: Record<ThemeName, string> = {
  green: '#00FF41',
  amber: '#FFB000',
  'tokyo-night': '#7aa2f7',
  'one-dark-pro': '#61AFEF',
};

const THEME_RAIN_COLORS: Record<ThemeName, RainColors> = {
  green: { primary: '#00FF41', primaryDim: '#00CC33', bg: '#0D0208' },
  amber: { primary: '#FFB000', primaryDim: '#CC8C00', bg: '#0A0600' },
  'tokyo-night': { primary: '#7AA2F7', primaryDim: '#565F89', bg: '#1A1B26' },
  'one-dark-pro': { primary: '#61AFEF', primaryDim: '#5C6370', bg: '#282C34' },
};

const HEX_RADIUS = 5;
const HEX_TILE_W = Math.sqrt(3) * HEX_RADIUS;
const HEX_TILE_H = 3 * HEX_RADIUS;
const HEX_TILE_W_STR = HEX_TILE_W.toFixed(2);
const HEX_TILE_H_STR = HEX_TILE_H.toFixed(2);

function hexPoints(r: number, cx: number, cy: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

function buildHexPatternUri(color: string, opacity: number): string {
  const r = HEX_RADIUS;
  const w = HEX_TILE_W;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${HEX_TILE_W_STR}" height="${HEX_TILE_H_STR}"><polygon points="${hexPoints(r, w / 2, r)}" fill="none" stroke="${color}" stroke-width="0.4" opacity="${opacity}"/><polygon points="${hexPoints(r, 0, r * 2.5)}" fill="none" stroke="${color}" stroke-width="0.4" opacity="${opacity}"/><polygon points="${hexPoints(r, w, r * 2.5)}" fill="none" stroke="${color}" stroke-width="0.4" opacity="${opacity}"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

const THEME_HEX_URIS: Record<ThemeName, string> = Object.fromEntries(
  Object.entries(THEME_HEX_COLORS).map(([t, c]) => [t, buildHexPatternUri(c, 0.3)])
) as Record<ThemeName, string>;

let purifyInstance: typeof DOMPurifyType | null = null;

const sanitizeHtml = async (content: string): Promise<string> => {
  if (!purifyInstance) {
    try {
      const mod = await import('dompurify');
      purifyInstance = mod.default;
    } catch {
      return content.replace(/<[^>]*>/g, '');
    }
  }
  return purifyInstance.sanitize(content, PURIFY_CONFIG);
};

const getCurrentTime = () =>
  new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const RESPONSIVE_COMMANDS: Record<string, { mobile: string; desktop: string }> = {
  whoami: { mobile: 'whoami', desktop: 'whoamiDesktop' },
  skills: { mobile: 'skillsMobile', desktop: 'skills' },
};

export type TerminalHandle = {
  handleMobileAction: (action: 'up' | 'down') => void;
};

type TerminalProps = {
  onShutdown?: () => void;
  onBell?: () => void;
  playSound?: (sound: SoundType) => void;
  soundEnabled?: boolean;
  onSoundSet?: (enabled: boolean) => void;
  onRevealStateChange?: (isRevealing: boolean) => void;
  bootComplete?: boolean;
  ref?: Ref<TerminalHandle>;
};

const Terminal = ({ onShutdown, onBell, playSound, soundEnabled, onSoundSet, onRevealStateChange, bootComplete, ref }: TerminalProps) => {
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
  const motdDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const motdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const motdAnimatingRef = useRef(false);

  const pendingExecuteRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [revealingLines, setRevealingLines] = useState<TerminalLine[] | null>(null);
  const revealRafRef = useRef<number>(0);
  const revealStartIndexRef = useRef<number>(0);
  const isInputBlocked = revealingLines !== null;

  const themeRef = useRef(theme);
  const soundEnabledRef = useRef(soundEnabled);
  const isMobileRef = useRef(isMobile);
  const inputCommandRef = useRef(inputCommand);
  const showSuggestionsRef = useRef(showSuggestions);
  const selectedSuggestionIndexRef = useRef(selectedSuggestionIndex);
  const suggestionModeRef = useRef(suggestionMode);
  const autoSuggestionRef = useRef(autoSuggestion);
  const historyIndexRef = useRef(historyIndex);
  const commandHistoryRef = useRef(commandHistory);
  const isInputBlockedRef = useRef(isInputBlocked);

  themeRef.current = theme;
  soundEnabledRef.current = soundEnabled;
  isMobileRef.current = isMobile;
  inputCommandRef.current = inputCommand;
  showSuggestionsRef.current = showSuggestions;
  selectedSuggestionIndexRef.current = selectedSuggestionIndex;
  suggestionModeRef.current = suggestionMode;
  autoSuggestionRef.current = autoSuggestion;
  historyIndexRef.current = historyIndex;
  commandHistoryRef.current = commandHistory;
  isInputBlockedRef.current = isInputBlocked;

  const playSoundRef = useRef(playSound);
  const onShutdownRef = useRef(onShutdown);
  const onBellRef = useRef(onBell);
  const onSoundSetRef = useRef(onSoundSet);

  playSoundRef.current = playSound;
  onShutdownRef.current = onShutdown;
  onBellRef.current = onBell;
  onSoundSetRef.current = onSoundSet;

  const displaySuggestions = useMemo(() => suggestions.map(s =>
    s.command === 'sound'
      ? { ...s, icon: soundEnabled
          ? <Volume2 className="w-4 h-4" style={{ color: 'var(--terminal-primary)' }} />
          : <VolumeX className="w-4 h-4" style={{ color: 'var(--terminal-primary)' }} />
        }
      : s
  ), [soundEnabled]);

  const filteredSuggestions = useMemo(() => {
    if (suggestionMode === 'themes') return displaySuggestions;
    const trimmed = inputCommand.trim().toLowerCase();
    if (!trimmed) return displaySuggestions;
    return displaySuggestions.filter(s =>
      s.command.toLowerCase().startsWith(trimmed)
    );
  }, [displaySuggestions, inputCommand, suggestionMode]);

  const filteredSuggestionsRef = useRef(filteredSuggestions);
  filteredSuggestionsRef.current = filteredSuggestions;

  const filteredLengthRef = useRef(filteredSuggestions.length);
  filteredLengthRef.current = filteredSuggestions.length;

  const hexBgStyle = useMemo(() => {
    const mask = 'radial-gradient(ellipse at 50% 45%, black 15%, transparent 65%)';
    return {
      backgroundImage: `radial-gradient(ellipse at 50% 45%, ${hexToRgba(THEME_HEX_COLORS[theme], 0.12)} 0%, transparent 60%), url("${THEME_HEX_URIS[theme]}")`,
      backgroundSize: `100% 100%, ${HEX_TILE_W_STR}px ${HEX_TILE_H_STR}px`,
      backgroundRepeat: 'no-repeat, repeat',
      WebkitMaskImage: mask,
      maskImage: mask,
    };
  }, [theme]);

  // Read once — this preference almost never changes mid-session
  const [reducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const sectionRef = useRef<HTMLDivElement>(null);
  const isIdle = useIdleTimer({
    containerRef: sectionRef,
    paused: isInputBlocked || isMobile || reducedMotion,
  });
  const [showRain, setShowRain] = useState(false);
  const [rainVisible, setRainVisible] = useState(false);

  useEffect(() => {
    let rafId: number;
    if (isIdle && !isMobile && !reducedMotion) {
      setShowRain(true);
      // Trigger fade-in on next frame so CSS transition fires
      rafId = requestAnimationFrame(() => setRainVisible(true));
    } else {
      setRainVisible(false);
      // showRain is cleared by onFadeOutComplete callback
    }
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [isIdle, isMobile, reducedMotion]);

  const handleRainFadeOutComplete = () => {
    setShowRain(false);
  };

  // Plain-text MOTD hints (used by typing animation; HTML version derived below)
  const motdPlainText = isMobile
    ? "Type 'help' or tap the prompt to explore."
    : "Type 'help' or press Tab to explore.";

  const displayMotd = useCallback((): TerminalLine[] => {
    const hint = isMobileRef.current
      ? 'Type <span style="color: var(--terminal-primary)">\'help\'</span> or <span style="color: var(--terminal-primary)">tap the prompt</span> to explore.'
      : 'Type <span style="color: var(--terminal-primary)">\'help\'</span> or press <span style="color: var(--terminal-primary)">Tab</span> to explore.';
    return [
      { content: `<span style="color: var(--terminal-gray)">${hint}</span>`, type: 'output' as const, isHtml: true },
    ];
  }, []);

  const cancelMotdAnimation = useCallback(() => {
    if (!motdAnimatingRef.current) return;
    motdAnimatingRef.current = false;
    if (motdDelayRef.current) { clearTimeout(motdDelayRef.current); motdDelayRef.current = null; }
    if (motdIntervalRef.current) { clearInterval(motdIntervalRef.current); motdIntervalRef.current = null; }
    setTerminalOutput(displayMotd());
  }, [displayMotd]);

  const displayHelp = useCallback(() => {
    return [
      { content: `${promptPrefix}help`, type: 'input' as const, timestamp: getCurrentTime() },
      { content: 'Available commands:', type: 'output' as const },
      ...suggestions.map(s => ({
        content: '',
        type: 'output' as const,
        helpEntry: { command: s.command, description: s.description, icon: s.icon },
      })),
      { content: '', type: 'output' as const },
      { content: 'Tips:', type: 'output' as const },
      { content: '  • Use ↑↓ arrows to navigate command history', type: 'output' as const },
      { content: '  • Tab for autocomplete', type: 'output' as const },
      { content: '  • Ctrl+L to clear', type: 'output' as const },
    ];
  }, []);

  const updateAutoSuggestion = useCallback((input: string) => {
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

    // Suggest sound arguments: "sound o" → "sound on" / "sound of" → "sound off"
    if (lower.startsWith('sound ') && lower.length > 6) {
      const partial = lower.slice(6);
      const match = ['on', 'off'].find(s => s.startsWith(partial));
      if (match) {
        setAutoSuggestion(`sound ${match}`);
        return;
      }
    }

    const matchingCommand = suggestions
      .map(s => s.command)
      .find(cmd => cmd.toLowerCase().startsWith(lower));

    setAutoSuggestion(matchingCommand || null);
  }, []);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (isInputBlockedRef.current) return;
    cancelMotdAnimation();
    if (pendingExecuteRef.current) {
      clearTimeout(pendingExecuteRef.current);
      pendingExecuteRef.current = null;
    }
    const value = e.target.value;
    setInputCommand(value);
    playSoundRef.current?.('keypress');
    updateAutoSuggestion(value);

    // Show/hide suggestions based on input
    const trimmed = value.trim().toLowerCase();
    if (trimmed === '') {
      // Backspaced to empty — re-open full list
      setShowSuggestions(true);
      setSuggestionMode('commands');
      setSelectedSuggestionIndex(0);
    } else {
      // Check if any commands match
      const hasMatches = suggestions.some(s =>
        s.command.toLowerCase().startsWith(trimmed)
      );
      setShowSuggestions(hasMatches);
      if (hasMatches) {
        setSuggestionMode('commands');
        setSelectedSuggestionIndex(0);
      }
    }
  }, [cancelMotdAnimation, updateAutoSuggestion]);

  const handleInputFocus = useCallback(() => {
    if (inputCommandRef.current.trim() === '') {
      setShowSuggestions(true);
      setSuggestionMode('commands');
      setSelectedSuggestionIndex(0);
    }
  }, []);

  const handleInputClick = useCallback(() => {
    if (inputCommandRef.current.trim() === '' && !showSuggestionsRef.current) {
      setShowSuggestions(true);
      setSuggestionMode('commands');
      setSelectedSuggestionIndex(0);
    }
  }, []);

  const handleCommand = useCallback((cmd: string) => {
    if (isInputBlockedRef.current) return;
    cancelMotdAnimation();
    setShowSuggestions(false);
    const trimmedCmd = cmd.trim().toLowerCase();

    if (trimmedCmd === '') return;

    if (trimmedCmd === 'help') {
      setTerminalOutput(prev => appendOutput(prev, ...displayHelp()));
      setCommandHistory(prev => [...prev, trimmedCmd].slice(-MAX_HISTORY));
      setHistoryIndex(-1);
      setInputCommand('');
      setAutoSuggestion(null);
      return;
    }

    if (trimmedCmd === 'clear') {
      setTerminalOutput(displayMotd());
      setInputCommand('');
      setAutoSuggestion(null);
      return;
    }

    if (trimmedCmd === 'exit') {
      setTerminalOutput(prev => appendOutput(prev,
        { content: `${promptPrefix}${trimmedCmd}`, type: 'input', timestamp: getCurrentTime() },
      ));
      setInputCommand('');
      setAutoSuggestion(null);
      setShowRain(false);
      setRainVisible(false);
      onShutdownRef.current?.();
      return;
    }

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

    setTerminalOutput(prev => appendOutput(prev, inputLine, spinnerLine));
    playSoundRef.current?.('execute');
    setCommandHistory(prev => [...prev, trimmedCmd].slice(-MAX_HISTORY));
    setHistoryIndex(-1);
    setInputCommand('');
    setAutoSuggestion(null);

    const startTime = performance.now();

    const timeoutId = setTimeout(() => {
      spinnerTimeouts.current.delete(timeoutId);

      const renderOutput = (lines: TerminalLine[], start: number, command: string, spinnerId: number) => {
        const elapsed = ((performance.now() - start) / 1000).toFixed(1);
        const showTiming = !command.startsWith('theme');
        const timingLine: TerminalLine = { content: `took ${elapsed}s`, type: 'timing' };
        const newLines = showTiming ? [...lines, timingLine] : lines;

        const shouldAnimate = !reducedMotion && newLines.length > 1;

        if (shouldAnimate) {
          setTerminalOutput(prev => {
            const spinnerIndex = prev.findIndex(l => l.type === 'spinner' && l.spinnerId === spinnerId);
            if (spinnerIndex === -1) return prev;
            const withoutSpinner = [...prev.slice(0, spinnerIndex), ...prev.slice(spinnerIndex + 1)];
            revealStartIndexRef.current = withoutSpinner.length;
            return withoutSpinner;
          });
          setRevealingLines(newLines);
        } else {
          setTerminalOutput(prev => {
            const spinnerIndex = prev.findIndex(l => l.type === 'spinner' && l.spinnerId === spinnerId);
            if (spinnerIndex === -1) return appendOutput(prev, ...newLines);
            return [...prev.slice(0, spinnerIndex), ...newLines, ...prev.slice(spinnerIndex + 1)].slice(-MAX_OUTPUT);
          });
        }
      };

      let outputLines: TerminalLine[];

      if (trimmedCmd in RESPONSIVE_COMMANDS) {
        const variant = RESPONSIVE_COMMANDS[trimmedCmd];
        const key = isMobileRef.current ? variant.mobile : variant.desktop;
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
            { content: `Current theme: ${themeRef.current}`, type: 'output' },
            { content: `Available: ${VALID_THEMES.join(', ')}`, type: 'output' },
            { content: `Usage: theme <name>`, type: 'output' },
          ];
        } else if (VALID_THEMES.includes(arg as ThemeName)) {
          const eggMessage = THEME_EASTER_EGGS[arg as ThemeName];
          const eggKey = `dkoder-${arg}-seen`;
          const isFirstTime = eggMessage && !localStorage.getItem(eggKey);
          setTheme(arg as ThemeName);
          playSoundRef.current?.('themeSwitch');
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
      } else if (trimmedCmd === 'sound' || trimmedCmd.startsWith('sound ')) {
        const arg = trimmedCmd.replace('sound', '').trim();
        if (!arg) {
          outputLines = [
            { content: `Sound: ${soundEnabledRef.current ? 'on' : 'off'}`, type: 'output' },
            { content: `Usage: sound <on|off>`, type: 'output' },
          ];
        } else if (arg === 'on') {
          onSoundSetRef.current?.(true);
          outputLines = [
            { content: 'Sound enabled.', type: 'output' },
          ];
        } else if (arg === 'off') {
          onSoundSetRef.current?.(false);
          outputLines = [
            { content: 'Sound disabled.', type: 'output' },
          ];
        } else {
          outputLines = [
            { content: `Unknown option: ${arg}. Usage: sound <on|off>`, type: 'error' },
          ];
        }
      } else if (trimmedCmd in commands) {
        const output = commands[trimmedCmd as keyof typeof commands];
        if (output.isHtml) {
          Promise.all(output.map(line => sanitizeHtml(line))).then(sanitized => {
            const htmlLines: TerminalLine[] = sanitized.map(content => ({
              content,
              type: 'output' as const,
              isHtml: true,
            }));
            renderOutput(htmlLines, startTime, trimmedCmd, currentSpinnerId);
          }).catch(() => {
            const fallback: TerminalLine[] = output.map(line => ({
              content: line.replace(/<[^>]*>/g, ''),
              type: 'output' as const,
            }));
            renderOutput(fallback, startTime, trimmedCmd, currentSpinnerId);
          });
          return;
        }
        outputLines = output.map(line => ({
          content: line,
          type: 'output' as const,
        }));
      } else {
        onBellRef.current?.();
        playSoundRef.current?.('error');
        outputLines = [{ content: `Command not found: ${cmd}`, type: 'error' as const }];
      }

      renderOutput(outputLines, startTime, trimmedCmd, currentSpinnerId);
    }, 600);
    spinnerTimeouts.current.add(timeoutId);
  }, [cancelMotdAnimation, displayMotd, displayHelp, setTheme, reducedMotion]);

  const executeWithPreview = useCallback((command: string) => {
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
  }, [handleCommand]);

  const backToCommands = useCallback(() => {
    setSuggestionMode('commands');
    setSelectedSuggestionIndex(suggestions.findIndex(s => s.command === 'theme'));
  }, []);

  const selectSuggestion = useCallback((index: number) => {
    if (suggestionModeRef.current === 'commands') {
      const selectedCommand = filteredSuggestionsRef.current[index].command;
      if (selectedCommand === 'theme') {
        setSuggestionMode('themes');
        setSelectedSuggestionIndex(0);
        return;
      }
      if (selectedCommand === 'sound') {
        executeWithPreview(soundEnabledRef.current ? 'sound off' : 'sound on');
        return;
      }
      executeWithPreview(selectedCommand);
    } else {
      const selectedTheme = VALID_THEMES[index];
      setSuggestionMode('commands');
      setSelectedSuggestionIndex(0);
      executeWithPreview(`theme ${selectedTheme}`);
    }
  }, [executeWithPreview]);

  const completeAutoSuggestion = useCallback(() => {
    if (autoSuggestionRef.current) {
      setInputCommand(autoSuggestionRef.current);
      setAutoSuggestion(null);
      inputRef.current?.focus();
    }
  }, []);

  const actionTab = useCallback(() => {
    cancelMotdAnimation();
    if (showSuggestionsRef.current) {
      selectSuggestion(selectedSuggestionIndexRef.current);
    } else if (autoSuggestionRef.current) {
      completeAutoSuggestion();
    } else {
      setSuggestionMode('commands');
      setShowSuggestions(true);
      setSelectedSuggestionIndex(0);
      suppressHoverRef.current = true;
      setTimeout(() => { suppressHoverRef.current = false; }, 100);
    }
  }, [cancelMotdAnimation, selectSuggestion, completeAutoSuggestion]);

  const actionUp = useCallback(() => {
    if (showSuggestionsRef.current) {
      const len = suggestionModeRef.current === 'themes' ? VALID_THEMES.length : filteredLengthRef.current;
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : len - 1);
    } else if (commandHistoryRef.current.length > 0) {
      const history = commandHistoryRef.current;
      const newIndex = historyIndexRef.current + 1 >= history.length ? 0 : historyIndexRef.current + 1;
      setHistoryIndex(newIndex);
      setInputCommand(history[history.length - 1 - newIndex]);
      setAutoSuggestion(null);
    }
  }, []);

  const actionDown = useCallback(() => {
    if (showSuggestionsRef.current) {
      const len = suggestionModeRef.current === 'themes' ? VALID_THEMES.length : filteredLengthRef.current;
      setSelectedSuggestionIndex(prev => prev < len - 1 ? prev + 1 : 0);
    } else if (commandHistoryRef.current.length > 0) {
      const history = commandHistoryRef.current;
      const newIndex = historyIndexRef.current <= 0 ? history.length - 1 : historyIndexRef.current - 1;
      setHistoryIndex(newIndex);
      setInputCommand(history[history.length - 1 - newIndex]);
      setAutoSuggestion(null);
    }
  }, []);

  const actionEnter = useCallback(() => {
    if (showSuggestionsRef.current && inputCommandRef.current.trim() === '') {
      selectSuggestion(selectedSuggestionIndexRef.current);
    } else {
      setShowSuggestions(false);
      handleCommand(inputCommandRef.current);
    }
  }, [selectSuggestion, handleCommand]);

  useImperativeHandle(ref, () => ({
    handleMobileAction: (action: 'up' | 'down') => {
      if (isInputBlockedRef.current) return;
      switch (action) {
        case 'up': actionUp(); break;
        case 'down': actionDown(); break;
      }
      inputRef.current?.focus();
    },
  }), [actionUp, actionDown]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isInputBlockedRef.current) { e.preventDefault(); return; }
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
        if (autoSuggestionRef.current) {
          e.preventDefault();
          completeAutoSuggestion();
        }
        return;
      case 'Escape':
        if (showSuggestionsRef.current && suggestionModeRef.current === 'themes') {
          backToCommands();
        } else if (showSuggestionsRef.current) {
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
  }, [actionTab, actionUp, actionDown, actionEnter, completeAutoSuggestion, backToCommands, handleCommand]);

  const handleSuggestionMouseEnter = useCallback((i: number) => {
    if (!suppressHoverRef.current) setSelectedSuggestionIndex(i);
  }, []);

  useEffect(() => {
    setTerminalOutput([{ content: '', type: 'output' }]);
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
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // MOTD typing animation — triggered when boot splash completes
  useEffect(() => {
    if (!bootComplete) return;

    // Reduced motion or no bootComplete prop: show MOTD instantly
    if (reducedMotion) {
      setTerminalOutput(displayMotd());
      return;
    }

    motdAnimatingRef.current = true;
    setTerminalOutput([{ content: '', type: 'output' }]);

    let charIndex = 0;

    motdDelayRef.current = setTimeout(() => {
      motdDelayRef.current = null;

      motdIntervalRef.current = setInterval(() => {
        if (!motdAnimatingRef.current || charIndex >= motdPlainText.length) {
          if (motdIntervalRef.current) clearInterval(motdIntervalRef.current);
          motdIntervalRef.current = null;
          motdAnimatingRef.current = false;
          setTerminalOutput(displayMotd());
          return;
        }
        charIndex++;
        setTerminalOutput([{ content: motdPlainText.slice(0, charIndex), type: 'output' }]);
      }, 30);
    }, 300);

    return () => {
      if (motdDelayRef.current) { clearTimeout(motdDelayRef.current); motdDelayRef.current = null; }
      if (motdIntervalRef.current) { clearInterval(motdIntervalRef.current); motdIntervalRef.current = null; }
      motdAnimatingRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootComplete]);

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
  }, []);

  useEffect(() => {
    const timeouts = spinnerTimeouts.current;
    return () => {
      timeouts.forEach(clearTimeout);
      timeouts.clear();
      if (pendingExecuteRef.current) clearTimeout(pendingExecuteRef.current);
      if (motdDelayRef.current) clearTimeout(motdDelayRef.current);
      if (motdIntervalRef.current) clearInterval(motdIntervalRef.current);
      cancelAnimationFrame(revealRafRef.current);
    };
  }, []);

  // Batched reveal: 10ms/line target, naturally batches at low frame rates (30fps → 3 lines/frame)
  useEffect(() => {
    if (!revealingLines || revealingLines.length === 0) return;

    let flushedIndex = 0;
    let startTime = 0;
    const lines = revealingLines; // Capture for closure safety

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const targetIndex = Math.min(Math.floor(elapsed / 10), lines.length);

      if (targetIndex > flushedIndex) {
        const batch = lines.slice(flushedIndex, targetIndex);
        flushedIndex = targetIndex;
        setTerminalOutput(prev => appendOutput(prev, ...batch));
      }

      if (flushedIndex >= lines.length) {
        setRevealingLines(null);
        return;
      }

      revealRafRef.current = requestAnimationFrame(step);
    };

    revealRafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(revealRafRef.current);
  }, [revealingLines]);

  useEffect(() => {
    onRevealStateChange?.(isInputBlocked);
  }, [revealingLines, onRevealStateChange]);

  return (
    <section ref={sectionRef} className="w-full flex flex-col flex-1 overflow-hidden p-4 terminal-glow crt-breathe" style={{ background: 'var(--terminal-bg)' }}>
      <div className="flex-1 relative overflow-hidden mb-4">
        <div className="hex-bg absolute inset-0 pointer-events-none z-0" style={hexBgStyle} />
        {showRain && (
          <MatrixRain
            visible={rainVisible}
            colors={THEME_RAIN_COLORS[theme]}
            onFadeOutComplete={handleRainFadeOutComplete}
          />
        )}
        <TerminalOutput
          terminalOutput={terminalOutput}
          isInputBlocked={isInputBlocked}
          revealStartIndex={revealStartIndexRef.current}
          showScrollIndicator={showScrollIndicator}
          rainVisible={rainVisible}
          scrollRef={terminalRef}
          sentinelRef={sentinelRef}
        />
      </div>
      <div className="relative z-[1]">
        <TerminalInput
          inputCommand={inputCommand}
          autoSuggestion={autoSuggestion}
          isInputBlocked={isInputBlocked}
          isMobile={isMobile}
          showSuggestions={showSuggestions}
          onInputChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onInputClick={handleInputClick}
          onFocus={handleInputFocus}
          inputRef={inputRef}
        />
        {showSuggestions && (
          <Suggestions
            ref={suggestionsRef}
            suggestions={filteredSuggestions}
            selectedIndex={selectedSuggestionIndex}
            onSelect={selectSuggestion}
            onMouseEnter={handleSuggestionMouseEnter}
            mode={suggestionMode}
            themes={VALID_THEMES}
            currentTheme={theme}
            onBack={backToCommands}
            filterText={inputCommand.trim()}
          />
        )}
      </div>
    </section>
  );
};

export default Terminal;
