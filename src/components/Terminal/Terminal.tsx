import React, { useState, useEffect, useRef } from 'react';
import { Code2, ChevronRight } from 'lucide-react';
import DOMPurify from 'dompurify';
import { suggestions, commands } from './commands';
import { TerminalLine } from './types';
import Suggestions from './Suggestions';
import AutoSuggestion from './AutoSuggestion';
import { PAGE_LOAD_TIME } from '../../constants';

const MAX_HISTORY = 50;

const Terminal: React.FC = () => {
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

    if (trimmedCmd === 'uptime') {
      const seconds = Math.floor((Date.now() - PAGE_LOAD_TIME) / 1000);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      const output: string[] = [
        ` up ${mins > 0 ? mins + 'm ' : ''}${secs}s (this session)`,
        ` up 15 years 4 months (career)`,
        ` load average: 0.42, 0.15, 0.07`,
      ];
      setCommandHistory(prev => [...prev, trimmedCmd].slice(-MAX_HISTORY));
      setHistoryIndex(-1);
      setTerminalOutput(prev => [
        ...prev,
        { content: `$ ${trimmedCmd}`, type: 'input', timestamp: getCurrentTime() },
        ...output.map(line => ({ content: line, type: 'output' as const })),
      ]);
      setInputCommand('');
      setAutoSuggestion(null);
      return;
    }

    const output = commands[trimmedCmd as keyof typeof commands] || `Command not found: ${cmd}`;

    setCommandHistory((prev) => [...prev, trimmedCmd].slice(-MAX_HISTORY));
    setHistoryIndex(-1);

    const newOutput: TerminalLine[] = [
      {
        content: `$ ${trimmedCmd}`,
        type: 'input',
        timestamp: getCurrentTime()
      },
      ...(Array.isArray(output)
        ? output.map((line) => ({
            content: line,
            type: 'output' as const,
            isHtml: trimmedCmd === 'contact' || trimmedCmd === 'projects',
          }))
        : [
            {
              content: output,
              type: output.startsWith('Command not found')
                ? 'error'
                : 'output',
            } as const,
          ]),
    ];
    setTerminalOutput((prevOutput) => [...prevOutput, ...newOutput]);
    setInputCommand('');
    setAutoSuggestion(null);
  };

  const selectSuggestion = () => {
    const selectedCommand = suggestions[selectedSuggestionIndex].command;
    setInputCommand(selectedCommand);
    setShowSuggestions(false);
    setAutoSuggestion(null);
    inputRef.current?.focus();
  };

  const completeAutoSuggestion = () => {
    if (autoSuggestion) {
      setInputCommand(autoSuggestion);
      setAutoSuggestion(null);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions) {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSuggestionIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          return;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSuggestionIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          return;
        case 'Enter':
          e.preventDefault();
          selectSuggestion();
          return;
        case 'Escape':
          e.preventDefault();
          setShowSuggestions(false);
          return;
        case 'Tab':
          e.preventDefault();
          selectSuggestion();
          return;
      }
    } else {
      switch (e.key) {
        case 'Enter':
          handleCommand(inputCommand);
          break;
        case 'Tab':
          e.preventDefault();
          if (autoSuggestion) {
            completeAutoSuggestion();
          } else {
            setShowSuggestions(true);
            setSelectedSuggestionIndex(0);
          }
          break;
        case 'ArrowRight':
          if (autoSuggestion) {
            e.preventDefault();
            completeAutoSuggestion();
          }
          break;
        case 'Escape':
          setInputCommand('');
          setAutoSuggestion(null);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (commandHistory.length > 0) {
            const newIndex = historyIndex + 1 >= commandHistory.length ? 0 : historyIndex + 1;
            setHistoryIndex(newIndex);
            setInputCommand(commandHistory[commandHistory.length - 1 - newIndex]);
            setAutoSuggestion(null);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (commandHistory.length > 0) {
            const newIndex = historyIndex <= 0 ? commandHistory.length - 1 : historyIndex - 1;
            setHistoryIndex(newIndex);
            setInputCommand(commandHistory[commandHistory.length - 1 - newIndex]);
            setAutoSuggestion(null);
          }
          break;
      }
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
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
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

  return (
    <section className="w-full bg-black flex flex-col flex-1 overflow-hidden p-4">
      <div
        ref={terminalRef}
        className="bg-black flex-1 overflow-y-auto mb-4 text-sm"
      >
        {terminalOutput.map((line, index) => (
          <div key={index} className="group flex items-start hover:bg-white/5 px-2 py-0.5 -mx-2 rounded">
            <p className={`font-mono ${getLineColor(line.type)} flex-1`}>
              {line.helpEntry ? (
                <span className="inline-flex items-center gap-3">
                  {suggestions[line.helpEntry.commandIndex].icon}
                  <span style={{ color: '#00FF41' }}>{suggestions[line.helpEntry.commandIndex].command}</span>
                  <span style={{ color: '#555' }}>-</span>
                  <span className="text-gray-400">{suggestions[line.helpEntry.commandIndex].description}</span>
                </span>
              ) : line.isHtml ? (
                <span
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(line.content),
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
              placeholder="Type a command or press Tab for suggestions..."
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
              setInputCommand(command);
              setShowSuggestions(false);
              setAutoSuggestion(null);
              inputRef.current?.focus();
            }}
            onMouseEnter={setSelectedSuggestionIndex}
          />
        )}
      </div>
    </section>
  );
};

const getLineColor = (type: string): string => {
  switch (type) {
    case 'input': return 'text-[#00FF41]';
    case 'output': return 'text-gray-200';
    case 'error': return 'text-red-400';
    default: return 'text-white';
  }
};

export default Terminal;
