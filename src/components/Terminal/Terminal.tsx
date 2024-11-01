import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Code2, ChevronRight } from 'lucide-react';
import DOMPurify from 'dompurify';
import { suggestions, commands } from './commands';
import { TerminalLine } from './types';
import Suggestions from './Suggestions';
import AutoSuggestion from './AutoSuggestion';

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
        timestamp: getCurrentTime(),
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
    } else {
      const output = commands[trimmedCmd as keyof typeof commands] || `Command not found: ${cmd}`;
      
      setCommandHistory((prev) => [...prev, trimmedCmd]);
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
              isHtml: trimmedCmd === 'contact',
              timestamp: getCurrentTime()
            }))
          : [
              {
                content: output,
                type: output.startsWith('Command not found')
                  ? 'error'
                  : 'output',
                timestamp: getCurrentTime()
              } as const,
            ]),
      ];
      setTerminalOutput((prevOutput) => [...prevOutput, ...newOutput]);
    }
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
        case 'Escape':
          setInputCommand('');
          setAutoSuggestion(null);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (commandHistory.length > 0) {
            const newIndex = historyIndex + 1;
            if (newIndex < commandHistory.length) {
              setHistoryIndex(newIndex);
              setInputCommand(commandHistory[commandHistory.length - 1 - newIndex]);
              setAutoSuggestion(null);
            }
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setInputCommand(commandHistory[commandHistory.length - 1 - newIndex]);
            setAutoSuggestion(null);
          } else if (historyIndex === 0) {
            setHistoryIndex(-1);
            setInputCommand('');
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
    <section className="w-full bg-gray-900 bg-opacity-50 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <TerminalIcon className="text-green-400 w-5 h-5" />
          <h2 className="text-base sm:text-lg font-mono font-argon font-semibold">
            <span className="text-green-400">guest</span>
            <span className="text-gray-400">@</span>
            <span className="text-blue-400">dkoderinc</span>
          </h2>
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <span>🔋 100%</span>
          <span>📡 Connected</span>
        </div>
      </div>
      <div
        ref={terminalRef}
        className="bg-gray-950 p-4 rounded-lg h-96 overflow-y-auto mb-4 text-sm sm:text-base shadow-inner"
      >
        {terminalOutput.map((line, index) => (
          <div key={index} className="group flex items-start hover:bg-gray-900/30 px-2 py-0.5 -mx-2 rounded">
            <span className="text-gray-500 text-xs mr-2 opacity-0 group-hover:opacity-100 select-none">
              {line.timestamp}
            </span>
            <p className={`font-mono font-argon ${getLineColor(line.type)} flex-1`}>
              {line.isHtml ? (
                <span
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(line.content),
                  }}
                />
              ) : (
                line.content
              )}
            </p>
          </div>
        ))}
      </div>
      <div className="relative">
        <div className="flex items-center space-x-2 w-full bg-gray-950 rounded-lg p-2">
          <ChevronRight className="text-green-400 w-5 h-5" />
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputCommand}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="bg-transparent text-white font-mono font-argon w-full focus:outline-none relative z-10"
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
            className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded"
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
    case 'input':
      return 'text-green-400';
    case 'output':
      return 'text-gray-200';
    case 'success':
      return 'text-green-400';
    case 'error':
      return 'text-red-400';
    default:
      return 'text-white';
  }
};

export default Terminal;
