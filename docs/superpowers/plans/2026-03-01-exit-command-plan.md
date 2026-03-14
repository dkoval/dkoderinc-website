# Exit Command with CRT Power-Off — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an `exit` command that triggers a cinematic CRT power-off animation, black screen, and "Press any key to restart" reboot cycle.

**Architecture:** The `exit` command is registered in the terminal's command system. When executed, it calls an `onShutdown` callback prop that bubbles up to `App.tsx`, which orchestrates a 4-phase shutdown sequence (messages → CRT collapse → dot fade → restart prompt) using a state machine and CSS animations. Restart re-triggers the existing `BootSplash` and resets all terminal state.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, CSS keyframe animations, existing Vite build.

**Note:** This project has no test infrastructure — no test runner, no test files. Tasks skip TDD steps accordingly.

---

### Task 1: Add `exit` to command registry and suggestions

**Files:**
- Modify: `src/components/Terminal/commands.tsx`

**Step 1: Add the `exit` suggestion entry**

In `commands.tsx`, add a `LogOut` import from lucide-react and append an entry to the `suggestions` array:

```tsx
// Add to imports at line 2:
import { Cpu, Mail, Sparkles, User, Info, FolderOpen, Clock, LogOut } from 'lucide-react';

// Add to suggestions array after the 'clear' entry (line 13):
{ command: 'exit', description: 'Terminate the current session', icon: <LogOut className="w-4 h-4 text-[#00FF41]" /> },
```

**Step 2: Add the `exit` command entry**

The `exit` command doesn't need static output strings like other commands — it's handled specially in `Terminal.tsx`. But we still need an entry so the generic command lookup doesn't return "Command not found". Add to the `commands` record:

```tsx
// Add to the commands record (after 'projects' entry, around line 91):
exit: [
  'Shutting down...',
],
```

**Step 3: Verify the dev server compiles**

Run: `npm run dev` (check for TypeScript/compilation errors)
Expected: Clean compile, no errors.

**Step 4: Commit**

```bash
git add src/components/Terminal/commands.tsx
git commit -m "feat: add exit command to registry and suggestions"
```

---

### Task 2: Add CRT shutdown CSS animations

**Files:**
- Modify: `src/index.css`

**Step 1: Add the keyframe animations and utility classes**

Append the following to the end of `src/index.css`:

```css
/* CRT shutdown animation - Phase 2: vertical collapse to horizontal line */
@keyframes crt-collapse {
  0% {
    transform: scaleY(1) scaleX(1);
    filter: brightness(1);
  }
  60% {
    transform: scaleY(0.005) scaleX(1);
    filter: brightness(3);
  }
  100% {
    transform: scaleY(0.005) scaleX(0);
    filter: brightness(3);
    opacity: 0;
  }
}

.crt-shutdown {
  animation: crt-collapse 1.4s cubic-bezier(0.2, 0, 0.8, 1) forwards;
  transform-origin: center center;
}

/* Restart prompt blink */
.restart-blink {
  animation: blink 1s step-end infinite;
}
```

This single `crt-collapse` animation handles both Phase 2 (vertical collapse, 0-60%) and Phase 3 (horizontal shrink + fade, 60-100%) in one smooth sequence. The `brightness(3)` creates the phosphor glow effect on the collapsing line. No need for a separate `dot-shrink` keyframe — combining them into one animation is simpler and produces a smoother result.

The `restart-blink` class reuses the existing `blink` keyframe already defined in `index.css`.

**Step 2: Verify the dev server compiles**

Run: Check dev server for CSS errors.
Expected: Clean compile.

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add CRT shutdown CSS keyframe animations"
```

---

### Task 3: Wire `exit` command in Terminal to call `onShutdown` prop

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx`

**Step 1: Accept `onShutdown` prop**

Change the Terminal component signature to accept props:

```tsx
// Change line 29 from:
const Terminal = forwardRef<TerminalHandle>((_, ref) => {

// To:
type TerminalProps = {
  onShutdown?: () => void;
};

const Terminal = forwardRef<TerminalHandle, TerminalProps>(({ onShutdown }, ref) => {
```

**Step 2: Handle `exit` in `handleCommand`**

Add an `exit` handler in `handleCommand` (after the `clear` block, around line 100). When `exit` is typed, we:
1. Print the `$ exit` input line to terminal output
2. Call `onShutdown()` — App.tsx takes over from here

```tsx
// Add after the 'clear' block (line 100) and before the 'uptime' block:
if (trimmedCmd === 'exit') {
  setTerminalOutput(prev => [
    ...prev,
    { content: `$ ${trimmedCmd}`, type: 'input', timestamp: getCurrentTime() },
  ]);
  setInputCommand('');
  setAutoSuggestion(null);
  onShutdown?.();
  return;
}
```

**Step 3: Verify the dev server compiles**

Run: Check dev server.
Expected: Clean compile. Typing `exit` in the terminal should print `$ exit` and then do nothing visible yet (since App.tsx doesn't handle the callback yet).

**Step 4: Commit**

```bash
git add src/components/Terminal/Terminal.tsx
git commit -m "feat: wire exit command to call onShutdown callback prop"
```

---

### Task 4: Implement shutdown state machine and restart logic in App.tsx

**Files:**
- Modify: `src/App.tsx`

This is the core task. App.tsx orchestrates the full shutdown sequence.

**Step 1: Add shutdown state and message constants**

```tsx
// Add these imports at the top (update existing import line 1):
import React, { useState, useCallback, useRef, useEffect } from 'react';

// Add shutdown messages constant above the App component:
const SHUTDOWN_MESSAGES = [
  'Broadcast message from root@dkoderinc (pts/0):',
  'The system is going down for halt NOW!',
  'Stopping all services...            [OK]',
  'Unmounting filesystems...           [OK]',
  'Flushing disk cache...              [OK]',
  'System halted.',
];

type ShutdownPhase = null | 'messages' | 'crt-off' | 'black' | 'restart-prompt';
```

**Step 2: Add state and shutdown handler inside the App component**

```tsx
// Inside the App component, after the existing state declarations:
const [shutdownPhase, setShutdownPhase] = useState<ShutdownPhase>(null);
const [shutdownLines, setShutdownLines] = useState(0);

const handleShutdown = useCallback(() => {
  setShutdownPhase('messages');
  setShutdownLines(0);
}, []);
```

**Step 3: Add the shutdown message phase effect**

This effect prints shutdown messages one at a time (350ms apart), then transitions to the CRT-off phase:

```tsx
// Add useEffect for shutdown message sequencing:
useEffect(() => {
  if (shutdownPhase !== 'messages') return;

  const timers: ReturnType<typeof setTimeout>[] = [];
  SHUTDOWN_MESSAGES.forEach((_, i) => {
    timers.push(setTimeout(() => setShutdownLines(i + 1), i * 350));
  });
  // After all messages shown, wait 500ms then start CRT collapse
  timers.push(setTimeout(() => {
    setShutdownPhase('crt-off');
  }, SHUTDOWN_MESSAGES.length * 350 + 500));

  return () => timers.forEach(clearTimeout);
}, [shutdownPhase]);
```

**Step 4: Add the CRT-off → black → restart-prompt phase transitions**

```tsx
// Add useEffect for CRT animation phase transitions:
useEffect(() => {
  if (shutdownPhase !== 'crt-off') return;

  // crt-collapse animation is 1.4s, then go to black
  const timer = setTimeout(() => {
    setShutdownPhase('black');
  }, 1500);
  return () => clearTimeout(timer);
}, [shutdownPhase]);

useEffect(() => {
  if (shutdownPhase !== 'black') return;

  // Stay black for 2s, then show restart prompt
  const timer = setTimeout(() => {
    setShutdownPhase('restart-prompt');
  }, 2000);
  return () => clearTimeout(timer);
}, [shutdownPhase]);
```

**Step 5: Add the restart handler**

```tsx
// Add restart handler and its effect:
const handleRestart = useCallback(() => {
  setShutdownPhase(null);
  setShutdownLines(0);
  setShowBootSplash(true);
}, []);

useEffect(() => {
  if (shutdownPhase !== 'restart-prompt') return;

  const onKey = () => handleRestart();
  const onTouch = () => handleRestart();

  window.addEventListener('keydown', onKey);
  window.addEventListener('touchstart', onTouch);
  return () => {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('touchstart', onTouch);
  };
}, [shutdownPhase, handleRestart]);
```

**Step 6: Update the JSX return**

Replace the entire return block. Key changes:
- Pass `onShutdown={handleShutdown}` to `<Terminal>`
- Add `crt-shutdown` class to the main content wrapper when `shutdownPhase === 'crt-off'`
- Render shutdown messages overlay during `'messages'` phase
- Render black screen during `'black'` phase
- Render restart prompt during `'restart-prompt'` phase
- Use a `key` prop on `Terminal` that changes on restart to force a fresh mount (clearing all internal state — command history, output, etc.)

```tsx
// Add a restart counter to force Terminal remount:
const [sessionKey, setSessionKey] = useState(0);

// Update handleRestart to increment the key:
const handleRestart = useCallback(() => {
  setShutdownPhase(null);
  setShutdownLines(0);
  setSessionKey(k => k + 1);
  setShowBootSplash(true);
}, []);
```

The full JSX return:

```tsx
return (
  <div className="flex flex-col overflow-hidden" style={{ background: '#000', height: '100dvh' }}>
    {showBootSplash && <BootSplash onComplete={handleBootComplete} />}

    {/* Shutdown messages overlay */}
    {shutdownPhase === 'messages' && (
      <div
        className="fixed inset-0 z-[9000] flex flex-col justify-center items-start p-8 md:p-16"
        style={{ background: '#000' }}
      >
        {SHUTDOWN_MESSAGES.slice(0, shutdownLines).map((line, i) => (
          <p key={i} className="font-mono text-sm mb-1" style={{ color: '#00FF41' }}>
            {line}
          </p>
        ))}
      </div>
    )}

    {/* Black screen + restart prompt */}
    {(shutdownPhase === 'black' || shutdownPhase === 'restart-prompt') && (
      <div
        className="fixed inset-0 z-[9000] flex items-center justify-center"
        style={{ background: '#000' }}
      >
        {shutdownPhase === 'restart-prompt' && (
          <p className="font-mono text-sm restart-blink" style={{ color: '#00FF41' }}>
            Press any key to restart...
          </p>
        )}
      </div>
    )}

    <div
      className={`flex flex-col flex-1 overflow-hidden ${shutdownPhase === 'crt-off' ? 'crt-shutdown' : ''}`}
      style={{
        opacity: showBootSplash ? 0 : 1,
        transition: shutdownPhase ? undefined : 'opacity 0.3s',
      }}
    >
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 overflow-hidden p-3 md:p-4">
          <TerminalWindow>
            <Terminal key={sessionKey} ref={terminalRef} onShutdown={handleShutdown} />
          </TerminalWindow>
        </main>
      </div>
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
      {/* Copyright */}
      <div
        className="flex justify-center shrink-0 py-2 font-mono text-xs border-t"
        style={{ color: '#888', borderColor: '#333', paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <span style={{ color: '#888' }}>$ cat /etc/copyright&nbsp;&nbsp;</span>
        <span style={{ color: '#00FF41' }}>&copy; {new Date().getFullYear()} DKoder Inc.</span>
      </div>
    </div>
  </div>
);
```

**Step 7: Verify the full flow in the browser**

Run: Open dev server in browser. Type `exit`. Verify:
1. Shutdown messages appear one at a time (~350ms each)
2. After messages, the entire page collapses vertically (CRT effect)
3. Screen goes black for ~2 seconds
4. "Press any key to restart..." appears blinking
5. Pressing any key (or tapping on mobile) triggers the boot splash
6. After boot, terminal is fresh — no command history, help is displayed

**Step 8: Commit**

```bash
git add src/App.tsx
git commit -m "feat: implement shutdown state machine with CRT power-off and restart"
```

---

### Task 5: Visual polish and edge case handling

**Files:**
- Modify: `src/App.tsx` (if needed)
- Modify: `src/index.css` (if needed)

**Step 1: Test edge cases**

Verify in the browser:
- Typing `exit` during boot splash doesn't trigger shutdown
- Typing `exit` multiple times rapidly doesn't stack animations
- Mobile: tapping the screen during restart prompt works
- The CRT scanline overlay (`body::before`) doesn't interfere with the shutdown animation (it's at `z-index: 9999`, shutdown overlays are at `z-index: 9000` — the scanlines should still appear on top, which is correct)
- After restart, the terminal input is focused and functional

**Step 2: Fix any issues found**

Address anything that doesn't work as expected.

**Step 3: Final commit**

```bash
git add -A
git commit -m "fix: polish exit command edge cases"
```

Only create this commit if changes were made.
