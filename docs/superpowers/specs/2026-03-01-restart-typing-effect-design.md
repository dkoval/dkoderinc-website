# Design: Typing Effect for Restart Prompt

## Summary

Add character-by-character typing animation to the restart prompt screen (the 3 lines shown after CRT shutdown). Retains UNIX terminal aesthetic.

## Scope

Only the `restart-prompt` phase. The 6 shutdown messages (before CRT-off) remain unchanged.

## Behavior

1. `shutdownPhase` transitions to `'restart-prompt'`
2. Line 1 ("Reboot scheduled.") types at ~50ms/char
3. Pause ~400ms
4. Line 2 ("Waiting for user input...") types at ~50ms/char
5. Pause ~400ms
6. Line 3 ("Press any key to continue..." or "Tap to continue...") types at ~50ms/char
7. Cursor switches from solid to blinking after all lines finish

## Cursor

- Solid block (`█`) follows typing position during animation
- Switches to `.animate-blink` after all lines complete

## User Input

- `keydown`/`touchstart` listener activates only after typing finishes
- Prevents accidental restart mid-animation

## State

Added to App.tsx (no new files):

- `typingLine` (0-2): current line index
- `typingChar`: revealed character count for current line
- `typingDone`: boolean, enables input + blinking cursor

## Styling

- Lines 1-2: gray (#888)
- Line 3: green (#00FF41)
- Classes: `phosphor-glow`, `font-mono text-sm`, `text-center`
- Responsive: desktop shows "Press any key", mobile shows "Tap to continue"

## Approach

React state-driven with `setTimeout` (Approach A). Matches existing shutdown message pattern. No new components or dependencies.
