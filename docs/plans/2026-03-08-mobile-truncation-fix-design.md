# Mobile Output Truncation Fix

## Problem

On mobile viewports (e.g. Google Pixel 9 Pro XL), terminal command output gets truncated at the right edge. Root cause: `whiteSpace: 'pre'` prevents wrapping while `overflow-x-hidden` clips overflow.

Affected commands: `skills`, `history`. Other commands (`man dmytro`, `contact`, `whoami`) are unaffected — they either use HTML rendering, are already short, or have mobile variants.

## Solution

### 1. `skills` — Mobile variant with shorter bars

- Add `skillsMobile` key to the commands map
- Use 6-character bars instead of 12, tighter name-to-bar spacing
- Adopt a 5-level proportional scale for both mobile and desktop:
  - learning — 20% fill
  - basic — 40% fill
  - familiar — 60% fill
  - proficient — 80% fill
  - expert — 100% fill
- Desktop keeps 12-character bars, updated to 5-level scale

### 2. `history` — Single tighter variant for both viewports

- Remove excess left indent (4 spaces down to 1)
- Shorten long lines to fit mobile width

### 3. Detection

- Reuse existing `isMobile` check in Terminal.tsx (same pattern as `whoami`/`whoamiDesktop`)

## Files to modify

- `src/components/Terminal/commands.tsx` — add `skillsMobile`, update `skills` bar scale, tighten `history`
- `src/components/Terminal/Terminal.tsx` — select `skillsMobile` vs `skills` based on `isMobile`
