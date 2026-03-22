import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TerminalInput from '../TerminalInput';

const baseProps = {
  inputCommand: '',
  inputRef: { current: null } as React.RefObject<HTMLInputElement | null>,
  onInputChange: vi.fn(),
  onKeyDown: vi.fn(),
  isInputBlocked: false,
  autoSuggestion: null,
  isMobile: false,
  showSuggestions: false,
  onInputClick: vi.fn(),
  onFocus: vi.fn(),
};

describe('TerminalInput', () => {
  it('uses inputMode="search" on mobile', () => {
    render(<TerminalInput {...baseProps} isMobile={true} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('inputMode', 'search');
  });

  it('has no inputMode on desktop', () => {
    render(<TerminalInput {...baseProps} isMobile={false} />);
    const input = screen.getByRole('textbox');
    expect(input).not.toHaveAttribute('inputMode');
  });

  it('sets aria-expanded based on showSuggestions prop', () => {
    const { rerender } = render(<TerminalInput {...baseProps} showSuggestions={false} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-expanded', 'false');

    rerender(<TerminalInput {...baseProps} showSuggestions={true} />);
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('calls onInputClick when input is clicked', () => {
    const onInputClick = vi.fn();
    render(<TerminalInput {...baseProps} onInputClick={onInputClick} />);
    fireEvent.click(screen.getByRole('textbox'));
    expect(onInputClick).toHaveBeenCalledOnce();
  });
});
