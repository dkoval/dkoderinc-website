# Mobile Terminal Toolbar Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove duplicate Enter button and redesign the mobile toolbar for clarity.

**Architecture:** Two surgical file edits — remove the Code2 submit button from Terminal.tsx, then update the mobileKeys config and toolbar rendering in App.tsx to use new labels, order, icons, and emphasis styling.

**Tech Stack:** React, TypeScript, lucide-react, Tailwind CSS

---

## Problem

Two buttons perform the same "submit command" action on mobile:
1. The `</>` (Code2) button to the right of the terminal input — always visible
2. The "Enter" button in the mobile toolbar — visible on screens < 768px

## Design

**Current mobile toolbar:** `[Tab] [↑] [↓] [Enter]` — all same styling

**New mobile toolbar:** `[≡ Cmds] [↑] [↓] [⏎ Enter]` — Enter emphasized, Tab renamed

---

### Task 1: Remove the Code2 submit button from Terminal.tsx

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx:2` (remove Code2 import)
- Modify: `src/components/Terminal/Terminal.tsx:384-390` (delete button element)

**Step 1: Remove Code2 from the import**

Change line 2 from:
```tsx
import { Code2, ChevronRight } from 'lucide-react';
```
to:
```tsx
import { ChevronRight } from 'lucide-react';
```

**Step 2: Delete the Code2 button element**

Remove the entire `<button>` block (lines 384–390):
```tsx
          <button
            onClick={() => handleCommand(inputCommand)}
            className="p-1.5 rounded hover:opacity-80 transition-opacity"
            style={{ background: '#222', color: '#00FF41' }}
          >
            <Code2 className="w-4 h-4" />
          </button>
```

**Step 3: Update placeholder text for mobile**

On mobile, the placeholder currently says "Press Tab for suggestions..." — update it to match the new button label:

Change line 373 from:
```tsx
placeholder={isMobile ? "Press Tab for suggestions..." : "Type a command or press Tab for suggestions..."}
```
to:
```tsx
placeholder={isMobile ? "Tap Cmds for suggestions..." : "Type a command or press Tab for suggestions..."}
```

**Step 4: Verify the build compiles**

Run: `npm run build`
Expected: No errors, no unused import warnings

**Step 5: Commit**

```bash
git add src/components/Terminal/Terminal.tsx
git commit -m "Remove Code2 submit button from terminal input"
```

---

### Task 2: Redesign mobile toolbar in App.tsx

**Files:**
- Modify: `src/App.tsx:1` (add List icon import)
- Modify: `src/App.tsx:8-13` (update mobileKeys array)
- Modify: `src/App.tsx:208-224` (update toolbar rendering for icons and emphasis)

**Step 1: Add List icon import**

Change line 1 to add the List import from lucide-react. Since App.tsx doesn't currently import from lucide-react, add a new import:
```tsx
import { List } from 'lucide-react';
```

**Step 2: Update the mobileKeys array**

Replace lines 8–13:
```tsx
const mobileKeys = [
  { label: 'Tab', action: 'tab' as const },
  { label: '↑', action: 'up' as const },
  { label: '↓', action: 'down' as const },
  { label: 'Enter', action: 'enter' as const },
];
```
with:
```tsx
const mobileKeys = [
  { label: 'Cmds', action: 'tab' as const, icon: true },
  { label: '↑', action: 'up' as const },
  { label: '↓', action: 'down' as const },
  { label: '⏎ Enter', action: 'enter' as const, emphasized: true },
];
```

**Step 3: Update the toolbar rendering**

Replace the toolbar button rendering (lines 208–224):
```tsx
        {/* Mobile virtual keyboard shortcuts */}
        <div
          className="flex md:hidden shrink-0 gap-2 p-2 border-t"
          style={{ borderColor: '#333' }}
        >
          {mobileKeys.map(({ label, action }) => (
            <button
              key={label}
              className="flex-1 py-2 font-mono text-sm rounded"
              style={{ background: '#111', color: '#00FF41', border: '1px solid #333' }}
              data-mobile-action={action}
              onClick={() => terminalRef.current?.handleMobileAction(action)}
            >
              {label}
            </button>
          ))}
        </div>
```
with:
```tsx
        {/* Mobile virtual keyboard shortcuts */}
        <div
          className="flex md:hidden shrink-0 gap-2 p-2 border-t"
          style={{ borderColor: '#333' }}
        >
          {mobileKeys.map(({ label, action, icon, emphasized }) => (
            <button
              key={label}
              className="flex-1 py-2 font-mono text-sm rounded inline-flex items-center justify-center gap-1"
              style={emphasized
                ? { background: '#00FF41', color: '#000', border: '1px solid #00FF41' }
                : { background: '#111', color: '#00FF41', border: '1px solid #333' }
              }
              data-mobile-action={action}
              onClick={() => terminalRef.current?.handleMobileAction(action)}
            >
              {icon && <List className="w-3.5 h-3.5" />}
              {label}
            </button>
          ))}
        </div>
```

**Step 4: Verify the build compiles**

Run: `npm run build`
Expected: No errors

**Step 5: Visual verification**

Run: `npm run dev`
Check at mobile viewport (< 768px):
- Toolbar shows: `[≡ Cmds] [↑] [↓] [⏎ Enter]`
- Cmds button has List icon + dark styling
- Enter button has green background, black text
- No `</>` button visible next to input
- Tapping Cmds opens suggestions, tapping Enter submits

**Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "Redesign mobile toolbar: rename Tab→Cmds, emphasize Enter"
```

---

## Research

Based on analysis of terminal emulator apps (Termux, iSH, Blink Shell, a-Shell):
- None duplicate Enter in their toolbar — they rely on native keyboard
- Toolbars contain only special/modifier keys (Tab, arrows, Ctrl, Esc)
- This project intentionally disables native keyboard on mobile, making the toolbar the primary interaction method
