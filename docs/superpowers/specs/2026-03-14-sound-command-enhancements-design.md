# Sound Command Enhancements Design

**Date:** 2026-03-14
**Status:** Draft

## Overview

Three enhancements to the terminal sound system: argument autocomplete for the `sound` command, improved StatusBar indicator styling, and synthesized sound effects for the shutdown/reboot sequence.

## 1. Sound Command Autocomplete & Help Output

### Autocomplete (Terminal.tsx — `updateAutoSuggestion`)

Add argument-level autocomplete for `sound on` / `sound off`, following the existing `theme` autocomplete pattern. Insert a new block between the `theme ` prefix check and the generic command-level fallback:

- If input starts with `"sound "` and has content after the space, match the partial against `['on', 'off']`.
- If a match is found, suggest the full string (e.g., `"sound on"`).

### Command Handler (Terminal.tsx — command execution block)

Replace the current strict equality checks (`trimmedCmd === 'sound'`) with a `startsWith('sound')` check plus arg parsing, matching the `theme` command's conditional structure:

```
if (trimmedCmd === 'sound' || trimmedCmd.startsWith('sound ')) {
  const arg = trimmedCmd.replace('sound', '').trim();
  if (!arg) → show help
  else if (arg === 'on') → enable
  else if (arg === 'off') → disable
  else → error
}
```

| Input | Output |
|-------|--------|
| `sound` (no arg) | `"Sound: {current state}"`, `"Usage: sound <on\|off>"` |
| `sound on` | Enable sound → `"Sound enabled."` |
| `sound off` | Disable sound → `"Sound disabled."` |
| `sound <invalid>` | `"Unknown option: X. Usage: sound <on\|off>"` |

Note: bare `sound` shows the **current state** (e.g., `"Sound: on"`) consistent with how bare `theme` shows `"Current theme: green"`.

The StatusBar toggle remains the quick-access method for toggling without arguments. The suggestion panel selecting `sound` will now show help text instead of toggling — this is acceptable and consistent with selecting bare `theme`.

## 2. StatusBar Sound Indicator

Update the existing `♪ on` / `♪ off` button in StatusBar.tsx with conditional styling:

| State | Color | Text Decoration |
|-------|-------|-----------------|
| Sound on | `var(--terminal-primary)` | None |
| Sound off | `var(--terminal-gray)` | `line-through` |

No structural changes. The button remains clickable in both states via the existing `onSoundToggle` callback. Title attributes unchanged (`"Mute sounds"` / `"Enable sounds"`).

## 3. Shutdown/Reboot Sounds

### New Sound Types (useSoundEngine.ts)

Export the `SoundType` union from `useSoundEngine.ts` so it can be imported by other modules. Add two new members to the union:

**`shutdown`** — Descending sine triad: 660 → 440 → 220 Hz, oscillator type `'sine'`. Each tone ~80ms duration, volume 0.04, ~50ms stagger between tones. Mirrors the existing `boot` sound (330→440→660 ascending) but reversed for a "powering down" feel.

**`systemType`** — Single sine tone at ~600 Hz, ~20ms duration, oscillator type `'sine'`, volume 0.02 (explicitly passed as 4th arg to `playTone`, which defaults to 0.04). Intended to sound like "the machine speaking" rather than the user's `keypress`.

### Type Propagation

The `playSound` prop in Terminal.tsx's `TerminalProps` uses a hardcoded literal union rather than importing `SoundType`. Since the new sounds (`shutdown`, `systemType`) are only triggered from App.tsx (which calls `sound.play()` directly), Terminal.tsx's prop type does **not** need updating. However, `SoundType` should be exported from `useSoundEngine.ts` to allow future consumers to reference it without duplication.

### Trigger Points (App.tsx)

1. **`shutdown`** — Call `sound.play('shutdown')` inside `handleShutdown` (synchronously when the user types `exit`, before the overlay renders). This is cleaner than placing it in the `useEffect` for the `'messages'` phase.

2. **`systemType`** — Call `sound.play('systemType')` inside the `setTimeout` callback that increments `typingChar` during the restart prompt typing animation. Important: reference `sound.play` inside the timer callback only — do **not** add `sound` as an effect dependency, as this could re-trigger the animation loop if the `sound` object reference changes between renders.

3. **`boot`** — Already plays on remount via BootSplash; no changes needed.

No sounds during `crt-off` or `black` phases. The descending tones at shutdown start provide the "powering down" feel; silence during CRT-off and blackout reinforces the dead-screen moment before the restart prompt begins.

### prefers-reduced-motion

All new sounds go through the existing `play()` method in `useSoundEngine`, which already gates on `prefers-reduced-motion`. No additional checks needed.

## Files Affected

| File | Changes |
|------|---------|
| `src/components/Terminal/Terminal.tsx` | Autocomplete for `sound` args; refactored command handler with `startsWith` + arg parsing |
| `src/components/StatusBar.tsx` | Conditional color + text-decoration on sound button |
| `src/hooks/useSoundEngine.ts` | Export `SoundType`; add `shutdown` and `systemType` to union and `play()` switch |
| `src/App.tsx` | Trigger `shutdown` in `handleShutdown`; trigger `systemType` per-char in restart prompt timer callback |
