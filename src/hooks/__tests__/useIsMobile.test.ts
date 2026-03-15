import { renderHook, act } from '@testing-library/react';
import useIsMobile from '../useIsMobile';

describe('useIsMobile', () => {
  it('returns false on desktop (min-width: 768px matches)', () => {
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
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns true on mobile (min-width: 768px does not match)', () => {
    vi.mocked(window.matchMedia).mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('responds to media query change events', () => {
    let changeHandler: ((e: MediaQueryListEvent) => void) | null = null;

    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: query === '(min-width: 768px)', // starts as desktop
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_event: string, handler: EventListenerOrEventListenerObject) => {
        changeHandler = handler as (e: MediaQueryListEvent) => void;
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Simulate resize to mobile
    act(() => {
      changeHandler?.({ matches: false } as MediaQueryListEvent);
    });
    expect(result.current).toBe(true);
  });
});
