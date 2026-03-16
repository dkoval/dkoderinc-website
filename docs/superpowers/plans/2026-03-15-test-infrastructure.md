# Test Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Vitest + React Testing Library test suite covering utilities, hooks, and components to catch regressions early.

**Architecture:** Co-located `__tests__/` directories next to source. Global setup stubs browser APIs (matchMedia, IntersectionObserver, AudioContext). Shared `renderWithProviders` helper wraps components in ThemeProvider.

**Tech Stack:** Vitest, @testing-library/react, @testing-library/jest-dom, jsdom

**Spec:** `docs/superpowers/specs/2026-03-15-test-infrastructure-design.md`

---

## Chunk 1: Infrastructure + Pure Functions/Data

### Task 1: Install dependencies and configure Vitest

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `tsconfig.app.json`

- [ ] **Step 1: Install test dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Add test config to vite.config.ts**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

- [ ] **Step 3: Add vitest types to tsconfig.app.json**

Add `"vitest/globals"` to `compilerOptions.types`:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"],
    ...
  }
}
```

- [ ] **Step 4: Add test scripts to package.json**

```json
"scripts": {
  "test": "vitest",
  "test:ci": "vitest run"
}
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.app.json
git commit -m "chore: add Vitest and testing dependencies"
```

### Task 2: Create global test setup and helpers

**Files:**
- Create: `src/test/setup.ts`
- Create: `src/test/helpers.tsx`

- [ ] **Step 1: Create test setup file**

```ts
// src/test/setup.ts
import '@testing-library/jest-dom';

// matchMedia mock — default: desktop, no reduced motion
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// IntersectionObserver mock
class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds = [0];
  constructor(private callback: IntersectionObserverCallback) {
    setTimeout(() => {
      callback(
        [{ isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry],
        this
      );
    }, 0);
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// AudioContext mock
const mockGainNode = {
  gain: {
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
};

const mockOscillator = {
  type: 'sine' as OscillatorType,
  frequency: { value: 0 },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
};

class MockAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  resume = vi.fn().mockResolvedValue(undefined);
  createOscillator = vi.fn(() => ({ ...mockOscillator }));
  createGain = vi.fn(() => ({
    ...mockGainNode,
    gain: { ...mockGainNode.gain },
  }));
}
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: MockAudioContext,
});

// requestAnimationFrame — passthrough for fake-timer control
window.requestAnimationFrame = (cb: FrameRequestCallback) =>
  setTimeout(() => cb(performance.now()), 0) as unknown as number;
window.cancelAnimationFrame = (id: number) => clearTimeout(id);

// navigator.vibrate mock
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: vi.fn(),
});

// Clean up between tests
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});
```

- [ ] **Step 2: Create test helpers file**

```tsx
// src/test/helpers.tsx
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
```

- [ ] **Step 3: Verify setup with a smoke test**

Create `src/__tests__/smoke.test.ts`:

```ts
describe('test setup', () => {
  it('works', () => {
    expect(true).toBe(true);
  });

  it('has matchMedia mock', () => {
    const mql = window.matchMedia('(min-width: 768px)');
    expect(mql.matches).toBe(false);
  });
});
```

Run: `npx vitest run src/__tests__/smoke.test.ts`
Expected: 2 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/test/ src/__tests__/smoke.test.ts
git commit -m "chore: add test setup with browser API mocks and helpers"
```

### Task 3: Test formatUptime

**Files:**
- Create: `src/__tests__/constants.test.ts`
- Delete: `src/__tests__/smoke.test.ts`

- [ ] **Step 1: Write tests**

```ts
// src/__tests__/constants.test.ts
import { formatUptime } from '../constants';

describe('formatUptime', () => {
  it('returns "0s" for 0 seconds', () => {
    expect(formatUptime(0)).toBe('0s');
  });

  it('formats seconds only', () => {
    expect(formatUptime(45)).toBe('45s');
  });

  it('formats minutes and seconds', () => {
    expect(formatUptime(125)).toBe('2m 5s');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatUptime(3661)).toBe('1h 1m 1s');
  });

  it('formats days, hours, minutes, and seconds', () => {
    expect(formatUptime(90061)).toBe('1d 1h 1m 1s');
  });

  it('omits zero components at exact boundaries', () => {
    expect(formatUptime(60)).toBe('1m');
    expect(formatUptime(3600)).toBe('1h');
    expect(formatUptime(86400)).toBe('1d');
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/__tests__/constants.test.ts`
Expected: All 6 tests pass.

- [ ] **Step 3: Delete smoke test and commit**

```bash
rm src/__tests__/smoke.test.ts
git add src/__tests__/constants.test.ts
git commit -m "test: add formatUptime tests"
```

### Task 4: Test command registry

**Files:**
- Create: `src/components/Terminal/__tests__/commands.test.ts`

- [ ] **Step 1: Write tests**

```ts
// src/components/Terminal/__tests__/commands.test.ts
import { commands, suggestions } from '../commands';

describe('commands registry', () => {
  const dataCommands = [
    'whoami', 'whoamiDesktop', 'skills', 'skillsMobile',
    'contact', 'history', 'man dmytro',
  ];

  it('contains all data-driven commands', () => {
    for (const cmd of dataCommands) {
      expect(commands).toHaveProperty(cmd);
    }
  });

  it('marks contact as isHtml', () => {
    expect(commands['contact'].isHtml).toBe(true);
  });

  it('marks man dmytro as isHtml', () => {
    expect(commands['man dmytro'].isHtml).toBe(true);
  });

  it('does not mark non-HTML commands as isHtml', () => {
    const nonHtml = ['whoami', 'whoamiDesktop', 'skills', 'skillsMobile', 'history'];
    for (const cmd of nonHtml) {
      expect(commands[cmd].isHtml).toBeUndefined();
    }
  });

  it('has responsive variants for whoami', () => {
    expect(commands).toHaveProperty('whoami');
    expect(commands).toHaveProperty('whoamiDesktop');
  });

  it('has responsive variants for skills', () => {
    expect(commands).toHaveProperty('skills');
    expect(commands).toHaveProperty('skillsMobile');
  });

  it('returns non-empty arrays for all commands', () => {
    for (const key of Object.keys(commands)) {
      expect(Array.isArray(commands[key])).toBe(true);
      expect(commands[key].length).toBeGreaterThan(0);
    }
  });
});

describe('suggestions', () => {
  it('has exactly 10 entries', () => {
    expect(suggestions).toHaveLength(10);
  });

  it('each entry has command, description, and icon', () => {
    for (const s of suggestions) {
      expect(typeof s.command).toBe('string');
      expect(typeof s.description).toBe('string');
      expect(s.icon).toBeDefined();
    }
  });

  const expectedCommands = [
    'whoami', 'man dmytro', 'skills', 'history', 'contact',
    'uptime', 'theme', 'sound', 'clear', 'exit',
  ];

  it('contains all expected commands', () => {
    const names = suggestions.map(s => s.command);
    for (const cmd of expectedCommands) {
      expect(names).toContain(cmd);
    }
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/components/Terminal/__tests__/commands.test.ts`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/Terminal/__tests__/commands.test.ts
git commit -m "test: add command registry and suggestions tests"
```

### Task 5: Test ThemeContext

**Files:**
- Create: `src/__tests__/ThemeContext.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
// src/__tests__/ThemeContext.test.tsx
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
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/__tests__/ThemeContext.test.tsx`
Expected: All 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/ThemeContext.test.tsx
git commit -m "test: add ThemeContext provider and hook tests"
```

---

## Chunk 2: Hooks

### Task 6: Test useSoundEngine

**Files:**
- Create: `src/hooks/__tests__/useSoundEngine.test.ts`

- [ ] **Step 1: Write tests**

```ts
// src/hooks/__tests__/useSoundEngine.test.ts
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
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/hooks/__tests__/useSoundEngine.test.ts`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/__tests__/useSoundEngine.test.ts
git commit -m "test: add useSoundEngine hook tests"
```

### Task 7: Test useIsMobile

**Files:**
- Create: `src/hooks/__tests__/useIsMobile.test.ts`

- [ ] **Step 1: Write tests**

```ts
// src/hooks/__tests__/useIsMobile.test.ts
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
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/hooks/__tests__/useIsMobile.test.ts`
Expected: All 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/__tests__/useIsMobile.test.ts
git commit -m "test: add useIsMobile hook tests"
```

### Task 8: Test useIdleTimer

**Files:**
- Create: `src/hooks/__tests__/useIdleTimer.test.ts`

- [ ] **Step 1: Write tests**

```ts
// src/hooks/__tests__/useIdleTimer.test.ts
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
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/hooks/__tests__/useIdleTimer.test.ts`
Expected: All 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/__tests__/useIdleTimer.test.ts
git commit -m "test: add useIdleTimer hook tests"
```

---

## Chunk 3: Components

### Task 9: Test AutoSuggestion

**Files:**
- Create: `src/components/Terminal/__tests__/AutoSuggestion.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
// src/components/Terminal/__tests__/AutoSuggestion.test.tsx
import { render, screen } from '@testing-library/react';
import AutoSuggestion from '../AutoSuggestion';

describe('AutoSuggestion', () => {
  it('renders nothing when suggestion is null', () => {
    const { container } = render(
      <AutoSuggestion inputCommand="wh" suggestion={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders completion suffix', () => {
    render(<AutoSuggestion inputCommand="wh" suggestion="whoami" />);
    expect(screen.getByText('oami')).toBeInTheDocument();
  });

  it('renders hidden prefix matching input for alignment', () => {
    const { container } = render(
      <AutoSuggestion inputCommand="the" suggestion="theme" />
    );
    // The invisible prefix span contains the input text
    const spans = container.querySelectorAll('span');
    const prefixSpan = spans[0];
    expect(prefixSpan.textContent).toBe('the');
    expect(prefixSpan.className).toContain('opacity-0');
  });
});
```

- [ ] **Step 2: Run and commit**

```bash
npx vitest run src/components/Terminal/__tests__/AutoSuggestion.test.tsx
git add src/components/Terminal/__tests__/AutoSuggestion.test.tsx
git commit -m "test: add AutoSuggestion component tests"
```

### Task 10: Test Suggestions

**Files:**
- Create: `src/components/Terminal/__tests__/Suggestions.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
// src/components/Terminal/__tests__/Suggestions.test.tsx
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

describe('Suggestions', () => {
  it('renders all 10 command suggestions in commands mode', () => {
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
});
```

- [ ] **Step 2: Run and commit**

```bash
npx vitest run src/components/Terminal/__tests__/Suggestions.test.tsx
git add src/components/Terminal/__tests__/Suggestions.test.tsx
git commit -m "test: add Suggestions component tests"
```

### Task 11: Test BootSplash

**Files:**
- Create: `src/components/__tests__/BootSplash.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
// src/components/__tests__/BootSplash.test.tsx
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

    // 6 lines * 350ms + 400ms (done delay) + 300ms (onComplete delay) = 2800ms
    act(() => { vi.advanceTimersByTime(2800); });
    expect(onComplete).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run and commit**

```bash
npx vitest run src/components/__tests__/BootSplash.test.tsx
git add src/components/__tests__/BootSplash.test.tsx
git commit -m "test: add BootSplash component tests"
```

### Task 12: Test TerminalWindow

**Files:**
- Create: `src/components/__tests__/TerminalWindow.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
// src/components/__tests__/TerminalWindow.test.tsx
import { screen } from '@testing-library/react';
import TerminalWindow from '../TerminalWindow';
import { renderWithProviders } from '../../test/helpers';

describe('TerminalWindow', () => {
  it('renders title bar text', () => {
    renderWithProviders(
      <TerminalWindow><div>child</div></TerminalWindow>
    );
    expect(screen.getByText('dkoderinc.com — bash — 80×24')).toBeInTheDocument();
  });

  it('renders 3 traffic light dots', () => {
    const { container } = renderWithProviders(
      <TerminalWindow><div>child</div></TerminalWindow>
    );
    const dots = container.querySelectorAll('.rounded-full.w-3.h-3');
    expect(dots).toHaveLength(3);
  });

  it('applies bell-flash class when bellFlash is true', () => {
    const { container } = renderWithProviders(
      <TerminalWindow bellFlash><div>child</div></TerminalWindow>
    );
    expect(container.firstChild).toHaveClass('bell-flash');
  });

  it('does not apply bell-flash class when bellFlash is false', () => {
    const { container } = renderWithProviders(
      <TerminalWindow bellFlash={false}><div>child</div></TerminalWindow>
    );
    expect(container.firstChild).not.toHaveClass('bell-flash');
  });

  it('renders children', () => {
    renderWithProviders(
      <TerminalWindow><div data-testid="child">content</div></TerminalWindow>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders status bar', () => {
    renderWithProviders(
      <TerminalWindow><div>child</div></TerminalWindow>
    );
    // StatusBar renders "[0] bash"
    expect(screen.getByText('[0] bash')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and commit**

```bash
npx vitest run src/components/__tests__/TerminalWindow.test.tsx
git add src/components/__tests__/TerminalWindow.test.tsx
git commit -m "test: add TerminalWindow component tests"
```

### Task 13: Test StatusBar

**Files:**
- Create: `src/components/__tests__/StatusBar.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
// src/components/__tests__/StatusBar.test.tsx
import { screen } from '@testing-library/react';
import StatusBar from '../StatusBar';
import { renderWithProviders } from '../../test/helpers';

describe('StatusBar', () => {
  it('shows the current theme name', () => {
    renderWithProviders(<StatusBar />);
    expect(screen.getByText('green')).toBeInTheDocument();
  });

  it('shows sound toggle on desktop with off state', () => {
    // Default matchMedia mock: desktop (matches: false for all queries → useIsMobile returns true)
    // We need desktop, so mock min-width: 768px as matching
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

    renderWithProviders(<StatusBar soundEnabled={false} />);
    expect(screen.getByText(/♪ off/)).toBeInTheDocument();
  });

  it('shows sound toggle with on state when enabled', () => {
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

    renderWithProviders(<StatusBar soundEnabled={true} />);
    expect(screen.getByText(/♪ on/)).toBeInTheDocument();
  });

  it('hides sound toggle on mobile', () => {
    // Default mock: all queries return matches: false → useIsMobile returns true (mobile)
    renderWithProviders(<StatusBar soundEnabled={false} />);
    expect(screen.queryByText(/♪/)).not.toBeInTheDocument();
  });

  it('renders clock', () => {
    renderWithProviders(<StatusBar />);
    // Clock renders time — look for a pattern like HH:MM
    const statusBar = screen.getByText('[0] bash').closest('.status-bar');
    expect(statusBar?.textContent).toMatch(/\d{2}:\d{2}/);
  });
});
```

- [ ] **Step 2: Run and commit**

```bash
npx vitest run src/components/__tests__/StatusBar.test.tsx
git add src/components/__tests__/StatusBar.test.tsx
git commit -m "test: add StatusBar component tests"
```

### Task 14: Test Sidebar

**Files:**
- Create: `src/components/__tests__/Sidebar.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
// src/components/__tests__/Sidebar.test.tsx
import { screen } from '@testing-library/react';
import Sidebar from '../Sidebar';
import { renderWithProviders } from '../../test/helpers';

describe('Sidebar', () => {
  describe('desktop', () => {
    beforeEach(() => {
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
    });

    it('renders headshot image', () => {
      renderWithProviders(<Sidebar />);
      const img = screen.getAllByAltText('Dmytro Koval')[0];
      expect(img).toBeInTheDocument();
    });

    it('renders name and title', () => {
      renderWithProviders(<Sidebar />);
      expect(screen.getByText('Dmytro Koval')).toBeInTheDocument();
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    });

    it('renders social links with labels', () => {
      renderWithProviders(<Sidebar />);
      expect(screen.getByText('github.com')).toBeInTheDocument();
      expect(screen.getByText('linkedin.com')).toBeInTheDocument();
      expect(screen.getByText('twitter.com')).toBeInTheDocument();
      expect(screen.getByText('dkoderinc@gmail.com')).toBeInTheDocument();
    });

    it('renders social link hrefs', () => {
      renderWithProviders(<Sidebar />);
      const ghLink = screen.getByText('github.com').closest('a');
      expect(ghLink).toHaveAttribute('href', 'https://github.com/dkoval');
    });

    it('renders uptime', () => {
      renderWithProviders(<Sidebar />);
      expect(screen.getByText(/Uptime:/)).toBeInTheDocument();
    });
  });

  describe('mobile', () => {
    beforeEach(() => {
      // Default mock: matches: false → useIsMobile returns true (mobile)
    });

    it('renders compact bar with social icon links', () => {
      renderWithProviders(<Sidebar />);
      const links = screen.getAllByRole('link');
      // Mobile has 4 social icon links
      expect(links.length).toBeGreaterThanOrEqual(4);
    });

    it('renders name', () => {
      renderWithProviders(<Sidebar />);
      expect(screen.getByText('Dmytro Koval')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run and commit**

```bash
npx vitest run src/components/__tests__/Sidebar.test.tsx
git add src/components/__tests__/Sidebar.test.tsx
git commit -m "test: add Sidebar component tests"
```

### Task 15: Test Terminal

**Files:**
- Create: `src/components/Terminal/__tests__/Terminal.test.tsx`

This is the most complex test file. Key setup:
- Wrap in ThemeProvider
- Mock `prefers-reduced-motion: reduce` as `matches: true` to skip progressive reveal
- Mock `min-width: 768px` as `matches: true` for desktop (default)
- Use fake timers, advance by 600ms after command input for spinner delay

- [ ] **Step 1: Write tests**

```tsx
// src/components/Terminal/__tests__/Terminal.test.tsx
import { screen, fireEvent, act } from '@testing-library/react';
import Terminal from '../Terminal';
import { renderWithProviders } from '../../../test/helpers';

// Helper: set up matchMedia for Terminal tests
// - prefers-reduced-motion: true (skip progressive reveal)
// - min-width: 768px: configurable (desktop by default)
const setupMatchMedia = (mobile = false) => {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches:
      query === '(prefers-reduced-motion: reduce)' ||
      (query === '(min-width: 768px)' && !mobile),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

const defaultProps = {
  onShutdown: vi.fn(),
  onBell: vi.fn(),
  playSound: vi.fn(),
  soundEnabled: false,
  onSoundSet: vi.fn(),
  onRevealStateChange: vi.fn(),
};

// Helper: type a command and submit
const submitCommand = (command: string) => {
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: command } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

describe('Terminal', () => {
  beforeEach(() => {
    setupMatchMedia();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders help screen on mount', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    expect(screen.getByText('Available commands:')).toBeInTheDocument();
  });

  it('renders known command output after spinner delay', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    submitCommand('history');
    // Before timer: spinner visible
    expect(screen.getByText('processing query...')).toBeInTheDocument();
    // After 600ms: output rendered
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByText(/Still shipping/)).toBeInTheDocument();
  });

  it('shows error for unknown command', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    submitCommand('foobar');
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByText('Command not found: foobar')).toBeInTheDocument();
  });

  it('calls onBell and playSound error for unknown command', () => {
    const onBell = vi.fn();
    const playSound = vi.fn();
    renderWithProviders(<Terminal {...defaultProps} onBell={onBell} playSound={playSound} />);
    submitCommand('foobar');
    act(() => { vi.advanceTimersByTime(600); });
    expect(onBell).toHaveBeenCalled();
    expect(playSound).toHaveBeenCalledWith('error');
  });

  it('renders contact output as HTML with links', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    submitCommand('contact');
    act(() => { vi.advanceTimersByTime(600); });
    // Contact uses isHtml — links should be rendered as <a> tags
    const link = screen.getByText('github.com/dkoval');
    expect(link.closest('a')).toHaveAttribute('href', 'https://github.com/dkoval');
  });

  it('clears terminal and shows help on clear command', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    // Run a command first
    submitCommand('history');
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByText(/Still shipping/)).toBeInTheDocument();

    // Clear — synchronous, no timer needed
    submitCommand('clear');
    expect(screen.queryByText(/Still shipping/)).not.toBeInTheDocument();
    expect(screen.getByText('Available commands:')).toBeInTheDocument();
  });

  it('shows theme info when no argument given', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    submitCommand('theme');
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByText(/Current theme: green/)).toBeInTheDocument();
    expect(screen.getByText(/Available:/)).toBeInTheDocument();
  });

  it('shows error for invalid theme', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    submitCommand('theme invalid');
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByText(/Unknown theme: invalid/)).toBeInTheDocument();
  });

  it('shows sound status when no argument given', () => {
    renderWithProviders(<Terminal {...defaultProps} soundEnabled={false} />);
    submitCommand('sound');
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByText(/Sound: off/)).toBeInTheDocument();
  });

  it('calls onSoundSet(true) for sound on', () => {
    const onSoundSet = vi.fn();
    renderWithProviders(<Terminal {...defaultProps} onSoundSet={onSoundSet} />);
    submitCommand('sound on');
    act(() => { vi.advanceTimersByTime(600); });
    expect(onSoundSet).toHaveBeenCalledWith(true);
  });

  it('calls onSoundSet(false) for sound off', () => {
    const onSoundSet = vi.fn();
    renderWithProviders(<Terminal {...defaultProps} onSoundSet={onSoundSet} />);
    submitCommand('sound off');
    act(() => { vi.advanceTimersByTime(600); });
    expect(onSoundSet).toHaveBeenCalledWith(false);
  });

  it('uses mobile variant for responsive commands', () => {
    setupMatchMedia(true); // mobile
    renderWithProviders(<Terminal {...defaultProps} />);
    submitCommand('skills');
    act(() => { vi.advanceTimersByTime(600); });
    // Mobile skills uses 6-char bars and short labels like "Core Tech:"
    expect(screen.getByText(/Core Tech:/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/components/Terminal/__tests__/Terminal.test.tsx`
Expected: All tests pass.

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All 13 test files pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/Terminal/__tests__/Terminal.test.tsx
git commit -m "test: add Terminal component tests"
```

### Task 16: Final verification and cleanup

- [ ] **Step 1: Run full suite**

```bash
npx vitest run
```

Expected: All tests pass across all 13 files.

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Delete smoke test if still present**

Verify `src/__tests__/smoke.test.ts` was removed in Task 3.

- [ ] **Step 4: Final commit if any cleanup**

```bash
git add -A
git status
# Only commit if there are changes
```
