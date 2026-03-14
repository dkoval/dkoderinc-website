# Mobile Theme Selection Design

## Problem

On both mobile and desktop, selecting `theme` from the suggestions panel auto-executes
the bare `theme` command, which outputs text listing available themes but provides no
way to select one. On desktop, users must manually type `theme <name>`. On mobile
(where `inputMode="none"` disables the keyboard), users are completely stuck.

## Solution

When `theme` is selected from the suggestions panel, instead of auto-executing, drill
down into a theme sub-menu within the same suggestions panel.

## Flow

1. User opens suggestions (Tab on desktop, Cmds on mobile)
2. User navigates to `theme` and selects it (Enter/Tab/click)
3. Instead of executing `theme`, the suggestions panel swaps to show the 5 themes
4. Current theme is indicated (e.g., `● green` vs `○ amber`)
5. User picks a theme → executes `theme <name>` through the normal flow
   (spinner → phosphor transition → confirmation message)
6. Pressing Escape or a back action returns to the main command list

## What Changes

- `selectSuggestion` detects `theme` and enters a "sub-menu" mode instead of auto-executing
- New state to track whether the suggestions panel is showing commands vs themes
- `Suggestions` component (or a variant) renders theme items when in sub-menu mode
- Up/Down/Enter actions work the same way, just against a different list
- Escape backs out to the main command list (then closes suggestions on second press)
