# Performance Bundle, Asset & Canvas Optimization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce initial bundle size, optimize font loading, and make MatrixRain canvas performant on older devices.

**Architecture:** Seven independent optimizations across asset cleanup, font/bundle loading, and canvas rendering. No API changes.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, CSS

---

### Task 1: Delete Unused background.webp

**Files:**
- Delete: `public/images/background.webp`

- [ ] **Step 1: Verify no references exist**

Run: `grep -r "background.webp" src/ index.html`
Expected: No matches

- [ ] **Step 2: Delete the file**

```bash
rm public/images/background.webp
```

- [ ] **Step 3: Commit**

```bash
git add -A public/images/background.webp
git commit -m "perf: delete unused background.webp (960 KB)"
```

---

### Task 2: Font Loading Optimization

**Files:**
- Modify: `src/index.css:98-110` (font-face declarations)
- Modify: `index.html:4-6` (add preload links)

- [ ] **Step 1: Add font-display: swap to both @font-face declarations**

In `src/index.css`, add `font-display: swap;` to both `@font-face` blocks:

```css
@font-face {
  font-family: 'Monaspace Neon';
  src: url('/fonts/MonaspaceNeon-Regular.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Monaspace Argon';
  src: url('/fonts/MonaspaceArgon-Regular.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
```

- [ ] **Step 2: Add preload links in index.html**

Add after the favicon link in `<head>`:

```html
<link rel="preload" href="/fonts/MonaspaceNeon-Regular.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/fonts/MonaspaceArgon-Regular.woff2" as="font" type="font/woff2" crossorigin />
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Clean build, no errors

- [ ] **Step 4: Commit**

```bash
git add src/index.css index.html
git commit -m "perf: add font-display swap and preload for faster text rendering"
```

---

### Task 3: Lazy-Load DOMPurify

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx:2,65-66` (sanitizeHtml)

- [ ] **Step 1: Replace synchronous DOMPurify import with lazy singleton**

Remove the top-level import:
```typescript
// REMOVE: import DOMPurify from 'dompurify';
```

Replace the `sanitizeHtml` helper with an async lazy-loading version:

```typescript
let purifyInstance: typeof import('dompurify').default | null = null;

const sanitizeHtml = async (content: string): Promise<string> => {
  if (!purifyInstance) {
    try {
      const mod = await import('dompurify');
      purifyInstance = mod.default;
    } catch {
      // Fallback: strip HTML tags
      return content.replace(/<[^>]*>/g, '');
    }
  }
  return purifyInstance.sanitize(content, PURIFY_CONFIG);
};
```

- [ ] **Step 2: Update callers to await sanitizeHtml**

Both call sites are inside async contexts (after spinner delay). Update the `displayMotd` helper and the command execution output handler to `await sanitizeHtml(...)`.

In `displayMotd`:
```typescript
const sanitized = await sanitizeHtml(`<span style="color: var(--terminal-gray)">${hint}</span>`);
```

In the command handler (inside the `setTimeout` callback after spinner):
```typescript
content: output.isHtml ? await sanitizeHtml(line) : line,
```

The setTimeout callback needs to become async, or the sanitization needs to happen before building the output lines.

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: All 83 tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/Terminal/Terminal.tsx
git commit -m "perf: lazy-load DOMPurify via dynamic import (~30 KB off initial bundle)"
```

---

### Task 4: MatrixRain DPI Scaling + ResizeObserver Debouncing

**Files:**
- Modify: `src/components/Terminal/MatrixRain.tsx:57-70` (resize handler)

- [ ] **Step 1: Add DPI scaling to resize handler**

Replace the ResizeObserver callback:

```typescript
let resizeTimer: ReturnType<typeof setTimeout> | null = null;

const resizeObserver = new ResizeObserver(([entry]) => {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const { width, height } = entry.contentRect;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    columnsRef.current = initColumns(width);
    ctx.font = FONT;
  }, 150);
});
```

- [ ] **Step 2: Update draw loop to use CSS dimensions**

The draw loop references `canvas.width` and `canvas.height` for bounds checking. These now represent device pixels. Use `canvas.width / dpr` and `canvas.height / dpr` instead, or store the CSS dimensions in a ref.

Store CSS dimensions:

```typescript
const cssDims = useRef({ width: 0, height: 0 });
```

In resize handler:
```typescript
cssDims.current = { width, height };
```

In draw loop, replace `canvas.width`/`canvas.height` with `cssDims.current.width`/`cssDims.current.height`.

- [ ] **Step 3: Clean up resize timer in effect cleanup**

```typescript
return () => {
  cancelAnimationFrame(rafRef.current);
  resizeObserver.disconnect();
  if (resizeTimer) clearTimeout(resizeTimer);
};
```

- [ ] **Step 4: Verify visually**

Run: `npm run dev`
Check: MatrixRain should be crisp on high-DPI displays, no blurriness

- [ ] **Step 5: Run tests**

Run: `npx vitest run`
Expected: All tests pass (MatrixRain has no unit tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/Terminal/MatrixRain.tsx
git commit -m "perf: add DPI scaling and debounced resize to MatrixRain canvas"
```

---

### Task 5: MatrixRain Random Char Pool Pre-generation

**Files:**
- Modify: `src/components/Terminal/MatrixRain.tsx:18` (randomChar function)

- [ ] **Step 1: Replace randomChar with pre-generated buffer**

Replace the `randomChar` function with a pre-generated buffer approach:

```typescript
const POOL_SIZE = 1024;
const RANDOM_POOL = new Uint16Array(POOL_SIZE);
let poolIndex = POOL_SIZE; // Force initial fill

const fillPool = () => {
  for (let i = 0; i < POOL_SIZE; i++) {
    RANDOM_POOL[i] = Math.floor(Math.random() * CHAR_POOL.length);
  }
  poolIndex = 0;
};

const randomChar = (): string => {
  if (poolIndex >= POOL_SIZE) fillPool();
  return CHAR_POOL[RANDOM_POOL[poolIndex++]];
};
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/components/Terminal/MatrixRain.tsx
git commit -m "perf: pre-generate random char pool to reduce per-frame Math.random calls"
```

---

### Task 6: CSS will-change for Animated Elements

**Files:**
- Modify: `src/components/Terminal/MatrixRain.tsx:153` (canvas style)
- Modify: `src/index.css:73-86` (scanline pseudo-element)

- [ ] **Step 1: Add will-change to MatrixRain canvas**

In the canvas element's style prop, add `willChange: 'opacity'`:

```tsx
style={{
  opacity: visible ? 1 : 0,
  transition: 'opacity 400ms ease-in-out',
  willChange: 'opacity',
  zIndex: 10,
}}
```

- [ ] **Step 2: Add will-change to scanline overlay**

In `src/index.css`, add `will-change: transform;` to the `body::before` rule:

```css
body::before {
  content: '';
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: repeating-linear-gradient(...);
  pointer-events: none;
  z-index: 9999;
  will-change: transform;
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/Terminal/MatrixRain.tsx src/index.css
git commit -m "perf: add will-change hints for GPU-accelerated compositing"
```

---

### Task 7: Throttle mousemove + Add touchstart to click-outside

**Files:**
- Modify: `src/hooks/useIdleTimer.ts:16-20,29-30` (resetTimer + event binding)
- Modify: `src/components/Terminal/Terminal.tsx:628-643` (click-outside handler)

- [ ] **Step 1: Add mousemove throttle to idle timer**

Replace the `resetTimer` callback with a throttled version:

```typescript
const lastMoveRef = useRef(0);

const resetTimer = useCallback(() => {
  setIsIdle(false);
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = setTimeout(() => setIsIdle(true), IDLE_TIMEOUT);
}, []);

const throttledResetTimer = useCallback((e: Event) => {
  if (e.type === 'mousemove') {
    const now = Date.now();
    if (now - lastMoveRef.current < 200) return;
    lastMoveRef.current = now;
  }
  resetTimer();
}, [resetTimer]);
```

Update event listeners to use `throttledResetTimer`:
```typescript
events.forEach(evt => el.addEventListener(evt, throttledResetTimer, { passive: true }));
```

And cleanup:
```typescript
events.forEach(evt => el.removeEventListener(evt, throttledResetTimer));
```

- [ ] **Step 2: Add touchstart to click-outside handler in Terminal**

In Terminal.tsx, change:
```typescript
document.addEventListener('mousedown', handleClickOutside);
return () => document.removeEventListener('mousedown', handleClickOutside);
```

To:
```typescript
document.addEventListener('mousedown', handleClickOutside);
document.addEventListener('touchstart', handleClickOutside, { passive: true });
return () => {
  document.removeEventListener('mousedown', handleClickOutside);
  document.removeEventListener('touchstart', handleClickOutside);
};
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useIdleTimer.ts src/components/Terminal/Terminal.tsx
git commit -m "perf: throttle mousemove in idle timer, add touchstart to click-outside"
```
