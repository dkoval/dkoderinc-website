import { ReactNode } from 'react';

export interface TerminalLine {
  content: string;
  type: 'input' | 'output' | 'error' | 'spinner' | 'timing';
  isHtml?: boolean;
  timestamp?: string;
  helpEntry?: {
    commandIndex: number;
    command: string;
    description: string;
    icon: ReactNode;
  };
  spinnerId?: number;
}

export interface CommandSuggestion {
  command: string;
  description: string;
  icon: ReactNode;
}
