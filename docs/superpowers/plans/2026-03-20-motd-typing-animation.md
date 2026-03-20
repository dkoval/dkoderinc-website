# MOTD Typing Animation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a character-by-character typing animation to the MOTD hint line after the boot splash completes, making the terminal feel alive.

**Architecture:** Pass a `bootComplete` prop from App.tsx to Terminal. A new `useEffect` watching `bootComplete` drives a 300ms delay → setInterval typing animation. Timer refs enable cleanup on unmount/clear/early-completion. User interaction during animation snaps to final state.

**Tech Stack:** React 19, TypeScript, Vitest, @testing-library/react

**Spec:** `docs/superpowers/specs/2026-03-19-motd-typing-animation-design.md`

---

## Chunk 1: Wire `bootComplete` prop from App to Terminal

### Task 1: Add `bootComplete` prop to TerminalProps and pass from App.tsx

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx:31-39` (TerminalProps type), `Terminal.tsx:41` (component signature)
- Modify: `src/App.tsx:255-264` (Terminal JSX)

- [ ] **Step 1: Add `bootComplete` to TerminalProps type**

In `src/components/Terminal/Terminal.tsx`, add `bootComplete?: boolean` to the `TerminalProps` type at line 31-39:

```tsx
type TerminalProps = {
  onShutdown?: () => void;
  onBell?: () => void;
  playSound?: (sound: SoundType) => void;
  soundEnabled?: boolean;
  onSoundSet?: (enabled: boolean) => void;
  onRevealStateChange?: (isRevealing: boolean) => void;
  bootComplete?: boolean;
  ref?: Ref<TerminalHandle>;
};
```

- [ ] **Step 2: Destructure `bootComplete` in component signature**

Update line 41 to include `bootComplete`:

```tsx
const Terminal = ({ onShutdown, onBell, playSound, soundEnabled, onSoundSet, onRevealStateChange, bootComplete, ref }: TerminalProps) => {
```

- [ ] **Step 3: Pass `bootComplete` from App.tsx**

In `src/App.tsx`, add `bootComplete={!showBootSplash}` to the Terminal component at line 255:

```tsx
              <Terminal
                key={sessionKey}
                ref={terminalRef}
                onShutdown={handleShutdown}
                onBell={handleBell}
                playSound={sound.play}
                soundEnabled={sound.enabled}
                onSoundSet={sound.setEnabled}
                onRevealStateChange={setIsRevealing}
                bootComplete={!showBootSplash}
              />
```

- [ ] **Step 4: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/Terminal/Terminal.tsx src/App.tsx
git commit -m "feat: pass bootComplete prop from App to Terminal"
```

---

## Chunk 2: Animation logic in Terminal.tsx

### Task 2: Add animation timer refs and state

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx:57-68` (refs section)

- [ ] **Step 1: Add MOTD animation refs**

After `spinnerIdRef` (line 58), add three refs:

```tsx
  const motdDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const motdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const motdAnimatingRef = useRef(false);
```

- `motdDelayRef` — the 300ms setTimeout ID
- `motdIntervalRef` — the setInterval ID
- `motdAnimatingRef` — whether animation is in progress (for early completion checks)

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 3: Change mount effect to set empty output

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx:525-526` (mount effect)

- [ ] **Step 1: Replace `displayMotd()` with empty output in mount effect**

Change line 526 from:
```tsx
    setTerminalOutput(displayMotd());
```
to:
```tsx
    setTerminalOutput([{ content: '', type: 'output' }]);
```

The MOTD content will now be set by the animation effect (Task 4) when `bootComplete` transitions to `true`.

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 4: Add animation effect

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx` (insert new useEffect after the mount effect, before the scroll effect)

- [ ] **Step 1: Add the animation useEffect**

Insert a new `useEffect` after the mount effect's closing `}, []);` (after line 547) and before the scroll effect (line 549):

```tsx
  // MOTD typing animation — triggered when boot splash completes
  useEffect(() => {
    if (!bootComplete) return;

    // Reduced motion or no bootComplete prop: show MOTD instantly
    if (reducedMotion) {
      setTerminalOutput(displayMotd());
      return;
    }

    const plainText = isMobile
      ? 'Tap \u2261 to explore commands.'
      : "Type 'help' or press Tab to explore.";

    motdAnimatingRef.current = true;
    setTerminalOutput([{ content: '', type: 'output' }]);

    let charIndex = 0;

    motdDelayRef.current = setTimeout(() => {
      motdDelayRef.current = null;

      motdIntervalRef.current = setInterval(() => {
        if (!motdAnimatingRef.current || charIndex >= plainText.length) {
          if (motdIntervalRef.current) clearInterval(motdIntervalRef.current);
          motdIntervalRef.current = null;
          motdAnimatingRef.current = false;
          setTerminalOutput(displayMotd());
          return;
        }
        charIndex++;
        setTerminalOutput([{ content: plainText.slice(0, charIndex), type: 'output' }]);
      }, 30);
    }, 300);

    return () => {
      if (motdDelayRef.current) { clearTimeout(motdDelayRef.current); motdDelayRef.current = null; }
      if (motdIntervalRef.current) { clearInterval(motdIntervalRef.current); motdIntervalRef.current = null; }
      motdAnimatingRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootComplete]);
```

Key details:
- Watches `bootComplete` — fires when boot splash completes or on remount after session restart
- 300ms delay lets the CSS opacity fade-in settle before typing starts
- 30ms per character for consistent pacing (~1.1s for 37-char desktop text)
- On completion, swaps plain text for the final HTML version with `--terminal-primary` highlights
- Cleanup clears both timers on unmount
- `displayMotd` and `isMobile` are stable across the animation's lifetime (mount-only values), so the eslint disable is safe
- `reducedMotion` path sets `displayMotd()` immediately — tests use `prefers-reduced-motion: true` by default

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 5: Add early completion to user interaction handlers

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx:179-191` (handleInputChange), `Terminal.tsx:419-431` (actionTab), `Terminal.tsx:193-213` (handleCommand — clear handler)

- [ ] **Step 1: Add early completion to `handleInputChange`**

In `handleInputChange` (line 179), add a check at the top of the function, after the `isInputBlocked` guard and before the `pendingExecuteRef` check:

```tsx
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (isInputBlocked) return;
    if (motdAnimatingRef.current) {
      motdAnimatingRef.current = false;
      if (motdDelayRef.current) { clearTimeout(motdDelayRef.current); motdDelayRef.current = null; }
      if (motdIntervalRef.current) { clearInterval(motdIntervalRef.current); motdIntervalRef.current = null; }
      setTerminalOutput(displayMotd());
    }
    if (pendingExecuteRef.current) {
```

- [ ] **Step 2: Add early completion to `actionTab`**

In `actionTab` (line 419), add a check at the top of the function:

```tsx
  const actionTab = () => {
    if (motdAnimatingRef.current) {
      motdAnimatingRef.current = false;
      if (motdDelayRef.current) { clearTimeout(motdDelayRef.current); motdDelayRef.current = null; }
      if (motdIntervalRef.current) { clearInterval(motdIntervalRef.current); motdIntervalRef.current = null; }
      setTerminalOutput(displayMotd());
    }
    if (showSuggestions) {
```

- [ ] **Step 3: Add early completion to `handleCommand`**

In `handleCommand` (line 193), add a check after the `isInputBlocked` guard and before `trimmedCmd === ''`:

```tsx
  const handleCommand = (cmd: string) => {
    if (isInputBlocked) return;
    if (motdAnimatingRef.current) {
      motdAnimatingRef.current = false;
      if (motdDelayRef.current) { clearTimeout(motdDelayRef.current); motdDelayRef.current = null; }
      if (motdIntervalRef.current) { clearInterval(motdIntervalRef.current); motdIntervalRef.current = null; }
      setTerminalOutput(displayMotd());
    }
    const trimmedCmd = cmd.trim().toLowerCase();
```

Note: The `clear` handler (line 208) doesn't need a separate check — the early completion block above runs first, canceling the animation. Then `clear` overwrites with `displayMotd()` as usual.

- [ ] **Step 4: Add timer cleanup to existing cleanup effect**

Update the cleanup effect (line 571-579) to also clear MOTD animation timers:

```tsx
  useEffect(() => {
    const timeouts = spinnerTimeouts.current;
    return () => {
      timeouts.forEach(clearTimeout);
      timeouts.clear();
      if (pendingExecuteRef.current) clearTimeout(pendingExecuteRef.current);
      if (motdDelayRef.current) clearTimeout(motdDelayRef.current);
      if (motdIntervalRef.current) clearInterval(motdIntervalRef.current);
      cancelAnimationFrame(revealRafRef.current);
    };
  }, []);
```

- [ ] **Step 5: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/components/Terminal/Terminal.tsx
git commit -m "feat: add MOTD typing animation with early completion"
```

---

## Chunk 3: Tests

### Task 6: Update existing tests and add new test

**Files:**
- Modify: `src/components/Terminal/__tests__/Terminal.test.tsx:15-22` (defaultProps), `Terminal.test.tsx:41-46` (mount test), `Terminal.test.tsx:83-95` (clear test)

- [ ] **Step 1: Add `bootComplete: true` to defaultProps**

In `Terminal.test.tsx`, update defaultProps (line 15-22) to include `bootComplete: true`:

```tsx
const defaultProps = {
  onShutdown: vi.fn(),
  onBell: vi.fn(),
  playSound: vi.fn(),
  soundEnabled: false,
  onSoundSet: vi.fn(),
  onRevealStateChange: vi.fn(),
  bootComplete: true,
};
```

This is critical: the test setup already uses `prefers-reduced-motion: true` (via `setupTerminalMedia`), which means `reducedMotion` is true and the animation is skipped. With `bootComplete: true`, the animation effect fires but takes the instant `reducedMotion` path, setting `displayMotd()` immediately. **Existing assertions still pass.**

- [ ] **Step 2: Run existing tests to verify they still pass**

Run: `npx vitest run src/components/Terminal/__tests__/Terminal.test.tsx --reporter=verbose`
Expected: All 9 existing tests pass

- [ ] **Step 3: Add early completion test**

Add a new test after the `'shows full help output when help command is typed'` test (after line 101):

```tsx
  it('snaps MOTD to final state on early user input', () => {
    // Override reduced-motion to false so animation would normally play
    mockMatchMedia(query => query === '(min-width: 768px)');
    renderWithProviders(<Terminal {...defaultProps} />);
    // Advance past the 300ms delay to start the animation
    act(() => { vi.advanceTimersByTime(350); });
    // User starts typing — animation should snap to final state
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'h' } });
    expect(screen.getAllByText((_, el) =>
      el?.tagName === 'SPAN' && /Type.*'help'.*Tab.*explore/.test(el.textContent ?? '')
    ).length).toBeGreaterThan(0);
  });
```

Key details:
- Overrides `prefers-reduced-motion` to false (so the animation actually starts)
- Sets `bootComplete: true` via defaultProps (animation triggers immediately)
- Advances timers past the 300ms delay so the typing interval has started
- Fires a change event on the input — this triggers `handleInputChange` which calls the early completion
- Asserts the final HTML MOTD is present (not the plain-text partial)

- [ ] **Step 4: Run all Terminal tests**

Run: `npx vitest run src/components/Terminal/__tests__/Terminal.test.tsx --reporter=verbose`
Expected: All 10 tests pass (9 existing + 1 new)

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: All tests pass. No regressions.

- [ ] **Step 6: Commit**

```bash
git add src/components/Terminal/__tests__/Terminal.test.tsx
git commit -m "test: add bootComplete prop to Terminal tests and early completion test"
```

---

## Chunk 4: Manual Verification

### Task 7: Manual smoke test

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify typing animation on load**

Open browser to dev server URL:
1. Boot splash plays → terminal fades in → after ~300ms, MOTD types out character by character (~1.1s)
2. On completion, text shows highlighted keywords (`'help'`, `Tab`) in `--terminal-primary` color

- [ ] **Step 3: Verify early completion**

Reload page. During the MOTD typing animation, start typing any command. The MOTD should snap to its final HTML state immediately.

- [ ] **Step 4: Verify `clear` shows instant MOTD**

Type `clear` — MOTD appears instantly (no typing animation).

- [ ] **Step 5: Verify `clear` during animation**

Reload page. During the MOTD typing animation, type `clear` quickly. Animation should stop, and the instant MOTD should appear.

- [ ] **Step 6: Verify reduced-motion**

In browser DevTools, enable `prefers-reduced-motion: reduce`. Reload — MOTD should appear instantly on load (no animation).

- [ ] **Step 7: Verify session restart**

Type `exit`, wait for shutdown sequence, press any key. Boot splash replays, then MOTD types out again.

- [ ] **Step 8: Verify mobile behavior**

Use browser DevTools responsive mode (width < 768px). Reload — hint shows `Tap ≡ to explore commands.` typing out character by character.

- [ ] **Step 9: Stop dev server**
