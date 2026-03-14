# Remove Swipe-to-Navigate-History Gesture

**Date:** 2026-03-14
**Status:** Approved

## Problem

The terminal's scrollable output area (`overflow-y-auto`) has `onTouchStart`/`onTouchEnd` handlers that capture vertical swipes (>50px) and trigger command history navigation. This conflicts with native touch scrolling on mobile: any scroll attempt that exceeds the 50px threshold also changes the command history. Since `handleTouchEnd` does not call `preventDefault()`, both actions fire simultaneously — the terminal scrolls AND the input changes to a history entry.

The mobile toolbar already provides dedicated `[↑]` and `[↓]` buttons for history navigation, making the swipe gesture entirely redundant.

## Solution

Remove all swipe-to-navigate-history code from `Terminal.tsx`:

1. Delete `touchStartY` ref (line 51)
2. Delete `handleTouchStart` function (lines 556-558)
3. Delete `handleTouchEnd` function (lines 560-570)
4. Remove `onTouchStart`/`onTouchEnd` props from the scrollable div (lines 589-590)

## What stays unchanged

- Mobile toolbar `[↑]`/`[↓]` buttons continue to handle history navigation via `handleMobileAction`
- Desktop arrow key history navigation is unaffected
- Native touch scrolling on the terminal output area works without interference (`overflow-y-auto`)

## Risk

None. `touchStartY`, `handleTouchStart`, and `handleTouchEnd` are not referenced by any other code. This is a pure deletion with no behavioral side effects beyond restoring clean touch scrolling.

## Alternatives considered

- **Smart swipe (scroll-boundary-only triggering):** Only fire history navigation when scrolled to bottom. Rejected — adds complexity for a redundant gesture.
- **Horizontal swipe:** Use left/right swipe for history. Rejected — unconventional UX, still redundant with toolbar.
