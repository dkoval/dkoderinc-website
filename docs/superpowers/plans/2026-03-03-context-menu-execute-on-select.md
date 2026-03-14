# Context Menu Execute-on-Select Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make suggestion menu selection (Enter, Tab, or mouse click) execute the command immediately instead of requiring a second Enter press.

**Architecture:** Two call sites in `Terminal.tsx` currently copy the selected command to the input — change both to call `handleCommand()` directly instead.

**Tech Stack:** React, TypeScript

---

### Task 1: Update `selectSuggestion()` to Execute Directly

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx:167-173`

**Step 1: Edit `selectSuggestion()`**

Replace the current implementation:

```tsx
// Current (line 167-173)
const selectSuggestion = () => {
  const selectedCommand = suggestions[selectedSuggestionIndex].command;
  setInputCommand(selectedCommand);
  setShowSuggestions(false);
  setAutoSuggestion(null);
  inputRef.current?.focus();
};
```

With:

```tsx
const selectSuggestion = () => {
  const selectedCommand = suggestions[selectedSuggestionIndex].command;
  setShowSuggestions(false);
  handleCommand(selectedCommand);
  inputRef.current?.focus();
};
```

Key changes:
- Remove `setInputCommand(selectedCommand)` — no longer copying to input
- Remove `setAutoSuggestion(null)` — `handleCommand()` already calls this
- Replace with `handleCommand(selectedCommand)` — executes directly

This single change covers keyboard Enter (`actionEnter`), keyboard Tab (`actionTab`), and mobile (`handleMobileAction`) since they all call `selectSuggestion()`.

**Step 2: Commit**

```bash
git add src/components/Terminal/Terminal.tsx
git commit -m "feat: execute command on suggestion selection via keyboard

selectSuggestion() now calls handleCommand() directly instead of
copying the command to the input box."
```

---

### Task 2: Update Mouse Click Handler to Execute Directly

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx:379-384`

**Step 1: Edit the `onSelect` callback in `<Suggestions>`**

Replace the current inline handler:

```tsx
// Current (line 379-384)
onSelect={(command) => {
  setInputCommand(command);
  setShowSuggestions(false);
  setAutoSuggestion(null);
  inputRef.current?.focus();
}}
```

With:

```tsx
onSelect={(command) => {
  setShowSuggestions(false);
  handleCommand(command);
  inputRef.current?.focus();
}}
```

Same logic as Task 1 — execute directly instead of copying to input.

**Step 2: Commit**

```bash
git add src/components/Terminal/Terminal.tsx
git commit -m "feat: execute command on suggestion click

Mouse click on a suggestion now executes the command directly,
matching the keyboard selection behavior."
```

---

### Task 3: Manual Verification

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Verify keyboard flow**

1. Press Tab → suggestion menu opens
2. Use Up/Down arrows to navigate
3. Press Enter → command executes immediately (no second Enter needed)
4. Verify command appears in terminal output with `$` prefix
5. Press Up arrow → verify executed command is in history

**Step 3: Verify Tab-to-select flow**

1. Press Tab → suggestion menu opens
2. Navigate to a command
3. Press Tab again → command executes immediately
4. Verify output and history

**Step 4: Verify mouse flow**

1. Press Tab → suggestion menu opens
2. Click a suggestion → command executes immediately
3. Verify input is focused after execution

**Step 5: Verify edge cases**

1. Select `clear` from menu → terminal clears (no crash)
2. Select `exit` from menu → shutdown sequence starts
3. Verify Escape still dismisses menu without executing

**Step 6: Commit verification note (optional)**

```bash
git commit --allow-empty -m "verify: context menu execute-on-select tested manually"
```
