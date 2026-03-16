import { screen } from '@testing-library/react';
import StatusBar from '../StatusBar';
import { renderWithProviders, mockMatchMedia } from '../../test/helpers';

describe('StatusBar', () => {
  it('shows the current theme name', () => {
    renderWithProviders(<StatusBar />);
    expect(screen.getByText('green')).toBeInTheDocument();
  });

  describe('desktop', () => {
    beforeEach(() => {
      mockMatchMedia(q => q === '(min-width: 768px)');
    });

    it('shows sound toggle with off state', () => {
      renderWithProviders(<StatusBar soundEnabled={false} />);
      expect(screen.getByText(/♪ off/)).toBeInTheDocument();
    });

    it('shows sound toggle with on state when enabled', () => {
      renderWithProviders(<StatusBar soundEnabled={true} />);
      expect(screen.getByText(/♪ on/)).toBeInTheDocument();
    });
  });

  it('hides sound toggle on mobile', () => {
    // Default mock: all queries return matches: false → useIsMobile returns true (mobile)
    mockMatchMedia(() => false);
    renderWithProviders(<StatusBar soundEnabled={false} />);
    expect(screen.queryByText(/♪/)).not.toBeInTheDocument();
  });

  it('renders clock', () => {
    renderWithProviders(<StatusBar />);
    const statusBarEl = screen.getByText('[0] bash').parentElement;
    expect(statusBarEl?.textContent).toMatch(/\d{1,2}:\d{2}/);
  });
});
