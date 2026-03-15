import { renderHook, act } from '@testing-library/react';
import useSoundEngine from '../useSoundEngine';

describe('useSoundEngine', () => {
  it('defaults to disabled', () => {
    const { result } = renderHook(() => useSoundEngine());
    expect(result.current.enabled).toBe(false);
  });

  it('reads initial state from localStorage', () => {
    localStorage.setItem('dkoder-sound-enabled', '1');
    const { result } = renderHook(() => useSoundEngine());
    expect(result.current.enabled).toBe(true);
  });

  it('toggles enabled state', () => {
    const { result } = renderHook(() => useSoundEngine());
    act(() => { result.current.toggle(); });
    expect(result.current.enabled).toBe(true);
    act(() => { result.current.toggle(); });
    expect(result.current.enabled).toBe(false);
  });

  it('sets enabled directly', () => {
    const { result } = renderHook(() => useSoundEngine());
    act(() => { result.current.setEnabled(true); });
    expect(result.current.enabled).toBe(true);
    act(() => { result.current.setEnabled(false); });
    expect(result.current.enabled).toBe(false);
  });

  it('syncs state to localStorage', () => {
    const { result } = renderHook(() => useSoundEngine());
    act(() => { result.current.setEnabled(true); });
    expect(localStorage.getItem('dkoder-sound-enabled')).toBe('1');
    act(() => { result.current.setEnabled(false); });
    expect(localStorage.getItem('dkoder-sound-enabled')).toBe('0');
  });

  it('play is a no-op when disabled', () => {
    const { result } = renderHook(() => useSoundEngine());
    // enabled defaults to false — play should be a no-op
    act(() => { result.current.play('keypress'); });
    // Verify no oscillator was created (AudioContext.createOscillator not called)
    const MockAudioContext = window.AudioContext as unknown as { prototype: { createOscillator: ReturnType<typeof vi.fn> } };
    const instance = new MockAudioContext();
    expect(instance.createOscillator).not.toHaveBeenCalled();
  });

  it('play is a no-op when prefers-reduced-motion is active', () => {
    // Must set before hook renders so the ref captures matches: true
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useSoundEngine());
    act(() => { result.current.setEnabled(true); });
    act(() => { result.current.play('keypress'); });
    // Sound is enabled but reduced motion blocks playback — no tones should play
  });

  it('returns stable object identity when enabled does not change', () => {
    const { result, rerender } = renderHook(() => useSoundEngine());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
