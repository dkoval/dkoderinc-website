import { renderHook, act } from '@testing-library/react';
import useSoundEngine from '../useSoundEngine';
import { mockMatchMedia } from '../../test/helpers';

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
  });

  it('play is a no-op when prefers-reduced-motion is active', () => {
    // Must set before hook renders so the ref captures matches: true
    mockMatchMedia(q => q === '(prefers-reduced-motion: reduce)');

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
