# Exit Command with CRT Power-Off Shutdown

## Summary

Add an `exit` command to the terminal that triggers a cinematic CRT monitor power-off animation, followed by a black screen with a "Press any key to restart" prompt that reboots into the boot splash.

## Why not `window.close()`?

Browsers block `window.close()` unless the tab was opened programmatically via `window.open()`. Direct navigation (URL bar, bookmarks, external links) makes `window.close()` silently fail. This is enforced by all major browsers on desktop and mobile. A visual shutdown sequence is the right alternative.

## Command

- **Trigger:** `exit` (no aliases)
- **Appears in:** help output with icon and description: `exit — Terminate the current session`
- **Added to:** suggestions list for tab-completion and ghost-text

## Shutdown Sequence

### Phase 1: Shutdown Messages (~2.5s)

After Enter, the terminal prints staggered messages (~350ms each):

```
Broadcast message from root@dkoderinc (pts/0):
The system is going down for halt NOW!
Stopping all services...            [OK]
Unmounting filesystems...           [OK]
Flushing disk cache...              [OK]
System halted.
```

These render as normal green terminal output lines.

### Phase 2: CRT Collapse (~0.8s)

The entire page (sidebar, terminal, copyright bar) animates:
- Vertical scale compresses to 0, horizontal stays at 100%
- Creates a thin bright horizontal line in the center
- Brief white glow/brightness boost on the line (phosphor effect)

### Phase 3: Dot Shrink + Fade (~0.6s)

- Horizontal line shrinks to a small bright dot in center
- Dot fades out to pure black

### Phase 4: Black Screen + Restart Prompt

- Pure black screen for ~2 seconds
- Blinking green text appears centered: `Press any key to restart...`
- Desktop: any keypress triggers restart
- Mobile: tapping anywhere triggers restart

### Restart

- Re-triggers BootSplash animation
- Returns to normal terminal with help displayed
- Command history is cleared (fresh session)

## Architecture

### State Management

New `shutdownPhase` state in `App.tsx`:
- Values: `null | 'messages' | 'crt-off' | 'black' | 'restart-prompt'`
- Lives in App.tsx because the CRT animation affects the entire page layout

### Communication Flow

1. `Terminal.handleCommand` recognizes `exit`, calls `onShutdown()` prop
2. `App.tsx` receives callback, sets `shutdownPhase = 'messages'`
3. App.tsx orchestrates phase transitions via `setTimeout` chains
4. During `'crt-off'`: CSS class on root container triggers collapse animation
5. During `'restart-prompt'`: overlay listens for keypress/touch
6. On restart: all state resets, `showBootSplash = true`

### CSS Animations (in index.css)

- `crt-shutdown`: scales Y to 0 with brightness filter boost
- `dot-shrink`: scales X to 0 and fades opacity

### Mobile Support

"Press any key to restart" screen listens for `touchstart` + `keydown`. Full-screen tap target, no virtual keyboard needed.

## Files Changed

- `src/components/Terminal/commands.tsx` — add `exit` command + suggestion entry
- `src/components/Terminal/Terminal.tsx` — call `onShutdown` prop when `exit` entered
- `src/App.tsx` — shutdown phase state machine, transitions, restart logic
- `src/index.css` — CRT shutdown keyframe animations
