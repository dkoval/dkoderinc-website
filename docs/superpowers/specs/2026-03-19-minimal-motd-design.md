# Minimal MOTD: Replace Auto-Displayed Help with One-Line Hint

## Problem

The terminal auto-displays the full `help` output (17 lines) on initial load and after every `clear` command. This consumes excessive screen real estate and violates UNIX philosophy, where login messages communicate identity/status — not usage manuals. Help should be pull-based (user requests it), not push-based (forced on every load).

Additionally, `help` is not currently a user-typeable command — `displayHelp()` is only called internally by the mount effect and the `clear` handler. Typing `help` today produces "Command not found."

## Design

### Core Change

1. Replace `displayHelp()` call sites (mount + clear) with a new `displayMotd()` that renders a single hint line
2. Add `help` as a real command that users can type to see the full listing
3. Remove input placeholder text (redundant with the MOTD hint)

### Desktop

```
Type 'help' or press Tab to explore.

~ $
```

One line of muted output (`--terminal-gray` color), followed by the prompt.

### Mobile

```
Tap ≡ to explore commands.

~ $
```

Mobile variant uses the existing `isMobile` prop. The hint references the `≡ Cmds` toolbar button, which is the primary discovery mechanism on mobile (keyboard is disabled via `inputMode="none"`).

### Behavior Changes

| Scenario | Before | After |
|----------|--------|-------|
| Initial load | 17-line help output | 1-line hint |
| `clear` command | Resets to 17-line help | Resets to 1-line hint |
| `Ctrl+L` shortcut | Resets to 17-line help (delegates to `clear` handler) | Resets to 1-line hint |
| Typing `help` | "Command not found: help" | Full 17-line listing (new command) |
| Tab / suggestions | Dropdown appears | Unchanged |
| Auto-suggestions | Ghost text while typing | Unchanged |
| Input placeholder | `"Type a command or press Tab for suggestions..."` | Removed (MOTD hint covers it) |
| Session restart (`key={sessionKey}` remount) | Mount effect shows 17-line help | Mount effect shows 1-line hint |

### What Does NOT Change

- Tab autocomplete and suggestions dropdown behavior
- Auto-suggestion ghost text
- Progressive output reveal system
- Mobile toolbar behavior
- `displaySuggestions` useMemo pattern
- `helpEntry` type on `TerminalLine` and its rendering path (lines 634-640) — still used by the `help` command output

## Implementation

### Files Modified

- **`src/components/Terminal/Terminal.tsx`** — main changes
- **`src/components/Terminal/__tests__/Terminal.test.tsx`** — test updates

### Steps

1. **Add `displayMotd()` function** — returns a single `TerminalLine` array with the hint:
   - Desktop: `Type 'help' or press Tab to explore.`
   - Mobile: `Tap ≡ to explore commands.`
   - Use `isMobile` prop to select variant
   - The line is a standard `type: 'output'` with `isHtml: true`, content wrapped in a `<span style="color: var(--terminal-gray)">` for muted rendering
   - No `input`-type line, no timestamp — the hint is pure output, not a simulated command execution
   - Since it's a single line, progressive reveal renders it instantly (existing behavior)

2. **Keep `displayHelp()` as-is** — it continues to produce the full 17-line listing with `helpEntry` items, used only by the new `help` command handler

3. **Update mount effect** (line 508) — change `displayHelp()` to `displayMotd()`

4. **Update `clear` handler** (line 191) — change `displayHelp()` to `displayMotd()`. The `Ctrl+L` handler (line 501-504) delegates to `handleCommand('clear')`, so no separate update is needed.

5. **Add `help` command handler** — add an early-return case in `handleCommand` (alongside `clear`, `exit`, etc.) that appends `displayHelp()` output to the terminal. This makes `help` a real user-typeable command. Note: `displayHelp()` already includes `~ $ help` as its first entry (the input line), so the handler should append its output directly without adding a separate input line. Also add `help` to command history so it appears when pressing ↑ (unlike `clear`/`exit`, `help` is informational, not a terminal control command).

6. **Remove input placeholder** (line 686) — delete the `placeholder` attribute from the input element. The MOTD hint line now serves this purpose, and having both is redundant.

7. **Update `suggestions` array** — add a `help` entry to the suggestions array in `commands.tsx` so it appears in Tab-completion and the suggestions dropdown. Use an appropriate icon (e.g., `HelpCircle` from lucide-react).

### Note on `help` command placement

Add `help` as an early-return command in `handleCommand` (like `clear` and `exit`), not in the `commands` map. The `commands` map is for commands that show a spinner before output. `help` should display instantly, like `clear`.

## Testing

### Manual Verification

1. Load the page — should see only the hint line + prompt, no placeholder in input
2. Type `help` — full command listing appears (was previously "Command not found")
3. Type `clear` — resets to hint line, not to help output
4. Press `Ctrl+L` — same as clear
5. Resize to mobile — hint changes to "Tap ≡ to explore commands."
6. Use mobile toolbar `≡ Cmds` button — suggestions dropdown works normally
7. Trigger session restart — remount shows hint line, not help output
8. Tab-complete `hel` — should suggest `help`

### Existing Tests to Update

Two tests in `src/components/Terminal/__tests__/Terminal.test.tsx` will break:

- **`renders help screen on mount`** (approx line 41-44) — currently asserts `screen.getByText('Available commands:')`. Update to assert the MOTD hint text instead.
- **`clears terminal and shows help on clear command`** (approx line 81-91) — currently asserts `screen.getByText('Available commands:')` after clear. Update to assert the MOTD hint text instead.

Add new test:
- **`shows full help output when help command is typed`** — type `help`, assert `screen.getByText('Available commands:')` appears.

## Design Decisions

**Why not placeholder text in the input field?** The input already had placeholder text (`"Type a command or press Tab for suggestions..."`), but placeholder text is a web form pattern, not a terminal pattern. The MOTD hint line as terminal output is more authentic to the CRT aesthetic. Having both the MOTD hint and a placeholder would be redundant, so the placeholder is removed.

**Why not differentiate first-visit vs. returning visitors?** Adds localStorage state tracking complexity for marginal UX benefit. Same experience every time is simpler and more predictable — consistent with how real terminals behave.

**Why not show personal details in the MOTD?** The sidebar already displays name, role, and social links. Duplicating this in the terminal output is redundant.

**Why a mobile-specific hint?** On mobile, Tab doesn't exist and typing is disabled. The `≡ Cmds` toolbar button is the actual discovery mechanism, so the hint should point to it.

**Why add `help` as a command?** The MOTD says "Type 'help'" — this creates a user expectation that `help` works. Previously, `displayHelp()` was only called internally and typing `help` gave "Command not found." Adding it as an early-return command (no spinner, instant display) is consistent with how `clear` works.
