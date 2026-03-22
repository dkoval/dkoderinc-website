# Mobile Input Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the native keyboard on mobile, reduce the helper row to `[↑] [↓]`, and replace the suggestion panel with a floating autocomplete dropdown triggered by typing, input focus, and prompt tap.

**Architecture:** Remove `inputMode="none"` so the keyboard appears. Refactor `Suggestions.tsx` from a full panel overlay to a floating dropdown with prefix filtering and character highlighting. Simplify `App.tsx` toolbar from 4 buttons to 2. All changes gated by `useIsMobile` — desktop is untouched.

**Tech Stack:** React 19, TypeScript 5.9, Vitest, @testing-library/react, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-03-22-mobile-input-redesign-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/Terminal/TerminalInput.tsx` | Modify | Remove `inputMode="none"`, add `inputMode="search"`, `aria-expanded`, click-to-reopen callback |
| `src/App.tsx` | Modify | Reduce toolbar to 2 buttons `[↑] [↓]`, remove Lucide icon imports, add `aria-label`s |
| `src/components/Terminal/Terminal.tsx` | Modify | Narrow `TerminalHandle` to `'up' | 'down'`, refactor suggestion show/hide to state-driven triggers, add prefix filtering, update MOTD, add `role="log"` + `aria-live` on output |
| `src/components/Terminal/Suggestions.tsx` | Modify | Restyle as floating dropdown, add `role="listbox"`/`role="option"`, accept `filterText` prop for character highlighting, enforce 44px touch targets |
| `src/components/Terminal/__tests__/TerminalInput.test.tsx` | Create | Tests for inputMode, aria-expanded, click-to-reopen |
| `src/components/Terminal/__tests__/Suggestions.test.tsx` | Modify | Add floating dropdown, ARIA, filtering highlight tests |
| `src/components/Terminal/__tests__/Terminal.test.tsx` | Modify | Update MOTD assertion, update toolbar tests, add filtering tests |

---

### Task 1: Update TerminalInput — Keyboard Visibility, ARIA, Click-to-Reopen

**Files:**
- Modify: `src/components/Terminal/TerminalInput.tsx`
- Create: `src/components/Terminal/__tests__/TerminalInput.test.tsx`

- [ ] **Step 1: Write failing tests for TerminalInput**

Create `src/components/Terminal/__tests__/TerminalInput.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TerminalInput from '../TerminalInput';
import { mockMatchMedia } from '../../../test/helpers';

const baseProps = {
  inputCommand: '',
  inputRef: { current: null } as React.RefObject<HTMLInputElement | null>,
  onInputChange: vi.fn(),
  onKeyDown: vi.fn(),
  isInputBlocked: false,
  autoSuggestion: null,
  isMobile: false,
  showSuggestions: false,
  onInputClick: vi.fn(),
  onFocus: vi.fn(),
};

describe('TerminalInput', () => {
  it('uses inputMode="search" on mobile', () => {
    render(<TerminalInput {...baseProps} isMobile={true} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('inputMode', 'search');
  });

  it('has no inputMode on desktop', () => {
    render(<TerminalInput {...baseProps} isMobile={false} />);
    const input = screen.getByRole('textbox');
    expect(input).not.toHaveAttribute('inputMode');
  });

  it('sets aria-expanded based on showSuggestions prop', () => {
    const { rerender } = render(<TerminalInput {...baseProps} showSuggestions={false} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-expanded', 'false');

    rerender(<TerminalInput {...baseProps} showSuggestions={true} />);
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('calls onInputClick when input is clicked', () => {
    const onInputClick = vi.fn();
    render(<TerminalInput {...baseProps} onInputClick={onInputClick} />);
    fireEvent.click(screen.getByRole('textbox'));
    expect(onInputClick).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/Terminal/__tests__/TerminalInput.test.tsx`
Expected: FAIL — `onInputClick` and `showSuggestions` props don't exist yet

- [ ] **Step 3: Implement TerminalInput changes**

In `src/components/Terminal/TerminalInput.tsx`:

1. Add to props interface:
```tsx
showSuggestions: boolean;
onInputClick?: () => void;
onFocus?: () => void;
```

2. Replace the input element's `inputMode` line:
```tsx
// Old:
inputMode={isMobile ? "none" : undefined}

// New:
inputMode={isMobile ? "search" : undefined}
```

3. Add `aria-expanded`, `onClick`, and `onFocus` to the input element:
```tsx
aria-expanded={showSuggestions}
onClick={onInputClick}
onFocus={onFocus}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/Terminal/__tests__/TerminalInput.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Run full test suite to check for regressions**

Run: `npx vitest run`
Expected: All existing tests pass. The new `showSuggestions` and `onInputClick` props need to be threaded from Terminal.tsx — existing Terminal tests won't break because TerminalInput is rendered internally and the props are optional/have defaults.

- [ ] **Step 6: Commit**

```bash
git add src/components/Terminal/TerminalInput.tsx src/components/Terminal/__tests__/TerminalInput.test.tsx
git commit -m "feat(mobile): show keyboard with inputMode=search, add aria-expanded and click-to-reopen"
```

---

### Task 2: Reduce Mobile Toolbar to [↑] [↓]

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing test for reduced toolbar**

Add to `src/components/Terminal/__tests__/Terminal.test.tsx` (or a new App test file if preferred — but Terminal.test.tsx already tests mobile behavior):

Since the toolbar lives in App.tsx and is hard to unit test in isolation (it uses terminalRef), we'll verify via the mobileKeys change and existing rendering. The key change is structural — update the array and types.

Skip a dedicated test for this task; the type system will enforce correctness. Proceed directly to implementation.

- [ ] **Step 2: Update mobileKeys array in App.tsx**

In `src/App.tsx`, replace the `mobileKeys` array (lines 23-28):

```tsx
// Old:
const mobileKeys = [
  { label: 'Cmds', action: 'tab' as const, icon: true },
  { label: '↑', action: 'up' as const },
  { label: '↓', action: 'down' as const },
  { label: '⏎ Enter', action: 'enter' as const, emphasized: true },
];

// New:
const mobileKeys = [
  { label: '↑', action: 'up' as const },
  { label: '↓', action: 'down' as const },
];
```

- [ ] **Step 3: Remove unused icon import and rendering logic**

1. Remove the `List` import from `lucide-react` (used for the ≡ icon on the Cmds button).
2. Remove the `icon` and `emphasized` fields from the button type and rendering. In the toolbar JSX, remove the conditional icon rendering (`{icon && <List ... />}`) and the emphasized style logic.
3. Add `aria-label` to each button:

```tsx
<button
  key={label}
  className={`flex-1 py-3 font-mono text-sm rounded inline-flex items-center justify-center gap-1 ${isRevealing ? 'opacity-50 pointer-events-none' : ''}`}
  style={MOBILE_BTN_STYLE}
  data-mobile-action={action}
  aria-label={action === 'up' ? 'Previous command' : 'Next command'}
  onClick={() => {
    navigator.vibrate?.(10);
    terminalRef.current?.handleMobileAction(action);
  }}
>
  {label}
</button>
```

Note: `py-2` → `py-3` to ensure 48px minimum touch target height. Remove `MOBILE_BTN_STYLE_EMPHASIZED` constant if no longer used.

- [ ] **Step 4: Update the MobileAction type**

The `mobileKeys` type annotation (if any) and `handleMobileAction` call site now only pass `'up' | 'down'`. TypeScript will flag any remaining `'tab' | 'enter'` references after Task 3.

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass. The toolbar change is purely in App.tsx rendering; Terminal tests that mock `handleMobileAction` still work since `'up'` and `'down'` are valid values.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat(mobile): reduce toolbar to [↑] [↓], add aria-labels, remove Cmds/Enter buttons"
```

---

### Task 3: Narrow TerminalHandle Type and Simplify useImperativeHandle

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx`

- [ ] **Step 1: Update TerminalHandle type**

In `src/components/Terminal/Terminal.tsx` (line 91-93), narrow the action type:

```tsx
// Old:
export type TerminalHandle = {
  handleMobileAction: (action: 'tab' | 'up' | 'down' | 'enter') => void;
};

// New:
export type TerminalHandle = {
  handleMobileAction: (action: 'up' | 'down') => void;
};
```

- [ ] **Step 2: Simplify useImperativeHandle**

Replace the useImperativeHandle block (lines 596-607):

```tsx
// Old:
useImperativeHandle(ref, () => ({
  handleMobileAction: (action: 'tab' | 'up' | 'down' | 'enter') => {
    if (isInputBlockedRef.current) return;
    switch (action) {
      case 'tab': actionTab(); break;
      case 'up': actionUp(); break;
      case 'down': actionDown(); break;
      case 'enter': actionEnter(); break;
    }
    inputRef.current?.focus();
  },
}), [actionTab, actionUp, actionDown, actionEnter]);

// New:
useImperativeHandle(ref, () => ({
  handleMobileAction: (action: 'up' | 'down') => {
    if (isInputBlockedRef.current) return;
    switch (action) {
      case 'up': actionUp(); break;
      case 'down': actionDown(); break;
    }
    inputRef.current?.focus();
  },
}), [actionUp, actionDown]);
```

- [ ] **Step 3: Verify actionTab and actionEnter are still used internally**

`actionTab` is called from the desktop keyboard handler (`onKeyDown` for Tab key). `actionEnter` is called from the desktop Enter key handler. Both must remain — they are only removed from the *mobile imperative handle*, not from the component. Do NOT delete these functions.

- [ ] **Step 4: Run full test suite + TypeScript check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: All tests pass, no type errors. If App.tsx still references `'tab'` or `'enter'` in `handleMobileAction` calls, TypeScript will catch it — but Task 2 already removed those.

- [ ] **Step 5: Commit**

```bash
git add src/components/Terminal/Terminal.tsx
git commit -m "feat(mobile): narrow TerminalHandle to up/down only"
```

---

### Task 4: Restyle Suggestions.tsx as Floating Dropdown with ARIA

**Files:**
- Modify: `src/components/Terminal/Suggestions.tsx`
- Modify: `src/components/Terminal/__tests__/Suggestions.test.tsx`

- [ ] **Step 1: Write failing tests for floating dropdown styling and ARIA**

Add to `src/components/Terminal/__tests__/Suggestions.test.tsx`:

```tsx
it('has role="listbox" on the container', () => {
  render(<Suggestions {...baseProps} />);
  expect(screen.getByRole('listbox')).toBeInTheDocument();
});

it('has role="option" on each suggestion item', () => {
  render(<Suggestions {...baseProps} />);
  const options = screen.getAllByRole('option');
  expect(options.length).toBe(baseProps.suggestions.length);
});

it('sets aria-label="Run <command>" on each item', () => {
  render(<Suggestions {...baseProps} />);
  const options = screen.getAllByRole('option');
  expect(options[0]).toHaveAttribute('aria-label', `Run ${baseProps.suggestions[0].command}`);
});

it('highlights matching prefix when filterText is provided', () => {
  render(<Suggestions {...baseProps} filterText="sk" />);
  const option = screen.getByRole('option', { name: /Run skills/ });
  const highlight = option.querySelector('[data-highlight="match"]');
  expect(highlight).toHaveTextContent('sk');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/Terminal/__tests__/Suggestions.test.tsx`
Expected: FAIL — no `role="listbox"`, no `role="option"`, no `filterText` prop

- [ ] **Step 3: Add ARIA attributes and filterText prop**

In `src/components/Terminal/Suggestions.tsx`:

1. Add `filterText?: string` to props interface.

2. Add `role="listbox"` to the outer container `<div>`.

3. Change each suggestion `<button>` to include:
```tsx
role="option"
aria-label={`Run ${suggestion.command}`}
aria-selected={index === selectedIndex}
```

4. Add character highlighting helper inside the component:
```tsx
const highlightMatch = (command: string, filter: string) => {
  if (!filter) return <span>{command}</span>;
  const matchEnd = filter.length;
  return (
    <>
      <span data-highlight="match" style={{ color: 'var(--terminal-primary)', fontWeight: 'bold' }}>
        {command.slice(0, matchEnd)}
      </span>
      <span style={{ color: 'var(--terminal-gray)' }}>
        {command.slice(matchEnd)}
      </span>
    </>
  );
};
```

5. Replace the command label rendering in commands mode to use `highlightMatch(suggestion.command, filterText ?? '')`.

- [ ] **Step 4: Restyle as floating dropdown**

Update the outer container styling in Suggestions.tsx. Replace the current full-width panel with floating dropdown:

```tsx
<div
  ref={suggestionsRef}
  role="listbox"
  className="absolute bottom-full left-0 right-0 mb-1 z-20 overflow-y-auto rounded border"
  style={{
    maxHeight: 'min(50vh, 200px)',
    background: 'var(--terminal-bg)',
    borderColor: 'color-mix(in srgb, var(--terminal-primary) 30%, transparent)',
  }}
>
```

Note: `bottom-full` positions it above the input. `mb-1` adds a small gap. The parent (in Terminal.tsx) must have `position: relative` for this to work — verify this is already the case on the input wrapper.

6. Ensure each suggestion item has min-height 44px:
```tsx
className="w-full px-4 py-2 flex items-center space-x-3 text-left text-sm transition-colors min-h-[44px]"
```

The current code already has `min-h-[44px] md:min-h-0`. Change to `min-h-[44px]` always (remove the `md:min-h-0` breakpoint — 44px is fine on desktop too).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/Terminal/__tests__/Suggestions.test.tsx`
Expected: PASS

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass. Terminal.tsx tests that render Suggestions may need the `filterText` prop — but it's optional with a default so existing tests shouldn't break.

- [ ] **Step 7: Commit**

```bash
git add src/components/Terminal/Suggestions.tsx src/components/Terminal/__tests__/Suggestions.test.tsx
git commit -m "feat(mobile): restyle Suggestions as floating dropdown with ARIA and prefix highlighting"
```

---

### Task 5: Add Prefix Filtering and State-Driven Show/Hide Triggers

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx`

This is the largest task — it refactors how the suggestion dropdown opens, closes, and filters.

- [ ] **Step 1: Write failing tests for filtering and show/hide behavior**

Add to `src/components/Terminal/__tests__/Terminal.test.tsx`:

```tsx
describe('suggestion filtering (mobile)', () => {
  beforeEach(() => {
    setupTerminalMedia(true); // mobile mode
  });

  it('shows suggestions when input is focused and empty', async () => {
    const { container } = renderWithProviders(<Terminal bootComplete={true} />);
    const input = container.querySelector('input');
    fireEvent.focus(input!);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('filters suggestions by prefix as user types', async () => {
    const { container } = renderWithProviders(<Terminal bootComplete={true} />);
    const input = container.querySelector('input');
    fireEvent.focus(input!);
    fireEvent.change(input!, { target: { value: 'sk' } });
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveAttribute('aria-label', 'Run skills');
  });

  it('re-opens full list when input is backspaced to empty', async () => {
    const { container } = renderWithProviders(<Terminal bootComplete={true} />);
    const input = container.querySelector('input');
    fireEvent.focus(input!);
    fireEvent.change(input!, { target: { value: 's' } });
    fireEvent.change(input!, { target: { value: '' } });
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(1);
  });

  it('hides suggestions when no commands match', async () => {
    const { container } = renderWithProviders(<Terminal bootComplete={true} />);
    const input = container.querySelector('input');
    fireEvent.focus(input!);
    fireEvent.change(input!, { target: { value: 'xyz' } });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/Terminal/__tests__/Terminal.test.tsx`
Expected: FAIL — suggestions don't show on focus, no filtering logic exists

- [ ] **Step 3: Add filteredSuggestions derived state**

In `src/components/Terminal/Terminal.tsx`, add a `useMemo` that filters `displaySuggestions` based on current input:

```tsx
const filteredSuggestions = useMemo(() => {
  if (suggestionMode === 'themes') return displaySuggestions; // theme mode shows all themes, no filtering
  const trimmed = inputCommand.trim().toLowerCase();
  if (!trimmed) return displaySuggestions; // empty input = show all
  return displaySuggestions.filter(s =>
    s.command.toLowerCase().startsWith(trimmed)
  );
}, [displaySuggestions, inputCommand, suggestionMode]);
```

Pass `filteredSuggestions` to the `<Suggestions>` component instead of `displaySuggestions`. Also pass `filterText={inputCommand.trim()}`.

**Critical:** Store filtered suggestions in a ref so `selectSuggestion` can index into the correct array:

```tsx
const filteredSuggestionsRef = useRef(filteredSuggestions);
filteredSuggestionsRef.current = filteredSuggestions;
```

Then update `selectSuggestion` to use `filteredSuggestionsRef.current[index]` instead of `suggestions[index]` when in commands mode. The current code (line ~520) does `suggestions[index].command` — this must become `filteredSuggestionsRef.current[index].command`, otherwise selecting from a filtered list will execute the wrong command. For example: typing "sk" filters to `skills` at index 0, but `suggestions[0]` is `whoami`.

- [ ] **Step 4: Refactor show/hide triggers**

Modify the `onInputChange` handler (or wherever `setInputCommand` is called on user typing) to include suggestion show/hide logic:

```tsx
// In the onChange handler — IMPORTANT: preserve existing logic (cancelMotdAnimation,
// pendingExecuteRef cancellation, setInputCommand, updateAutoSuggestion) from the
// current handler. ADD the following suggestion show/hide logic after the existing lines:
//
  // Show/hide suggestions based on input
  const trimmed = value.trim().toLowerCase();
  if (trimmed === '') {
    // Backspaced to empty — re-open full list
    setShowSuggestions(true);
    setSuggestionMode('commands');
    setSelectedSuggestionIndex(0);
  } else {
    // Check if any commands match
    const hasMatches = suggestions.some(s =>
      s.command.toLowerCase().startsWith(trimmed)
    );
    setShowSuggestions(hasMatches);
    if (hasMatches) {
      setSuggestionMode('commands');
      setSelectedSuggestionIndex(0);
    }
  }
};
```

Add an `onFocus` handler for the input that shows suggestions when the input is empty:

```tsx
const handleInputFocus = useCallback(() => {
  if (inputCommandRef.current.trim() === '') {
    setShowSuggestions(true);
    setSuggestionMode('commands');
    setSelectedSuggestionIndex(0);
  }
}, []);
```

Add an `onInputClick` handler for the tap-to-reopen behavior:

```tsx
const handleInputClick = useCallback(() => {
  if (inputCommandRef.current.trim() === '' && !showSuggestionsRef.current) {
    setShowSuggestions(true);
    setSuggestionMode('commands');
    setSelectedSuggestionIndex(0);
  }
}, []);
```

Thread `handleInputFocus`, `handleInputClick`, and `showSuggestions` as props to `TerminalInput`.

- [ ] **Step 5: Clamp selectedSuggestionIndex to filtered list length**

The `actionUp` and `actionDown` callbacks currently use `suggestions.length` for wrapping. Update them to use `filteredSuggestions.length` when in commands mode. Store the filtered length in a ref so the callbacks can access it without stale closures:

```tsx
const filteredLengthRef = useRef(filteredSuggestions.length);
filteredLengthRef.current = filteredSuggestions.length;
```

In `actionUp` and `actionDown`, replace:
```tsx
const len = suggestionModeRef.current === 'themes' ? VALID_THEMES.length : suggestions.length;
```
with:
```tsx
const len = suggestionModeRef.current === 'themes' ? VALID_THEMES.length : filteredLengthRef.current;
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/Terminal/__tests__/Terminal.test.tsx`
Expected: PASS for the new filtering tests

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add src/components/Terminal/Terminal.tsx
git commit -m "feat(mobile): add prefix filtering and state-driven suggestion show/hide triggers"
```

---

### Task 6: Update Mobile MOTD

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx`
- Modify: `src/components/Terminal/__tests__/Terminal.test.tsx`

- [ ] **Step 1: Update MOTD test**

In `src/components/Terminal/__tests__/Terminal.test.tsx`, find the existing MOTD test (around line 42-47) and update or add:

```tsx
it('shows updated mobile MOTD', async () => {
  setupTerminalMedia(true); // mobile
  const { container } = renderWithProviders(<Terminal bootComplete={true} />);
  await waitFor(() => {
    expect(container.textContent).toContain("Type 'help' or tap the prompt to explore.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Terminal/__tests__/Terminal.test.tsx`
Expected: FAIL — MOTD still says "Tap ≡ to explore commands."

- [ ] **Step 3: Update MOTD text in Terminal.tsx**

Find the `displayMotd` callback and the `motdPlainText` variable. Update the mobile variants:

```tsx
// motdPlainText (used for typing animation character count):
const motdPlainText = isMobile
  ? "Type 'help' or tap the prompt to explore."
  : "Type 'help' or press Tab to explore.";

// displayMotd (HTML version):
const displayMotd = useCallback((): TerminalLine[] => {
  const hint = isMobileRef.current
    ? 'Type <span style="color: var(--terminal-primary)">\'help\'</span> or <span style="color: var(--terminal-primary)">tap the prompt</span> to explore.'
    : 'Type <span style="color: var(--terminal-primary)">\'help\'</span> or press <span style="color: var(--terminal-primary)">Tab</span> to explore.';
  return [
    { content: `<span style="color: var(--terminal-gray)">${hint}</span>`, type: 'output' as const, isHtml: true },
  ];
}, []);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/Terminal/__tests__/Terminal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/Terminal/Terminal.tsx src/components/Terminal/__tests__/Terminal.test.tsx
git commit -m "feat(mobile): update MOTD to 'Type help or tap the prompt to explore'"
```

---

### Task 7: Add Accessibility Attributes to Terminal Output

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx`
- Modify: `src/components/Terminal/__tests__/Terminal.test.tsx`

- [ ] **Step 1: Write failing test**

Add to `src/components/Terminal/__tests__/Terminal.test.tsx`:

```tsx
it('terminal output container has role="log" and aria-live="polite"', () => {
  setupTerminalMedia(false);
  const { container } = renderWithProviders(<Terminal bootComplete={true} />);
  const log = container.querySelector('[role="log"]');
  expect(log).toBeInTheDocument();
  expect(log).toHaveAttribute('aria-live', 'polite');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Terminal/__tests__/Terminal.test.tsx`
Expected: FAIL — no element with `role="log"`

- [ ] **Step 3: Add attributes to terminal output container**

In Terminal.tsx, find the terminal output `<div>` that wraps the output lines (in the render JSX, around line 792-810). Add:

```tsx
<div role="log" aria-live="polite" className="...existing classes...">
  {/* terminal output lines */}
</div>
```

This is the scrollable container that holds all `terminalOutput` lines.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/Terminal/__tests__/Terminal.test.tsx`
Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/components/Terminal/Terminal.tsx src/components/Terminal/__tests__/Terminal.test.tsx
git commit -m "feat(a11y): add role=log and aria-live=polite to terminal output"
```

---

### Task 8: Thread New Props and Integration Verification

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx` (thread props to TerminalInput)
- All test files

This task ensures all new props (`showSuggestions`, `onInputClick`, `onFocus`, `filterText`) are properly connected between Terminal.tsx → TerminalInput.tsx → Suggestions.tsx.

- [ ] **Step 1: Thread showSuggestions and handlers to TerminalInput**

In Terminal.tsx, where `<TerminalInput>` is rendered, add the new props:

```tsx
<TerminalInput
  inputCommand={inputCommand}
  inputRef={inputRef}
  onInputChange={handleInputChange}
  onKeyDown={handleKeyDown}
  isInputBlocked={isInputBlocked}
  autoSuggestion={autoSuggestion}
  isMobile={isMobile}
  showSuggestions={showSuggestions}
  onInputClick={handleInputClick}
  onFocus={handleInputFocus}
/>
```

Note: `onFocus` was already added to TerminalInput's props interface and wired to the `<input>` element in Task 1.

- [ ] **Step 2: Thread filterText to Suggestions**

In Terminal.tsx, where `<Suggestions>` is rendered, pass the filtered list and filter text:

```tsx
<Suggestions
  suggestions={filteredSuggestions}
  selectedIndex={selectedSuggestionIndex}
  onSelect={selectSuggestion}
  onMouseEnter={handleSuggestionMouseEnter}
  ref={suggestionsRef}
  mode={suggestionMode}
  themes={VALID_THEMES}
  currentTheme={theme}
  onBack={backToCommands}
  filterText={inputCommand.trim()}
/>
```

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass — no regressions

- [ ] **Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 5: Manual mobile testing checklist**

Run `npm run dev` and test on a mobile device or Chrome DevTools mobile emulation:

1. [ ] Page loads → input focused → keyboard appears → suggestion dropdown shows all 11 commands
2. [ ] Type "s" → dropdown filters to `skills`, `sound`
3. [ ] Type "sk" → dropdown filters to `skills` only, "sk" highlighted in green
4. [ ] Backspace to empty → dropdown shows full list
5. [ ] Tap a suggestion → command fills input for 300ms → executes
6. [ ] Tap outside dropdown (on terminal output) → dropdown closes
7. [ ] Tap input → dropdown re-opens
8. [ ] Press ↑ button with dropdown open → navigates suggestions
9. [ ] Press ↑ button with dropdown closed → cycles command history
10. [ ] Execute `theme` from suggestions → theme sub-menu appears in dropdown
11. [ ] MOTD reads "Type 'help' or tap the prompt to explore."
12. [ ] Keyboard Enter/Go key submits command
13. [ ] Desktop behavior unchanged — Tab/Enter/arrows all work as before

- [ ] **Step 6: Commit**

```bash
git add src/components/Terminal/Terminal.tsx src/components/Terminal/TerminalInput.tsx
git commit -m "feat(mobile): thread suggestion props through component tree, integration complete"
```

---

## Task Dependency Order

```
Task 1 (TerminalInput) ──┐
Task 2 (Toolbar)     ────┤
Task 3 (TerminalHandle) ─┤──→ Task 5 (Filtering + Show/Hide) ──→ Task 8 (Integration)
Task 4 (Suggestions)  ───┘
Task 6 (MOTD) ─────────────→ (independent, can run anytime after Task 3)
Task 7 (Accessibility) ────→ (independent, can run anytime)
```

Tasks 1-4 can be done in parallel. Task 5 depends on all four. Tasks 6-7 are independent. Task 8 ties everything together.
