# TUI Wow Effect — Design Document

**Date:** 2026-03-08
**Goal:** Transform the terminal from a polished static page into a living, cinematic TUI that makes visitors think "I can't believe this is a website."
**Approach:** Layered by UI depth — 3 phases, each shippable as an independent PR.

---

## Phase 1: Visual Foundation

CSS-heavy, minimal logic changes. Makes the terminal feel *alive* between interactions.

### 1.1 Ambient Screen Breathing

Real CRT monitors have subtle luminance drift from phosphor instability.

- New `@keyframes breathe` on the terminal container
- Slow cycle: **8s**, sine-wave-like easing
- Tiny amplitude: brightness oscillates **0.98 → 1.0**
- Barely perceptible consciously, but the brain registers it
- Stacks with existing `flicker` animation (breathing = slow undercurrent, flicker = occasional glitch)
- Disabled on `prefers-reduced-motion` and mobile (matching existing flicker behavior)

### 1.2 Cursor Improvements

Current cursor is a browser-default text caret (input) and blinking `▌` (restart prompt). Both feel flat.

**Input cursor:**
- Override with `caret-color: transparent`, render custom block cursor (`▌`) after input text
- `text-shadow` glow matching theme's phosphor glow color — cursor becomes a glowing beacon
- Blink timing: **1.2s** (slightly slower than current 1s — less anxious, more deliberate)

**Restart prompt cursor:**
- Phosphor **afterglow**: when cursor blinks off, dims to ~0.15 opacity for one cycle instead of going fully transparent
- Multi-step `@keyframes`: full brightness → dim ghost → off → full brightness

### 1.3 Terminal Bell Flash

Physical CRT-style reaction when visitor types an invalid command.

- Brief intensification of `TerminalWindow` border glow (box-shadow ~2x for 150ms, eases back)
- Vignette brightens slightly in sync
- Duration: **150ms** ease-out
- Trigger: unknown command ("command not found" error path)
- CSS class `.bell-flash` applied/removed via short timeout
- No sound (sound system is Phase 2)

### 1.4 Tmux-Style Status Bar

Persistent bottom bar inside the terminal window, modeled after tmux.

**Layout:**
```
 [0] bash                                    ● green │ ♪ off │ 14:32:05
 └─ left ─┘                                 └──────────── right ──────────┘
```

**Left side:**
- `[0] bash` — session/window indicator (cosmetic, feels authentic)

**Right side:**
- `●` colored dot (theme primary) + theme name
- `♪ on` / `♪ off` — sound toggle (clickable; wired as no-op placeholder in Phase 1, functional in Phase 2)
- `HH:MM:SS` — live clock, ticking every second

**Styling:**
- Background: `terminal-surface`
- Top border: 1px `terminal-border`
- Font: same monospace, `text-xs` (0.75rem)
- Fixed at bottom of `TerminalWindow`, below scrollable output
- Does not scroll with output

**Mobile:**
- Simplified: `● green │ 14:32` (no seconds, no sound toggle)
- Sound toggle moves to a `sound` command on mobile
- Sits above the mobile toolbar

**Interactions:**
- Theme dot/name: clickable, opens theme suggestions
- Sound icon: clickable toggle
- Subtle hover brightness increase on both

---

## Phase 2: Interaction Polish

Light logic changes. Adds feedback loops that make the terminal feel responsive and tactile.

### 2.1 Rich Prompt

Starship-inspired multi-segment prompt with color depth.

**Design:**
```
visitor@dkoderinc ~ $█
```

- `visitor` — primary-dim color (guest indicator)
- `@dkoderinc` — primary color (branded hostname)
- `~` — primary-dim (working directory, cosmetic)
- `$` — primary color (shell indicator)

**Mobile:** shortened to `~ $` to save horizontal space.

Segments are styled spans with individual color classes. Static — no runtime changes (not a real shell).

### 2.2 Command Execution Timing

Fish shell-style duration indicator after every command's output.

```
[command output]
                                          took 0.6s
```

- Color: `terminal-gray` (dimmest text tier)
- Right-aligned within output area
- Format: `took X.Xs` (one decimal place)
- Source: actual elapsed time from Enter to output render
- Excluded for: `clear`, `exit`, `theme` (these have their own visual feedback)
- Natural variance (608ms, 614ms, 602ms) makes it feel organic

### 2.3 Scroll Indicator

Subtle hint when output extends below the visible terminal area.

- `▼ more` label fixed at bottom-center of terminal scroll area
- Color: `terminal-primary-dim` at 60% opacity
- Fades in when content overflows below viewport
- Fades out when user scrolls within 20px of bottom
- Uses `IntersectionObserver` on sentinel element — no scroll event polling

**Appears for:** `man dmytro`, accumulated commands, `skills` on mobile.
**Does not appear for:** short outputs (`uptime`, `whoami`), after `clear`.

### 2.4 Sound System

Opt-in audio via Web Audio API — no audio files.

**Architecture:**
- `useSoundEngine` hook — creates `AudioContext` lazily on first enable
- State persisted in `localStorage` as `dkoder-sound-enabled`
- Toggle via status bar `♪` icon or `sound on/off` command

**Sound palette (synthesized, CRT/teletype character):**

| Event | Sound | Synthesis |
|-------|-------|-----------|
| Key press | Soft relay click | 15ms square wave, 1800Hz, fast decay |
| Command execute | Rising two-tone chime | 80ms, 440→660Hz sine, gentle envelope |
| Error / bell | Low buzzer | 100ms, 220Hz square wave, slight distortion |
| Theme switch | Soft power-cycle hum | 200ms, 120Hz sine fade-in/out |
| Boot complete | Ascending three-tone | 3×60ms sine: 330→440→660Hz |

**Constraints:**
- Master volume kept low — texture, not alerts
- All sounds < 200ms
- `prefers-reduced-motion` disables sound (respects reduced stimulation)
- No ambient hum — event-driven only
- Silent degradation if `AudioContext` fails

---

## Phase 3: Output Cinematics

Changes the command execution flow. Output streams in like real terminal stdout.

### 3.1 Progressive Output Reveal

After spinner completes, output lines render one at a time instead of appearing all at once.

**Timing:**
- **40ms stagger** between lines
- Each line fades opacity 0 → 1 over **80ms**
- Single-line outputs (`uptime`, `theme`) appear instantly — no stagger

**Per-command behavior:**

| Command | Lines | Reveal Style | Total Reveal |
|---------|-------|-------------|--------------|
| `whoami` | 3-6 | Line by line | 120-240ms |
| `skills` | ~15 | Line by line | 600ms |
| `history` | varies | Line by line | varies |
| `uptime` | 1 | Instant | — |
| `man dmytro` | ~30 | Section by section | ~1s |
| `contact` | HTML | Fade-in as single unit, 200ms | 200ms |
| `theme` | 1 | Instant | — |

**Implementation:**
- `useStreamReveal` hook: takes line array, returns currently visible subset
- `requestAnimationFrame`-driven timer (not `setTimeout` chains)
- Terminal auto-scrolls as each new line appears
- `took X.Xs` indicator appears after last line finishes revealing

### 3.2 Input Blocking During Reveal

Input is gated while output streams — matching real terminal blocking command behavior.

**Blocked state:**
- Input field dimmed to ~50% opacity
- Cursor stops blinking
- Suggestion menu button unresponsive (no hover effect)
- Mobile toolbar buttons dimmed
- All restored instantly when last line finishes revealing

**Why this works:**
- Authentic: real `cat`, `man`, `less` hold the terminal until done
- Reveal times are short: longest output (`man dmytro`) is ~1.2s
- Simpler: no "instant-complete previous output" logic needed
- Cinematic: forces visitors to watch the streaming effect

**Edge cases:**
- `clear`: no reveal, no blocking
- `prefers-reduced-motion`: all output instant, no blocking
- History scroll-back: previously revealed output stays visible, no re-animation

---

## PR Strategy

| Phase | Branch | Scope |
|-------|--------|-------|
| 1 | `feature/tui-phase1-visual-foundation` | CSS animations, cursor, bell flash, status bar component |
| 2 | `feature/tui-phase2-interaction-polish` | Rich prompt, timing, scroll indicator, sound engine |
| 3 | `feature/tui-phase3-output-cinematics` | Progressive reveal, input blocking |

Each phase merges to `main` before the next begins.
