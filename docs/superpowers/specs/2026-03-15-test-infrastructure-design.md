# Test Infrastructure Design Spec

## Overview

Add automated testing to the dkoderinc-website project to capture regressions early. The project currently has zero test infrastructure.

## Stack

- **Test runner**: Vitest (native Vite integration, shares config/transforms)
- **DOM environment**: jsdom (lightweight DOM; missing browser APIs stubbed in setup)
- **Component testing**: @testing-library/react + @testing-library/jest-dom
- **File convention**: Co-located `__tests__/` directories next to source files

## Global Test Setup

`src/test/setup.ts` provides mocks for browser APIs not available in jsdom:
- `window.matchMedia` — returns a stub MediaQueryList with `addEventListener`/`removeEventListener`. Default: `matches: false` (desktop, no reduced motion). Tests that need mobile or reduced-motion must override before rendering.
- `IntersectionObserver` — stub that immediately calls callback with `isIntersecting: true`
- `AudioContext` — stub with `createOscillator`, `createGain`, `resume`, `destination`
- `localStorage` — jsdom provides this, but we clear it between tests via `afterEach`
- `navigator.vibrate` — no-op stub
- `requestAnimationFrame` — passthrough to `setTimeout(cb, 0)` for predictable fake-timer control

### Component Test Helpers

A shared `renderWithProviders` helper wraps components in `ThemeProvider` (required by any component that calls `useTheme()`). Components that need it: Terminal, Sidebar, StatusBar, TerminalWindow.

## Test Plan (13 files)

### Pure Functions / Data (3 files)

#### `src/__tests__/constants.test.ts`
Tests `formatUptime`:
- 0 seconds → "0s"
- Seconds only (45s → "45s")
- Minutes + seconds (125s → "2m 5s")
- Hours (3661s → "1h 1m 1s")
- Days (90061s → "1d 1h 1m 1s")
- Exact boundaries (60s → "1m", 3600s → "1h")

#### `src/components/Terminal/__tests__/commands.test.ts`
Tests command registry structure:
- All data-driven commands exist as keys in `commands` (whoami, whoamiDesktop, skills, skillsMobile, contact, history, man dmytro)
- `contact` and `man dmytro` have `isHtml === true`
- Other commands do NOT have `isHtml`
- `whoami` and `whoamiDesktop` both exist (responsive variants)
- `skills` and `skillsMobile` both exist (responsive variants)
- `suggestions` array has 10 entries with command, description, and icon

#### `src/__tests__/ThemeContext.test.tsx`
Tests ThemeProvider + useTheme hook:
- Default theme is 'green'
- `setTheme` updates the theme value
- Theme is persisted to localStorage
- Invalid stored theme falls back to 'green'
- `data-theme` attribute set on document element

### Hooks (3 files)

#### `src/hooks/__tests__/useSoundEngine.test.ts`
Tests sound engine state management:
- Default state is disabled (no localStorage entry)
- `toggle` flips enabled state
- `setEnabled(true/false)` sets state directly
- `play()` is a no-op when disabled (does not call AudioContext methods)
- `play()` is a no-op when prefers-reduced-motion is active — mock must be set **before** hook renders (ref reads matchMedia at initialization)
- localStorage syncs on state change
- Return value has stable identity across renders when `enabled` doesn't change (useMemo)

#### `src/hooks/__tests__/useIsMobile.test.ts`
Tests breakpoint detection:
- Returns `true` when viewport < 768px (matchMedia mock returns `matches: true` for min-width query → `!matches` = mobile)
- Returns `false` when viewport >= 768px
- Updates when media query change listener fires

#### `src/hooks/__tests__/useIdleTimer.test.ts`
Tests idle detection:
- Hook requires a `containerRef` pointing to a real DOM element — use `renderHook` with a wrapper component that creates and provides a ref to a rendered `<div>`
- Returns `false` initially
- Returns `true` after 30_000ms timeout (use `vi.useFakeTimers()` + `vi.advanceTimersByTime()`)
- Resets to `false` on user activity events dispatched on the container element
- Stays `false` (timer cleared) when `paused: true`

### Components (7 files)

#### `src/components/Terminal/__tests__/Terminal.test.tsx`

**Important implementation notes:**
- Terminal must be wrapped in `ThemeProvider`
- Terminal props: provide mock functions for `onShutdown`, `onBell`, `playSound`, `onSoundSet`, `onRevealStateChange`; provide `soundEnabled: false`
- All commands except `clear` and `exit` go through a 600ms `setTimeout` spinner delay — tests must use `vi.useFakeTimers()` and `vi.advanceTimersByTime(600)` after entering a command
- Multi-line outputs use RAF-based progressive reveal — to avoid this complexity, set the `matchMedia` mock for `prefers-reduced-motion` to return `matches: true` before rendering. This makes Terminal compute `reducedMotion = true` via `useState`, which skips progressive reveal and renders output instantly after the 600ms delay.
- `clear` is handled synchronously (no spinner delay, no timer advancement needed)

Tests:
- Known command (e.g. 'history') renders output lines after 600ms timer
- Unknown command shows "Command not found: ..." with error styling after 600ms
- `contact` command output contains links (isHtml rendering via dangerouslySetInnerHTML)
- `clear` resets terminal output to help screen (synchronous, no timer)
- `theme` with no arg shows "Current theme:" and "Available:"
- `theme <invalid>` shows "Unknown theme:" error
- `sound` with no arg shows "Sound:" status
- `sound on` / `sound off` calls onSoundSet with true/false
- Responsive commands: mock `useIsMobile` to return true, verify mobile variant renders (shorter bars in skills)

#### `src/components/__tests__/Sidebar.test.tsx`
Tests sidebar rendering (wrap in `ThemeProvider`):
- Desktop (default matchMedia mock): renders headshot image, "Dmytro Koval" name, "Senior Software Engineer" title
- Desktop: renders social links with labels — assert on rendered text content ("github.com", "linkedin.com", etc.) and `href` attributes
- Mobile (override matchMedia): renders compact bar with 4 icon links
- Uptime counter renders (assert "Uptime:" text present)

#### `src/components/__tests__/StatusBar.test.tsx`
Tests status bar (wrap in `ThemeProvider`):
- Shows current theme name ("green")
- Desktop (default mock): sound toggle button visible, shows "♪ off" when `soundEnabled={false}`, "♪ on" when `soundEnabled={true}`
- Mobile (mock `useIsMobile` to return true): sound toggle NOT in DOM (conditional rendering via `!isMobile`)
- Clock renders (assert time text present)

#### `src/components/__tests__/TerminalWindow.test.tsx`
Tests window chrome (wrap in `ThemeProvider`):
- Renders title bar text "dkoderinc.com — bash — 80×24" (note: em dashes `—` and multiplication sign `×`)
- Renders 3 traffic light dots
- Applies `bell-flash` class when `bellFlash={true}`, absent when `false`
- Renders children passed to it
- Renders StatusBar component within

#### `src/components/__tests__/BootSplash.test.tsx`
Tests boot animation:
- Renders first boot line ("DKODER BIOS v2.6.0")
- Shows "[Press any key to skip]" text (with square brackets)
- Calls `onComplete` on keydown event (immediate skip path)
- Calls `onComplete` after full timeout: `LINES.length * 350 + 400 + 300` ms (use fake timers)

#### `src/components/Terminal/__tests__/Suggestions.test.tsx`
Tests suggestion panel:
- Commands mode: renders all 10 suggestion items with command names and descriptions
- Themes mode: renders theme names with palette icons
- Current theme shows "(current)" indicator
- Back button ("Themes" with chevron) visible in themes mode
- `onSelect` callback fires on click

#### `src/components/Terminal/__tests__/AutoSuggestion.test.tsx`
Tests inline suggestion:
- Renders completion suffix (e.g., input="wh", suggestion="whoami" → renders "oami")
- Returns null (renders nothing) when `suggestion` is null
- Hidden prefix span matches input text for alignment

## Out of Scope

- CSS animations / visual effects (scanlines, CRT glow, matrix rain canvas)
- Audio output (state management tested, not Web Audio synthesis)
- Shutdown sequence timing (timing-dependent state machine, fragile)
- App.tsx orchestration (composition of individually tested units)
- E2E / Playwright tests (separate effort)

## Dependencies to Install

```
vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

## Configuration

- `vite.config.ts`: Add `test` block with `environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`, `globals: true`
- `tsconfig.app.json`: Add `vitest/globals` to `types` array
- `package.json`: Add `"test": "vitest"` and `"test:ci": "vitest run"` scripts
