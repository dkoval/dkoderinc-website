# Design: Website Revamp — Approach 3 "Workstation"

**Date:** 2026-02-24
**Branch:** `revamp/approach3-workstation`
**Status:** Approved for implementation

## Overview

Reimagine the dkoderinc.com personal website as a tmux-style two-pane workstation. Left pane: static info panel (headshot, status, social links). Right pane: interactive terminal. A real-time status bar runs along the bottom of the viewport. Clean green-on-black, no scanlines — sharp and brutal. MOTD auto-types on load instead of a boot splash.

## Visual Language

| Property | Value |
|---|---|
| Background | `#0A0A0A` near-black |
| Primary accent | `#00FF41` matrix green |
| White | `#FFFFFF` for pane borders and headings |
| Secondary text | `#888888` dimmed gray |
| Status bar highlight | `#005F87` blue for active pane indicator |
| Font | Monaspace Argon / Monaspace Neon (existing) |
| Style | No scanlines, no glow — clean sharp edges |

## Layout — Desktop

### Structure
Full-viewport layout with a pinned bottom status bar (~28px). Above it: two horizontal panes separated by a box-drawing border character.

### Left Pane (35% width)
- Box-drawing border on all sides: `┌ ─ ┐ │ └ ┘`
- Title strip: `┤ INFO ├` centered in top border
- Headshot: CSS `grayscale(100%)` + `sepia(100%) hue-rotate(90deg)` for green tint
- `whoami` output block (static, styled as terminal output)
- `/proc/dmytro/status` block (uptime ticks in real time)
- Social links styled as `~/.ssh/known_hosts` entries

### Right Pane (65% width, flex-1)
- Box-drawing border, title strip: `┤ TERMINAL ├`
- Blue left border when terminal input is focused (active pane indicator)
- MOTD auto-types on first render (3–4 lines)
- Full interactive terminal below MOTD

### Status Bar (bottom, full width, fixed)
```
[1] main  [2] about   dmytro@dkoderinc   14:32:07  up 42s
```
- Left: pane labels (non-interactive, decorative)
- Center: `user@host`
- Right: real-time clock (updates every second via `setInterval`) + page uptime

## Layout — Mobile

- Single column, status bar stays pinned to bottom
- Info panel: collapses to horizontal strip (avatar thumbnail + name)
- `[info]` toggle button in status bar slides info panel in as a full-width overlay
- Terminal fills remaining viewport

## MOTD (Message of the Day)

Auto-types on load, no blocking. Appears as first terminal output.

```
Welcome to dkoderinc.com (GNU/Linux 6.1.0-backend x86_64)

  Last login: never — first time visiting?
  Type 'help' to see available commands.

dmytro@dkoderinc:~$
```

- Characters type one by one at ~40ms/char
- Then normal input cursor appears

## Terminal Commands

### Enriched Existing Commands

| Command | Enhancement |
|---|---|
| `about` | Pre-rendered ASCII art `DMYTRO` figlet banner above bio text |
| `experience` | ASCII box-drawing timeline with years and roles |
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
├── StatusBar              (new — pinned bottom, real-time clock)
├── WorkspaceLayout        (new — flex row, full height minus status bar)
│   ├── InfoPane           (new — replaces sidebar/header/about)
│   │   ├── HeadshotPanel  (refactored from AboutMe)
│   │   └── StatusPanel    (new)
│   ├── PaneDivider        (new — single │ character, decorative)
│   └── TerminalPane       (new wrapper with box-drawing chrome)
│       └── Terminal       (existing, enriched with MOTD)
└── (Header and Footer removed)
```

## CSS / Styling Notes

- Pane borders: single Unicode box-drawing chars rendered in `font-mono`, no actual CSS borders
- Active pane: left border of terminal pane changes from `#888` to `#005F87` on focus
- Status bar: fixed bottom, `height: 28px`, `background: #005F87`, white text
- No glow effects — flat, sharp aesthetic
- Green text: plain `color: #00FF41` — no `text-shadow`

## Dependencies

No new npm packages required. All effects use CSS + existing stack (React, TypeScript, Tailwind, Lucide).

## Responsive Breakpoints

- `< 768px`: Mobile layout (info panel collapses, toggle button in status bar)
- `≥ 768px`: Desktop two-pane layout
