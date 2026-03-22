# Performance Optimization: Re-render Elimination (Approach 1)

**Date:** 2026-03-21
**Goal:** Eliminate unnecessary React re-renders and fix algorithmic inefficiencies to achieve smooth performance on ~5-year-old mid-range devices (iPhone 8, Galaxy A50, 2019 Chromebooks).

**Scope:** Re-render architecture only. Bundle, asset, canvas, and font optimizations are deferred to Approach 2.

---

## 1. ThemeContext Value Memoization

**Problem:** `ThemeProvider` creates a new `{ theme, setTheme, transitioning }` object on every render. During theme transitions, `transitioning` toggles false→true→false, causing 2 unnecessary re-render cascades across all context consumers (Terminal, Sidebar, StatusBar, MatrixRain).

**Fix:** Wrap the context value in `useMemo`:

```tsx
const value = useMemo(
  () => ({ theme, setTheme, transitioning }),
  [theme, transitioning]
);
```

Note: `setTheme` is already wrapped in `useCallback` with an empty dependency array (stable reference), so it is excluded from deps for clarity. Only `theme` and `transitioning` actually change.

**File:** `src/ThemeContext.tsx`
**Impact:** Prevents cascade re-renders across the entire component tree on every theme transition.

---

## 2. Terminal Component Splitting

**Problem:** Terminal.tsx is 849 lines. A single keystroke re-evaluates the entire component — output list, suggestion logic, easter egg checks, hex background style, MOTD animation state.

**Fix:** Split into 3 memoized subcomponents. Terminal.tsx remains the orchestrator — owns all state, defines all handlers (wrapped in `useCallback`), passes props down.

### 2a. TerminalOutput

- Receives `terminalOutput` array, `isInputBlocked`, `revealStartIndex`
- Wrapped in `memo()`
- Handles output line rendering (`.map()` over terminalOutput), line-reveal CSS class, scroll indicator
- Only re-renders when output actually changes

### 2b. TerminalInput

- Receives `inputCommand`, `autoSuggestion`, `isInputBlocked`, `isMobile`, and memoized callbacks (`onInputChange`, `onKeyDown`)
- Wrapped in `memo()`
- Handles input field, cursor, auto-suggestion ghost text
- Only re-renders on keystrokes

### 2c. Suggestions (existing component)

The existing `src/components/Terminal/Suggestions.tsx` already handles suggestion list rendering and selection highlighting. Do NOT create a duplicate. Instead:

- Wrap the existing `Suggestions` component in `memo()`
- Ensure its props are stable (memoized callbacks from Terminal)
- Only re-renders when suggestion state changes

### Component boundaries and ref ownership

The existing Suggestions component is rendered conditionally inside the input area, coupled via `suggestionsRef` for click-outside detection. After the split:

- Suggestions remains a sibling to TerminalInput, rendered by Terminal.tsx (the orchestrator)
- Terminal.tsx owns both `inputRef` and `suggestionsRef` and passes them down
- The click-outside handler stays in Terminal.tsx (it needs access to both refs)

### Re-render isolation achieved

| User action | What re-renders | What skips |
|-------------|----------------|------------|
| Typing a character | TerminalInput | TerminalOutput; Suggestions skips unless it was visible (in which case it unmounts) |
| Command output arrives | TerminalOutput | TerminalInput, Suggestions |
| Opening suggestions | Suggestions | TerminalOutput, TerminalInput |
| Theme change | Terminal (hex style) | Subcomponents skip if props unchanged |

### DOMPurify at creation time

Move HTML sanitization from render-time to command-execution-time. Remove the `DOMPurify.sanitize()` call from the render path (currently in TerminalOutput's line rendering). Instead, call it once when constructing `TerminalLine` objects in `handleCommand` and store the sanitized HTML in `line.content`. TerminalOutput renders the pre-sanitized string directly via `dangerouslySetInnerHTML`.

### useImperativeHandle update

After wrapping action handlers in `useCallback`, the `useImperativeHandle` dependency array must also be updated to reference the memoized handlers.

**Files:** `src/components/Terminal/Terminal.tsx`, `src/components/Terminal/Suggestions.tsx` (add memo), new files `src/components/Terminal/TerminalOutput.tsx`, `src/components/Terminal/TerminalInput.tsx`

---

## 3. Progressive Reveal Optimization

**Problem:** Each revealed line triggers its own state update: `setRevealedCount(prev => prev + 1)` + `setTerminalOutput(prev => [...prev, oneNewLine])`. For a 30-line output, that's 30 `setState` calls, each spreading the entire array — O(n²) total copies.

**Fix:** Single persistent RAF loop with batched state updates.

- Track elapsed time and progress internally via refs (no state dependency)
- The RAF loop ticks at frame rate, checking elapsed time
- Every ~10ms, increment an internal line counter
- Every ~30ms (3 lines), flush accumulated lines in a single `setTerminalOutput` call: `prev => [...prev, ...batch]`
- On final batch, clear `revealingLines` state
- Remove `revealedCount` state variable — loop tracks progress internally
- RAF loop lives in a ref, not driven by effect re-triggers
- Cleanup cancels RAF on unmount
- **Stale closure safety:** `revealingLines` must be captured via ref so the RAF closure always sees the current value. The current effect-per-tick pattern avoids stale closures by re-running the effect on each state change; the proposed approach loses that safety net and must compensate with refs.

**Result:** 30 state updates → ~10. Visual result nearly identical — lines still stream smoothly. Batch size of 3 (30ms flush) keeps perceived animation close to 1-line-at-a-time while cutting state updates by 2/3.

**Visual tradeoff:** At 30ms flush intervals, 3 lines appear simultaneously every ~30ms rather than 1 line every 10ms. At 60fps (16.67ms/frame), this is ~2 frames per batch — below perceptible threshold for most users. If testing reveals visible stuttering, reduce batch to 2 lines (20ms flush).

**File:** `src/components/Terminal/Terminal.tsx`

---

## 4. Clock and Uptime Component Extraction

**Problem:** Sidebar re-renders every second for uptime text. StatusBar re-renders every second for clock text. Both trigger full component re-renders (including headshot filter, social links, theme indicator, sound button) for a single text change.

**Fix:** Extract two small isolated components.

### 4a. `<Clock />`

- Owns its own `setInterval` and `useState`
- Renders just the time string
- Wrapped in `memo()`
- Parent StatusBar stops re-rendering every second

### 4b. `<Uptime />`

- Owns its own `setInterval` and `useState`
- Renders just the uptime string
- Wrapped in `memo()`
- Parent Sidebar stops re-rendering every second

**Result:** Sidebar and StatusBar become effectively static renders that only update on theme/sound state changes.

**Files:** New files `src/components/Clock.tsx` and `src/components/Uptime.tsx`. Must be defined at module scope (not inline inside parent components) for `memo()` to work — inline components get recreated each parent render, defeating memoization.

---

## 5. Handler Memoization

**Problem:** All Terminal handlers recreated on every render — `handleInputChange`, `handleCommand`, `actionTab`, `actionUp`, `actionDown`, `actionEnter`, `handleClickOutside`. This defeats `memo()` on subcomponents because new function references are passed as props on every render.

**Fix:** Wrap all handlers in `useCallback` with explicit dependencies. This is a prerequisite for Section 2 — without stable function references, the memoized subcomponents re-render anyway.

### Handling `handleCommand` complexity

`handleCommand` closes over many values: `theme`, `soundEnabled`, `isMobile`, `playSound`, `onShutdown`, `onBell`, state setters, and more. Wrapping it in `useCallback` with all these as dependencies would make it unstable — it would recreate on nearly every render, defeating `memo()` on TerminalOutput.

**Strategy: Use refs for frequently-changing values.** Store `theme`, `soundEnabled`, `isMobile`, and similar values in refs (e.g., `themeRef.current = theme`). The `useCallback` then reads from refs inside the closure, keeping the dependency array minimal (only state setters, which are stable). This is the standard "latest ref" pattern for stabilizing callbacks that need access to current values without triggering recreation.

Also memoize `displayMotd` and `displayHelp` with `useCallback`, since they are called inside `handleCommand` and would otherwise be implicit dependencies.

**File:** `src/components/Terminal/Terminal.tsx`

---

## 6. Passive Event Listeners

**Problem:** `useIdleTimer` adds `touchstart` and `mousemove` listeners without `{ passive: true }`. On mobile, non-passive `touchstart` listeners block the browser's scroll optimization, causing touch jank.

**Fix:** Change `el.addEventListener(evt, resetTimer)` to `el.addEventListener(evt, resetTimer, { passive: true })`. The `resetTimer` callback never calls `preventDefault()`, so this is safe.

**File:** `src/hooks/useIdleTimer.ts`

---

## 7. Terminal Output Cap

**Problem:** `terminalOutput` array grows unbounded. After ~100 commands, the DOM has hundreds of nodes. Every state update diffs them all.

**Fix:** Cap at 500 lines when appending: `setTerminalOutput(prev => [...prev, ...newLines].slice(-500))`.

- 500 lines is generous — users won't scroll back that far on a portfolio site
- The `clear` command already resets to empty
- Oldest output scrolls away naturally

**File:** `src/components/Terminal/Terminal.tsx`

---

## Testing Strategy

- All 81 existing tests must continue to pass after changes
- **Component splitting:** Existing Terminal integration tests in `src/components/Terminal/__tests__/Terminal.test.tsx` should continue to work since they render Terminal (which composes the subcomponents). New subcomponents do NOT need their own test files — the integration tests cover them through Terminal. Update imports only if tests directly reference internals that moved.
- **Progressive reveal:** Verify output appears correctly with batched updates. Test with both short (1-3 lines) and long (20+ lines) outputs.
- **Clock/Uptime:** Verify they tick independently and render correct values
- **Output cap:** Verify oldest lines are dropped when cap is reached and most recent output is preserved
- **Passive listeners:** Verify idle timer still fires after 30s
- **Handler memoization:** Verify all commands still execute correctly after wrapping in useCallback (stale closure risk)

---

## Out of Scope (Deferred to Approach 2)

- Delete unused `background.webp` (960 KB)
- Add `font-display: swap` + font preloading
- Lazy-load DOMPurify via dynamic `import()`
- MatrixRain DPI scaling, ResizeObserver debouncing, random char pool
- `will-change` on high-frequency animations
- Throttle mousemove in idle timer
- Add touchstart to click-outside handler
