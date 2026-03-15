# Test Infrastructure Design Spec

## Overview

Add automated testing to the dkoderinc-website project to capture regressions early. The project currently has zero test infrastructure.

## Stack

- **Test runner**: Vitest (native Vite integration, shares config/transforms)
- **DOM environment**: jsdom (browser-faithful, handles matchMedia/IntersectionObserver/AudioContext)
- **Component testing**: @testing-library/react + @testing-library/jest-dom
- **File convention**: Co-located `__tests__/` directories next to source files

## Global Test Setup

`src/test/setup.ts` provides mocks for browser APIs not available in jsdom:
- `window.matchMedia` — returns a stub MediaQueryList with `addEventListener`/`removeEventListener`
- `IntersectionObserver` — stub that tracks observed elements
- `AudioContext` — stub with `createOscillator`, `createGain`, `resume`, `destination`
- `localStorage` — jsdom provides this, but we reset it between tests
- `navigator.vibrate` — no-op stub

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
- All 10 commands exist as keys in `commands` or are handled inline (clear, exit, theme, sound, uptime)
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
- `play()` is a no-op when disabled
- `play()` is a no-op when prefers-reduced-motion is active
- localStorage syncs on state change
- Return value has stable identity across renders (useMemo)

#### `src/hooks/__tests__/useIsMobile.test.ts`
Tests breakpoint detection:
- Returns `true` when viewport < 768px
- Returns `false` when viewport >= 768px
- Updates when media query changes

#### `src/hooks/__tests__/useIdleTimer.test.ts`
Tests idle detection:
- Returns `false` initially
- Returns `true` after timeout (30s, use fake timers)
- Resets to `false` on user activity events
- Respects `paused` option (doesn't go idle when paused)

### Components (7 files)

#### `src/components/Terminal/__tests__/Terminal.test.tsx`
Tests command execution and output:
- Known command (e.g. 'history') renders output lines
- Unknown command shows "Command not found" error
- `contact` command output renders with `isHtml` (dangerouslySetInnerHTML)
- `man dmytro` command output renders with `isHtml`
- `clear` resets terminal output to help screen
- `theme` with no arg shows current theme + available themes
- `theme <valid>` calls setTheme
- `theme <invalid>` shows error
- `sound` with no arg shows current state
- `sound on` / `sound off` calls onSoundSet
- Responsive commands: uses mobile variant when isMobile is true

#### `src/components/__tests__/Sidebar.test.tsx`
Tests sidebar rendering:
- Desktop: renders headshot image, name, title, social links with labels
- Mobile: renders compact bar with social icons
- All 4 social link URLs are present
- Uptime counter renders

#### `src/components/__tests__/StatusBar.test.tsx`
Tests status bar:
- Shows current theme name
- Sound toggle visible on desktop, hidden on mobile
- Sound toggle shows "on"/"off" based on prop
- Clock renders with time format

#### `src/components/__tests__/TerminalWindow.test.tsx`
Tests window chrome:
- Renders title bar with "dkoderinc.com — bash — 80×24"
- Renders traffic light dots (red, yellow, green)
- Applies bell-flash class when bellFlash prop is true
- Renders children in content area
- Renders StatusBar

#### `src/components/__tests__/BootSplash.test.tsx`
Tests boot animation:
- Renders boot lines
- Shows "Press any key to skip" text
- Calls onComplete callback (on keypress or after timeout)

#### `src/components/Terminal/__tests__/Suggestions.test.tsx`
Tests suggestion panel:
- Commands mode: renders all suggestion items with icons, commands, descriptions
- Themes mode: renders theme list with palette icons
- Current theme shows "(current)" indicator
- Back button visible in themes mode

#### `src/components/Terminal/__tests__/AutoSuggestion.test.tsx`
Tests inline suggestion:
- Renders completion text (suffix after typed input)
- Returns null when suggestion is null
- Invisible prefix matches input length for alignment

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

- `vite.config.ts`: Add `test` block with `environment: 'jsdom'`, `setupFiles`, `globals: true`
- `tsconfig.app.json`: Add `vitest/globals` to `types` (for global `describe`/`it`/`expect`)
- `package.json`: Add `"test": "vitest"` and `"test:ci": "vitest run"` scripts
