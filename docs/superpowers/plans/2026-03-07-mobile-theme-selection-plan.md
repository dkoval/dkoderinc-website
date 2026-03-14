# Theme Sub-Menu in Suggestions Panel — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When users select `theme` from the suggestions panel, show a sub-menu of available themes instead of auto-executing the bare `theme` command.

**Architecture:** Add a `suggestionMode` state to Terminal.tsx that toggles between `'commands'` and `'themes'`. When in `'themes'` mode, the Suggestions component renders theme items instead of command items. All existing navigation (Up/Down/Enter/Escape) works against the theme list. Selecting a theme executes `theme <name>` through the normal command flow.

**Tech Stack:** React, TypeScript, Tailwind CSS, lucide-react icons

---

### Task 1: Add sub-menu state to Terminal.tsx

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx:42-44` (state declarations)
- Modify: `src/components/Terminal/Terminal.tsx:227-241` (selectSuggestion)

**Step 1: Add suggestionMode state**

In Terminal.tsx, after the `selectedSuggestionIndex` state declaration (line 43), add:

```tsx
const [suggestionMode, setSuggestionMode] = useState<'commands' | 'themes'>('commands');
```

**Step 2: Modify selectSuggestion to intercept `theme`**

Replace the `selectSuggestion` function with:

```tsx
const selectSuggestion = (index: number) => {
  if (suggestionMode === 'commands') {
    const selectedCommand = suggestions[index].command;

    // Drill into theme sub-menu instead of auto-executing
    if (selectedCommand === 'theme') {
      setSuggestionMode('themes');
      setSelectedSuggestionIndex(0);
      return;
    }

    setShowSuggestions(false);
    setInputCommand(selectedCommand);
    setAutoSuggestion(null);
    inputRef.current?.focus();
    if (pendingExecuteRef.current) {
      clearTimeout(pendingExecuteRef.current);
      pendingExecuteRef.current = null;
    }
    pendingExecuteRef.current = setTimeout(() => {
      pendingExecuteRef.current = null;
      handleCommand(selectedCommand);
    }, 300);
  } else {
    // Theme sub-menu: execute the selected theme
    const selectedTheme = VALID_THEMES[index];
    setSuggestionMode('commands');
    setShowSuggestions(false);
    setInputCommand(`theme ${selectedTheme}`);
    setAutoSuggestion(null);
    inputRef.current?.focus();
    if (pendingExecuteRef.current) {
      clearTimeout(pendingExecuteRef.current);
      pendingExecuteRef.current = null;
    }
    pendingExecuteRef.current = setTimeout(() => {
      pendingExecuteRef.current = null;
      handleCommand(`theme ${selectedTheme}`);
    }, 300);
  }
};
```

**Step 3: Commit**

```
git add src/components/Terminal/Terminal.tsx
git commit -m "Add suggestionMode state and intercept theme in selectSuggestion"
```

---

### Task 2: Handle Escape to back out of theme sub-menu

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx:332-339` (Escape handler in handleKeyDown)
- Modify: `src/components/Terminal/Terminal.tsx:252-261` (actionTab)

**Step 1: Update Escape handler**

Replace the Escape case in `handleKeyDown` with:

```tsx
case 'Escape':
  if (suggestionMode === 'themes') {
    setSuggestionMode('commands');
    setSelectedSuggestionIndex(suggestions.findIndex(s => s.command === 'theme'));
  } else if (showSuggestions) {
    setShowSuggestions(false);
  } else {
    setInputCommand('');
    setAutoSuggestion(null);
  }
  return;
```

**Step 2: Reset suggestionMode when opening suggestions fresh**

In `actionTab`, when opening the suggestions panel fresh (the `else` branch), ensure we start in commands mode:

```tsx
const actionTab = () => {
  if (showSuggestions) {
    selectSuggestion(selectedSuggestionIndex);
  } else if (autoSuggestion) {
    completeAutoSuggestion();
  } else {
    setSuggestionMode('commands');
    setShowSuggestions(true);
    setSelectedSuggestionIndex(0);
  }
};
```

**Step 3: Reset suggestionMode when suggestions close**

Anywhere `setShowSuggestions(false)` is called outside of selectSuggestion (the click-outside handler at line 356 and the Enter handler for non-suggestion mode), also reset:

In the `handleClickOutside` effect, update:

```tsx
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (
    suggestionsRef.current &&
    !suggestionsRef.current.contains(target) &&
    !inputRef.current?.contains(target) &&
    !target.closest('[data-mobile-action]')
  ) {
    setShowSuggestions(false);
    setSuggestionMode('commands');
  }
};
```

In `handleInputChange`, after `setShowSuggestions(false)`:

```tsx
setSuggestionMode('commands');
```

**Step 4: Commit**

```
git add src/components/Terminal/Terminal.tsx
git commit -m "Handle Escape to back out of theme sub-menu, reset mode on close"
```

---

### Task 3: Update Suggestions component to render theme items

**Files:**
- Modify: `src/components/Terminal/Suggestions.tsx`
- Reference: `src/ThemeContext.tsx` (VALID_THEMES, ThemeName)

**Step 1: Add theme mode props to Suggestions**

Update Suggestions.tsx to accept mode and theme-related props, and render accordingly:

```tsx
import React from 'react';
import { ChevronLeft, Palette } from 'lucide-react';
import { CommandSuggestion } from './types';
import { ThemeName } from '../../ThemeContext';

interface SuggestionsProps {
  suggestions: CommandSuggestion[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onMouseEnter: (index: number) => void;
  mode: 'commands' | 'themes';
  themes?: ThemeName[];
  currentTheme?: ThemeName;
  onBack?: () => void;
}

const Suggestions = React.forwardRef<HTMLDivElement, SuggestionsProps>(
  ({ suggestions, selectedIndex, onSelect, onMouseEnter, mode, themes, currentTheme, onBack }, ref) => {
    return (
      <div
        ref={ref}
        className="absolute bottom-full mb-2 w-full shadow-lg overflow-hidden"
        style={{ background: 'var(--terminal-bg)', border: '1px solid var(--terminal-border)' }}
      >
        {mode === 'themes' && (
          <button
            className="w-full px-4 py-2 flex items-center space-x-2 text-left text-sm border-b min-h-[44px] md:min-h-0"
            style={{ color: 'var(--terminal-gray)', borderColor: 'var(--terminal-border)' }}
            onClick={onBack}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="font-mono">Themes</span>
          </button>
        )}
        {mode === 'commands'
          ? suggestions.map((suggestion, index) => (
              <button
                key={suggestion.command}
                className="w-full px-4 py-2 flex items-center space-x-3 text-left text-sm transition-colors min-h-[44px] md:min-h-0"
                style={{
                  background: index === selectedIndex ? 'var(--terminal-surface)' : 'transparent',
                }}
                onClick={() => onSelect(index)}
                onMouseEnter={() => onMouseEnter(index)}
              >
                {suggestion.icon}
                <span className="font-mono" style={{ color: 'var(--terminal-primary)' }}>{suggestion.command}</span>
                <span style={{ color: 'var(--terminal-primary-dark)' }}>-</span>
                <span style={{ color: 'var(--terminal-gray)' }}>{suggestion.description}</span>
              </button>
            ))
          : themes?.map((t, index) => (
              <button
                key={t}
                className="w-full px-4 py-2 flex items-center space-x-3 text-left text-sm transition-colors min-h-[44px] md:min-h-0"
                style={{
                  background: index === selectedIndex ? 'var(--terminal-surface)' : 'transparent',
                }}
                onClick={() => onSelect(index)}
                onMouseEnter={() => onMouseEnter(index)}
              >
                <Palette className="w-4 h-4" style={{ color: 'var(--terminal-primary)' }} />
                <span className="font-mono" style={{ color: 'var(--terminal-primary)' }}>{t}</span>
                {t === currentTheme && (
                  <span className="font-mono text-xs" style={{ color: 'var(--terminal-gray)' }}>(current)</span>
                )}
              </button>
            ))}
      </div>
    );
  }
);

Suggestions.displayName = 'Suggestions';

export default Suggestions;
```

**Step 2: Commit**

```
git add src/components/Terminal/Suggestions.tsx
git commit -m "Update Suggestions component to render theme sub-menu"
```

---

### Task 4: Wire up Suggestions props in Terminal.tsx

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx:474-484` (Suggestions render)

**Step 1: Update Suggestions usage**

Replace the Suggestions render block with:

```tsx
{showSuggestions && (
  <Suggestions
    ref={suggestionsRef}
    suggestions={suggestions}
    selectedIndex={selectedSuggestionIndex}
    onSelect={(index) => {
      selectSuggestion(index);
    }}
    onMouseEnter={setSelectedSuggestionIndex}
    mode={suggestionMode}
    themes={VALID_THEMES}
    currentTheme={theme}
    onBack={() => {
      setSuggestionMode('commands');
      setSelectedSuggestionIndex(suggestions.findIndex(s => s.command === 'theme'));
    }}
  />
)}
```

**Step 2: Commit**

```
git add src/components/Terminal/Terminal.tsx
git commit -m "Wire up theme sub-menu props to Suggestions component"
```

---

### Task 5: Adjust Up/Down bounds for theme mode

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx:263-287` (actionUp, actionDown)

**Step 1: Update actionUp and actionDown to use correct list length**

The Up/Down actions currently use `suggestions.length` when `showSuggestions` is true. In theme mode, the list length is `VALID_THEMES.length` instead. Update both:

```tsx
const actionUp = () => {
  if (showSuggestions) {
    const len = suggestionMode === 'themes' ? VALID_THEMES.length : suggestions.length;
    setSelectedSuggestionIndex((prev) =>
      prev > 0 ? prev - 1 : len - 1
    );
  } else if (commandHistory.length > 0) {
    const newIndex = historyIndex + 1 >= commandHistory.length ? 0 : historyIndex + 1;
    setHistoryIndex(newIndex);
    setInputCommand(commandHistory[commandHistory.length - 1 - newIndex]);
    setAutoSuggestion(null);
  }
};

const actionDown = () => {
  if (showSuggestions) {
    const len = suggestionMode === 'themes' ? VALID_THEMES.length : suggestions.length;
    setSelectedSuggestionIndex((prev) =>
      prev < len - 1 ? prev + 1 : 0
    );
  } else if (commandHistory.length > 0) {
    const newIndex = historyIndex <= 0 ? commandHistory.length - 1 : historyIndex - 1;
    setHistoryIndex(newIndex);
    setInputCommand(commandHistory[commandHistory.length - 1 - newIndex]);
    setAutoSuggestion(null);
  }
};
```

**Step 2: Commit**

```
git add src/components/Terminal/Terminal.tsx
git commit -m "Fix Up/Down navigation bounds for theme sub-menu"
```

---

### Task 6: Manual verification

**Step 1: Start dev server**

```
npm run dev
```

**Step 2: Test desktop flow**

1. Press Tab → suggestions panel opens with commands
2. Navigate to `theme` with ↑/↓ → press Enter
3. Panel should swap to theme list with "← Themes" header and 5 themes
4. Current theme should show "(current)" label
5. Navigate with ↑/↓ → press Enter to select a theme
6. Theme should change with phosphor transition, "Theme switched to X" output
7. Press Escape in theme sub-menu → should return to command list
8. Press Escape again → should close suggestions

**Step 3: Test mobile flow**

1. Tap "Cmds" → suggestions panel opens
2. Tap `theme` → panel swaps to theme list
3. Use ↑/↓ buttons or tap a theme
4. Tap Enter → theme changes
5. Tap "← Themes" back button → returns to commands

**Step 4: Test edge cases**

- Typing while suggestions are open resets to commands mode
- Clicking outside closes suggestions and resets mode
- Selecting a non-theme command still works normally (auto-execute after 300ms)

**Step 5: Final commit**

```
git add -A
git commit -m "Add theme sub-menu in suggestions panel for mobile and desktop

Selecting 'theme' from suggestions now shows a sub-menu of available
themes instead of auto-executing the bare command. Users can navigate
with Up/Down/Enter or tap to select. Escape backs out to the main
command list."
```
