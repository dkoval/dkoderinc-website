# Mobile Terminal Toolbar Redesign

**Date:** 2026-03-04
**Branch:** feature/enter-button

## Problem

Two buttons perform the same "submit command" action on mobile:
1. The `</>` (Code2) button to the right of the terminal input — always visible
2. The "Enter" button in the mobile toolbar — visible on screens < 768px

This confuses users who see two identical actions.

## Design

### 1. Remove the `</>` button entirely

Delete the `<button>` with the `Code2` icon from `Terminal.tsx`.

- Applies to all screen sizes (desktop + mobile)
- Desktop users submit with keyboard Enter (standard terminal behavior)
- Mobile users submit via the toolbar Enter button
- The input field stretches to fill the freed space

### 2. Redesign mobile toolbar

**Current:** `[Tab] [↑] [↓] [Enter]` — all equal width, same styling

**New:** `[≡ Cmds] [↑] [↓] [⏎ Enter]`

| Button | Label | Icon | Style | Action (unchanged) |
|--------|-------|------|-------|---------------------|
| Cmds | `≡ Cmds` | `List` from lucide-react | Dark (`#111` bg, `#00FF41` text, `#333` border) | `tab` |
| Up | `↑` | — | Dark (same) | `up` |
| Down | `↓` | — | Dark (same) | `down` |
| Enter | `⏎ Enter` | — | **Emphasized** (`#00FF41` bg, `#000` text) | `enter` |

Key changes:
- **Reorder**: Navigation arrows grouped together, action keys on edges
- **Rename Tab → Cmds**: Clearer meaning for mobile users ("open command list" vs keyboard concept)
- **Add List icon**: Visual reinforcement of the menu-opening action
- **Emphasize Enter**: Green background makes it the obvious primary action
- **Add symbols**: `≡` prefix on Cmds, `⏎` prefix on Enter for extra clarity

### 3. No other changes

- Desktop: No toolbar, keyboard handles everything
- Suggestions system, auto-suggestion, command handling — all unchanged
- No CSS or responsive logic changes beyond the toolbar
- `inputMode="none"` stays (no native keyboard on mobile)

## Files to modify

1. `src/components/Terminal/Terminal.tsx` — Remove Code2 button and its import
2. `src/App.tsx` — Update `mobileKeys` array (labels, order) and Enter button styling; add `List` icon import

## Research

Based on analysis of terminal emulator apps (Termux, iSH, Blink Shell, a-Shell):
- None duplicate Enter in their toolbar — they rely on native keyboard
- Toolbars contain only special/modifier keys (Tab, arrows, Ctrl, Esc)
- This project intentionally disables native keyboard on mobile, making the toolbar the primary interaction method
