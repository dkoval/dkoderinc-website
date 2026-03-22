import { screen, fireEvent, act, waitFor } from '@testing-library/react';
import Terminal, { appendOutput, MAX_OUTPUT } from '../Terminal';
import { TerminalLine } from '../types';
import { renderWithProviders, mockMatchMedia } from '../../../test/helpers';

// Helper: set up matchMedia for Terminal tests
// - prefers-reduced-motion: true (skip progressive reveal)
// - min-width: 768px: configurable (desktop by default)
const setupTerminalMedia = (mobile = false) => {
  mockMatchMedia(query =>
    query === '(prefers-reduced-motion: reduce)' ||
    (query === '(min-width: 768px)' && !mobile),
  );
};

const defaultProps = {
  onShutdown: vi.fn(),
  onBell: vi.fn(),
  playSound: vi.fn(),
  soundEnabled: false,
  onSoundSet: vi.fn(),
  onRevealStateChange: vi.fn(),
  bootComplete: true,
};

// Helper: type a command and submit
const submitCommand = (command: string) => {
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: command } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

describe('Terminal', () => {
  beforeEach(() => {
    setupTerminalMedia();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders MOTD hint on mount', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    expect(screen.getAllByText((_, el) =>
      el?.tagName === 'SPAN' && /Type.*'help'.*Tab.*explore/.test(el.textContent ?? '')
    ).length).toBeGreaterThan(0);
  });

  it('shows updated mobile MOTD', () => {
    setupTerminalMedia(true); // mobile
    const { container } = renderWithProviders(<Terminal {...defaultProps} />);
    expect(container.textContent).toContain("Type 'help' or tap the prompt to explore.");
  });

  it('renders known command output after spinner delay', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    submitCommand('history');
    // Before timer: spinner visible
    expect(screen.getByText('processing query...')).toBeInTheDocument();
    // After 600ms: output rendered
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByText(/Still shipping/)).toBeInTheDocument();
  });

  it('shows error for unknown command', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    submitCommand('foobar');
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByText('Command not found: foobar')).toBeInTheDocument();
  });

  it('calls onBell and playSound error for unknown command', () => {
    const onBell = vi.fn();
    const playSound = vi.fn();
    renderWithProviders(<Terminal {...defaultProps} onBell={onBell} playSound={playSound} />);
    submitCommand('foobar');
    act(() => { vi.advanceTimersByTime(600); });
    expect(onBell).toHaveBeenCalled();
    expect(playSound).toHaveBeenCalledWith('error');
  });

  it('renders contact output as HTML with links', async () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    submitCommand('contact');
    // DOMPurify is lazy-loaded — two flushes needed: first fires the 600ms timeout,
    // second resolves the dynamic import() promise after suggestion state transitions
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    const link = screen.getByText('github.com/dkoval');
    expect(link.closest('a')).toHaveAttribute('href', 'https://github.com/dkoval');
  });

  it('clears terminal and shows MOTD on clear command', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    submitCommand('history');
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByText(/Still shipping/)).toBeInTheDocument();

    // Clear — synchronous, no timer needed
    submitCommand('clear');
    expect(screen.queryByText(/Still shipping/)).not.toBeInTheDocument();
    expect(screen.getAllByText((_, el) =>
      el?.tagName === 'SPAN' && /Type.*'help'.*Tab.*explore/.test(el.textContent ?? '')
    ).length).toBeGreaterThan(0);
  });

  it('shows full help output when help command is typed', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    submitCommand('help');
    expect(screen.getByText('Available commands:')).toBeInTheDocument();
  });

  it('snaps MOTD to final state on early user input', () => {
    // Override reduced-motion to false so animation would normally play
    mockMatchMedia(query => query === '(min-width: 768px)');
    renderWithProviders(<Terminal {...defaultProps} />);
    // Advance past the 300ms delay to start the animation
    act(() => { vi.advanceTimersByTime(350); });
    // User starts typing — animation should snap to final state
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'h' } });
    expect(screen.getAllByText((_, el) =>
      el?.tagName === 'SPAN' && /Type.*'help'.*Tab.*explore/.test(el.textContent ?? '')
    ).length).toBeGreaterThan(0);
  });

  it('shows theme info when no argument given', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    submitCommand('theme');
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByText(/Current theme: green/)).toBeInTheDocument();
    expect(screen.getByText(/Available:/)).toBeInTheDocument();
  });

  it('shows error for invalid theme', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    submitCommand('theme invalid');
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByText(/Unknown theme: invalid/)).toBeInTheDocument();
  });

  it('shows sound status when no argument given', () => {
    renderWithProviders(<Terminal {...defaultProps} soundEnabled={false} />);
    submitCommand('sound');
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByText(/Sound: off/)).toBeInTheDocument();
  });

  it('calls onSoundSet(true) for sound on', () => {
    const onSoundSet = vi.fn();
    renderWithProviders(<Terminal {...defaultProps} onSoundSet={onSoundSet} />);
    submitCommand('sound on');
    act(() => { vi.advanceTimersByTime(600); });
    expect(onSoundSet).toHaveBeenCalledWith(true);
  });

  it('calls onSoundSet(false) for sound off', () => {
    const onSoundSet = vi.fn();
    renderWithProviders(<Terminal {...defaultProps} onSoundSet={onSoundSet} />);
    submitCommand('sound off');
    act(() => { vi.advanceTimersByTime(600); });
    expect(onSoundSet).toHaveBeenCalledWith(false);
  });

  it('uses mobile variant for responsive commands', () => {
    setupTerminalMedia(true); // mobile
    renderWithProviders(<Terminal {...defaultProps} />);
    submitCommand('skills');
    act(() => { vi.advanceTimersByTime(600); });
    // Mobile skills uses short label "Core Tech:" — verify mobile variant rendered
    expect(screen.getByText(/Core Tech:/)).toBeInTheDocument();
  });

  it('renders hex background with theme-colored pattern', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    const bg = document.querySelector('.hex-bg') as HTMLElement;
    expect(bg).toBeInTheDocument();
    // Default theme is 'green' — radial gradient uses green RGB
    expect(bg!.style.backgroundImage).toContain('0, 255, 65');
  });
});

describe('suggestion filtering (mobile)', () => {
  beforeEach(() => {
    setupTerminalMedia(true); // mobile mode
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows suggestions when input is focused and empty', async () => {
    const { container } = renderWithProviders(<Terminal {...defaultProps} />);
    const input = container.querySelector('input');
    fireEvent.focus(input!);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('filters suggestions by prefix as user types', async () => {
    const { container } = renderWithProviders(<Terminal {...defaultProps} />);
    const input = container.querySelector('input');
    fireEvent.focus(input!);
    fireEvent.change(input!, { target: { value: 'sk' } });
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveAttribute('aria-label', 'Run skills');
  });

  it('re-opens full list when input is backspaced to empty', async () => {
    const { container } = renderWithProviders(<Terminal {...defaultProps} />);
    const input = container.querySelector('input');
    fireEvent.focus(input!);
    fireEvent.change(input!, { target: { value: 's' } });
    fireEvent.change(input!, { target: { value: '' } });
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(1);
  });

  it('hides suggestions when no commands match', async () => {
    const { container } = renderWithProviders(<Terminal {...defaultProps} />);
    const input = container.querySelector('input');
    fireEvent.focus(input!);
    fireEvent.change(input!, { target: { value: 'xyz' } });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('appendOutput', () => {
  const makeLine = (content: string): TerminalLine => ({
    content,
    type: 'output',
  });

  it('caps output at MAX_OUTPUT lines, preserving most recent', () => {
    const existing = Array.from({ length: MAX_OUTPUT - 2 }, (_, i) => makeLine(`line-${i}`));
    const newLines = [makeLine('new-1'), makeLine('new-2'), makeLine('new-3')];
    const result = appendOutput(existing, ...newLines);
    expect(result).toHaveLength(MAX_OUTPUT);
    expect(result[result.length - 1].content).toBe('new-3');
    expect(result[result.length - 2].content).toBe('new-2');
    expect(result[result.length - 3].content).toBe('new-1');
    // Oldest line dropped
    expect(result[0].content).toBe('line-1');
  });

  it('does not cap when under limit', () => {
    const existing = [makeLine('a'), makeLine('b')];
    const result = appendOutput(existing, makeLine('c'));
    expect(result).toHaveLength(3);
  });

  it('terminal output container has role="log" and aria-live="polite"', () => {
    setupTerminalMedia(false);
    const { container } = renderWithProviders(<Terminal {...defaultProps} />);
    const log = container.querySelector('[role="log"]');
    expect(log).toBeInTheDocument();
    expect(log).toHaveAttribute('aria-live', 'polite');
  });
});
