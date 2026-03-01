# Restart Prompt Typing Effect — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add character-by-character typing animation to the 3-line restart prompt screen.

**Architecture:** A single `useEffect` in App.tsx drives a typing sequence through 3 lines using `setTimeout`. State tracks which line and character position we're at. The keydown/touchstart listener only attaches after typing completes.

**Tech Stack:** React 18 state + setTimeout (no new dependencies)

**Design doc:** `docs/plans/2026-03-01-restart-typing-effect-design.md`

---

### Task 1: Add restart prompt line constants

**Files:**
- Modify: `src/App.tsx:15-22` (add new constant after SHUTDOWN_MESSAGES)

**Step 1: Add the RESTART_LINES constant**

Add this constant right after `SHUTDOWN_MESSAGES` (after line 22):

```typescript
const RESTART_LINES = [
  { text: 'Reboot scheduled.', color: '#888' },
  { text: 'Waiting for user input...', color: '#888' },
];

const RESTART_FINAL_DESKTOP = 'Press any key to continue... ';
const RESTART_FINAL_MOBILE = 'Tap to continue... ';
```

Note: Line 3 is separate because it has special color (#00FF41) and responsive variants.

**Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add restart prompt line constants"
```

---

### Task 2: Add typing state and useEffect

**Files:**
- Modify: `src/App.tsx` (add state vars after line 33, add useEffect)

**Step 1: Add typing state**

After `const [sessionKey, setSessionKey] = useState(0);` (line 33), add:

```typescript
const [typingLine, setTypingLine] = useState(0);
const [typingChar, setTypingChar] = useState(0);
const [typingDone, setTypingDone] = useState(false);
```

**Step 2: Reset typing state in handleRestart**

In `handleRestart` (around line 40-46), add resets before `setShutdownPhase(null)`:

```typescript
const handleRestart = useCallback(() => {
  resetPageLoadTime();
  setTypingLine(0);
  setTypingChar(0);
  setTypingDone(false);
  setShutdownPhase(null);
  setShutdownLines(0);
  setSessionKey(k => k + 1);
  setShowBootSplash(true);
}, []);
```

**Step 3: Add typing useEffect**

Add a new `useEffect` after the existing shutdown sequence useEffect (after line 83). This drives the character-by-character typing:

```typescript
// Typing animation for restart prompt
useEffect(() => {
  if (shutdownPhase !== 'restart-prompt' || typingDone) return;

  // Determine the full text of the current line
  const allLines = [
    RESTART_LINES[0].text,
    RESTART_LINES[1].text,
    // Use desktop text for timing (mobile is shorter, but we type at same pace)
    RESTART_FINAL_DESKTOP,
  ];

  const currentText = allLines[typingLine];
  if (!currentText) return;

  if (typingChar < currentText.length) {
    // Type next character
    const timer = setTimeout(() => setTypingChar(c => c + 1), 50);
    return () => clearTimeout(timer);
  }

  // Current line finished
  if (typingLine < allLines.length - 1) {
    // Pause, then move to next line
    const timer = setTimeout(() => {
      setTypingLine(l => l + 1);
      setTypingChar(0);
    }, 400);
    return () => clearTimeout(timer);
  }

  // All lines done
  setTypingDone(true);
}, [shutdownPhase, typingLine, typingChar, typingDone]);
```

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add typing state and animation useEffect"
```

---

### Task 3: Gate keydown/touchstart listener on typingDone

**Files:**
- Modify: `src/App.tsx` (the `restart-prompt` case in the shutdown useEffect, around line 70-79)

**Step 1: Update the restart-prompt case**

Replace the existing `case 'restart-prompt'` block with:

```typescript
case 'restart-prompt':
  // Listener is attached by a separate effect that depends on typingDone
  break;
```

**Step 2: Add a new useEffect for the input listener**

Add after the typing useEffect:

```typescript
// Attach restart listener only after typing completes
useEffect(() => {
  if (shutdownPhase !== 'restart-prompt' || !typingDone) return;

  const onKey = (e: KeyboardEvent) => { e.preventDefault(); handleRestart(); };
  const onTouch = (e: TouchEvent) => { e.preventDefault(); handleRestart(); };
  window.addEventListener('keydown', onKey);
  window.addEventListener('touchstart', onTouch);
  return () => {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('touchstart', onTouch);
  };
}, [shutdownPhase, typingDone, handleRestart]);
```

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: gate restart input on typing completion"
```

---

### Task 4: Update JSX to render typed characters with cursor

**Files:**
- Modify: `src/App.tsx` (the restart-prompt JSX, around lines 109-117)

**Step 1: Replace the restart prompt JSX**

Replace the current `{shutdownPhase === 'restart-prompt' && (...)}` block (lines 109-117) with:

```tsx
{shutdownPhase === 'restart-prompt' && (
  <div className="text-center font-mono text-sm phosphor-glow">
    {/* Completed lines */}
    {RESTART_LINES.slice(0, typingLine).map((line, i) => (
      <p key={i} className={i === 0 ? 'mb-1' : 'mb-4'} style={{ color: line.color }}>
        {line.text}
      </p>
    ))}

    {/* Currently typing line (lines 0-1: gray) */}
    {typingLine < RESTART_LINES.length && (
      <p className={typingLine === 0 ? 'mb-1' : 'mb-4'} style={{ color: RESTART_LINES[typingLine].color }}>
        {RESTART_LINES[typingLine].text.slice(0, typingChar)}
        <span className={typingDone ? 'animate-blink' : ''}>&#x2588;</span>
      </p>
    )}

    {/* Line 3: green, responsive, shows after first 2 lines done */}
    {typingLine >= RESTART_LINES.length && (
      <p style={{ color: '#00FF41' }}>
        <span className="hidden md:inline">
          {RESTART_FINAL_DESKTOP.slice(0, typingChar)}
        </span>
        <span className="md:hidden">
          {RESTART_FINAL_MOBILE.slice(0, Math.min(typingChar, RESTART_FINAL_MOBILE.length))}
        </span>
        <span className={typingDone ? 'animate-blink' : ''}>&#x2588;</span>
      </p>
    )}
  </div>
)}
```

**Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: render typed characters with cursor on restart prompt"
```

---

### Task 5: Manual verification

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Verify the typing effect**

1. Open the site in browser
2. Type `exit` in the terminal and press Enter
3. Watch the shutdown messages (should be unchanged — line-by-line reveal)
4. After CRT-off and black screen, observe:
   - "Reboot scheduled." types out character by character with solid cursor
   - ~400ms pause
   - "Waiting for user input..." types out with solid cursor
   - ~400ms pause
   - "Press any key to continue..." types out, then cursor starts blinking
5. Press any key — should restart (boot splash → terminal)
6. On mobile viewport: verify "Tap to continue..." appears instead

**Step 3: Verify no input during typing**

- During the typing animation, press keys — nothing should happen
- Only after the blinking cursor appears should keypress trigger restart

**Step 4: Commit any fixes if needed, then final commit**

```bash
git add -A
git commit -m "feat: restart prompt typing effect complete"
```
