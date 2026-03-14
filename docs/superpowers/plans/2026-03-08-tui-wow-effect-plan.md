# TUI Wow Effect — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the terminal into a cinematic TUI with ambient breathing, glowing cursors, bell flash, tmux status bar, rich prompt, command timing, scroll indicator, opt-in sound, progressive output reveal, and input blocking during reveal.

**Architecture:** Three phases layered by UI depth. Phase 1 is CSS-heavy with one new component (StatusBar). Phase 2 adds interaction logic (sound engine hook, timing, scroll observer). Phase 3 changes the command execution flow (stream reveal hook, input gating). Each phase is one PR branched from `main`.

**Tech Stack:** React 18, TypeScript, Vite 5, Tailwind CSS 3, Web Audio API (Phase 2), IntersectionObserver (Phase 2), requestAnimationFrame (Phase 3)

**Note:** This project has no test infrastructure. Verification is visual — run `npm run dev` and check in browser.

---

## Phase 1: Visual Foundation

Branch: `feature/tui-phase1-visual-foundation`

### Task 1: Ambient Screen Breathing

**Files:**
- Modify: `src/index.css:206-227` (after flicker, before reduced-motion media queries)

**Step 1: Add breathe keyframes and class**

Add after the `.crt-flicker` block (line 216) and before the mobile media query (line 219):

```css
/* CRT ambient breathing — slow luminance drift */
@keyframes breathe {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(0.98); }
}

.crt-breathe {
  animation: breathe 8s ease-in-out infinite;
}
```

**Step 2: Disable breathing on mobile and reduced-motion**

Add `crt-breathe` to the existing disable rules:

```css
@media (max-width: 767px) {
  .crt-flicker { animation: none; }
  .crt-breathe { animation: none; }
}

@media (prefers-reduced-motion: reduce) {
  .crt-flicker { animation: none; }
  .crt-breathe { animation: none; }
  .ai-spinner::before { animation: none; content: '...'; }
  .animate-blink { animation: none; }
}
```

**Step 3: Apply to terminal section**

- Modify: `src/components/Terminal/Terminal.tsx:445`

Change the section className to include `crt-breathe`:

```tsx
<section className="w-full flex flex-col flex-1 overflow-hidden p-4 terminal-glow crt-flicker crt-breathe" ...>
```

**Step 4: Verify**

Run `npm run dev`. Stare at the terminal for 8+ seconds. The brightness should oscillate very subtly — barely noticeable unless looking for it.

**Step 5: Commit**

```bash
git add src/index.css src/components/Terminal/Terminal.tsx
git commit -m "feat: add ambient screen breathing animation"
```

---

### Task 2: Cursor Improvements — Input Cursor

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx:491-514` (input area)
- Modify: `src/index.css` (new cursor styles)

**Step 1: Add cursor glow styles to index.css**

Add after the `.terminal-glow` block:

```css
/* Custom block cursor with phosphor glow */
.terminal-cursor {
  display: inline-block;
  animation: blink-glow 1.2s step-end infinite;
}

@keyframes blink-glow {
  0%, 100% {
    opacity: 1;
    text-shadow: 0 0 8px var(--terminal-glow), 0 0 20px var(--terminal-glow-soft);
  }
  50% {
    opacity: 0;
    text-shadow: none;
  }
}
```

**Step 2: Hide native caret and render custom cursor**

In Terminal.tsx, add `caret-transparent` to the input's className (Tailwind class for `caret-color: transparent`):

```tsx
<input
  ref={inputRef}
  type="text"
  value={inputCommand}
  onChange={handleInputChange}
  onKeyDown={handleKeyDown}
  className="bg-transparent font-mono text-sm w-full focus:outline-none relative z-10 caret-transparent"
  style={{ color: 'var(--terminal-primary)' }}
  ...
/>
```

After the `<AutoSuggestion>` component (still inside the `relative flex-1` div), add the custom cursor:

```tsx
<AutoSuggestion
  inputCommand={inputCommand}
  suggestion={autoSuggestion}
/>
<span
  className="terminal-cursor font-mono text-sm pointer-events-none absolute top-0 left-0 z-0"
  style={{ color: 'var(--terminal-primary)', paddingLeft: `${inputCommand.length}ch` }}
  aria-hidden="true"
>
  ▌
</span>
```

Note: Using `ch` units for cursor positioning works because the font is monospace. The cursor sits at the exact character position.

**Step 3: Verify**

Run `npm run dev`. The cursor should glow with phosphor effect and blink at 1.2s. Type text — cursor moves with input. Native caret should be invisible.

**Step 4: Commit**

```bash
git add src/index.css src/components/Terminal/Terminal.tsx
git commit -m "feat: add glowing block cursor with phosphor effect"
```

---

### Task 3: Cursor Improvements — Restart Prompt Afterglow

**Files:**
- Modify: `src/index.css` (phosphor afterglow keyframes)
- Modify: `src/App.tsx:209` (use new class on restart cursor)

**Step 1: Add afterglow keyframes to index.css**

Add after the `blink-glow` keyframes:

```css
/* Phosphor afterglow — cursor dims instead of disappearing */
@keyframes blink-afterglow {
  0%, 100% {
    opacity: 1;
    text-shadow: 0 0 8px var(--terminal-glow), 0 0 20px var(--terminal-glow-soft);
  }
  33% {
    opacity: 0.15;
    text-shadow: 0 0 4px var(--terminal-glow-soft);
  }
  50% {
    opacity: 0;
    text-shadow: none;
  }
}

.cursor-afterglow {
  animation: blink-afterglow 1.2s ease-in-out infinite;
}
```

**Step 2: Apply to restart prompt cursor**

In `src/App.tsx:209`, change:

```tsx
<span className={typingDone ? 'animate-blink' : ''}>&#x2588;</span>
```

To:

```tsx
<span className={typingDone ? 'cursor-afterglow' : ''}>&#x2588;</span>
```

**Step 3: Verify**

Run `npm run dev`. Type `exit`. Watch the restart prompt. When typing finishes, the cursor should blink with a phosphor ghost — dims to 15% before going fully off, then back to full brightness.

**Step 4: Commit**

```bash
git add src/index.css src/App.tsx
git commit -m "feat: add phosphor afterglow to restart prompt cursor"
```

---

### Task 4: Terminal Bell Flash

**Files:**
- Modify: `src/index.css` (bell flash keyframes and class)
- Modify: `src/components/TerminalWindow.tsx` (accept bellFlash prop, apply class)
- Modify: `src/components/Terminal/Terminal.tsx` (trigger bell on unknown command)
- Modify: `src/App.tsx` (pass bell state through)

**Step 1: Add bell flash CSS to index.css**

Add after the cursor styles:

```css
/* Terminal bell flash — intensified border glow */
@keyframes bell-flash {
  0% {
    box-shadow: 0 0 40px var(--terminal-glow), inset 0 0 40px var(--terminal-glow-soft);
  }
  100% {
    box-shadow: 0 0 20px var(--terminal-glow), inset 0 0 20px var(--terminal-glow-soft);
  }
}

.bell-flash {
  animation: bell-flash 150ms ease-out;
}
```

**Step 2: Add onBell callback to Terminal**

In `src/components/Terminal/Terminal.tsx`, update the props type:

```tsx
type TerminalProps = {
  onShutdown?: () => void;
  onBell?: () => void;
};
```

Update the forwardRef destructuring:

```tsx
const Terminal = forwardRef<TerminalHandle, TerminalProps>(({ onShutdown, onBell }, ref) => {
```

In the `handleCommand` function, where "Command not found" is generated (line 219, the else branch), trigger the bell after the spinner timeout fires. Inside the setTimeout callback, after `outputLines` is set for the "command not found" case, add:

```tsx
// After the line: outputLines = [{ content: output, type: ... }];
if (typeof output === 'string' && output.startsWith('Command not found')) {
  onBell?.();
}
```

**Step 3: Update TerminalWindow to accept and apply bell flash**

In `src/components/TerminalWindow.tsx`:

```tsx
type Props = { children: React.ReactNode; bellFlash?: boolean };

const TerminalWindow: React.FC<Props> = ({ children, bellFlash }) => (
  <div
    className={`flex flex-col flex-1 rounded overflow-hidden ${bellFlash ? 'bell-flash' : ''}`}
    style={{
      border: '1px solid var(--terminal-border)',
      boxShadow: '0 0 20px var(--terminal-glow), inset 0 0 20px var(--terminal-glow-soft)',
    }}
  >
```

**Step 4: Wire bell state in App.tsx**

In `src/App.tsx`, add bell state and handler:

```tsx
const [bellFlash, setBellFlash] = useState(false);
const bellTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

const handleBell = useCallback(() => {
  if (bellTimerRef.current) clearTimeout(bellTimerRef.current);
  setBellFlash(false);
  // Force re-trigger by toggling off then on in next frame
  requestAnimationFrame(() => {
    setBellFlash(true);
    bellTimerRef.current = setTimeout(() => setBellFlash(false), 150);
  });
}, []);
```

Pass to components:

```tsx
<TerminalWindow bellFlash={bellFlash}>
  <Terminal key={sessionKey} ref={terminalRef} onShutdown={handleShutdown} onBell={handleBell} />
</TerminalWindow>
```

Add `bellTimerRef` import to the existing `useRef` imports (already imported).

**Step 5: Verify**

Run `npm run dev`. Type `asdf` and press Enter. After the spinner, the terminal border should flash brightly for 150ms and ease back. Repeat — should re-trigger each time.

**Step 6: Commit**

```bash
git add src/index.css src/components/TerminalWindow.tsx src/components/Terminal/Terminal.tsx src/App.tsx
git commit -m "feat: add terminal bell flash on invalid commands"
```

---

### Task 5: Tmux-Style Status Bar Component

**Files:**
- Create: `src/components/StatusBar.tsx`
- Modify: `src/components/TerminalWindow.tsx` (render StatusBar at bottom)
- Modify: `src/index.css` (status bar styles)

**Step 1: Add status bar styles to index.css**

```css
/* Tmux-style status bar */
.status-bar {
  font-size: 0.75rem;
  line-height: 1rem;
  border-top: 1px solid var(--terminal-border);
  background: var(--terminal-surface);
  color: var(--terminal-gray);
}

.status-bar-item {
  transition: filter 0.15s ease;
}

.status-bar-item:hover {
  filter: brightness(1.3);
}
```

**Step 2: Create StatusBar component**

Create `src/components/StatusBar.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../ThemeContext';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && !window.matchMedia('(min-width: 768px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(!e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
};

type StatusBarProps = {
  onThemeClick?: () => void;
  onSoundToggle?: () => void;
  soundEnabled?: boolean;
};

const StatusBar: React.FC<StatusBarProps> = ({ onThemeClick, onSoundToggle, soundEnabled = false }) => {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = clock.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    ...(isMobile ? {} : { second: '2-digit' }),
  });

  return (
    <div className="status-bar flex items-center justify-between px-3 py-1 font-mono shrink-0 select-none">
      <span style={{ color: 'var(--terminal-primary-dim)' }}>
        [0] bash
      </span>
      <div className="flex items-center gap-2">
        <button
          className="status-bar-item flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 font-mono"
          style={{ color: 'var(--terminal-gray)', fontSize: 'inherit' }}
          onClick={onThemeClick}
          title="Switch theme"
        >
          <span style={{ color: 'var(--terminal-primary)' }}>●</span>
          <span>{theme}</span>
        </button>
        {!isMobile && (
          <>
            <span style={{ color: 'var(--terminal-border)' }}>│</span>
            <button
              className="status-bar-item cursor-pointer bg-transparent border-none p-0 font-mono"
              style={{ color: 'var(--terminal-gray)', fontSize: 'inherit' }}
              onClick={onSoundToggle}
              title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            >
              ♪ {soundEnabled ? 'on' : 'off'}
            </button>
          </>
        )}
        <span style={{ color: 'var(--terminal-border)' }}>│</span>
        <span>{timeStr}</span>
      </div>
    </div>
  );
};

export default StatusBar;
```

**Step 3: Render StatusBar inside TerminalWindow**

In `src/components/TerminalWindow.tsx`, import and render StatusBar between terminal content and the closing div:

```tsx
import StatusBar from './StatusBar';

type Props = {
  children: React.ReactNode;
  bellFlash?: boolean;
  onThemeClick?: () => void;
  onSoundToggle?: () => void;
  soundEnabled?: boolean;
};

const TerminalWindow: React.FC<Props> = ({ children, bellFlash, onThemeClick, onSoundToggle, soundEnabled }) => (
  <div
    className={`flex flex-col flex-1 rounded overflow-hidden ${bellFlash ? 'bell-flash' : ''}`}
    style={{
      border: '1px solid var(--terminal-border)',
      boxShadow: '0 0 20px var(--terminal-glow), inset 0 0 20px var(--terminal-glow-soft)',
    }}
  >
    {/* Title bar */}
    <div
      className="flex items-center px-3 py-2 shrink-0"
      style={{ background: 'var(--terminal-surface)', borderBottom: '1px solid var(--terminal-border)' }}
    >
      <div className="flex gap-1.5 mr-3">
        <div className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#FEBC2E' }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#28C840' }} />
      </div>
      <span className="flex-1 text-center font-mono text-xs" style={{ color: 'var(--terminal-primary)' }}>
        dkoderinc.com — bash — 80×24
      </span>
      <div className="w-2 h-2 rounded-full animate-blink" style={{ background: 'var(--terminal-primary)' }} />
    </div>
    {/* Terminal content */}
    <div className="flex-1 overflow-hidden flex flex-col">
      {children}
    </div>
    {/* Status bar */}
    <StatusBar
      onThemeClick={onThemeClick}
      onSoundToggle={onSoundToggle}
      soundEnabled={soundEnabled}
    />
  </div>
);
```

**Step 4: Pass theme click handler from App.tsx**

In `src/App.tsx`, add a handler that triggers the terminal's suggestion menu for themes. For Phase 1, this is a placeholder — the status bar theme click will be a no-op that can be wired later. For now, pass `undefined`:

```tsx
<TerminalWindow bellFlash={bellFlash}>
  <Terminal key={sessionKey} ref={terminalRef} onShutdown={handleShutdown} onBell={handleBell} />
</TerminalWindow>
```

No changes needed in App.tsx for Phase 1 — `onThemeClick` and `onSoundToggle` default to undefined, and `soundEnabled` defaults to false.

**Step 5: Verify**

Run `npm run dev`. A status bar should appear at the bottom of the terminal window:
- Left: `[0] bash` in dim primary
- Right: `● green │ ♪ off │ 14:32:05` (clock should tick every second)
- On mobile: simplified to `● green │ 14:32` (no seconds, no sound toggle)
- Theme dot should be colored with theme's primary color
- Hover on theme name or sound toggle should brighten slightly

**Step 6: Commit**

```bash
git add src/components/StatusBar.tsx src/components/TerminalWindow.tsx src/index.css
git commit -m "feat: add tmux-style status bar with clock and theme indicator"
```

---

### Task 6: Extract useIsMobile to shared hook

**Files:**
- Create: `src/hooks/useIsMobile.ts`
- Modify: `src/components/Terminal/Terminal.tsx` (import from hook)
- Modify: `src/components/StatusBar.tsx` (import from hook)

The `useIsMobile` hook is now duplicated between Terminal.tsx and StatusBar.tsx. Extract it.

**Step 1: Create shared hook**

Create `src/hooks/useIsMobile.ts`:

```tsx
import { useState, useEffect } from 'react';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && !window.matchMedia('(min-width: 768px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(!e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
};

export default useIsMobile;
```

**Step 2: Update imports**

In `src/components/Terminal/Terminal.tsx`, remove the local `useIsMobile` definition (lines 22-33) and add:

```tsx
import useIsMobile from '../../hooks/useIsMobile';
```

In `src/components/StatusBar.tsx`, remove the local `useIsMobile` definition and add:

```tsx
import useIsMobile from '../hooks/useIsMobile';
```

**Step 3: Verify**

Run `npm run dev`. Everything should work identically. Check both desktop and mobile views.

**Step 4: Commit**

```bash
git add src/hooks/useIsMobile.ts src/components/Terminal/Terminal.tsx src/components/StatusBar.tsx
git commit -m "refactor: extract useIsMobile hook to shared module"
```

---

### Task 7: Phase 1 final review and PR

**Step 1: Visual verification checklist**

Run `npm run dev` and verify all Phase 1 features:

- [ ] Screen breathing: subtle brightness oscillation visible on desktop (disabled on mobile)
- [ ] Input cursor: glowing block cursor, blinks at 1.2s, moves with typed text
- [ ] Restart cursor: phosphor afterglow (type `exit`, watch restart prompt cursor)
- [ ] Bell flash: border intensifies on invalid command (type `asdf`)
- [ ] Status bar: visible at bottom, clock ticks, theme dot colored, hover effects work
- [ ] Mobile: no breathing/flicker, status bar simplified, cursor works
- [ ] Reduced motion: breathing/flicker/blink disabled

**Step 2: Build check**

```bash
npm run build
```

Ensure no TypeScript or build errors.

**Step 3: Create PR**

```bash
git push -u origin feature/tui-phase1-visual-foundation
gh pr create --title "Add TUI visual foundation: breathing, cursors, bell, status bar" --body "$(cat <<'EOF'
## Summary
- Ambient screen breathing animation (8s cycle, barely perceptible CRT luminance drift)
- Glowing block cursor with phosphor effect on input, afterglow on restart prompt
- Terminal bell flash on invalid commands (150ms border glow intensification)
- Tmux-style status bar with live clock, theme indicator, and sound toggle placeholder

## Phase
Phase 1 of 3 — Visual Foundation (see `docs/plans/2026-03-08-tui-wow-effect-design.md`)

## Test plan
- [ ] Verify breathing animation on desktop (8s subtle brightness cycle)
- [ ] Verify glowing cursor tracks input position correctly
- [ ] Type invalid command, confirm border flash
- [ ] Status bar: clock ticks, theme dot matches current theme color
- [ ] Mobile: breathing disabled, status bar simplified
- [ ] `prefers-reduced-motion`: all animations disabled

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Phase 2: Interaction Polish

Branch: `feature/tui-phase2-interaction-polish` (from `main` after Phase 1 merges)

### Task 8: Rich Prompt

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx:491-514` (input bar area)

**Step 1: Replace ChevronRight with rich prompt segments**

In the input bar div, replace the `<ChevronRight>` icon with styled prompt segments:

```tsx
<div className="flex items-center space-x-2 w-full p-2" style={{ background: 'var(--terminal-bg)', border: '1px solid var(--terminal-border)' }}>
  <span className="font-mono text-sm shrink-0 select-none">
    {isMobile ? (
      <>
        <span style={{ color: 'var(--terminal-primary-dim)' }}>~ </span>
        <span style={{ color: 'var(--terminal-primary)' }}>$ </span>
      </>
    ) : (
      <>
        <span style={{ color: 'var(--terminal-primary-dim)' }}>visitor</span>
        <span style={{ color: 'var(--terminal-primary)' }}>@dkoderinc</span>
        <span style={{ color: 'var(--terminal-primary-dim)' }}> ~ </span>
        <span style={{ color: 'var(--terminal-primary)' }}>$ </span>
      </>
    )}
  </span>
  <div className="relative flex-1">
    ...existing input + autosuggestion + cursor...
  </div>
</div>
```

Remove the `ChevronRight` import from the file's imports if it's no longer used elsewhere.

**Step 2: Update input lines to show rich prompt in output**

In `handleCommand`, update the input line content to include the prompt prefix:

```tsx
const promptPrefix = isMobile ? '~ $ ' : 'visitor@dkoderinc ~ $ ';
const inputLine: TerminalLine = {
  content: `${promptPrefix}${trimmedCmd}`,
  type: 'input',
  timestamp: getCurrentTime(),
};
```

Also update the `clear` and `exit` paths where `$ ${trimmedCmd}` is used (line 69 in displayHelp and line 135 in exit handler).

For displayHelp:

```tsx
{ content: `${isMobile ? '~ $ ' : 'visitor@dkoderinc ~ $ '}help`, type: 'input' as const, timestamp: getCurrentTime() },
```

For exit:

```tsx
{ content: `${isMobile ? '~ $ ' : 'visitor@dkoderinc ~ $ '}${trimmedCmd}`, type: 'input', timestamp: getCurrentTime() },
```

**Step 3: Verify**

Run `npm run dev`. Prompt should show `visitor@dkoderinc ~ $` on desktop, `~ $` on mobile. After running a command, the input echo should match the prompt style.

**Step 4: Commit**

```bash
git add src/components/Terminal/Terminal.tsx
git commit -m "feat: add Starship-inspired rich prompt with color segments"
```

---

### Task 9: Command Execution Timing

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx` (track start time, append timing line)
- Modify: `src/components/Terminal/types.ts` (add timing field to TerminalLine)

**Step 1: Add timing field to TerminalLine**

In `src/components/Terminal/types.ts`, add an optional field:

```tsx
export interface TerminalLine {
  content: string;
  type: 'input' | 'output' | 'error' | 'success' | 'spinner' | 'timing';
  isHtml?: boolean;
  timestamp?: string;
  helpEntry?: { commandIndex: number };
  spinnerId?: number;
}
```

**Step 2: Track timing and append timing line**

In `src/components/Terminal/Terminal.tsx`, in the `handleCommand` function:

After the input line creation (around line 144), record start time:

```tsx
const startTime = performance.now();
```

Inside the setTimeout callback, after the `setTerminalOutput` call that replaces the spinner, add a timing line for commands that should show timing. The commands to exclude are: `clear`, `exit`, `theme` (already handled separately).

Modify the `setTerminalOutput` call inside setTimeout to append the timing line:

```tsx
const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
const timingLine: TerminalLine = { content: `took ${elapsed}s`, type: 'timing' };

setTerminalOutput(prev => {
  const spinnerIndex = prev.findIndex(l => l.type === 'spinner' && l.spinnerId === currentSpinnerId);
  if (spinnerIndex === -1) return [...prev, ...outputLines, timingLine];
  return [...prev.slice(0, spinnerIndex), ...outputLines, timingLine, ...prev.slice(spinnerIndex + 1)];
});
```

For the `theme` command path (which also goes through the spinner), skip the timing line. Wrap the timing line addition in a condition:

```tsx
const showTiming = trimmedCmd !== 'theme' && !trimmedCmd.startsWith('theme ');
```

Then conditionally include it:

```tsx
const newLines = showTiming ? [...outputLines, timingLine] : outputLines;
```

**Step 3: Render timing lines**

In the terminal output rendering (around line 453), add a case for `type === 'timing'`:

Inside the `<p>` element's content rendering, add before the default `<span>` case:

```tsx
{line.type === 'timing' ? (
  <span className="block text-right" style={{ color: 'var(--terminal-gray)', fontSize: '0.75rem' }}>
    {line.content}
  </span>
) : line.type === 'spinner' ? (
  ...existing spinner rendering...
```

**Step 4: Verify**

Run `npm run dev`. Type `whoami`. After output, a right-aligned `took 0.6s` should appear in gray. Theme commands should not show timing.

**Step 5: Commit**

```bash
git add src/components/Terminal/Terminal.tsx src/components/Terminal/types.ts
git commit -m "feat: add fish-style command execution timing indicator"
```

---

### Task 10: Scroll Indicator

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx` (IntersectionObserver, indicator element)
- Modify: `src/index.css` (scroll indicator styles)

**Step 1: Add scroll indicator styles**

In `src/index.css`:

```css
/* Scroll indicator */
.scroll-indicator {
  position: sticky;
  bottom: 0;
  text-align: center;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
```

**Step 2: Add sentinel and indicator to Terminal.tsx**

Add a ref for the sentinel and state for visibility:

```tsx
const sentinelRef = useRef<HTMLDivElement>(null);
const [showScrollIndicator, setShowScrollIndicator] = useState(false);
```

Add IntersectionObserver setup in a useEffect:

```tsx
useEffect(() => {
  const sentinel = sentinelRef.current;
  const container = terminalRef.current;
  if (!sentinel || !container) return;

  const observer = new IntersectionObserver(
    ([entry]) => setShowScrollIndicator(!entry.isIntersecting),
    { root: container, threshold: 0, rootMargin: '20px' }
  );
  observer.observe(sentinel);
  return () => observer.disconnect();
}, [terminalOutput]);
```

In the JSX, add a sentinel div at the end of the terminal output area (inside the scrollable div, after the output map), and the indicator:

```tsx
{/* After the terminalOutput.map */}
<div ref={sentinelRef} className="h-px" />
```

After the scrollable div's closing tag, add:

```tsx
<div
  className="scroll-indicator font-mono"
  style={{
    color: 'var(--terminal-primary-dim)',
    opacity: showScrollIndicator ? 0.6 : 0,
    fontSize: '0.75rem',
    padding: '2px 0',
  }}
>
  ▼ more
</div>
```

**Step 3: Verify**

Run `npm run dev`. Run several commands to accumulate output, or run `man dmytro`. If output overflows, `▼ more` should appear. Scroll to bottom — it should fade out.

**Step 4: Commit**

```bash
git add src/components/Terminal/Terminal.tsx src/index.css
git commit -m "feat: add scroll indicator for overflowing terminal output"
```

---

### Task 11: Sound Engine Hook

**Files:**
- Create: `src/hooks/useSoundEngine.ts`

**Step 1: Create the hook**

Create `src/hooks/useSoundEngine.ts`:

```tsx
import { useCallback, useRef, useState, useEffect } from 'react';

type SoundType = 'keypress' | 'execute' | 'error' | 'themeSwitch' | 'boot';

const STORAGE_KEY = 'dkoder-sound-enabled';

const useSoundEngine = () => {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; }
    catch { return false; }
  });
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0'); }
    catch { /* ignore */ }
  }, [enabled]);

  const getContext = useCallback(() => {
    if (!ctxRef.current) {
      try { ctxRef.current = new AudioContext(); }
      catch { return null; }
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playTone = useCallback((
    frequency: number,
    duration: number,
    type: OscillatorType = 'square',
    volume: number = 0.04,
  ) => {
    const ctx = getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
  }, [getContext]);

  const play = useCallback((sound: SoundType) => {
    if (!enabled) return;

    // Check prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    switch (sound) {
      case 'keypress':
        playTone(1800, 15, 'square', 0.03);
        break;
      case 'execute': {
        playTone(440, 80, 'sine', 0.04);
        setTimeout(() => playTone(660, 80, 'sine', 0.04), 40);
        break;
      }
      case 'error':
        playTone(220, 100, 'square', 0.04);
        break;
      case 'themeSwitch': {
        const ctx = getContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 120;
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.1);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
        break;
      }
      case 'boot': {
        const notes = [330, 440, 660];
        notes.forEach((freq, i) => {
          setTimeout(() => playTone(freq, 60, 'sine', 0.04), i * 70);
        });
        break;
      }
    }
  }, [enabled, playTone, getContext]);

  const toggle = useCallback(() => {
    setEnabled(prev => !prev);
  }, []);

  return { enabled, toggle, play };
};

export default useSoundEngine;
```

**Step 2: Verify**

This is a standalone hook — verify it compiles by importing it in Terminal.tsx temporarily and calling `play('keypress')` on input change. Remove the temporary usage after confirming sounds work.

**Step 3: Commit**

```bash
git add src/hooks/useSoundEngine.ts
git commit -m "feat: add Web Audio synthesized sound engine with opt-in toggle"
```

---

### Task 12: Wire Sound Engine to Terminal

**Files:**
- Modify: `src/App.tsx` (instantiate hook, pass to TerminalWindow and Terminal)
- Modify: `src/components/Terminal/Terminal.tsx` (accept sound play callback, fire on events)
- Modify: `src/components/TerminalWindow.tsx` (pass sound state to StatusBar)

**Step 1: Instantiate in App.tsx**

In `src/App.tsx`, import and use the hook:

```tsx
import useSoundEngine from './hooks/useSoundEngine';

// Inside App component:
const sound = useSoundEngine();
```

Pass to TerminalWindow:

```tsx
<TerminalWindow bellFlash={bellFlash} onSoundToggle={sound.toggle} soundEnabled={sound.enabled}>
  <Terminal
    key={sessionKey}
    ref={terminalRef}
    onShutdown={handleShutdown}
    onBell={handleBell}
    playSound={sound.play}
  />
</TerminalWindow>
```

Play boot sound after boot splash completes:

```tsx
const handleBootComplete = useCallback(() => {
  setShowBootSplash(false);
  sound.play('boot');
}, [sound]);
```

**Step 2: Accept and use in Terminal.tsx**

Update Terminal props:

```tsx
type TerminalProps = {
  onShutdown?: () => void;
  onBell?: () => void;
  playSound?: (sound: 'keypress' | 'execute' | 'error' | 'themeSwitch' | 'boot') => void;
};
```

Destructure:

```tsx
const Terminal = forwardRef<TerminalHandle, TerminalProps>(({ onShutdown, onBell, playSound }, ref) => {
```

Fire sounds at the right moments:

- **Key press**: In `handleInputChange`, after setting the value:
  ```tsx
  playSound?.('keypress');
  ```

- **Command execute**: In `handleCommand`, right after adding the spinner:
  ```tsx
  playSound?.('execute');
  ```

- **Error**: In the setTimeout callback, where "Command not found" is detected:
  ```tsx
  playSound?.('error');
  ```

- **Theme switch**: Where `setTheme` is called:
  ```tsx
  playSound?.('themeSwitch');
  ```

**Step 3: Add `sound` command for mobile**

In `src/components/Terminal/Terminal.tsx`, in the `handleCommand` function, add a case for `sound on` / `sound off` / `sound` before the generic command lookup:

```tsx
if (trimmedCmd === 'sound' || trimmedCmd === 'sound on' || trimmedCmd === 'sound off') {
  // Handle after spinner
}
```

Actually, since the sound toggle needs to come from the parent, add an `onSoundToggle` prop to Terminal and handle it inside the setTimeout callback alongside other special commands. For simplicity, handle it in the generic path — the `sound` command isn't in the commands map, so it would hit "Command not found". Instead, add explicit handling before the generic lookup:

```tsx
} else if (trimmedCmd === 'sound on' || trimmedCmd === 'sound off' || trimmedCmd === 'sound') {
  if (trimmedCmd === 'sound') {
    outputLines = [
      { content: `Sound: ${soundEnabled ? 'on' : 'off'}`, type: 'output' },
      { content: 'Usage: sound on | sound off', type: 'output' },
    ];
  } else {
    const wantOn = trimmedCmd === 'sound on';
    onSoundToggle?.();
    outputLines = [
      { content: `Sound ${wantOn ? 'enabled' : 'disabled'}.`, type: 'output' },
    ];
  }
```

This requires additional props: `soundEnabled` and `onSoundToggle` on Terminal.

Update Terminal props:

```tsx
type TerminalProps = {
  onShutdown?: () => void;
  onBell?: () => void;
  playSound?: (sound: 'keypress' | 'execute' | 'error' | 'themeSwitch' | 'boot') => void;
  soundEnabled?: boolean;
  onSoundToggle?: () => void;
};
```

Pass from App.tsx:

```tsx
<Terminal
  key={sessionKey}
  ref={terminalRef}
  onShutdown={handleShutdown}
  onBell={handleBell}
  playSound={sound.play}
  soundEnabled={sound.enabled}
  onSoundToggle={sound.toggle}
/>
```

**Step 4: Verify**

Run `npm run dev`. Click `♪ off` in status bar — should toggle to `♪ on`. Type something — should hear soft clicks. Run a command — should hear rising chime. Type invalid command — should hear buzzer. Switch theme — should hear hum. Toggle off — silence. Reload — setting persists.

**Step 5: Commit**

```bash
git add src/App.tsx src/components/Terminal/Terminal.tsx src/components/TerminalWindow.tsx
git commit -m "feat: wire sound engine to terminal events and status bar toggle"
```

---

### Task 13: Phase 2 final review and PR

**Step 1: Visual/audio verification checklist**

- [ ] Rich prompt: `visitor@dkoderinc ~ $` on desktop, `~ $` on mobile
- [ ] Command timing: `took 0.6s` right-aligned after output (not on theme/clear/exit)
- [ ] Scroll indicator: `▼ more` appears when output overflows, fades on scroll to bottom
- [ ] Sound: opt-in via status bar, key clicks, execute chime, error buzz, theme hum, boot tones
- [ ] Sound persists across reload (localStorage)
- [ ] Sound disabled on `prefers-reduced-motion`
- [ ] `sound on/off` command works

**Step 2: Build check**

```bash
npm run build
```

**Step 3: Create PR**

```bash
git push -u origin feature/tui-phase2-interaction-polish
gh pr create --title "Add interaction polish: rich prompt, timing, scroll, sound" --body "$(cat <<'EOF'
## Summary
- Starship-inspired rich prompt (`visitor@dkoderinc ~ $`) with color segments
- Fish-style command execution timing (`took 0.6s`)
- Scroll indicator (`▼ more`) using IntersectionObserver
- Opt-in Web Audio sound engine with 5 synthesized sounds

## Phase
Phase 2 of 3 — Interaction Polish (see `docs/plans/2026-03-08-tui-wow-effect-design.md`)

## Test plan
- [ ] Rich prompt shows correctly on desktop and mobile
- [ ] Timing appears after commands, excluded for theme/clear/exit
- [ ] Scroll indicator fades in/out correctly
- [ ] Sound toggle works via status bar and `sound` command
- [ ] Sound respects prefers-reduced-motion
- [ ] No console errors, clean build

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Phase 3: Output Cinematics

Branch: `feature/tui-phase3-output-cinematics` (from `main` after Phase 2 merges)

### Task 14: Stream Reveal Hook

**Files:**
- Create: `src/hooks/useStreamReveal.ts`

**Step 1: Create the hook**

Create `src/hooks/useStreamReveal.ts`:

```tsx
import { useState, useEffect, useRef, useCallback } from 'react';

type UseStreamRevealOptions = {
  /** Milliseconds between each line appearing */
  staggerMs?: number;
  /** Whether to animate (false = show all instantly) */
  animate?: boolean;
  /** Callback when reveal completes */
  onComplete?: () => void;
};

const useStreamReveal = <T,>(
  items: T[],
  { staggerMs = 40, animate = true, onComplete }: UseStreamRevealOptions = {},
) => {
  const [visibleCount, setVisibleCount] = useState(animate ? 0 : items.length);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const isRevealing = animate && visibleCount < items.length;

  useEffect(() => {
    if (!animate || items.length <= 1) {
      setVisibleCount(items.length);
      onCompleteRef.current?.();
      return;
    }

    setVisibleCount(0);
    lastTimeRef.current = 0;

    const step = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed >= staggerMs) {
        lastTimeRef.current = timestamp;
        setVisibleCount(prev => {
          const next = prev + 1;
          if (next >= items.length) {
            onCompleteRef.current?.();
          }
          return Math.min(next, items.length);
        });
      }

      // Continue animation if more items to reveal
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [items, staggerMs, animate]);

  return { visibleCount, isRevealing };
};

export default useStreamReveal;
```

**Step 2: Commit**

```bash
git add src/hooks/useStreamReveal.ts
git commit -m "feat: add useStreamReveal hook for progressive output rendering"
```

---

### Task 15: Progressive Output Reveal in Terminal

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx` (integrate stream reveal into output rendering)
- Modify: `src/index.css` (line fade-in animation)

This is the most complex task. The approach: when a command's output lines replace the spinner, they enter a "revealing" state. A new piece of state tracks which output batch is currently revealing.

**Step 1: Add line fade-in CSS**

In `src/index.css`:

```css
/* Progressive output reveal */
@keyframes line-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.line-reveal {
  animation: line-fade-in 80ms ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  .line-reveal { animation: none; opacity: 1; }
}
```

**Step 2: Add reveal state to Terminal.tsx**

Add state for tracking the revealing output:

```tsx
const [revealingLines, setRevealingLines] = useState<TerminalLine[] | null>(null);
const [revealedCount, setRevealedCount] = useState(0);
const revealRafRef = useRef<number>(0);
const revealLastTimeRef = useRef<number>(0);
const revealStartIndexRef = useRef<number>(0);
```

**Step 3: Modify command output insertion to trigger reveal**

In the setTimeout callback where spinner is replaced with output, instead of immediately inserting all lines, put them into `revealingLines`:

```tsx
// Check if we should animate this output
const shouldAnimate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  && outputLines.length > 1;

if (shouldAnimate) {
  // Remove spinner, mark where reveal starts
  setTerminalOutput(prev => {
    const spinnerIndex = prev.findIndex(l => l.type === 'spinner' && l.spinnerId === currentSpinnerId);
    const withoutSpinner = spinnerIndex === -1 ? prev : [...prev.slice(0, spinnerIndex), ...prev.slice(spinnerIndex + 1)];
    revealStartIndexRef.current = withoutSpinner.length;
    return withoutSpinner;
  });
  setRevealingLines(showTiming ? [...outputLines, timingLine] : outputLines);
  setRevealedCount(0);
} else {
  // Instant reveal (single-line outputs, reduced motion)
  const newLines = showTiming ? [...outputLines, timingLine] : outputLines;
  setTerminalOutput(prev => {
    const spinnerIndex = prev.findIndex(l => l.type === 'spinner' && l.spinnerId === currentSpinnerId);
    if (spinnerIndex === -1) return [...prev, ...newLines];
    return [...prev.slice(0, spinnerIndex), ...newLines, ...prev.slice(spinnerIndex + 1)];
  });
}
```

**Step 4: Add reveal animation effect**

```tsx
useEffect(() => {
  if (!revealingLines || revealingLines.length === 0) return;

  if (revealedCount >= revealingLines.length) {
    setRevealingLines(null);
    return;
  }

  revealLastTimeRef.current = 0;

  const step = (timestamp: number) => {
    if (!revealLastTimeRef.current) revealLastTimeRef.current = timestamp;
    if (timestamp - revealLastTimeRef.current >= 40) {
      revealLastTimeRef.current = timestamp;
      setRevealedCount(prev => prev + 1);
      // Append next line to terminal output
      setTerminalOutput(prev => [...prev, revealingLines[revealedCount]]);
    }
    if (revealedCount + 1 < revealingLines.length) {
      revealRafRef.current = requestAnimationFrame(step);
    }
  };

  revealRafRef.current = requestAnimationFrame(step);
  return () => cancelAnimationFrame(revealRafRef.current);
}, [revealingLines, revealedCount]);
```

Note: This is a simplified approach. A cleaner alternative is to track reveal state per-line using the `useStreamReveal` hook, but integrating it inline avoids an extra component layer. The implementer should evaluate both approaches and pick whichever integrates more cleanly with the existing `terminalOutput` state array.

**Step 5: Add `line-reveal` class to newly revealed lines**

When rendering, lines added during a reveal should get the `line-reveal` class. Track this by comparing index against `revealStartIndexRef.current`:

```tsx
const isRevealing = revealingLines !== null;
const revealStart = revealStartIndexRef.current;

// In the map:
<div
  key={index}
  className={`group flex items-start hover:bg-white/5 px-2 py-0.5 -mx-2 rounded ${
    isRevealing && index >= revealStart ? 'line-reveal' : ''
  }`}
>
```

**Step 6: Verify**

Run `npm run dev`. Type `skills`. After spinner, lines should appear one at a time with ~40ms gaps, each fading in over 80ms. `uptime` (single line) should appear instantly. `man dmytro` should stream ~30 lines.

**Step 7: Commit**

```bash
git add src/components/Terminal/Terminal.tsx src/index.css src/hooks/useStreamReveal.ts
git commit -m "feat: add progressive output reveal with line-by-line streaming"
```

---

### Task 16: Input Blocking During Reveal

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx` (gate input during reveal)
- Modify: `src/App.tsx` (gate mobile toolbar during reveal)
- Modify: `src/index.css` (blocked input styles)

**Step 1: Add blocked input styles**

In `src/index.css`:

```css
/* Input blocked during output reveal */
.input-blocked {
  opacity: 0.5;
  pointer-events: none;
}

.input-blocked .terminal-cursor {
  animation: none;
  opacity: 0.3;
}
```

**Step 2: Expose revealing state and gate input**

In Terminal.tsx, the `isRevealing` boolean (from Task 15) gates all input:

In `handleCommand`, add early return:

```tsx
const handleCommand = (cmd: string) => {
  if (revealingLines !== null) return; // Block during reveal
  ...
```

In `handleInputChange`:

```tsx
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (revealingLines !== null) return; // Block during reveal
  ...
```

In `handleKeyDown`, add at the top:

```tsx
if (revealingLines !== null) { e.preventDefault(); return; }
```

In the mobile action handler (`handleMobileAction`):

```tsx
handleMobileAction: (action) => {
  if (revealingLines !== null) return; // Block during reveal
  ...
```

**Step 3: Apply blocked visual style**

On the input bar div:

```tsx
<div className={`flex items-center space-x-2 w-full p-2 ${revealingLines !== null ? 'input-blocked' : ''}`} ...>
```

**Step 4: Expose isRevealing to parent for mobile toolbar**

Add to the TerminalHandle interface:

```tsx
export type TerminalHandle = {
  handleMobileAction: (action: 'tab' | 'up' | 'down' | 'enter') => void;
  isRevealing: boolean;
};
```

In useImperativeHandle, add a getter. Since useImperativeHandle doesn't support getters well, instead expose revealing state via a callback prop:

```tsx
type TerminalProps = {
  ...
  onRevealStateChange?: (isRevealing: boolean) => void;
};
```

Fire it when reveal state changes:

```tsx
useEffect(() => {
  onRevealStateChange?.(revealingLines !== null);
}, [revealingLines, onRevealStateChange]);
```

**Step 5: Dim mobile toolbar in App.tsx**

In `src/App.tsx`:

```tsx
const [isRevealing, setIsRevealing] = useState(false);

<Terminal
  ...
  onRevealStateChange={setIsRevealing}
/>
```

On the mobile toolbar buttons:

```tsx
<button
  ...
  className={`flex-1 py-2 font-mono text-sm rounded inline-flex items-center justify-center gap-1 ${isRevealing ? 'opacity-50 pointer-events-none' : ''}`}
  ...
>
```

**Step 6: Verify**

Run `npm run dev`. Type `skills`. During the ~600ms reveal:
- Input should be dimmed and unresponsive
- Cursor should stop blinking
- Mobile toolbar buttons should be dimmed
- After reveal completes, everything snaps back to normal instantly

**Step 7: Commit**

```bash
git add src/components/Terminal/Terminal.tsx src/App.tsx src/index.css
git commit -m "feat: block input during progressive output reveal"
```

---

### Task 17: Phase 3 final review and PR

**Step 1: Full verification checklist**

- [ ] Progressive reveal: multi-line outputs stream in at ~40ms/line
- [ ] Single-line outputs (uptime, theme) appear instantly
- [ ] Input blocked during reveal: can't type, can't click suggestions, can't use mobile toolbar
- [ ] Blocked state visually obvious: dimmed input, frozen cursor
- [ ] Everything restores instantly when reveal completes
- [ ] `clear` works normally (no reveal, no blocking)
- [ ] `prefers-reduced-motion`: instant output, no blocking
- [ ] Timing indicator appears after last revealed line
- [ ] Auto-scroll follows revealed lines
- [ ] All Phase 1 + Phase 2 features still work correctly

**Step 2: Build check**

```bash
npm run build
```

**Step 3: Create PR**

```bash
git push -u origin feature/tui-phase3-output-cinematics
gh pr create --title "Add output cinematics: progressive reveal and input blocking" --body "$(cat <<'EOF'
## Summary
- Progressive output reveal: lines stream in one at a time (40ms stagger, 80ms fade-in)
- Input blocking during reveal: input dimmed, cursor frozen, toolbar unresponsive
- Single-line outputs and reduced-motion users see instant output
- Auto-scroll follows revealed lines

## Phase
Phase 3 of 3 — Output Cinematics (see `docs/plans/2026-03-08-tui-wow-effect-design.md`)

## Test plan
- [ ] Multi-line commands stream progressively
- [ ] Single-line commands appear instantly
- [ ] Input is blocked during reveal (keyboard, mobile toolbar, suggestions)
- [ ] Blocked state is visually indicated
- [ ] `clear` and `exit` skip reveal
- [ ] prefers-reduced-motion: instant, no blocking
- [ ] Timing indicator appears after last line
- [ ] All Phase 1 + 2 features still work

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
