import { ReactNode } from 'react';

export interface TerminalLine {
  content: string;
  type: 'input' | 'output' | 'error' | 'success';
  isHtml?: boolean;
  timestamp?: string;
  helpEntry?: { commandIndex: number };
}

export interface CommandSuggestion {
  command: string;
  description: string;
  icon: ReactNode;
}

export interface TerminalCommand {
  name: string;
  output: string[];
}
