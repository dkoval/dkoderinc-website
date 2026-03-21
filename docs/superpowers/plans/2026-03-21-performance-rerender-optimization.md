# Performance Re-render Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate unnecessary React re-renders and fix algorithmic inefficiencies to achieve smooth performance on ~5-year-old mid-range devices.

**Architecture:** Split the monolithic Terminal component into memoized subcomponents (TerminalOutput, TerminalInput), memoize the ThemeContext provider value, extract ticking components (Clock, Uptime) to isolate 1Hz re-renders, optimize the progressive reveal animation from O(n²) to batched updates, and stabilize handler references with the latest-ref pattern.

**Tech Stack:** React 19, TypeScript 5.9, Vitest, @testing-library/react

**Spec:** `docs/superpowers/specs/2026-03-21-performance-rerender-optimization-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/ThemeContext.tsx` | Add `useMemo` to provider value |
| Modify | `src/hooks/useIdleTimer.ts` | Add `{ passive: true }` to event listeners |
| Create | `src/components/Clock.tsx` | Isolated 1Hz clock component |
| Create | `src/components/Uptime.tsx` | Isolated 1Hz uptime component |
| Modify | `src/components/StatusBar.tsx` | Replace inline clock state with `<Clock />` |
| Modify | `src/components/Sidebar.tsx` | Replace inline uptime state with `<Uptime />` |
| Modify | `src/components/Terminal/Suggestions.tsx` | Wrap in `memo()` |
| Create | `src/components/Terminal/TerminalOutput.tsx` | Memoized output list rendering |
| Create | `src/components/Terminal/TerminalInput.tsx` | Memoized input field + cursor + auto-suggestion |
| Modify | `src/components/Terminal/Terminal.tsx` | Orchestrator: state, handlers (useCallback + latest-ref), compose subcomponents, batched progressive reveal, output cap |

---

## Task 1: ThemeContext Value Memoization

**Files:**
- Modify: `src/ThemeContext.tsx:61-64`

- [ ] **Step 1: Add useMemo import and memoize context value**

In `src/ThemeContext.tsx`, add `useMemo` to the import and wrap the provider value:

```tsx
// Line 1: add useMemo to imports
import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, ReactNode } from 'react';

// Lines 61-64: replace inline object with memoized value
  const value = useMemo(
    () => ({ theme, setTheme, transitioning }),
    [theme, transitioning]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
```

`setTheme` is stable (wrapped in `useCallback` with `[]` deps), so it's excluded from the dep array.

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All 81 tests pass. No behavioral change.

- [ ] **Step 3: Commit**

```bash
git add src/ThemeContext.tsx
git commit -m "perf: memoize ThemeContext provider value to prevent cascade re-renders"
```

---

## Task 2: Passive Event Listeners in useIdleTimer

**Files:**
- Modify: `src/hooks/useIdleTimer.ts:30,36`

- [ ] **Step 1: Add passive option to addEventListener and removeEventListener**

In `src/hooks/useIdleTimer.ts`, change lines 30 and 36:

```tsx
// Line 30: add passive option
    events.forEach(evt => el.addEventListener(evt, resetTimer, { passive: true }));

// Line 36: removeEventListener doesn't need options, but must match listener
    events.forEach(evt => el.removeEventListener(evt, resetTimer));
```

`resetTimer` never calls `preventDefault()`, so passive is safe.

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useIdleTimer.ts
git commit -m "perf: add passive flag to idle timer event listeners for mobile scroll"
```

---

## Task 3: Extract Clock Component

**Files:**
- Create: `src/components/Clock.tsx`
- Modify: `src/components/StatusBar.tsx`

- [ ] **Step 1: Create Clock component**

Create `src/components/Clock.tsx`:

```tsx
import { useState, useEffect, memo } from 'react';
import useIsMobile from '../hooks/useIsMobile';

const Clock = memo(() => {
  const isMobile = useIsMobile();
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span>
      {clock.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        ...(isMobile ? {} : { second: '2-digit' }),
      })}
    </span>
  );
});

Clock.displayName = 'Clock';

export default Clock;
```

- [ ] **Step 2: Update StatusBar to use Clock**

In `src/components/StatusBar.tsx`:

Remove the `useState`/`useEffect` for clock (lines 1, 13-18, 20-25) and the `useIsMobile` import. Replace `{timeStr}` (line 58) with `<Clock />`.

The full updated file:

```tsx
import { useTheme } from '../ThemeContext';
import Clock from './Clock';

type StatusBarProps = {
  onSoundToggle?: () => void;
  soundEnabled?: boolean;
};

const StatusBar = ({ onSoundToggle, soundEnabled = false }: StatusBarProps) => {
  const { theme } = useTheme();

  return (
    <div className="status-bar flex items-center justify-between px-3 py-1 font-mono shrink-0 select-none">
      <span style={{ color: 'var(--terminal-primary-dim)' }}>
        [0] bash
      </span>
      <div className="flex items-center gap-2">
        <span
          className="status-bar-item flex items-center gap-1 font-mono"
          style={{ color: 'var(--terminal-gray)', fontSize: 'inherit' }}
        >
          <span style={{ color: 'var(--terminal-primary)' }}>●</span>
          <span>{theme}</span>
        </span>
        {/* Sound toggle — desktop only, needs useIsMobile inside or passed as prop */}
        <DesktopSoundToggle onSoundToggle={onSoundToggle} soundEnabled={soundEnabled} />
        <span style={{ color: 'var(--terminal-border)' }}>│</span>
        <Clock />
      </div>
    </div>
  );
};
```

Wait — the existing code uses `useIsMobile` to conditionally render the sound toggle. Since we're removing `useIsMobile` from StatusBar, we need to either keep it or handle differently. Let me reconsider. The simplest approach: keep `useIsMobile` in StatusBar for the sound toggle conditional, only extract the clock-related state. Updated approach:

```tsx
import { useTheme } from '../ThemeContext';
import useIsMobile from '../hooks/useIsMobile';
import Clock from './Clock';

type StatusBarProps = {
  onSoundToggle?: () => void;
  soundEnabled?: boolean;
};

const StatusBar = ({ onSoundToggle, soundEnabled = false }: StatusBarProps) => {
  const { theme } = useTheme();
  const isMobile = useIsMobile();

  return (
    <div className="status-bar flex items-center justify-between px-3 py-1 font-mono shrink-0 select-none">
      <span style={{ color: 'var(--terminal-primary-dim)' }}>
        [0] bash
      </span>
      <div className="flex items-center gap-2">
        <span
          className="status-bar-item flex items-center gap-1 font-mono"
          style={{ color: 'var(--terminal-gray)', fontSize: 'inherit' }}
        >
          <span style={{ color: 'var(--terminal-primary)' }}>●</span>
          <span>{theme}</span>
        </span>
        {!isMobile && (
          <>
            <span style={{ color: 'var(--terminal-border)' }}>│</span>
            <button
              className="status-bar-item cursor-pointer bg-transparent border-none p-0 font-mono"
              style={{
                color: soundEnabled ? 'var(--terminal-primary)' : 'var(--terminal-gray)',
                fontSize: 'inherit',
                textDecoration: soundEnabled ? 'none' : 'line-through',
              }}
              onClick={onSoundToggle}
              title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            >
              ♪ {soundEnabled ? 'on' : 'off'}
            </button>
          </>
        )}
        <span style={{ color: 'var(--terminal-border)' }}>│</span>
        <Clock />
      </div>
    </div>
  );
};

export default StatusBar;
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/components/__tests__/StatusBar.test.tsx`
Expected: All 4 StatusBar tests pass. Clock renders time string.

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/Clock.tsx src/components/StatusBar.tsx
git commit -m "perf: extract Clock component to isolate 1Hz re-renders from StatusBar"
```

---

## Task 4: Extract Uptime Component

**Files:**
- Create: `src/components/Uptime.tsx`
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Create Uptime component**

Create `src/components/Uptime.tsx`:

```tsx
import { useState, useEffect, memo } from 'react';
import { PAGE_LOAD_TIME, formatUptime } from '../constants';

const Uptime = memo(() => {
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setUptime(Math.floor((Date.now() - PAGE_LOAD_TIME) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return <span style={{ color: 'var(--terminal-primary)' }}>{formatUptime(uptime)}</span>;
});

Uptime.displayName = 'Uptime';

export default Uptime;
```

- [ ] **Step 2: Update Sidebar to use Uptime**

In `src/components/Sidebar.tsx`:

Remove the `useState`/`useEffect` imports for uptime (lines 1, 3, 21, 24-29). Remove the `uptime` state and the `setInterval`. Replace line 63's `formatUptime(uptime)` span with `<Uptime />`.

Updated file:

```tsx
import { Github, Linkedin, Twitter, Mail } from 'lucide-react';
import { useTheme, ThemeName } from '../ThemeContext';
import Uptime from './Uptime';

const SOCIAL_LINKS = [
  { href: 'https://github.com/dkoval', Icon: Github, label: 'github.com' },
  { href: 'https://linkedin.com/in/dmytrokoval', Icon: Linkedin, label: 'linkedin.com' },
  { href: 'https://twitter.com/dkovalbuzz', Icon: Twitter, label: 'twitter.com' },
  { href: 'mailto:dkoderinc@gmail.com', Icon: Mail, label: 'dkoderinc@gmail.com' },
] as const;

const HEADSHOT_FILTERS: Record<ThemeName, string> = {
  green: 'grayscale(100%) sepia(60%) hue-rotate(80deg) saturate(200%)',
  amber: 'grayscale(100%) sepia(80%) saturate(200%)',
  'tokyo-night': 'grayscale(100%) sepia(20%) hue-rotate(190deg) saturate(200%) brightness(0.9)',
  'one-dark-pro': 'grayscale(100%) sepia(15%) hue-rotate(180deg) saturate(150%) brightness(0.9)',
};

const Sidebar = () => {
  const { theme } = useTheme();
  const headshotFilter = HEADSHOT_FILTERS[theme];

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col p-4 gap-4 shrink-0 overflow-hidden terminal-glow"
        style={{ width: '280px', borderRight: '1px solid var(--terminal-border)' }}
      >
        {/* Headshot */}
        <div className="relative overflow-hidden rounded" style={{ aspectRatio: '1/1' }}>
          <img
            src="images/headshot.webp"
            alt="Dmytro Koval"
            className="w-full h-full object-cover"
            style={{ filter: headshotFilter }}
          />
        </div>
        {/* Name + title */}
        <div className="font-mono">
          <p className="font-bold text-lg" style={{ color: 'var(--terminal-primary)' }}>Dmytro Koval</p>
          <p className="text-sm" style={{ color: 'var(--terminal-gray)' }}>Senior Software Engineer</p>
        </div>
        {/* /proc/dmytro/status */}
        <div className="font-mono text-sm border rounded p-3" style={{ borderColor: 'var(--terminal-border)' }}>
          <p className="mb-2" style={{ color: 'var(--terminal-gray)' }}>/proc/dmytro/status</p>
          <p><span style={{ color: 'var(--terminal-gray)' }}>Name:   </span><span style={{ color: 'var(--terminal-primary)' }}>Dmytro Koval</span></p>
          <p><span style={{ color: 'var(--terminal-gray)' }}>Role:   </span><span style={{ color: 'var(--terminal-primary)' }}>Backend Engineer</span></p>
          <p><span style={{ color: 'var(--terminal-gray)' }}>Exp:    </span><span style={{ color: 'var(--terminal-primary)' }}>15+ years</span></p>
          <p><span style={{ color: 'var(--terminal-gray)' }}>Stack:  </span><span style={{ color: 'var(--terminal-primary)' }}>Java, Kotlin</span></p>
          <p><span style={{ color: 'var(--terminal-gray)' }}>Status: </span><span style={{ color: 'var(--terminal-primary)' }}>available</span></p>
          <p><span style={{ color: 'var(--terminal-gray)' }}>Uptime: </span><Uptime /></p>
        </div>
        {/* Social links as known_hosts */}
        <div className="font-mono text-sm border rounded p-3" style={{ borderColor: 'var(--terminal-border)' }}>
          <p className="mb-2" style={{ color: 'var(--terminal-gray)' }}>~/.ssh/known_hosts</p>
          {SOCIAL_LINKS.map(({ href, Icon, label }) => (
            <a key={href} href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 mb-1 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--terminal-primary)' }}>
              <Icon className="w-3 h-3" />
              <span>{label}</span>
            </a>
          ))}
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex md:hidden items-center gap-3 p-3 border-b" style={{ borderColor: 'var(--terminal-border)' }}>
        <img
          src="images/headshot.webp"
          alt="Dmytro Koval"
          className="w-10 h-10 rounded-full object-cover"
          style={{ filter: headshotFilter }}
        />
        <span className="font-mono font-bold" style={{ color: 'var(--terminal-primary)' }}>Dmytro Koval</span>
        <div className="flex gap-2 ml-auto">
          {SOCIAL_LINKS.map(({ href, Icon }) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--terminal-primary)' }} className="hover:opacity-80">
              <Icon className="w-4 h-4" />
            </a>
          ))}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/components/__tests__/Sidebar.test.tsx`
Expected: All 5 Sidebar tests pass. Uptime renders in proc status block.

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/Uptime.tsx src/components/Sidebar.tsx
git commit -m "perf: extract Uptime component to isolate 1Hz re-renders from Sidebar"
```

---

## Task 5: Wrap Suggestions in memo()

**Files:**
- Modify: `src/components/Terminal/Suggestions.tsx`

- [ ] **Step 1: Add memo import and wrap component**

In `src/components/Terminal/Suggestions.tsx`:

```tsx
// Line 1: add memo to imports
import { Ref, memo } from 'react';

// Line 18: wrap the component function
const Suggestions = memo(({ suggestions, selectedIndex, onSelect, onMouseEnter, mode, themes, currentTheme, onBack, ref }: SuggestionsProps) => {
    // ... existing body unchanged ...
});

// After the closing — add displayName
Suggestions.displayName = 'Suggestions';

// Line 75: export stays the same
export default Suggestions;
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/components/Terminal/__tests__/Suggestions.test.tsx`
Expected: All 5 Suggestions tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/Terminal/Suggestions.tsx
git commit -m "perf: wrap Suggestions in memo() to prevent unnecessary re-renders"
```

---

## Task 6: Extract TerminalOutput Component

This is the first half of the Terminal split. Extract the output rendering into a memoized component.

**Files:**
- Create: `src/components/Terminal/TerminalOutput.tsx`
- Modify: `src/components/Terminal/Terminal.tsx`

- [ ] **Step 1: Create TerminalOutput component**

Create `src/components/Terminal/TerminalOutput.tsx`:

**Critical design decision:** The `displaySuggestions` array contains `icon: ReactNode` — React elements that are never referentially stable. Passing it as a prop to a `memo()` component would defeat memoization. Instead, resolve help entry content at creation time in `displayHelp()` and store command name, description, and icon directly in the `TerminalLine.helpEntry` field. This requires updating the `TerminalLine` type:

In `src/components/Terminal/types.ts`, expand `helpEntry`:

```tsx
export interface TerminalLine {
  content: string;
  type: 'input' | 'output' | 'error' | 'spinner' | 'timing';
  isHtml?: boolean;
  timestamp?: string;
  helpEntry?: {
    commandIndex: number;  // kept for backwards compat with any tests
    command: string;       // resolved at creation time
    description: string;   // resolved at creation time
    icon: ReactNode;       // resolved at creation time
  };
  spinnerId?: number;
}
```

Then in `displayHelp()` (Task 8), resolve the fields from the static `suggestions` array:

```tsx
...suggestions.map((s, i) => ({
  content: '',
  type: 'output' as const,
  helpEntry: { commandIndex: i, command: s.command, description: s.description, icon: s.icon },
})),
```

Note: `suggestions` is a static array imported from `commands.tsx` — its `icon` fields are stable module-level React elements (e.g., `<List className="w-4 h-4" />`). They only become unstable in `displaySuggestions` (which swaps the sound icon based on `soundEnabled`). By reading from the static `suggestions` array at creation time, we avoid the instability. The only icon that differs is the sound toggle — for the help output, using the static icon is acceptable since the help text doesn't need to reflect the live sound state.

Now the TerminalOutput component never receives `displaySuggestions`:

```tsx
import { memo, Ref } from 'react';
import { TerminalLine } from './types';

interface TerminalOutputProps {
  terminalOutput: TerminalLine[];
  isInputBlocked: boolean;
  revealStartIndex: number;
  showScrollIndicator: boolean;
  rainVisible: boolean;
  scrollRef: Ref<HTMLDivElement>;
  sentinelRef: Ref<HTMLDivElement>;
}

const TerminalOutput = memo(({
  terminalOutput,
  isInputBlocked,
  revealStartIndex,
  showScrollIndicator,
  rainVisible,
  scrollRef,
  sentinelRef,
}: TerminalOutputProps) => {
  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto overflow-x-hidden text-sm terminal-scroll relative z-[1]"
      style={{
        opacity: rainVisible ? 0 : 1,
        transition: 'opacity 400ms ease-in-out',
      }}
    >
      {terminalOutput.map((line, index) => (
        <div key={index} className={`group flex items-start hover:bg-white/5 px-2 py-0.5 -mx-2 rounded ${
          isInputBlocked && index >= revealStartIndex ? 'line-reveal' : ''
        }`}>
          <p
            className="font-mono flex-1 break-words"
            style={
              line.type === 'input' ? { color: 'var(--terminal-primary)' } :
              line.type === 'error' ? { color: 'var(--terminal-error)' } :
              { color: 'var(--terminal-output)' }
            }
          >
            {line.type === 'timing' ? (
              <span className="block text-right" style={{ color: 'var(--terminal-gray)', fontSize: '0.75rem' }}>
                {line.content}
              </span>
            ) : line.type === 'spinner' ? (
              <span className="inline-flex items-center gap-2">
                <span className="ai-spinner" />
                <span style={{ color: 'var(--terminal-gray)' }}>{line.content}</span>
              </span>
            ) : line.helpEntry ? (
              <span className="inline-flex items-center gap-3">
                {line.helpEntry.icon}
                <span style={{ color: 'var(--terminal-primary)' }}>{line.helpEntry.command}</span>
                <span style={{ color: 'var(--terminal-primary-dark)' }}>-</span>
                <span style={{ color: 'var(--terminal-gray)' }}>{line.helpEntry.description}</span>
              </span>
            ) : line.isHtml ? (
              <span
                dangerouslySetInnerHTML={{ __html: line.content }}
              />
            ) : (
              <span style={{ whiteSpace: 'pre-wrap' }}>{line.content}</span>
            )}
          </p>
          <span className="text-xs mr-2 opacity-0 group-hover:opacity-100 select-none" style={{ color: 'var(--terminal-primary-dark)' }}>
            {line.timestamp}
          </span>
        </div>
      ))}
      <div ref={sentinelRef} className="h-px" />
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
    </div>
  );
});

TerminalOutput.displayName = 'TerminalOutput';

export default TerminalOutput;
```

**Key changes:**
1. No `displaySuggestions` prop — help entries read from pre-resolved `line.helpEntry` fields
2. The `isHtml` branch renders `line.content` directly via `dangerouslySetInnerHTML` without calling `DOMPurify.sanitize()` — sanitization moves to command-execution time (Task 8)

- [ ] **Step 2: Update Terminal.tsx to use TerminalOutput**

In `src/components/Terminal/Terminal.tsx`:

Add import:
```tsx
import TerminalOutput from './TerminalOutput';
```

Replace lines 733-796 (the scroll div and its contents) with:
```tsx
        {/* revealStartIndexRef.current is read during render — this is safe because
            it is always set inside a setTerminalOutput updater that triggers this
            re-render, so the ref has the correct value by the time we read it here. */}
        <TerminalOutput
          terminalOutput={terminalOutput}
          isInputBlocked={isInputBlocked}
          revealStartIndex={revealStartIndexRef.current}
          showScrollIndicator={showScrollIndicator}
          rainVisible={rainVisible}
          scrollRef={terminalRef}
          sentinelRef={sentinelRef}
        />
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: All tests pass. Output rendering is unchanged — just moved to a child component.

- [ ] **Step 4: Commit**

```bash
git add src/components/Terminal/TerminalOutput.tsx src/components/Terminal/Terminal.tsx
git commit -m "refactor: extract TerminalOutput as memoized subcomponent"
```

---

## Task 7: Extract TerminalInput Component

**Files:**
- Create: `src/components/Terminal/TerminalInput.tsx`
- Modify: `src/components/Terminal/Terminal.tsx`

- [ ] **Step 1: Create TerminalInput component**

Create `src/components/Terminal/TerminalInput.tsx`:

```tsx
import { memo, ChangeEvent, KeyboardEvent, Ref } from 'react';
import AutoSuggestion from './AutoSuggestion';

interface TerminalInputProps {
  inputCommand: string;
  autoSuggestion: string | null;
  isInputBlocked: boolean;
  isMobile: boolean;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: KeyboardEvent) => void;
  inputRef: Ref<HTMLInputElement>;
}

const TerminalInput = memo(({
  inputCommand,
  autoSuggestion,
  isInputBlocked,
  isMobile,
  onInputChange,
  onKeyDown,
  inputRef,
}: TerminalInputProps) => {
  return (
    <div className={`flex items-center space-x-2 w-full p-2 ${isInputBlocked ? 'input-blocked' : ''}`} style={{ border: '1px solid var(--terminal-border)' }}>
      <span className="font-mono text-sm shrink-0 select-none">
        <span style={{ color: 'var(--terminal-primary-dim)' }}>~ </span>
        <span style={{ color: 'var(--terminal-primary)' }}>$ </span>
      </span>
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={inputCommand}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          className="bg-transparent font-mono text-sm w-full focus:outline-none relative z-10 caret-transparent"
          style={{ color: 'var(--terminal-primary)' }}
          inputMode={isMobile ? "none" : undefined}
          autoCapitalize="none"
          spellCheck={false}
          autoComplete="off"
        />
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
      </div>
    </div>
  );
});

TerminalInput.displayName = 'TerminalInput';

export default TerminalInput;
```

- [ ] **Step 2: Update Terminal.tsx to use TerminalInput**

In `src/components/Terminal/Terminal.tsx`:

Add import:
```tsx
import TerminalInput from './TerminalInput';
```

Replace lines 798-830 (the input div) with:
```tsx
      <div className="relative z-[1]">
        <TerminalInput
          inputCommand={inputCommand}
          autoSuggestion={autoSuggestion}
          isInputBlocked={isInputBlocked}
          isMobile={isMobile}
          onInputChange={handleInputChange}
          onKeyDown={handleKeyDown}
          inputRef={inputRef}
        />
        {showSuggestions && (
          <Suggestions
            ref={suggestionsRef}
            suggestions={displaySuggestions}
            selectedIndex={selectedSuggestionIndex}
            onSelect={selectSuggestion}
            onMouseEnter={(i) => { if (!suppressHoverRef.current) setSelectedSuggestionIndex(i); }}
            mode={suggestionMode}
            themes={VALID_THEMES}
            currentTheme={theme}
            onBack={backToCommands}
          />
        )}
      </div>
```

Note: Suggestions stays as a sibling in Terminal.tsx per spec — click-outside handler needs both refs.

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/Terminal/TerminalInput.tsx src/components/Terminal/Terminal.tsx
git commit -m "refactor: extract TerminalInput as memoized subcomponent"
```

---

## Task 8: Handler Memoization + DOMPurify at Creation Time + Output Cap

This is the largest task — it makes the component splitting effective by stabilizing all handler references, moves DOMPurify sanitization to command-execution time, and adds the output cap.

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx`

- [ ] **Step 1: Add latest-ref pattern for frequently-changing values**

At the top of the Terminal component (after state declarations), add refs that mirror frequently-changing values:

```tsx
// Latest-ref pattern: keep refs in sync so useCallback closures read current values
const themeRef = useRef(theme);
const soundEnabledRef = useRef(soundEnabled);
const isMobileRef = useRef(isMobile);
const inputCommandRef = useRef(inputCommand);
const showSuggestionsRef = useRef(showSuggestions);
const selectedSuggestionIndexRef = useRef(selectedSuggestionIndex);
const suggestionModeRef = useRef(suggestionMode);
const autoSuggestionRef = useRef(autoSuggestion);
const historyIndexRef = useRef(historyIndex);
const commandHistoryRef = useRef(commandHistory);
const isInputBlockedRef = useRef(isInputBlocked);

// Sync refs on every render (cheap — just assignments)
themeRef.current = theme;
soundEnabledRef.current = soundEnabled;
isMobileRef.current = isMobile;
inputCommandRef.current = inputCommand;
showSuggestionsRef.current = showSuggestions;
selectedSuggestionIndexRef.current = selectedSuggestionIndex;
suggestionModeRef.current = suggestionMode;
autoSuggestionRef.current = autoSuggestion;
historyIndexRef.current = historyIndex;
commandHistoryRef.current = commandHistory;
isInputBlockedRef.current = isInputBlocked;
```

Also add refs for callback props:

```tsx
const playSoundRef = useRef(playSound);
const onShutdownRef = useRef(onShutdown);
const onBellRef = useRef(onBell);
const onSoundSetRef = useRef(onSoundSet);

playSoundRef.current = playSound;
onShutdownRef.current = onShutdown;
onBellRef.current = onBell;
onSoundSetRef.current = onSoundSet;
```

- [ ] **Step 2: Move DOMPurify sanitization to a helper**

Add a helper function at module scope (before the component):

```tsx
const sanitizeHtml = (content: string): string =>
  DOMPurify.sanitize(content, PURIFY_CONFIG);
```

In `handleCommand`, wherever `TerminalLine` objects are created with HTML content, sanitize at creation time. The key locations:

1. In the `commands[trimmedCmd]` branch (around the existing line that sets `isHtml`):
```tsx
outputLines = output.map(line => ({
  content: output.isHtml ? sanitizeHtml(line) : line,
  type: 'output' as const,
  isHtml: output.isHtml,
}));
```

2. In `displayMotd()`:
```tsx
const displayMotd = useCallback((): TerminalLine[] => {
  const hint = isMobileRef.current
    ? 'Tap <span style="color: var(--terminal-primary)">≡</span> to explore commands.'
    : 'Type <span style="color: var(--terminal-primary)">\'help\'</span> or press <span style="color: var(--terminal-primary)">Tab</span> to explore.';
  return [
    { content: sanitizeHtml(`<span style="color: var(--terminal-gray)">${hint}</span>`), type: 'output' as const, isHtml: true },
  ];
}, []);
```

- [ ] **Step 3: Wrap all handlers in useCallback**

Convert each handler to `useCallback`. Key handlers and their strategy:

**`updateAutoSuggestion`** — reads no changing state, only its `input` argument. Wrap with `[]`:
```tsx
const updateAutoSuggestion = useCallback((input: string) => {
  // ... existing body, uses setAutoSuggestion (stable)
}, []);
```

**`cancelMotdAnimation`** — reads `motdAnimatingRef`, `motdDelayRef`, `motdIntervalRef` (all refs). Uses `displayMotd` (now memoized). Wrap with `[displayMotd]`:
```tsx
const cancelMotdAnimation = useCallback(() => {
  if (!motdAnimatingRef.current) return;
  motdAnimatingRef.current = false;
  if (motdDelayRef.current) { clearTimeout(motdDelayRef.current); motdDelayRef.current = null; }
  if (motdIntervalRef.current) { clearInterval(motdIntervalRef.current); motdIntervalRef.current = null; }
  setTerminalOutput(displayMotd());
}, [displayMotd]);
```

**`handleInputChange`** — reads `isInputBlocked` via ref. Wrap with `[cancelMotdAnimation, updateAutoSuggestion]`:
```tsx
const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
  if (isInputBlockedRef.current) return;
  cancelMotdAnimation();
  if (pendingExecuteRef.current) {
    clearTimeout(pendingExecuteRef.current);
    pendingExecuteRef.current = null;
  }
  const value = e.target.value;
  setInputCommand(value);
  playSoundRef.current?.('keypress');
  updateAutoSuggestion(value);
  setShowSuggestions(false);
  setSuggestionMode('commands');
}, [cancelMotdAnimation, updateAutoSuggestion]);
```

**`displayHelp`** — reads `promptPrefix` (constant), `getCurrentTime` (pure function). Resolves help entry fields from static `suggestions` array at creation time. Wrap with `[]`:
```tsx
const displayHelp = useCallback(() => {
  return [
    { content: `${promptPrefix}help`, type: 'input' as const, timestamp: getCurrentTime() },
    { content: 'Available commands:', type: 'output' as const },
    ...suggestions.map((s, i) => ({
      content: '',
      type: 'output' as const,
      helpEntry: { commandIndex: i, command: s.command, description: s.description, icon: s.icon },
    })),
    { content: '', type: 'output' as const },
    { content: 'Tips:', type: 'output' as const },
    { content: '  • Use ↑↓ arrows to navigate command history', type: 'output' as const },
    { content: '  • Tab for autocomplete', type: 'output' as const },
    { content: '  • Ctrl+L to clear', type: 'output' as const },
  ];
}, []);
```

**`handleCommand`** — the complex one. All changing values read from refs. Deps = `[cancelMotdAnimation, displayMotd, displayHelp]` (all stable):
```tsx
const handleCommand = useCallback((cmd: string) => {
  if (isInputBlockedRef.current) return;
  cancelMotdAnimation();
  const trimmedCmd = cmd.trim().toLowerCase();
  if (trimmedCmd === '') return;

  if (trimmedCmd === 'help') {
    setTerminalOutput(prev => [...prev, ...displayHelp()]);
    // ... rest uses state setters (stable) and refs
    return;
  }

  // ... rest of handleCommand body
  // Replace all direct reads of theme, soundEnabled, isMobile with themeRef.current, etc.
  // Replace playSound?.() with playSoundRef.current?.()
  // Replace onShutdown?.() with onShutdownRef.current?.()
  // Replace onBell?.() with onBellRef.current?.()
  // Replace onSoundSet?.() with onSoundSetRef.current?.()
  // Replace setTheme(x) with setTheme(x) — setTheme is already stable (from context)
  //
  // IMPORTANT: The inner setTimeout (600ms spinner delay) also has closures that
  // read theme, soundEnabled, isMobile, etc. These MUST also be converted to ref
  // reads (themeRef.current, soundEnabledRef.current, isMobileRef.current).
  // The nested closure is easy to miss — grep for all direct state variable reads
  // inside handleCommand after conversion.
}, [cancelMotdAnimation, displayMotd, displayHelp, setTheme]);
```

**`executeWithPreview`** — reads `handleCommand` (now memoized). Wrap with `[handleCommand]`:
```tsx
const executeWithPreview = useCallback((command: string) => {
  setShowSuggestions(false);
  setSelectedSuggestionIndex(0);
  setInputCommand(command);
  setAutoSuggestion(null);
  inputRef.current?.focus();
  if (pendingExecuteRef.current) {
    clearTimeout(pendingExecuteRef.current);
    pendingExecuteRef.current = null;
  }
  pendingExecuteRef.current = setTimeout(() => {
    pendingExecuteRef.current = null;
    handleCommand(command);
  }, 300);
}, [handleCommand]);
```

**`selectSuggestion`** — reads `suggestionMode`, `soundEnabled` via refs. Wrap with `[executeWithPreview]`:
```tsx
const selectSuggestion = useCallback((index: number) => {
  if (suggestionModeRef.current === 'commands') {
    const selectedCommand = suggestions[index].command;
    if (selectedCommand === 'theme') {
      setSuggestionMode('themes');
      setSelectedSuggestionIndex(0);
      return;
    }
    if (selectedCommand === 'sound') {
      executeWithPreview(soundEnabledRef.current ? 'sound off' : 'sound on');
      return;
    }
    executeWithPreview(selectedCommand);
  } else {
    const selectedTheme = VALID_THEMES[index];
    setSuggestionMode('commands');
    setSelectedSuggestionIndex(0);
    executeWithPreview(`theme ${selectedTheme}`);
  }
}, [executeWithPreview]);
```

**`completeAutoSuggestion`** — wrap with `[]`:
```tsx
const completeAutoSuggestion = useCallback(() => {
  if (autoSuggestionRef.current) {
    setInputCommand(autoSuggestionRef.current);
    setAutoSuggestion(null);
    inputRef.current?.focus();
  }
}, []);
```

**`backToCommands`** — wrap with `[]`:
```tsx
const backToCommands = useCallback(() => {
  setSuggestionMode('commands');
  setSelectedSuggestionIndex(suggestions.findIndex(s => s.command === 'theme'));
}, []);
```

**`actionTab`** — wrap with `[cancelMotdAnimation, selectSuggestion, completeAutoSuggestion]`:
```tsx
const actionTab = useCallback(() => {
  cancelMotdAnimation();
  if (showSuggestionsRef.current) {
    selectSuggestion(selectedSuggestionIndexRef.current);
  } else if (autoSuggestionRef.current) {
    completeAutoSuggestion();
  } else {
    setSuggestionMode('commands');
    setShowSuggestions(true);
    setSelectedSuggestionIndex(0);
    suppressHoverRef.current = true;
    setTimeout(() => { suppressHoverRef.current = false; }, 100);
  }
}, [cancelMotdAnimation, selectSuggestion, completeAutoSuggestion]);
```

**`actionUp`** — wrap with `[]` (reads all from refs):
```tsx
const actionUp = useCallback(() => {
  if (showSuggestionsRef.current) {
    const len = suggestionModeRef.current === 'themes' ? VALID_THEMES.length : suggestions.length;
    setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : len - 1);
  } else if (commandHistoryRef.current.length > 0) {
    const history = commandHistoryRef.current;
    const newIndex = historyIndexRef.current + 1 >= history.length ? 0 : historyIndexRef.current + 1;
    setHistoryIndex(newIndex);
    setInputCommand(history[history.length - 1 - newIndex]);
    setAutoSuggestion(null);
  }
}, []);
```

**`actionDown`** — wrap with `[]` (reads all from refs):
```tsx
const actionDown = useCallback(() => {
  if (showSuggestionsRef.current) {
    const len = suggestionModeRef.current === 'themes' ? VALID_THEMES.length : suggestions.length;
    setSelectedSuggestionIndex(prev => prev < len - 1 ? prev + 1 : 0);
  } else if (commandHistoryRef.current.length > 0) {
    const history = commandHistoryRef.current;
    const newIndex = historyIndexRef.current <= 0 ? history.length - 1 : historyIndexRef.current - 1;
    setHistoryIndex(newIndex);
    setInputCommand(history[history.length - 1 - newIndex]);
    setAutoSuggestion(null);
  }
}, []);
```

**`actionEnter`** — wrap with `[selectSuggestion, handleCommand]`:
```tsx
const actionEnter = useCallback(() => {
  if (showSuggestionsRef.current) {
    selectSuggestion(selectedSuggestionIndexRef.current);
  } else {
    handleCommand(inputCommandRef.current);
  }
}, [selectSuggestion, handleCommand]);
```

**`handleKeyDown`** — wrap with `[actionTab, actionUp, actionDown, actionEnter, completeAutoSuggestion, backToCommands, handleCommand]`:
```tsx
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  if (isInputBlockedRef.current) { e.preventDefault(); return; }
  switch (e.key) {
    case 'Tab': e.preventDefault(); actionTab(); return;
    case 'ArrowUp': e.preventDefault(); actionUp(); return;
    case 'ArrowDown': e.preventDefault(); actionDown(); return;
    case 'Enter': actionEnter(); return;
    case 'ArrowRight':
      if (autoSuggestionRef.current) { e.preventDefault(); completeAutoSuggestion(); }
      return;
    case 'Escape':
      if (showSuggestionsRef.current && suggestionModeRef.current === 'themes') {
        backToCommands();
      } else if (showSuggestionsRef.current) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(0);
      } else {
        setInputCommand('');
        setAutoSuggestion(null);
      }
      return;
  }
  if (e.ctrlKey && e.key === 'l') {
    e.preventDefault();
    handleCommand('clear');
  }
}, [actionTab, actionUp, actionDown, actionEnter, completeAutoSuggestion, backToCommands, handleCommand]);
```

**Memoize `onMouseEnter` for Suggestions:**
```tsx
const handleSuggestionMouseEnter = useCallback((i: number) => {
  if (!suppressHoverRef.current) setSelectedSuggestionIndex(i);
}, []);
```

Then in JSX, replace inline `onMouseEnter` with `handleSuggestionMouseEnter`.

- [ ] **Step 4: Update useImperativeHandle deps**

```tsx
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
```

- [ ] **Step 5: Add output cap (MAX_OUTPUT constant)**

Add a constant near the top of the file:

```tsx
const MAX_OUTPUT = 500;
```

Create a helper to cap output:

```tsx
const appendOutput = (prev: TerminalLine[], ...lines: TerminalLine[]): TerminalLine[] =>
  [...prev, ...lines].slice(-MAX_OUTPUT);
```

Replace all `setTerminalOutput(prev => [...prev, ...newLines])` calls with `setTerminalOutput(prev => appendOutput(prev, ...newLines))`. Key locations:

- `handleCommand` help branch: `setTerminalOutput(prev => appendOutput(prev, ...displayHelp()))`
- `handleCommand` spinner+input append: `setTerminalOutput(prev => appendOutput(prev, inputLine, spinnerLine))`
- Progressive reveal append (Task 9 will handle this)
- Any other `[...prev, ...]` patterns

Do NOT apply cap on `clear` (which sets output directly) or on `displayMotd()` (which replaces all output).

- [ ] **Step 6: Run tests**

Run: `npx vitest run`
Expected: All tests pass. Commands still execute, output renders correctly.

- [ ] **Step 7: Commit**

```bash
git add src/components/Terminal/Terminal.tsx
git commit -m "perf: memoize all Terminal handlers with useCallback + latest-ref pattern, sanitize HTML at creation time, add output cap"
```

---

## Task 9: Batched Progressive Reveal

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx`

- [ ] **Step 1: Replace effect-per-tick reveal with batched RAF loop**

Remove the `revealedCount` state variable. Add a ref to hold `revealingLines` for the RAF closure:

```tsx
// Remove: const [revealedCount, setRevealedCount] = useState(0);
const revealingLinesRef = useRef<TerminalLine[] | null>(null);

// Sync ref whenever state changes
revealingLinesRef.current = revealingLines;
```

Replace the progressive reveal effect (lines 692-716) with:

```tsx
// Progressive reveal animation — batched RAF loop using absolute elapsed time.
// At 60fps (~16ms/frame), each tick advances floor(16/10) = 1 line.
// At 30fps (~33ms/frame), each tick advances 3 lines — organic batching.
useEffect(() => {
  if (!revealingLines || revealingLines.length === 0) return;

  let flushedIndex = 0;
  let startTime = 0;
  const lines = revealingLines; // Capture for closure safety

  const step = (timestamp: number) => {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const targetIndex = Math.min(Math.floor(elapsed / 10), lines.length);

    if (targetIndex > flushedIndex) {
      const batch = lines.slice(flushedIndex, targetIndex);
      flushedIndex = targetIndex;
      setTerminalOutput(prev => appendOutput(prev, ...batch));
    }

    if (flushedIndex >= lines.length) {
      setRevealingLines(null);
      return;
    }

    revealRafRef.current = requestAnimationFrame(step);
  };

  revealRafRef.current = requestAnimationFrame(step);
  return () => cancelAnimationFrame(revealRafRef.current);
}, [revealingLines]);
```

This approach uses absolute elapsed time: `targetIndex = floor(elapsed / 10)` determines how many lines should be visible by now. Each RAF tick flushes any lines between the last flushed index and the target. At 60fps, that's typically 1 line per frame. At 30fps (older devices), it's 2-3 lines per frame — the animation maintains the same total duration regardless of frame rate.

Also update `handleCommand`: remove `setRevealedCount(0)` from the progressive reveal branch (it no longer exists as state).

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All tests pass. The test setup uses `prefers-reduced-motion: true` which bypasses progressive reveal, so existing tests are unaffected.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`
Test by running multi-line commands (`man dmytro`, `skills`, `history`). Verify:
- Lines still stream in smoothly
- No visual stuttering or jumps
- Input is blocked during reveal
- Output appears correctly

- [ ] **Step 4: Commit**

```bash
git add src/components/Terminal/Terminal.tsx
git commit -m "perf: batch progressive reveal to reduce state updates from O(n) to O(n/3)"
```

---

## Task 10: Output Cap Test + Final Verification

- [ ] **Step 1: Add test for output cap**

In `src/components/Terminal/__tests__/Terminal.test.tsx`, add a test that verifies the `appendOutput` helper caps at MAX_OUTPUT. Since `appendOutput` is a module-scope function in Terminal.tsx, test it indirectly through the component or export it for direct testing. The simplest approach is to export it:

In Terminal.tsx, change `const appendOutput` to `export const appendOutput`:
```tsx
export const appendOutput = (prev: TerminalLine[], ...lines: TerminalLine[]): TerminalLine[] =>
  [...prev, ...lines].slice(-MAX_OUTPUT);
```

Then add a unit test:

```tsx
import { appendOutput } from '../Terminal';
import { TerminalLine } from '../types';

describe('appendOutput', () => {
  const makeLine = (content: string): TerminalLine => ({
    content,
    type: 'output',
  });

  it('caps output at 500 lines, preserving most recent', () => {
    const existing = Array.from({ length: 498 }, (_, i) => makeLine(`line-${i}`));
    const newLines = [makeLine('new-1'), makeLine('new-2'), makeLine('new-3')];
    const result = appendOutput(existing, ...newLines);
    expect(result).toHaveLength(500);
    expect(result[result.length - 1].content).toBe('new-3');
    expect(result[result.length - 2].content).toBe('new-2');
    expect(result[result.length - 3].content).toBe('new-1');
    // Oldest line dropped
    expect(result[0].content).toBe('line-1');
  });

  it('does not cap when under limit', () => {
    const existing = [makeLine('a'), makeLine('b')];
    const result = appendOutput(existing, makeLine('c'));
    expect(result).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run the new test**

Run: `npx vitest run src/components/Terminal/__tests__/Terminal.test.tsx`
Expected: All tests pass, including the new output cap tests.

- [ ] **Step 3: Commit**

```bash
git add src/components/Terminal/__tests__/Terminal.test.tsx src/components/Terminal/Terminal.tsx
git commit -m "test: add unit tests for output cap helper"
```

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Run linter**

Run: `npx eslint src/`
Expected: Only the 4 intentional warnings (documented in MEMORY.md). No new warnings or errors.

- [ ] **Step 4: Build for production**

Run: `npm run build`
Expected: Build succeeds. Bundle size should be similar or slightly larger (memo + useCallback add small overhead, but no new dependencies).

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev`
Test all critical paths:
1. Boot splash animation plays, skip on keypress works
2. MOTD typing animation plays on boot complete
3. All 11 commands execute correctly
4. Theme switching works with phosphor transition
5. Sound toggle works from StatusBar and command
6. Suggestions panel opens/closes, mouse hover and keyboard navigation
7. Command history (up/down arrows)
8. Auto-suggestion and Tab completion
9. Mobile toolbar actions (if testing on mobile viewport)
10. Matrix rain triggers after 30s idle (desktop only)
11. Exit/shutdown sequence
12. Clear command resets to MOTD
13. Clock ticks in StatusBar
14. Uptime ticks in Sidebar

- [ ] **Step 6: Commit any remaining fixes**

If any issues found during verification, fix and commit.
