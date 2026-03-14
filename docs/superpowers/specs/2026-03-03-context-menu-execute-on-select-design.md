# Context Menu: Execute on Selection

## Problem

When a user selects a command from the suggestion context menu (via Enter or mouse click), the command is copied to the input box. The user must press Enter a second time to execute it. This double-Enter interaction is unintuitive.

## Solution

Change `selectSuggestion()` and the mouse click handler to execute the command immediately instead of copying it to the input. Both keyboard and mouse paths converge on `handleCommand()`, which already handles history recording, terminal output, and input clearing.

## Approach

**Approach A: Enter/Click = Execute Immediately**

Selecting a suggestion (Enter, Tab when menu is open, or mouse click) executes the command directly. This matches real terminal autocomplete behavior (fzf, zsh-autocomplete). The menu already shows command name and description, so there's nothing to "preview."

Alternatives considered and rejected:
- **Tab to inspect, Enter to execute** — added complexity for no real benefit
- **Flash command in input then auto-execute** — artificial delay, redundant visual feedback

## Changes

### `Terminal.tsx` — `selectSuggestion()` (line 167-173)

Replace copying command to input with direct execution:

```tsx
// Before
const selectSuggestion = () => {
  const selectedCommand = suggestions[selectedSuggestionIndex].command;
  setInputCommand(selectedCommand);
  setShowSuggestions(false);
  setAutoSuggestion(null);
  inputRef.current?.focus();
};

// After
const selectSuggestion = () => {
  const selectedCommand = suggestions[selectedSuggestionIndex].command;
  setShowSuggestions(false);
  handleCommand(selectedCommand);
  inputRef.current?.focus();
};
```

### `Terminal.tsx` — `Suggestions onSelect` callback (line 379-384)

Replace inline handler with direct execution:

```tsx
// Before
onSelect={(command) => {
  setInputCommand(command);
  setShowSuggestions(false);
  setAutoSuggestion(null);
  inputRef.current?.focus();
}}

// After
onSelect={(command) => {
  setShowSuggestions(false);
  handleCommand(command);
  inputRef.current?.focus();
}}
```

## What Stays the Same

- `handleCommand()` — no changes; already records history, appends output, clears input
- `actionTab()` / `actionEnter()` — still call `selectSuggestion()`, which now executes
- Mobile — `handleMobileAction` delegates to the same `actionTab()`/`actionEnter()`, so mobile gets the fix for free
- Keyboard navigation (Up/Down), Escape to dismiss — unchanged

## Edge Cases

- `clear` and `exit` — already handled inside `handleCommand()`
- Focus after execution — `inputRef.current?.focus()` ensures input stays focused for both keyboard and mouse paths
