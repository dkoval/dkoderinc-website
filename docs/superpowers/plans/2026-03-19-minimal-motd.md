# Minimal MOTD Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the auto-displayed 17-line help output with a 1-line MOTD hint on load/clear, add `help` as a real command, and remove the redundant input placeholder.

**Architecture:** Three surgical changes to Terminal.tsx (new `displayMotd()` function, new `help` early-return handler, placeholder removal), one addition to commands.tsx (help suggestion entry), and test updates.

**Tech Stack:** React 19, TypeScript, Vitest, @testing-library/react

**Spec:** `docs/superpowers/specs/2026-03-19-minimal-motd-design.md`

---

## Chunk 1: Implementation

### Task 1: Add `help` to suggestions array

**Files:**
- Modify: `src/components/Terminal/commands.tsx:1-15`

- [ ] **Step 1: Add HelpCircle import and help entry**

In `commands.tsx`, add `HelpCircle` to the lucide-react import and add a `help` entry to the `suggestions` array — after `sound`, before `clear`:

```tsx
// Line 1 — add HelpCircle to import:
import { Cpu, Mail, Sparkles, User, Info, Clock, LogOut, History, Palette, Volume2, HelpCircle } from 'lucide-react';

// Insert after the sound entry (line 12), before clear (line 13):
  { command: 'help', description: 'Show available commands', icon: <HelpCircle className="w-4 h-4" style={{ color: 'var(--terminal-primary)' }} /> },
```

The full suggestions array order becomes: whoami, man dmytro, skills, history, contact, uptime, theme, sound, **help**, clear, exit.

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Terminal/commands.tsx
git commit -m "feat: add help to suggestions array for Tab-completion"
```

---

### Task 2: Add `displayMotd()` and swap call sites

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx:119-134` (add function), `Terminal.tsx:191` (clear handler), `Terminal.tsx:508` (mount effect), `Terminal.tsx:686` (placeholder)

- [ ] **Step 1: Add `displayMotd()` function**

Add the new function directly above the existing `displayHelp()` (before line 119):

```tsx
  const displayMotd = (): TerminalLine[] => {
    const hint = isMobile
      ? 'Tap <span style="color: var(--terminal-primary)">≡</span> to explore commands.'
      : 'Type <span style="color: var(--terminal-primary)">\'help\'</span> or press <span style="color: var(--terminal-primary)">Tab</span> to explore.';
    return [
      { content: `<span style="color: var(--terminal-gray)">${hint}</span>`, type: 'output' as const, isHtml: true },
    ];
  };
```

Key details:
- Uses `isMobile` (already in scope from line 42) to select the variant
- Wraps content in `<span>` with `--terminal-gray` for muted rendering
- Highlights keywords (`'help'`, `Tab`, `≡`) in `--terminal-primary`
- Uses `isHtml: true` so the span renders via DOMPurify (line 641-646)
- `style` attribute is allowed by `PURIFY_CONFIG` (`ADD_ATTR: ['style']` on line 16)

- [ ] **Step 2: Update mount effect**

Change line 508 from:
```tsx
    setTerminalOutput(displayHelp());
```
to:
```tsx
    setTerminalOutput(displayMotd());
```

- [ ] **Step 3: Update `clear` handler**

Change line 191 from:
```tsx
      setTerminalOutput(displayHelp());
```
to:
```tsx
      setTerminalOutput(displayMotd());
```

Note: `Ctrl+L` (line 501-504) calls `handleCommand('clear')`, which hits this handler. No separate update needed.

- [ ] **Step 4: Remove input placeholder**

Remove the `placeholder` attribute from line 686. Change from:
```tsx
              placeholder={isMobile ? "Tap Cmds for suggestions..." : "Type a command or press Tab for suggestions..."}
```
to: (delete the entire line)

The MOTD hint line now serves this purpose.

- [ ] **Step 5: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/components/Terminal/Terminal.tsx
git commit -m "feat: replace help auto-display with minimal MOTD hint"
```

---

### Task 3: Add `help` command handler

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx` (insert before the `clear` early-return handler)

Note: Line numbers below reference the original file. After Task 2's insertions, they will have shifted by ~7 lines. Use the descriptive anchors (e.g., "before the `if (trimmedCmd === 'clear')` block") to find the correct insertion point.

- [ ] **Step 1: Add early-return `help` handler**

Insert immediately before the `if (trimmedCmd === 'clear')` block:

```tsx
    if (trimmedCmd === 'help') {
      setTerminalOutput(prev => [...prev, ...displayHelp()]);
      setCommandHistory(prev => [...prev, trimmedCmd].slice(-MAX_HISTORY));
      setHistoryIndex(-1);
      setInputCommand('');
      setAutoSuggestion(null);
      return;
    }
```

Key details:
- **Appends** to output (unlike `clear` which replaces) — `displayHelp()` already includes the `~ $ help` input line as its first entry, so no separate input line is added
- Adds to `commandHistory` so it appears when pressing ↑ (unlike `clear`/`exit` which don't)
- Instant display — no spinner, no setTimeout (same pattern as `clear` and `exit`)
- Resets `historyIndex`, `inputCommand`, and `autoSuggestion` (standard cleanup)

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Terminal/Terminal.tsx
git commit -m "feat: add help as a user-typeable command"
```

---

## Chunk 2: Tests

### Task 4: Update existing tests and add new test

**Files:**
- Modify: `src/components/Terminal/__tests__/Terminal.test.tsx:41-44, 81-91`

- [ ] **Step 1: Write failing test for `help` command**

Add a new test case after the existing `'clears terminal and shows help on clear command'` test (after line 91):

```tsx
  it('shows full help output when help command is typed', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    submitCommand('help');
    expect(screen.getByText('Available commands:')).toBeInTheDocument();
  });
```

Note: `help` is an early-return command (no spinner), so no `advanceTimersByTime` is needed.

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/components/Terminal/__tests__/Terminal.test.tsx --reporter=verbose`
Expected: The new test PASSES (since the `help` handler was already added in Task 3). If it fails, the handler wasn't added correctly — check Task 3.

- [ ] **Step 3: Update mount test assertion**

Change the test at line 41-44 from:
```tsx
  it('renders help screen on mount', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    expect(screen.getByText('Available commands:')).toBeInTheDocument();
  });
```
to:
```tsx
  it('renders MOTD hint on mount', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    expect(screen.getByText(/Type.*'help'.*or press.*Tab.*to explore/)).toBeInTheDocument();
  });
```

Uses regex because the content is HTML with `<span>` tags — `getByText` matches on rendered text content.

- [ ] **Step 4: Update clear test assertion**

Change the test at line 81-91 from:
```tsx
  it('clears terminal and shows help on clear command', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    submitCommand('history');
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByText(/Still shipping/)).toBeInTheDocument();

    // Clear — synchronous, no timer needed
    submitCommand('clear');
    expect(screen.queryByText(/Still shipping/)).not.toBeInTheDocument();
    expect(screen.getByText('Available commands:')).toBeInTheDocument();
  });
```
to:
```tsx
  it('clears terminal and shows MOTD on clear command', () => {
    renderWithProviders(<Terminal {...defaultProps} />);
    submitCommand('history');
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByText(/Still shipping/)).toBeInTheDocument();

    // Clear — synchronous, no timer needed
    submitCommand('clear');
    expect(screen.queryByText(/Still shipping/)).not.toBeInTheDocument();
    expect(screen.getByText(/Type.*'help'.*or press.*Tab.*to explore/)).toBeInTheDocument();
  });
```

- [ ] **Step 5: Run all Terminal tests**

Run: `npx vitest run src/components/Terminal/__tests__/Terminal.test.tsx --reporter=verbose`
Expected: All tests pass

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: All tests pass. No regressions in other test files.

- [ ] **Step 7: Commit**

```bash
git add src/components/Terminal/__tests__/Terminal.test.tsx
git commit -m "test: update Terminal tests for MOTD and help command"
```

---

## Chunk 3: Manual Verification

### Task 5: Manual smoke test

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify desktop behavior**

Open browser to dev server URL:
1. Page loads → single hint line `Type 'help' or press Tab to explore.` in gray + prompt. No 17-line help dump.
2. Input field has no placeholder text.
3. Type `help` → full command listing appears with all 11 commands (including help itself) + tips section.
4. Type `clear` → resets to hint line.
5. Press `Ctrl+L` → same as clear.
6. Press Tab → suggestions dropdown shows `help` in the list.
7. Type `hel` → auto-suggestion ghost text shows `help`.

- [ ] **Step 3: Verify mobile behavior**

Use browser DevTools responsive mode (width < 768px):
1. Page loads → hint shows `Tap ≡ to explore commands.` instead of the desktop variant.
2. Tap `≡ Cmds` button → suggestions dropdown works.

- [ ] **Step 4: Stop dev server**
