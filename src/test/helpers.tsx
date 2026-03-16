import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '../ThemeContext';

const AllProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options });

/** Override window.matchMedia with a predicate that determines `matches` per query. */
export const mockMatchMedia = (
  predicate: (query: string) => boolean,
  overrides?: { addEventListener?: ReturnType<typeof vi.fn> },
) => {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: predicate(query),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: overrides?.addEventListener ?? vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};
