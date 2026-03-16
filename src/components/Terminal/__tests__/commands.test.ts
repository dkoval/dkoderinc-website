import { commands, suggestions } from '../commands';

describe('commands registry', () => {
  const dataCommands = [
    'whoami', 'whoamiDesktop', 'skills', 'skillsMobile',
    'contact', 'history', 'man dmytro',
  ];

  it('contains all data-driven commands', () => {
    for (const cmd of dataCommands) {
      expect(commands).toHaveProperty(cmd);
    }
  });

  it('marks contact as isHtml', () => {
    expect(commands['contact'].isHtml).toBe(true);
  });

  it('marks man dmytro as isHtml', () => {
    expect(commands['man dmytro'].isHtml).toBe(true);
  });

  it('does not mark non-HTML commands as isHtml', () => {
    const nonHtml = ['whoami', 'whoamiDesktop', 'skills', 'skillsMobile', 'history'];
    for (const cmd of nonHtml) {
      expect(commands[cmd].isHtml).toBeUndefined();
    }
  });

  it('has responsive variants for whoami', () => {
    expect(commands).toHaveProperty('whoami');
    expect(commands).toHaveProperty('whoamiDesktop');
  });

  it('has responsive variants for skills', () => {
    expect(commands).toHaveProperty('skills');
    expect(commands).toHaveProperty('skillsMobile');
  });

  it('returns non-empty arrays for all commands', () => {
    for (const key of Object.keys(commands)) {
      expect(Array.isArray(commands[key])).toBe(true);
      expect(commands[key].length).toBeGreaterThan(0);
    }
  });
});

describe('suggestions', () => {
  it('has exactly 10 entries', () => {
    expect(suggestions).toHaveLength(10);
  });

  it('each entry has command, description, and icon', () => {
    for (const s of suggestions) {
      expect(typeof s.command).toBe('string');
      expect(typeof s.description).toBe('string');
      expect(s.icon).toBeDefined();
    }
  });

  const expectedCommands = [
    'whoami', 'man dmytro', 'skills', 'history', 'contact',
    'uptime', 'theme', 'sound', 'clear', 'exit',
  ];

  it('contains all expected commands', () => {
    const names = suggestions.map(s => s.command);
    for (const cmd of expectedCommands) {
      expect(names).toContain(cmd);
    }
  });
});
