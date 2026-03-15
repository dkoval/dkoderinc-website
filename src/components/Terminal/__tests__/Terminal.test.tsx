import { screen, fireEvent, act } from '@testing-library/react';
import Terminal from '../Terminal';
import { renderWithProviders } from '../../../test/helpers';

// Helper: set up matchMedia for Terminal tests
// - prefers-reduced-motion: true (skip progressive reveal)
// - min-width: 768px: configurable (desktop by default)
const setupMatchMedia = (mobile = false) => {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches:
      query === '(prefers-reduced-motion: reduce)' ||
      (query === '(min-width: 768px)' && !mobile),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

const defaultProps = {
  onShutdown: vi.fn(),
  onBell: vi.fn(),
  playSound: vi.fn(),
  soundEnabled: false,
  onSoundSet: vi.fn(),
  onRevealStateChange: vi.fn(),
};

// Helper: type a command and submit
const submitCommand = (command: string) => {
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: command } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

describe('Terminal', () => {
  beforeEach(() => {
    setupMatchMedia();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders help screen on mount', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    expect(screen.getByText('Available commands:')).toBeInTheDocument();
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

  it('renders contact output as HTML with links', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    submitCommand('contact');
    act(() => { vi.advanceTimersByTime(600); });
    const link = screen.getByText('github.com/dkoval');
    expect(link.closest('a')).toHaveAttribute('href', 'https://github.com/dkoval');
  });

  it('clears terminal and shows help on clear command', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    submitCommand('history');
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByText(/Still shipping/)).toBeInTheDocument();

    // Clear — synchronous, no timer needed
    submitCommand('clear');
    expect(screen.queryByText(/Still shipping/)).not.toBeInTheDocument();
    expect(screen.getByText('Available commands:')).toBeInTheDocument();
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
    setupMatchMedia(true); // mobile
    renderWithProviders(<Terminal {...defaultProps} />);
    submitCommand('skills');
    act(() => { vi.advanceTimersByTime(600); });
    // Mobile skills uses short label "Core Tech:" — verify mobile variant rendered
    expect(screen.getByText(/Core Tech:/)).toBeInTheDocument();
  });
});
