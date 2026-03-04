# AI Aesthetics & Sidebar Enhancement

## Problem

1. The left sidebar (280px fixed) feels sparse on standard and large screens
2. The website lacks any signal that Dmytro leverages modern AI tooling

## Solution

Two independent enhancements that fit the existing UNIX/CRT terminal aesthetic.

### Part 1: Terminal — AI "Thinking" Animation

When a user enters a command, a brief spinner animation plays before output renders, suggesting the terminal is backed by an AI processing layer.

**Behavior:**
- Braille spinner characters (`⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`) cycle for ~500-800ms
- Text: `processing query...` in gray next to the green spinner
- The spinner line is replaced (not stacked) when real output renders
- Applies to commands that produce output — not `clear`, `exit`, or empty input

**Example:**
```
$ skills
⠋ processing query...
→ (spinner disappears, real output renders)
```

### Part 2: Sidebar — Animated ASCII Neural Network

Below the `~/.ssh/known_hosts` panel, the remaining vertical space fills with a slowly animating ASCII art neural network visualization.

**Visual:**
- Nodes (`○`) connected by lines (`─`, `│`, `/`, `\`, `┼`) in monospace
- Rendered in very dim green (`#00FF41` at ~15-20% opacity)
- Fills available space with `flex-1`, `overflow: hidden`

**Animation:**
- Nodes subtly pulse (opacity oscillation on individual nodes)
- Every ~5-10 seconds, a "signal" pulse travels along a connection path (brief brightness increase moving node-to-node)

**Constraints:**
- Desktop sidebar only — not shown in mobile top bar
- Purely decorative — no interaction, no hover states
- Lightweight — CSS animations + simple JS intervals, no canvas/WebGL

## Files Affected

- `src/components/Sidebar.tsx` — add ASCII neural network section
- `src/components/Terminal/Terminal.tsx` — add thinking spinner before command output
- Possibly new: `src/components/AsciiNeuralNet.tsx` — extracted component if complex enough
