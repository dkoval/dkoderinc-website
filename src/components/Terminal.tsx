import React, { useState, useEffect, useRef } from 'react';
import { Home, Code2 } from 'lucide-react';
import DOMPurify from 'dompurify';

interface TerminalLine {
  content: string;
  type: 'input' | 'output' | 'error';
  isHtml?: boolean;
}

const Terminal: React.FC = () => {
  const [terminalOutput, setTerminalOutput] = useState<TerminalLine[]>([]);
  const [inputCommand, setInputCommand] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const commands = {
    help: [
      'Example usage:',
      '  about      - Learn about Dmytro Koval',
      "  skills     - View Dmytro's technical skills",
      "  experience - See Dmytro's work experience",
      "  contact    - Get Dmytro's contact information",
      '  clear      - Clear the terminal screen',
    ],
    about:
      'Dmytro Koval is a seasoned software engineer with 15+ years of experience in backend development.',
    skills:
      'Java, Kotlin, Microservices, Distributed Systems, API Design, Concurrent Applications, Apache Kafka, Kafka Streams.',
    experience:
      '15+ years in software engineering, focusing on Java server-side development and distributed systems.',
    contact: [
      'GitHub: <a href="https://github.com/dkoval" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">github.com/dkoval</a>',
      'LinkedIn: <a href="https://linkedin.com/in/dmytrokoval" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">linkedin.com/in/dmytrokoval</a>',
      'Twitter: <a href="https://twitter.com/dkovalbuzz" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">twitter.com/dkovalbuzz</a>',
      'Email: <a href="mailto:dkoderinc@gmail.com" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">dkoderinc@gmail.com</a>',
    ],
  };

  const displayHelp = () => {
    return [
      { content: '$ help', type: 'input' as const },
      ...commands.help.map((line, index) => ({
        content: index === 0 ? line : `  ${line}`,
        type: 'output' as const,
      })),
    ];
  };

  const handleCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim().toLowerCase();
    
    if (trimmedCmd === 'clear') {
      setTerminalOutput(displayHelp());
    } else {
        const output = commands[trimmedCmd as keyof typeof commands] || `Command not found: ${cmd}`;

        const newOutput: TerminalLine[] = [
        { content: `$ ${trimmedCmd}`, type: 'input' },
        ...(Array.isArray(output)
          ? output.map((line) => ({
              content: line,
              type: 'output' as const,
              isHtml: trimmedCmd === 'contact',
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
    }
    setInputCommand('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(inputCommand);
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      handleCommand('clear');
    }
  };

  useEffect(() => {
    setTerminalOutput(displayHelp());
    if (inputRef.current) {
      inputRef.current.focus();
    }
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
    <section className="md:w-full bg-gray-900 bg-opacity-50 p-4 rounded-lg">
      <h2 className="text-xl font-mono font-argon font-semibold mb-4 flex items-center">
        <Home className="mr-2 text-green-400" />
        <span className="text-green-400">admin@dkoderinc</span>
        <span className="text-white">:</span>
        <span className="text-blue-400">~</span>
        <span className="text-white">$</span>
      </h2>
      <div
        ref={terminalRef}
        className="bg-black p-4 rounded h-64 overflow-y-auto mb-4"
      >
        {terminalOutput.map((line, index) => (
          <p key={index} className={`font-mono font-argon ${getLineColor(line.type)}`}>
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
        ))}
      </div>
      <div className="flex items-center">
        <span className="font-mono font-argon mr-2 text-green-400">$</span>
        <input
          ref={inputRef}
          type="text"
          value={inputCommand}
          onChange={(e) => setInputCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-black text-white font-mono font-argon flex-grow p-2 rounded"
          placeholder="Type a command..."
          autoCapitalize="none"
        />
        <button
          onClick={() => handleCommand(inputCommand)}
          className="ml-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          <Code2 />
        </button>
      </div>
    </section>
  );
};

const getLineColor = (type: string): string => {
  switch (type) {
    case 'input':
      return 'text-green-400';
    case 'output':
      return 'text-blue-300';
    case 'error':
      return 'text-red-400';
    default:
      return 'text-white';
  }
};

export default Terminal;
