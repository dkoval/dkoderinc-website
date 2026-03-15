import { screen } from '@testing-library/react';
import StatusBar from '../StatusBar';
import { renderWithProviders } from '../../test/helpers';

describe('StatusBar', () => {
  it('shows the current theme name', () => {
    renderWithProviders(<StatusBar />);
    expect(screen.getByText('green')).toBeInTheDocument();
  });

  it('shows sound toggle on desktop with off state', () => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: query === '(min-width: 768px)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    renderWithProviders(<StatusBar soundEnabled={false} />);
    expect(screen.getByText(/♪ off/)).toBeInTheDocument();
  });

  it('shows sound toggle with on state when enabled', () => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: query === '(min-width: 768px)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    renderWithProviders(<StatusBar soundEnabled={true} />);
    expect(screen.getByText(/♪ on/)).toBeInTheDocument();
  });

  it('hides sound toggle on mobile', () => {
    // Explicitly set mobile: all queries return matches: false → useIsMobile returns true
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    renderWithProviders(<StatusBar soundEnabled={false} />);
    expect(screen.queryByText(/♪/)).not.toBeInTheDocument();
  });

  it('renders clock', () => {
    renderWithProviders(<StatusBar />);
    // Clock renders time — look for the status bar container and check for time pattern
    // The StatusBar uses a specific class structure
    const statusBarEl = screen.getByText('[0] bash').parentElement;
    expect(statusBarEl?.textContent).toMatch(/\d{1,2}:\d{2}/);
  });
});
