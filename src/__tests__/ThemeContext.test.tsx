import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, useTheme } from '../ThemeContext';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('ThemeContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults to green theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('green');
  });

  it('updates theme via setTheme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => { result.current.setTheme('amber'); });
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current.theme).toBe('amber');
  });

  it('persists theme to localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => { result.current.setTheme('tokyo-night'); });
    act(() => { vi.advanceTimersByTime(200); });
    expect(localStorage.getItem('dkoder-theme')).toBe('tokyo-night');
  });

  it('falls back to green for invalid stored theme', () => {
    localStorage.setItem('dkoder-theme', 'nonexistent');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('green');
  });

  it('sets data-theme attribute on document element', () => {
    renderHook(() => useTheme(), { wrapper });
    expect(document.documentElement.getAttribute('data-theme')).toBe('green');
  });
});
