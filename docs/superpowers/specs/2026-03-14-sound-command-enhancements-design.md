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

Replace the current toggle-on-bare-`sound` behavior with help output:

| Input | Output |
|-------|--------|
| `sound` (no arg) | `"Sound: on/off"`, `"Usage: sound <on\|off>"` |
| `sound on` | Enable sound → `"Sound enabled."` |
| `sound off` | Disable sound → `"Sound disabled."` |
| `sound <invalid>` | `"Unknown option: X. Usage: sound <on\|off>"` |

The StatusBar toggle remains the quick-access method for toggling without arguments.

## 2. StatusBar Sound Indicator

Update the existing `♪ on` / `♪ off` button in StatusBar.tsx with conditional styling:

| State | Color | Text Decoration |
|-------|-------|-----------------|
| Sound on | `var(--terminal-primary)` | None |
| Sound off | `var(--terminal-gray)` | `line-through` |

No structural changes. The button remains clickable in both states via the existing `onSoundToggle` callback. Title attributes unchanged (`"Mute sounds"` / `"Enable sounds"`).

## 3. Shutdown/Reboot Sounds

### New Sound Types (useSoundEngine.ts)

**`shutdown`** — Descending sine triad: 660 → 440 → 220 Hz. Each tone ~80ms duration, ~50ms stagger between tones. Mirrors the existing `boot` sound (330→440→660 ascending) but reversed for a "powering down" feel.

**`systemType`** — Single sine tone at ~600 Hz, ~20ms duration, volume ~0.02 (lower than the user's `keypress` at 0.03). Intended to sound like "the machine speaking" rather than "the user typing."

### Trigger Points (App.tsx)

1. **`shutdown`** — Played once when `shutdownPhase` transitions to `'messages'`.
2. **`systemType`** — Played per-character during the restart prompt typing animation (3 lines at 50ms/char intervals).
3. **`boot`** — Already plays on remount via BootSplash; no changes needed.

No sounds during `crt-off` or `black` phases. The descending tones during messages provide the "powering down" feel; silence during CRT-off and blackout reinforces the dead-screen moment before the restart prompt begins.

### prefers-reduced-motion

All new sounds go through the existing `play()` method in `useSoundEngine`, which already gates on `prefers-reduced-motion`. No additional checks needed.

## Files Affected

| File | Changes |
|------|---------|
| `src/components/Terminal/Terminal.tsx` | Autocomplete for `sound` args; updated command handler with help output and error case |
| `src/components/StatusBar.tsx` | Conditional color + text-decoration on sound button |
| `src/hooks/useSoundEngine.ts` | Add `shutdown` and `systemType` to `SoundType` union and `play()` switch |
| `src/App.tsx` | Trigger `shutdown` sound on phase transition; trigger `systemType` per-char in restart prompt |
