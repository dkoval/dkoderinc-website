# MOTD Typing Animation

Addendum to `2026-03-19-minimal-motd-design.md`.

## Problem

After the boot splash fade-in, the MOTD hint line appears instantly — a jarring cut from the animated boot sequence to a static text line. A typing animation bridges this transition, making the terminal feel alive.

## Design

### Behavior

After the boot splash completes and the terminal fades in, the MOTD hint types out character by character:

1. **Boot splash completes** → Terminal becomes visible (0.3s CSS opacity fade-in)
2. **300ms delay** after visibility (lets fade-in settle)
3. **~30ms per character** reveals the plain-text hint progressively
4. On completion, the line swaps to the final HTML version (with `--terminal-primary` highlights on `'help'`, `Tab`, or `≡`)

Total duration: ~300ms delay + ~1.1s typing = ~1.4s after terminal becomes visible.

### When It Plays

| Scenario | Animation? | Why |
|----------|-----------|-----|
| Initial page load | Yes | Boot splash completes → animation starts |
| Session restart (`key={sessionKey}` remount) | Yes | Boot splash replays, terminal remounts, `bootComplete` re-triggers |
| After `clear` | No — instant display | User is actively working, no boot transition |
| After `Ctrl+L` | No — delegates to `clear` | Same as clear |
| `prefers-reduced-motion` | No — instant display | Accessibility |

### Edge Cases

**User types during animation:** The animation completes instantly (jumps to final state). Input is not blocked — the existing `isInputBlocked` (derived from `revealingLines`) is not used for MOTD animation. If the user starts typing, presses Tab, or executes any command, the MOTD snaps to its final HTML version immediately.

**`clear` during animation:** The `clear` handler cancels any running MOTD animation (clears timers via refs) before setting terminal output to the instant MOTD. This prevents stale animation ticks from overwriting the cleared state.

**Mobile:** Same animation, different text (`Tap ≡ to explore commands.` instead of desktop variant). The `isMobile` check happens before the animation starts.

## Implementation

### Files Modified

- **`src/App.tsx`** — pass `bootComplete` prop to Terminal
- **`src/components/Terminal/Terminal.tsx`** — animation logic

### Triggering the Animation: `bootComplete` Prop

The terminal mounts hidden behind `opacity: 0` while the boot splash plays. The mount effect fires immediately, but the terminal isn't visible yet. Starting the animation on mount means it runs invisibly and finishes before the user ever sees it.

**Fix:** Add a `bootComplete` prop to Terminal, passed from App.tsx as `!showBootSplash`. The animation is triggered by a `useEffect` watching this prop, not by the mount effect.

Flow:
1. App renders with `showBootSplash = true` → Terminal mounts with `bootComplete = false`
2. Boot splash plays its BIOS animation (several seconds)
3. `handleBootComplete` runs → `setShowBootSplash(false)` → Terminal's `bootComplete` prop becomes `true`
4. Terminal fades in (0.3s CSS opacity transition)
5. `useEffect` on `bootComplete` fires → 300ms delay → typing animation starts
6. Animation completes → plain text swaps to final HTML

On session restart: `handleRestart` sets `showBootSplash = true` and increments `sessionKey`. Terminal remounts with `bootComplete = false`. When boot splash replays and completes, `bootComplete` becomes `true` again, triggering the animation.

### Mount Effect Change

The existing mount effect (line 525-529) currently calls `setTerminalOutput(displayMotd())`. Change this to set **empty output** (or a blank placeholder line) instead. The MOTD content will be set by either:
- The animation effect (when `bootComplete` transitions to `true` and `reducedMotion` is false)
- Instantly (when `reducedMotion` is true — the animation effect sets `displayMotd()` immediately)

### Animation Effect

New `useEffect` that watches `bootComplete`:

```
useEffect:
  deps: [bootComplete]
  if (!bootComplete) return
  if (reducedMotion) { setTerminalOutput(displayMotd()); return }

  // Start with empty output
  setTerminalOutput([{ content: '', type: 'output' }])

  // 300ms delay for fade-in to complete
  delayTimer = setTimeout(() => {
    charIndex = 0
    typingTimer = setInterval(() => {
      if (earlyCompleteRef.current || charIndex >= plainText.length) {
        clearInterval(typingTimer)
        setTerminalOutput(displayMotd())  // swap to final HTML
        return
      }
      charIndex++
      setTerminalOutput([{ content: plainText.slice(0, charIndex), type: 'output' }])
    }, 30)
  }, 300)

  return () => { clearTimeout(delayTimer); clearInterval(typingTimer) }
```

### Early Completion

Add a `motdAnimatingRef` ref (tracks whether animation is in progress) and use the existing flow:

- `handleInputChange`, `actionTab`, `handleCommand` — if `motdAnimatingRef.current` is true, set `earlyCompleteRef.current = true` (the next animation tick jumps to final state)
- `clear` handler — if `motdAnimatingRef.current` is true, clear timers directly (via refs), set terminal output to `displayMotd()`, and set `motdAnimatingRef.current = false`

### Animation Timer Refs

Store timer IDs in refs for cleanup:
- `motdDelayRef` — the 300ms `setTimeout` ID
- `motdIntervalRef` — the `setInterval` ID

These are cleared on: unmount, early completion, `clear` during animation.

### Plain-Text Hints

The typing animation needs plain-text versions of the hints (no HTML spans):

- Desktop: `Type 'help' or press Tab to explore.`
- Mobile: `Tap ≡ to explore commands.`

Define as simple string constants computed from `isMobile`.

### TerminalProps Change

Add `bootComplete?: boolean` to the `TerminalProps` type.

## Testing

### Existing Tests

The mount test (`'renders MOTD hint on mount'`) uses `prefers-reduced-motion: true` in the test setup (via `setupTerminalMedia`), which means `reducedMotion` is true and the animation is skipped. The `bootComplete` prop must be passed as `true` in test `defaultProps` so the MOTD renders immediately. **Existing assertions still pass** after this prop addition.

### New Test

Add one test for early completion:
- Render Terminal with `bootComplete={true}` and `prefers-reduced-motion: false`
- Immediately type a command
- Assert MOTD snaps to final state (full hint text present)

### Manual Verification

1. Load page — after boot splash fades in, MOTD types out character by character (~1.4s)
2. Load page, immediately start typing — MOTD snaps to final state
3. Type `clear` — MOTD appears instantly (no typing animation)
4. Type `clear` during MOTD animation — animation stops, instant MOTD displayed
5. Enable `prefers-reduced-motion` in browser — MOTD appears instantly on load
6. Trigger session restart — boot splash replays, then MOTD types out again

## Design Decisions

**Why a `bootComplete` prop instead of mounting later?** The terminal needs to be in the DOM before the boot splash finishes (for focus management, key listeners, etc.). Deferring mount would break existing patterns. A prop is the minimal interface change.

**Why plain text during animation?** The HTML version has `<span>` tags with inline styles. Revealing character by character would show raw HTML fragments mid-type (e.g., `Type <sp`). Plain text during reveal, HTML swap at the end.

**Why not animate after `clear`?** The user is actively working — re-typing the MOTD every time they clear would feel like lag, not atmosphere. The animation is a first-impression flourish.

**Why 300ms delay before typing starts?** The boot splash fades out via a 0.3s CSS opacity transition. The delay lets the terminal fully appear before typing begins.

**Why `setInterval` over `requestAnimationFrame`?** The existing progressive reveal uses RAF for multi-line output, but that system is tightly coupled to the `revealingLines`/`revealedCount` state machine. The MOTD typing is a simpler, independent animation that doesn't need RAF's frame-syncing — a fixed 30ms interval produces consistent character pacing. Keeping it separate avoids coupling two unrelated animation systems.
