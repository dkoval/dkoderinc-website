# Terminal Enhancements Design

**Date:** 2026-03-05
**Branch:** feature/terminal-enhancements
**Approach:** Theme Foundation First

## Goals

- Authenticity as foundation with selective wow moments
- Switchable phosphor themes (green, amber, white) + modern Easter egg (gruvbox)
- Richer output formatting for existing commands
- Subtle CSS-only CRT effect refinements
- Mobile visual parity and interaction improvements

## 1. Theme System Architecture

### CSS Custom Properties

All colors, glows, and effect intensities defined as CSS variables on `:root`, swapped by a `data-theme` attribute on `<html>`.

Four themes:

**Green (default) -- P31 phosphor:**
- `--terminal-primary: #00FF41`
- `--terminal-primary-dim: #00CC33`
- `--terminal-primary-dark: #005500`
- `--terminal-bg: #0D0208`
- `--terminal-surface: #111111`
- `--terminal-border: #333333`
- `--terminal-gray: #888888`
- `--terminal-error: #FF3333`
- `--terminal-glow: rgba(0, 255, 65, 0.4)`
- `--terminal-glow-soft: rgba(0, 255, 65, 0.15)`
- `--terminal-scanline: rgba(0, 255, 65, 0.03)`
- `--terminal-vignette: rgba(0, 10, 2, 0.5)`

**Amber -- P3 phosphor:**
- `--terminal-primary: #FFB000`
- `--terminal-primary-dim: #CC8C00`
- `--terminal-primary-dark: #553A00`
- `--terminal-bg: #0A0600`
- `--terminal-surface: #111008`
- `--terminal-border: #333333`
- `--terminal-gray: #888888`
- `--terminal-error: #FF6633`
- `--terminal-glow: rgba(255, 176, 0, 0.4)`
- `--terminal-glow-soft: rgba(255, 176, 0, 0.15)`
- `--terminal-scanline: rgba(255, 176, 0, 0.03)`
- `--terminal-vignette: rgba(10, 6, 0, 0.5)`

**White -- white phosphor:**
- `--terminal-primary: #B0B0B0`
- `--terminal-primary-dim: #888888`
- `--terminal-primary-dark: #444444`
- `--terminal-bg: #050505`
- `--terminal-surface: #0E0E0E`
- `--terminal-border: #333333`
- `--terminal-gray: #606060`
- `--terminal-error: #FF4444`
- `--terminal-glow: rgba(176, 176, 176, 0.3)`
- `--terminal-glow-soft: rgba(176, 176, 176, 0.1)`
- `--terminal-scanline: rgba(176, 176, 176, 0.03)`
- `--terminal-vignette: rgba(5, 5, 5, 0.5)`

**Gruvbox -- modern Easter egg:**
- `--terminal-primary: #EBDBB2`
- `--terminal-primary-dim: #A89984`
- `--terminal-primary-dark: #504945`
- `--terminal-bg: #1D2021`
- `--terminal-surface: #282828`
- `--terminal-border: #333333`
- `--terminal-gray: #928374`
- `--terminal-error: #FB4934`
- `--terminal-glow: rgba(235, 219, 178, 0.15)`
- `--terminal-glow-soft: rgba(235, 219, 178, 0.05)`
- `--terminal-scanline: rgba(0, 0, 0, 0.02)`
- `--terminal-vignette: rgba(0, 0, 0, 0.3)`
- `--terminal-accent-green: #B8BB26`
- `--terminal-accent-yellow: #FABD2F`
- `--terminal-accent-blue: #83A598`
- `--terminal-accent-orange: #FE8019`
- `--terminal-accent-purple: #D3869B`

### Neutral borders

Borders remain `#333333` across all themes -- no phosphor tinting.

### State management

- Theme stored in `localStorage` under key `dkoder-theme`
- Default: `green`
- React context (`ThemeContext`) provides current theme name + setter
- On boot, `data-theme` set before first paint via inline script in `index.html` to prevent flash of wrong theme

### Color migration

Every hardcoded color in components (#00FF41, #888, #333, #111, #000) replaced with corresponding CSS variable via Tailwind arbitrary values (`text-[var(--terminal-primary)]`) or inline styles where Tailwind can't reach.

## 2. `theme` Command

### Usage

```
theme [green|amber|white|gruvbox]
```

- No argument: shows current theme and available options
- Valid argument: switches theme
- `theme gruvbox` first time: Easter egg message "Monitor upgrade detected. Welcome to the 21st century."
- Invalid argument: error "Unknown theme. Available: green, amber, white, gruvbox"
- Theme persists in localStorage, survives reload and restart

### Transition animation

1. Screen dims to ~30% opacity over 150ms
2. CSS variables swap (instant)
3. Screen brightens to 100% over 250ms

Total 400ms. CSS-only overlay opacity transition.

### Suggestion entry

```
{ command: 'theme', description: 'Switch color theme', icon: <Palette /> }
```

Using `Palette` from lucide-react (already a dependency).

### Boot splash

Respects active theme -- BIOS lines render in the current phosphor color.

## 3. CRT Effect Refinements

### Global text glow

Extend phosphor glow to all primary-colored terminal text (currently only on restart prompt):

```css
.terminal-text {
  text-shadow: 0 0 4px var(--terminal-glow);
}
```

Half intensity of the restart prompt glow -- present but not distracting.

### Tuned scanlines

Scanline color uses `--terminal-scanline` from theme:

```css
body::before {
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    var(--terminal-scanline) 2px,
    var(--terminal-scanline) 3px
  );
}
```

### Subtle screen flicker

Barely perceptible brightness oscillation, once every ~4 seconds:

```css
@keyframes flicker {
  0%, 100% { opacity: 1; }
  92% { opacity: 1; }
  93% { opacity: 0.97; }
  94% { opacity: 1; }
}

.crt-flicker {
  animation: flicker 4s infinite;
}
```

Disabled on mobile (< 768px) and when `prefers-reduced-motion: reduce`.

### Improved vignette

Tightened from 55% to 100% gradient using `--terminal-vignette`:

```css
body::after {
  background: radial-gradient(
    ellipse at center,
    transparent 55%,
    var(--terminal-vignette) 100%
  );
}
```

### `prefers-reduced-motion` respect

```css
@media (prefers-reduced-motion: reduce) {
  .crt-flicker { animation: none; }
  .ai-spinner::before { animation: none; content: "..."; }
}
```

### Explicitly excluded

- No barrel distortion
- No chromatic aberration
- No phosphor persistence/ghosting
- No interlacing

## 4. Command Output Redesign

### `whoami` -- ASCII art + info side-by-side

Desktop (md+):

```
  ██████╗ ██╗  ██╗      Dmytro Koval
  ██╔══██╗██║ ██╔╝      ─────────────────────────────
  ██║  ██║█████╔╝       Focus: Backend & Distributed Systems
  ██║  ██║██╔═██╗
  ██████╔╝██║  ██╗
  ╚═════╝ ╚═╝  ╚═╝
```

Mobile (< md):

```
  Dmytro Koval
  ─────────────────────────────
  Focus: Backend & Distributed Systems
```

Two separate output templates selected via `window.matchMedia('(min-width: 768px)')` at render time. ASCII art in primary color, labels in dim, values in primary.

### `skills` -- No content change

Exact same progress bar output. Colors migrate from hardcoded #00FF41 to theme variables.

### `man dmytro` -- Formatting enhancement

All existing text retained verbatim. Section headers (NAME, SYNOPSIS, OPTIONS, etc.) rendered in primary color. Body text in dim. Header/footer lines in dim.

### `contact` -- Box-drawing frame

```
+-- Contact ----------------------------+
|                                       |
|  > github.com/dkoval                  |
|  > linkedin.com/in/dmytrokoval        |
|  > twitter.com/dkovalbuzz             |
|  @ dkoderinc@gmail.com               |
|                                       |
+---------------------------------------+
```

Links remain clickable. Inline SVG icons replaced with Unicode symbols. Frame border in dim, links in primary.

### `uptime` -- Real uptime format

```
 14:24:07 up 3 min,  1 user,  load average: 0.42, 0.31, 0.28
```

Mimics real `uptime` output. Load averages are cosmetic (seeded random values that drift slowly). Time and uptime in primary, labels in dim.

### `history` -- No change

Content unchanged. Colors migrate to theme variables.

### `help` -- No change

Content unchanged. Colors migrate to theme variables.

### Mobile considerations

- `whoami` ASCII art hidden below md breakpoint
- All `white-space: pre` outputs use `overflow-x: auto`
- `man dmytro` uses reduced indentation on mobile

## 5. Mobile Improvements

### Visual parity

- Scanlines and vignette: already fullscreen, theme migration makes them phosphor-aware
- Text glow: works on mobile without performance concern
- Flicker: disabled on mobile via media query

### Interaction improvements

**Swipe gestures on terminal output area:**
- Swipe up: previous command in history
- Swipe down: next command in history
- Vanilla JS touchstart/touchend, 50px minimum distance
- Vertical only; horizontal left for native scroll

**Haptic feedback:**
```ts
navigator.vibrate?.(10);
```
10ms pulse on toolbar button taps. No-ops on unsupported devices.

**Touch-friendly suggestions:**
- Minimum 44px row height (iOS guideline)
- Slight padding between items

### Excluded

- No shake-to-trigger Easter eggs
- No landscape orientation prompts
- No pull-to-refresh gestures

## 6. Out of Scope

- No new navigation paradigm (no virtual filesystem)
- No new Easter egg commands beyond gruvbox message
- No WebGL effects
- No new fonts or font weight changes
- No layout changes to sidebar or overall structure
- No changes to boot splash content (just theme-aware colors)
- No changes to shutdown/restart sequence (just theme-aware colors)

## 7. Dependencies

- No new npm packages needed
- `Palette` icon from lucide-react (already installed)
- Swipe detection is vanilla JS
