import { commands } from './commands';
import { TerminalLine } from './types';
import { ThemeName, VALID_THEMES } from '../../ThemeContext';

const RESPONSIVE_COMMANDS: Record<string, { mobile: string; desktop: string }> = {
  whoami: { mobile: 'whoami', desktop: 'whoamiDesktop' },
  skills: { mobile: 'skillsMobile', desktop: 'skills' },
};

const THEME_EASTER_EGGS: Partial<Record<ThemeName, string>> = {
  'tokyo-night': 'Welcome to Neo-Tokyo. The night shift begins.',
  'one-dark-pro': 'Dark mode activated. Your eyes will thank you.',
};

export interface CommandContext {
  isMobile: boolean;
  theme: ThemeName;
  soundEnabled: boolean;
}

export type CommandSideEffect =
  | { type: 'setTheme'; theme: ThemeName }
  | { type: 'setSoundEnabled'; enabled: boolean }
  | { type: 'bell' };

export interface CommandResult {
  lines: TerminalLine[];
  isHtml?: boolean;
  effects?: CommandSideEffect[];
}

export function resolveCommand(cmd: string, ctx: CommandContext): CommandResult {
  if (cmd in RESPONSIVE_COMMANDS) {
    const variant = RESPONSIVE_COMMANDS[cmd];
    const key = ctx.isMobile ? variant.mobile : variant.desktop;
    return {
      lines: commands[key].map(line => ({ content: line, type: 'output' as const })),
    };
  }

  if (cmd === 'theme' || cmd.startsWith('theme ')) {
    const arg = cmd.replace('theme', '').trim();
    if (!arg) {
      return {
        lines: [
          { content: `Current theme: ${ctx.theme}`, type: 'output' },
          { content: `Available: ${VALID_THEMES.join(', ')}`, type: 'output' },
          { content: 'Usage: theme <name>', type: 'output' },
        ],
      };
    }
    if (VALID_THEMES.includes(arg as ThemeName)) {
      const eggMessage = THEME_EASTER_EGGS[arg as ThemeName];
      const eggKey = `dkoder-${arg}-seen`;
      const isFirstTime = eggMessage && !localStorage.getItem(eggKey);
      if (isFirstTime) localStorage.setItem(eggKey, '1');
      return {
        lines: [{ content: isFirstTime ? eggMessage! : `Theme switched to ${arg}.`, type: 'output' }],
        effects: [{ type: 'setTheme', theme: arg as ThemeName }],
      };
    }
    return {
      lines: [{ content: `Unknown theme: ${arg}. Available: ${VALID_THEMES.join(', ')}`, type: 'error' }],
    };
  }

  if (cmd === 'sound' || cmd.startsWith('sound ')) {
    const arg = cmd.replace('sound', '').trim();
    if (!arg) {
      return {
        lines: [
          { content: `Sound: ${ctx.soundEnabled ? 'on' : 'off'}`, type: 'output' },
          { content: 'Usage: sound <on|off>', type: 'output' },
        ],
      };
    }
    if (arg === 'on' || arg === 'off') {
      const enabled = arg === 'on';
      return {
        lines: [{ content: enabled ? 'Sound enabled.' : 'Sound disabled.', type: 'output' }],
        effects: [{ type: 'setSoundEnabled', enabled }],
      };
    }
    return {
      lines: [{ content: `Unknown option: ${arg}. Usage: sound <on|off>`, type: 'error' }],
    };
  }

  if (cmd in commands) {
    const output = commands[cmd as keyof typeof commands];
    if (output.isHtml) {
      return {
        lines: output.map(line => ({ content: line, type: 'output' as const })),
        isHtml: true,
      };
    }
    return {
      lines: output.map(line => ({ content: line, type: 'output' as const })),
    };
  }

  return {
    lines: [{ content: `Command not found: ${cmd}`, type: 'error' as const }],
    effects: [{ type: 'bell' }],
  };
}
