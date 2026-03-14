# Matrix Rain Idle Effect — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Matrix-style rain canvas effect that activates after 30s of terminal idle, using theme-aware colors and mixed katakana + code symbol characters.

**Architecture:** New `useIdleTimer` hook tracks inactivity in Terminal. New `MatrixRain` canvas component renders inside terminal output area. Terminal.tsx orchestrates show/hide transitions between output and rain.

**Tech Stack:** React 18, TypeScript, HTML Canvas API, requestAnimationFrame, ResizeObserver, CSS transitions

---

### Task 1: Create useIdleTimer hook

**Files:**
- Create: `src/hooks/useIdleTimer.ts`

**Step 1: Create the hook**

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';

const IDLE_TIMEOUT = 30_000; // 30 seconds

type UseIdleTimerOptions = {
  /** Element to watch for activity. If null, idle detection is disabled. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** When true, pause the idle timer (e.g. during output reveal). */
  paused?: boolean;
};

const useIdleTimer = ({ containerRef, paused = false }: UseIdleTimerOptions): boolean => {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    setIsIdle(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsIdle(true), IDLE_TIMEOUT);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || paused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const events = ['keydown', 'click', 'touchstart', 'mousemove'] as const;
    events.forEach(evt => el.addEventListener(evt, resetTimer));

    // Start initial timer
    resetTimer();

    return () => {
      events.forEach(evt => el.removeEventListener(evt, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [containerRef, paused, resetTimer]);

  return isIdle;
};

export default useIdleTimer;
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/hooks/useIdleTimer.ts
git commit -m "feat: add useIdleTimer hook for 30s idle detection"
```

---

### Task 2: Create MatrixRain canvas component

**Files:**
- Create: `src/components/Terminal/MatrixRain.tsx`

**Step 1: Create the component**

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../ThemeContext';

// Half-width katakana (U+FF66–FF9D) + code symbols
const KATAKANA = Array.from({ length: 56 }, (_, i) => String.fromCharCode(0xFF66 + i));
const CODE_SYMBOLS = '{}[]<>=/;0123456789ABCDEF'.split('');
const CHAR_POOL = [...KATAKANA, ...CODE_SYMBOLS];

const FONT_SIZE = 14;
const FADE_ALPHA = 0.05;

type Column = {
  y: number;
  speed: number;
  delay: number; // frames to wait before starting
};

const randomChar = () => CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)];

type MatrixRainProps = {
  /** Controls CSS opacity transition for fade in/out */
  visible: boolean;
  /** Called when the fade-out transition ends (so parent can unmount) */
  onFadeOutComplete: () => void;
};

const MatrixRain: React.FC<MatrixRainProps> = ({ visible, onFadeOutComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const columnsRef = useRef<Column[]>([]);
  const rafRef = useRef<number>(0);
  const { theme } = useTheme();

  // Read theme colors from CSS custom properties
  const getColors = useCallback(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      primary: style.getPropertyValue('--terminal-primary').trim(),
      primaryDim: style.getPropertyValue('--terminal-primary-dim').trim(),
      bg: style.getPropertyValue('--terminal-bg').trim(),
    };
  }, []);

  // Parse hex color to rgba string
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const initColumns = useCallback((width: number): Column[] => {
    const count = Math.floor(width / FONT_SIZE);
    return Array.from({ length: count }, () => ({
      y: Math.random() * -50, // stagger start positions above viewport
      speed: 0.3 + Math.random() * 0.7, // variable fall speed
      delay: Math.floor(Math.random() * 40), // stagger initial appearance
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ResizeObserver to keep canvas sized to container
    const resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      canvas.width = width;
      canvas.height = height;
      columnsRef.current = initColumns(width);
    });
    resizeObserver.observe(canvas.parentElement!);

    let colors = getColors();
    // Re-read colors periodically to handle theme changes
    let frameCount = 0;

    const draw = () => {
      // Re-read colors every 60 frames (~1s) to pick up theme changes
      if (frameCount++ % 60 === 0) {
        colors = getColors();
      }

      const { width, height } = canvas;
      if (width === 0 || height === 0) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      // Fade trail: draw semi-transparent bg over previous frame
      ctx.fillStyle = hexToRgba(colors.bg, FADE_ALPHA);
      ctx.fillRect(0, 0, width, height);

      ctx.font = `${FONT_SIZE}px monospace`;

      const columns = columnsRef.current;
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];

        // Handle initial delay
        if (col.delay > 0) {
          col.delay--;
          continue;
        }

        const x = i * FONT_SIZE;
        const yPx = col.y * FONT_SIZE;

        // Lead character: bright primary color
        ctx.fillStyle = colors.primary;
        ctx.fillText(randomChar(), x, yPx);

        // Trail character (one step behind): dimmer
        ctx.fillStyle = colors.primaryDim;
        if (yPx - FONT_SIZE > 0) {
          ctx.fillText(randomChar(), x, yPx - FONT_SIZE);
        }

        col.y += col.speed;

        // Reset column when it passes the bottom (with random delay)
        if (yPx > height) {
          col.y = 0;
          col.speed = 0.3 + Math.random() * 0.7;
          col.delay = Math.floor(Math.random() * 30);
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
    };
  }, [getColors, initColumns]);

  // Re-init columns on theme change (colors are picked up in draw loop)
  useEffect(() => {
    // Theme changed — colors will update via getColors() in draw loop
  }, [theme]);

  const handleTransitionEnd = () => {
    if (!visible) {
      onFadeOutComplete();
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onTransitionEnd={handleTransitionEnd}
      className="absolute inset-0 w-full h-full"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 400ms ease-in-out',
        zIndex: 10,
      }}
    />
  );
};

export default MatrixRain;
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/Terminal/MatrixRain.tsx
git commit -m "feat: add MatrixRain canvas component with theme-aware rendering"
```

---

### Task 3: Integrate into Terminal.tsx

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx`

**Step 1: Add imports and idle state (top of file, after existing imports)**

At line 9, after the `useIsMobile` import, add:

```typescript
import useIdleTimer from '../../hooks/useIdleTimer';
import MatrixRain from './MatrixRain';
```

**Step 2: Add idle timer state inside the component**

After `const isInputBlocked = revealingLines !== null;` (line 58), add:

```typescript
// Matrix rain idle effect
const reducedMotion = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sectionRef = useRef<HTMLDivElement>(null);
const isIdle = useIdleTimer({
  containerRef: sectionRef,
  paused: isInputBlocked || isMobile || reducedMotion,
});
const [showRain, setShowRain] = useState(false);
const [rainVisible, setRainVisible] = useState(false);

// When idle state changes, manage rain visibility
useEffect(() => {
  if (isIdle && !isMobile && !reducedMotion) {
    setShowRain(true);
    // Trigger fade-in on next frame so CSS transition fires
    requestAnimationFrame(() => setRainVisible(true));
  } else {
    setRainVisible(false);
    // showRain is cleared by onFadeOutComplete callback
  }
}, [isIdle, isMobile, reducedMotion]);

const handleRainFadeOutComplete = () => {
  setShowRain(false);
};
```

**Step 3: Add ref to section element and make output area position-relative**

In the JSX return (line 541), add the `ref` to the section:

Change:
```tsx
<section className="w-full flex flex-col flex-1 overflow-hidden p-4 terminal-glow crt-breathe" style={{ background: 'var(--terminal-bg)' }}>
```
To:
```tsx
<section ref={sectionRef} className="w-full flex flex-col flex-1 overflow-hidden p-4 terminal-glow crt-breathe" style={{ background: 'var(--terminal-bg)' }}>
```

**Step 4: Wrap terminal output area with position-relative container and add MatrixRain**

Change the terminal output div (line 542-605) to wrap it in a relative container:

Change:
```tsx
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto overflow-x-hidden mb-4 text-sm terminal-scroll"
        style={{ background: 'var(--terminal-bg)' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
```
To:
```tsx
      <div className="flex-1 relative overflow-hidden mb-4">
        {showRain && (
          <MatrixRain
            visible={rainVisible}
            onFadeOutComplete={handleRainFadeOutComplete}
          />
        )}
        <div
          ref={terminalRef}
          className="h-full overflow-y-auto overflow-x-hidden text-sm terminal-scroll"
          style={{
            background: 'var(--terminal-bg)',
            opacity: rainVisible ? 0 : 1,
            transition: 'opacity 400ms ease-in-out',
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
```

And after the closing `</div>` for the terminal output (after the scroll indicator div, line 605), add a closing `</div>` for the wrapper:

Change:
```tsx
      </div>
      <div className="relative">
```
To:
```tsx
        </div>
      </div>
      <div className="relative">
```

**Step 5: Verify it compiles and renders**

Run: `npx tsc --noEmit`
Expected: No errors

Run: `npm run dev`
Expected: Site loads normally. After 30s of no interaction, matrix rain fades in. Any keypress/click fades it out and restores terminal output.

**Step 6: Commit**

```bash
git add src/components/Terminal/Terminal.tsx
git commit -m "feat: integrate matrix rain idle effect into terminal"
```

---

### Task 4: Visual polish and edge cases

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx`
- Modify: `src/components/Terminal/MatrixRain.tsx`

**Step 1: Handle shutdown during rain**

In Terminal.tsx, in the `exit` command handler (around line 137), before calling `onShutdown?.()`, add:

```typescript
setShowRain(false);
setRainVisible(false);
```

**Step 2: Clear canvas fully on initial mount (prevent stale first frame)**

In MatrixRain.tsx, before the draw loop starts, add an initial full clear:

After `resizeObserver.observe(canvas.parentElement!);` add:

```typescript
// Clear canvas fully on mount
ctx.fillStyle = getColors().bg;
ctx.fillRect(0, 0, canvas.width, canvas.height);
```

**Step 3: Verify visually**

Run: `npm run dev`
Expected:
- Rain fades in smoothly after 30s idle
- Rain fades out on interaction, terminal output returns
- Theme switch during rain updates rain colors within ~1s
- Browser resize recalculates columns
- Shutdown during rain: rain disappears, shutdown sequence plays
- Mobile: no rain (disabled)

**Step 4: Commit**

```bash
git add src/components/Terminal/Terminal.tsx src/components/Terminal/MatrixRain.tsx
git commit -m "fix: handle shutdown during rain, clear canvas on mount"
```

---

### Task 5: Build verification

**Step 1: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Commit any remaining changes**

If no changes needed, skip.
