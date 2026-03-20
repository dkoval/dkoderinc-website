import { render, screen, fireEvent } from '@testing-library/react';
import Suggestions from '../Suggestions';
import { suggestions } from '../commands';
import { VALID_THEMES, ThemeName } from '../../../ThemeContext';

const defaultProps = {
  suggestions,
  selectedIndex: 0,
  onSelect: vi.fn(),
  onMouseEnter: vi.fn(),
  mode: 'commands' as const,
  themes: VALID_THEMES,
  currentTheme: 'green' as ThemeName,
  onBack: vi.fn(),
};

describe('Suggestions', () => {
  it('renders all 11 command suggestions in commands mode', () => {
    render(<Suggestions {...defaultProps} />);
    for (const s of suggestions) {
      expect(screen.getByText(s.command)).toBeInTheDocument();
      expect(screen.getByText(s.description)).toBeInTheDocument();
    }
  });

  it('renders theme list in themes mode', () => {
    render(<Suggestions {...defaultProps} mode="themes" />);
    for (const t of VALID_THEMES) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
  });

  it('shows (current) indicator for active theme', () => {
    render(<Suggestions {...defaultProps} mode="themes" currentTheme="green" />);
    expect(screen.getByText('(current)')).toBeInTheDocument();
  });

  it('shows back button in themes mode', () => {
    render(<Suggestions {...defaultProps} mode="themes" />);
    expect(screen.getByText('Themes')).toBeInTheDocument();
  });

  it('fires onSelect on click', () => {
    const onSelect = vi.fn();
    render(<Suggestions {...defaultProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('whoami'));
    expect(onSelect).toHaveBeenCalledWith(0);
  });
});
