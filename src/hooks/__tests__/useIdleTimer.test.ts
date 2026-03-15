import { renderHook, act } from '@testing-library/react';
import useIdleTimer from '../useIdleTimer';

describe('useIdleTimer', () => {
  let containerEl: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    containerEl = document.createElement('div');
    document.body.appendChild(containerEl);
  });

  afterEach(() => {
    vi.useRealTimers();
    containerEl.remove();
  });

  it('returns false initially', () => {
    const ref = { current: containerEl };
    const { result } = renderHook(() => useIdleTimer({ containerRef: ref }));
    expect(result.current).toBe(false);
  });

  it('returns true after 30s idle timeout', () => {
    const ref = { current: containerEl };
    const { result } = renderHook(() => useIdleTimer({ containerRef: ref }));
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(result.current).toBe(true);
  });

  it('resets to false on user activity', () => {
    const ref = { current: containerEl };
    const { result } = renderHook(() => useIdleTimer({ containerRef: ref }));

    act(() => { vi.advanceTimersByTime(30_000); });
    expect(result.current).toBe(true);

    act(() => { containerEl.dispatchEvent(new Event('click')); });
    expect(result.current).toBe(false);
  });

  it('stays false when paused', () => {
    const ref = { current: containerEl };
    const { result } = renderHook(() => useIdleTimer({ containerRef: ref, paused: true }));
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(result.current).toBe(false);
  });
});
