# Mobile Input Redesign — Design Spec

## Problem

Users report unintuitive navigation on mobile devices. Three specific pain points:

1. **Discovery** — Users don't realize commands exist or how to find them
2. **Mechanics** — The `[≡ Cmds] [↑] [↓] [⏎ Enter]` toolbar workflow requires too many taps to reach content
3. **Keyboard expectation** — Users expect to type; the hidden keyboard (`inputMode="none"`) surprises them

## Research Summary

Thorough research across native terminal apps (Termux, Blink Shell, Prompt, Termius, a-Shell), terminal-themed websites, NNg/Google/Algolia UX guidelines, and accessibility standards produced one clear consensus: **every major mobile terminal app keeps the native keyboard visible and augments it with an extra key row**. Hiding the keyboard entirely contradicts user expectations and industry patterns.

However, this site has only 11 fixed commands — fundamentally different from a general-purpose terminal. This enables aggressive autocomplete and real-time filtering that general-purpose terminals can't offer.

## Design: Typing-First with Inline Floating Suggestions

### Approach

Show the native keyboard, remove the dedicated commands button, reduce the helper row to `[↑] [↓]`, and let the floating suggestion dropdown be the primary discovery and selection mechanism — triggered by typing, input focus, and prompt tap.

---

### 1. Input & Keyboard Behavior

**Changes to `TerminalInput.tsx`:**

- Remove `inputMode="none"`. Replace with `inputMode="search"` — shows keyboard with "Go"/"Search" return key instead of newline. Correct for command entry.
- Keep `autoCapitalize="none"`, `spellCheck={false}`, `autoComplete="off"` — all correct for terminal input.
- Keep custom blinking cursor via `<span>` and `caret-transparent` CSS.

**Focus behavior:**

- After boot splash completes, focus the input so keyboard appears immediately.
- On iOS Safari, auto-focus may not open the keyboard without a user gesture. First tap on the terminal area must focus and open it.
- Tapping outside the input area (on terminal output) does NOT dismiss the keyboard. The keyboard stays visible unless explicitly dismissed (swipe down on iOS, back button on Android).

**Desktop:** Completely unchanged.

### 2. Helper Row

**Reduce from 4 buttons to 2:**

Current: `[≡ Cmds] [↑] [↓] [⏎ Enter]`
New: `[↑] [↓]`

- `≡ Cmds` removed — discovery handled by autocomplete dropdown, MOTD hint, and tap-to-reopen on input.
- `⏎ Enter` removed — the keyboard has its own return/go key.

**Button behavior:**

- **↑ / ↓ dual purpose:** When suggestion dropdown is visible, navigate the suggestion list. When dropdown is hidden, cycle through command history. Matches standard terminal behavior.
- **Sizing:** Minimum 48px height per Google's touch target recommendation.
- **Haptic feedback:** Keep existing 10ms vibrate on tap.
- **Visual weight:** Slightly lighter background than terminal area, matching keyboard tone. Creates visual boundary: terminal (dark) → helper row (medium) → keyboard (light).
- **Disabled during reveal:** Buttons get `opacity-50 pointer-events-none` while progressive output is animating.

**Attributes preserved:**

- `data-mobile-action` on each button (for click-outside handling).
- `handleMobileAction` imperative handle — now accepts only `'up' | 'down'` (remove `'tab'` and `'enter'`).

### 3. Floating Suggestion Dropdown

The dropdown appears as a floating list above the input line — not a full-screen panel.

**Show triggers:**

- Focus empty input (initial page load, after keyboard dismiss/refocus)
- Type any character (filters in real-time)
- Tap the input when it's focused, empty, and dropdown is hidden (re-open)

**Hide triggers:**

- Execute a command
- Tap outside the dropdown (on terminal output)
- No matching commands for current input

**Filtering:**

- Real-time prefix match, case-insensitive
- Matched characters highlighted in terminal-primary color (bold), rest dimmed
- Single match auto-highlighted for immediate Enter/Go execution

**Selection:**

- Tap any item directly to select
- Use ↑/↓ helper buttons to navigate, then keyboard Enter/Go to execute
- Selected command fills input for 300ms → auto-executes (current behavior preserved)

**Sizing:**

- Max height: `min(50vh, 200px)` with `overflow-y: auto`
- Shows ~4-5 items without scrolling, scrollable for full list
- Prevents covering entire shrunken viewport when keyboard is open

**Sub-menus:**

- Theme sub-menu: same dropdown, content swaps to theme list with color indicators. "← Commands" link to return. Tapping a theme executes `theme <name>`.
- Sound toggle: tapping `sound` from suggestions directly toggles (current behavior preserved).

**≡ Cmds toggle behavior removed.** The dropdown is now purely state-driven (show/hide based on triggers above), not toggled by a button.

### 4. MOTD Update

**Current mobile MOTD:** `Tap ≡ to explore commands.`
**New mobile MOTD:** `Type 'help' or tap the prompt to explore.`

- Consistent structure with desktop: `Type 'help' or press Tab to explore.`
- "tap the prompt" refers to tapping the `$` input area to re-open the dropdown
- Styled with terminal-primary color on `'help'` and `the prompt` (matching desktop styling of `'help'` and `Tab`)
- MOTD typing animation behavior unchanged (300ms delay, 30ms/char on boot, skip for `prefers-reduced-motion`)

### 5. Viewport & Layout

**Keyboard impact:** The soft keyboard consumes ~40-50% of screen height on mobile.

- Let the browser handle viewport resize naturally. Do not use VirtualKeyboard API (not supported on Safari).
- Terminal output area is already a flex column — it shrinks when keyboard pushes up the bottom.
- Existing `scrollIntoView` on input after command execution keeps recent output and input visible.
- Helper row sticks above keyboard as part of the bottom fixed area, moves with viewport resize.
- No layout changes on desktop — gated by `useIsMobile` hook.

### 6. Accessibility

Targeted improvements scoped to mobile input changes:

- **`role="log"` + `aria-live="polite"`** on terminal output container — screen readers announce new output when idle.
- **`aria-label`** on helper buttons: `↑` → `"Previous command"`, `↓` → `"Next command"`.
- **`aria-label`** on dropdown items: `"Run <command>"` (e.g., "Run whoami").
- **`role="listbox"`** on dropdown container, **`role="option"`** on each item.
- **`aria-expanded`** on the input element — reflects dropdown open/closed state.
- **Minimum 44px touch targets** on dropdown items (padding to meet threshold).

**Out of scope:** Full screen reader mode, braille spinner accessibility, progressive reveal screen reader support.

---

## What Stays the Same

- Desktop behavior — completely untouched
- Progressive output reveal + input blocking during animation
- Theme sub-menu flow inside dropdown
- Sound toggle behavior
- 300ms command preview before auto-execute
- `RESPONSIVE_COMMANDS` mobile/desktop output variants
- Boot splash, shutdown sequence, CRT effects
- `useIsMobile` hook, 768px breakpoint
- `key={sessionKey}` remount pattern

## Files Affected

| File | Changes |
|------|---------|
| `src/components/Terminal/TerminalInput.tsx` | Remove `inputMode="none"`, add `inputMode="search"`, add `aria-expanded`, add click-to-reopen handler |
| `src/components/Terminal/Terminal.tsx` | Refactor suggestion dropdown to floating style, add filtering with character highlighting, add ↑/↓ dual-role logic, update MOTD text, add ARIA attributes to dropdown, update `TerminalHandle` type |
| `src/App.tsx` | Remove `≡ Cmds` and `⏎ Enter` from toolbar, remove Lucide `List`/`Terminal` icon imports, update `mobileKeys` array, simplify layout |
| `src/components/Terminal/Suggestions.tsx` | Restyle as floating dropdown, add max-height constraint, add `role="listbox"`/`role="option"`, ensure 44px touch targets |
| `src/index.css` | Any mobile-specific dropdown positioning styles |
| Tests | Update mobile toolbar tests, add dropdown filtering tests, update MOTD assertion |
