import { render, screen, fireEvent, act } from '@testing-library/react';
import BootSplash from '../BootSplash';

describe('BootSplash', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders first boot line', () => {
    render(<BootSplash onComplete={vi.fn()} />);
    // First line appears via setTimeout(..., 0) — advance to flush it
    act(() => { vi.advanceTimersByTime(0); });
    expect(screen.getByText('DKODER BIOS v2.6.0')).toBeInTheDocument();
  });

  it('shows skip hint', () => {
    render(<BootSplash onComplete={vi.fn()} />);
    // Skip hint only renders when visibleLines > 0
    act(() => { vi.advanceTimersByTime(0); });
    expect(screen.getByText('[Press any key to skip]')).toBeInTheDocument();
  });

  it('calls onComplete on keydown', () => {
    const onComplete = vi.fn();
    render(<BootSplash onComplete={onComplete} />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onComplete).toHaveBeenCalled();
  });

  it('calls onComplete after full animation timeout', () => {
    const onComplete = vi.fn();
    render(<BootSplash onComplete={onComplete} />);

    // 6 lines * 350ms + 400ms (done delay) = 2500ms sets done=true, then
    // the effect scheduling onComplete fires after a 300ms delay.
    // Advance past the done transition, then flush the React re-render,
    // then advance past the final 300ms timeout.
    act(() => { vi.advanceTimersByTime(2500); });
    act(() => { vi.advanceTimersByTime(300); });
    expect(onComplete).toHaveBeenCalled();
  });
});
