# Matrix Rain on Idle — Design

## Summary
Add a Matrix-style rain effect that activates when the terminal sits idle for 30 seconds. The rain renders on an HTML canvas inside the terminal output area, using theme-aware colors and a mixed katakana + code symbol character set.

## Decisions

| Decision | Choice |
|----------|--------|
| Idle timeout | 30 seconds |
| Dismiss behavior | Fade out over ~400ms on any interaction |
| Render location | Inside terminal output area |
| Content during rain | Rain replaces output view (output preserved, hidden) |
| Character set | Mixed: half-width katakana + code symbols |
| Colors | Theme-aware via CSS custom properties |
| Rendering approach | HTML Canvas with RAF loop |
| Mobile / reduced-motion | Disabled entirely |

## Idle Detection

New hook `useIdleTimer`:
- Watches: keydown, click, touchstart, mousemove on terminal container
- Resets a 30s `setTimeout` on each event
- Exposes `isIdle: boolean`
- Paused while `isInputBlocked` (output revealing) or during shutdown

## Matrix Rain Canvas Component

`MatrixRain.tsx` in `src/components/Terminal/`:

### Rendering
- `<canvas>` absolutely positioned, fills terminal output area
- `ResizeObserver` keeps canvas sized to container

### Rain Algorithm
- Divide canvas width into columns (~14px each)
- Each column: independent `y` position, randomized speed
- RAF tick: draw character at column's `y`, advance `y`
- Column resets to top when reaching bottom (with random delay)
- Characters randomly change every few frames (decoding flicker)

### Character Set
- Half-width katakana: U+FF66–FF9D
- Code symbols: `{}[]<>=/;0-9A-F`
- Random pick per cell per change

### Trail Effect
- Semi-transparent `--terminal-bg` rectangle drawn each frame (rgba ~0.05 alpha)
- Creates natural fading trail
- Lead character: full brightness `--terminal-primary`

### Theme Integration
- Read colors via `getComputedStyle` on mount and theme change
- Lead char: `--terminal-primary`
- Trail fades naturally toward `--terminal-bg`

## Transitions

### Fade In (idle → rain)
- Canvas: `opacity: 0` → `1` over ~400ms CSS transition
- Terminal output: `opacity: 0` simultaneously, then `display: none`
- RAF loop starts immediately (draws while fading in)

### Fade Out (rain → active)
- Any interaction flips `isIdle` to `false`
- Canvas: `opacity: 0` over ~400ms
- Terminal output: `display: block` → `opacity: 1`
- Canvas unmounts + RAF cleanup after transition ends
- Previous output fully preserved

## Edge Cases
- Theme change during rain: re-read CSS vars, update next frame
- Resize during rain: ResizeObserver recalculates columns
- Mobile: disabled (useIsMobile)
- prefers-reduced-motion: disabled
- Shutdown during rain: cancel immediately (no fade)

## File Changes

### New Files
- `src/components/Terminal/MatrixRain.tsx`
- `src/hooks/useIdleTimer.ts`

### Modified Files
- `src/components/Terminal/Terminal.tsx` — integrate idle timer, render MatrixRain, hide/show output
