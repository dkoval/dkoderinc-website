# Copyright Section Design

## Goal

Add a creative, terminal-themed copyright to the website that fits the retro hacker aesthetic.

## Approach: Sidebar-anchored + Mobile Footer

### Desktop (Sidebar bottom)

Copyright anchored to the bottom of the 280px sidebar using `mt-auto`:

- Label: `$ cat /etc/copyright` in muted gray (#888)
- Copyright: `© {currentYear} DKoder Inc.` in neon green (#00FF41)
- Sub-text: `All rights reserved.` in muted gray (#888)
- Font: monospace, `text-xs`
- No border — subtle text only

### Mobile (Below terminal)

Single-line copyright below the keyboard bar area:

- Text: `© {currentYear} DKoder Inc.` centered
- Color: muted gray (#666), `text-xs`, monospace
- Respects `safe-area-inset-bottom`

### Dynamic Year

Uses `new Date().getFullYear()` for auto-updating year.

## Files Changed

1. `src/components/Sidebar.tsx` — Add copyright at bottom of desktop sidebar
2. `src/App.tsx` — Add mobile copyright below keyboard bar
3. `src/components/Footer.tsx` — Delete (orphaned, replaced)
