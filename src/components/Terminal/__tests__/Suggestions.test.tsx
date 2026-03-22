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

const baseProps = defaultProps;

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

  it('has role="listbox" on the container', () => {
    render(<Suggestions {...baseProps} />);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('has role="option" on each suggestion item', () => {
    render(<Suggestions {...baseProps} />);
    const options = screen.getAllByRole('option');
    expect(options.length).toBe(baseProps.suggestions.length);
  });

  it('sets aria-label="Run <command>" on each item', () => {
    render(<Suggestions {...baseProps} />);
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-label', `Run ${baseProps.suggestions[0].command}`);
  });

  it('highlights matching prefix when filterText is provided', () => {
    render(<Suggestions {...baseProps} filterText="sk" />);
    const option = screen.getByRole('option', { name: /Run skills/ });
    const highlight = option.querySelector('[data-highlight="match"]');
    expect(highlight).toHaveTextContent('sk');
  });
});
