# Design: Website Revamp — Approach 1 "Phosphor Station"

**Date:** 2026-02-24
**Branch:** `revamp/approach1-phosphor-station`
**Status:** Approved for implementation

## Overview

Reimagine the dkoderinc.com personal website with an authentic VT100/amber-phosphor terminal aesthetic. The terminal emulator remains the star. Deep black background, amber phosphor glow, CRT scanline overlay, and a 2–3 second BIOS POST boot splash on first load. Two-column layout: left sidebar with headshot + stats, right main terminal.

## Visual Language

| Property | Value |
|---|---|
| Background | `#000000` pure black |
| Primary accent | `#FFB000` amber phosphor |
| Dim output | `#7A5500` muted amber |
| Error text | `#FF4444` red |
| Scanlines | `repeating-linear-gradient` every 4px, 3% opacity |
| CRT vignette | Radial gradient darkening corners |
| Glow | `text-shadow` + `box-shadow` with amber color |
| Font | Monaspace Argon / Monaspace Neon (existing) |

## Layout — Desktop

### Sidebar (280px fixed width)
- Headshot: CSS `grayscale(100%) contrast(120%)` + `mix-blend-mode: screen` for phosphor amber tint
- Name + title below image
- `/proc/dmytro/status` stats block:
  - `uptime:` real counter since page load + career joke ("15 years 4 months...")
  - `load_avg:` static joke value
  - Social links styled as file paths

### Main Terminal Area (flex-1)
- Authentic OS chrome title bar: `dkoderinc.com — bash — 80×24`
- Three decorative dots (non-functional, aesthetic only)
- Blinking amber activity LED in title bar
- Terminal output area + input line below

## Layout — Mobile

- Sidebar collapses to compact top bar (thumbnail headshot + name + social icons)
- Terminal fills remaining viewport height
- Virtual shortcut bar pinned to bottom: `Tab`, `↑`, `↓`, `Enter` touch buttons

## Boot Splash

Blocks viewport on first page load. Dismissed by any keypress or after 3 seconds.

```
DKODER BIOS v2.6.0
CPU: Senior Engineer @ 15+ years
RAM: 640K skills (should be enough)
Checking distributed systems... OK
Mounting /home/dkoval............. OK
Starting bash...
```

- Amber text on black
- Lines appear sequentially with ~300ms delay each
- After completion (or keypress): boot splash fades out (200ms), main layout fades in (300ms)

## Terminal Commands

### Enriched Existing Commands

| Command | Enhancement |
|---|---|
| `about` | Pre-rendered ASCII art `DMYTRO` figlet banner above bio text |
| `experience` | ASCII box-drawing timeline with years and roles (`┌─ 2020 ──...`) |
| `skills` | ASCII bar chart: `Java    ████████████ expert` etc. |
| `contact` | Existing linked output + `gpg --fingerprint` joke line |
| `clear` | Unchanged behavior |

### New Commands

| Command | Output |
|---|---|
| `whoami` | `/etc/passwd`-style: `dkoval:x:1000:1000:Dmytro Koval,,,:/home/dkoval:/bin/bash` |
| `uname -a` | `Linux dkoderinc 6.1.0-backend #1 SMP PREEMPT Tue Jan 1 00:00:00 UTC 2026 x86_64` |
| `man dmytro` | Mock man page: NAME, SYNOPSIS, DESCRIPTION, SEE ALSO sections |
| `projects` | Static list of GitHub repos with clickable links |
| `uptime` | Real uptime since page load + career uptime joke |

## Component Structure

```
App
├── BootSplash            (new — blocks render until dismissed)
├── Sidebar               (new — replaces static header)
│   ├── HeadshotPanel     (refactored from AboutMe)
│   └── StatusPanel       (new — /proc/dmytro/status block)
├── MainArea
│   ├── TerminalWindow    (new wrapper with OS chrome title bar)
│   │   └── Terminal      (existing, enriched)
└── (Footer removed — social links move to Sidebar)
```

## CSS / Styling Notes

- Scanline overlay: pseudo-element on root container, `pointer-events: none`, `z-index: 9999`
- CRT vignette: separate pseudo-element with `radial-gradient`
- Amber glow on text: `text-shadow: 0 0 8px #FFB000, 0 0 16px #FFB00066`
- Amber glow on terminal border: `box-shadow: 0 0 20px #FFB00033, inset 0 0 20px #FFB00011`
- Boot splash: fixed fullscreen overlay, `z-index: 10000`

## Dependencies

No new npm packages required. All effects use CSS + existing stack (React, TypeScript, Tailwind, Lucide).

## Responsive Breakpoints

- `< 768px`: Mobile layout (sidebar collapses, virtual keyboard bar appears)
- `≥ 768px`: Desktop two-column layout
