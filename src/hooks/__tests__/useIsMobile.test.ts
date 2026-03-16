import { renderHook, act } from '@testing-library/react';
import useIsMobile from '../useIsMobile';
import { mockMatchMedia } from '../../test/helpers';

describe('useIsMobile', () => {
  it('returns false on desktop (min-width: 768px matches)', () => {
    mockMatchMedia(q => q === '(min-width: 768px)');
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns true on mobile (min-width: 768px does not match)', () => {
    mockMatchMedia(() => false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('responds to media query change events', () => {
    let changeHandler: ((e: MediaQueryListEvent) => void) | null = null;

    mockMatchMedia(
      q => q === '(min-width: 768px)',
      {
        addEventListener: vi.fn((_event: string, handler: EventListenerOrEventListenerObject) => {
          changeHandler = handler as (e: MediaQueryListEvent) => void;
        }),
      },
    );

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Simulate resize to mobile
    act(() => {
      changeHandler?.({ matches: false } as MediaQueryListEvent);
    });
    expect(result.current).toBe(true);
  });
});
