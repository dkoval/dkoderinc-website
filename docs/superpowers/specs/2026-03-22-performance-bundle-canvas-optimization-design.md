# Performance Optimization — Bundle, Asset & Canvas (Approach 2)

## Goal

Reduce initial bundle size, eliminate unused assets, optimize font loading, and make the MatrixRain canvas animation efficient on 5-year-old mid-range devices (iPhone 8, Galaxy A50, 2019 Chromebooks).

## Architecture

Seven independent optimizations targeting three categories: asset cleanup, font/bundle loading, and canvas rendering. All changes are backward-compatible and require no API changes.

## Sections

### 1. Delete Unused Asset

**File:** `public/images/background.webp` (960 KB)

Zero references in source code. Delete it. Saves ~960 KB from the deployed build.

### 2. Font Loading Optimization

**Files:** `src/index.css`, `index.html`

Add `font-display: swap` to both `@font-face` declarations (Monaspace Neon, Monaspace Argon) so text renders immediately with a fallback font, then swaps when the custom font loads.

Add `<link rel="preload">` tags in `index.html` for both woff2 files to start downloading fonts early, before the CSS parser discovers them.

### 3. Lazy-Load DOMPurify

**File:** `src/components/Terminal/Terminal.tsx`

DOMPurify (~30 KB) is imported synchronously but only used by 2 commands (`contact`, `man dmytro`) that produce HTML output. Convert to a lazy singleton:

- Replace `import DOMPurify from 'dompurify'` with a module-scope `let` + async loader
- `sanitizeHtml` becomes async — load DOMPurify on first call, cache the instance
- Callers already handle async output (spinner delay), so the lazy load is invisible to users
- Fallback: if DOMPurify fails to load, strip HTML tags and render as plain text

### 4. MatrixRain DPI Scaling

**File:** `src/components/Terminal/MatrixRain.tsx`

Canvas currently uses CSS pixel dimensions, causing blurry text on high-DPI displays:

- On resize, multiply `canvas.width`/`canvas.height` by `devicePixelRatio`
- Scale the 2D context by `devicePixelRatio` so drawing coordinates remain CSS-pixel based
- Debounce the ResizeObserver callback by 150ms to avoid thrashing during window resize

### 5. MatrixRain Random Char Pool

**File:** `src/components/Terminal/MatrixRain.tsx`

Currently `randomChar()` calls `Math.random()` per column per frame (~40-80 calls/frame at 60fps). Replace with:

- Pre-generate a `Uint16Array` buffer of 1024 indices into `CHAR_POOL`
- Cycle through the buffer with a simple counter, regenerate when exhausted
- Visually indistinguishable (random chars already change every frame)

### 6. CSS `will-change` for Animated Elements

**Files:** `src/components/Terminal/MatrixRain.tsx`, `src/index.css`

Add `will-change: opacity` to the MatrixRain canvas (animated via opacity transition). Add `will-change: transform` to the CRT scanline `body::before` pseudo-element to promote it to its own compositor layer (it's a fixed overlay on every frame).

### 7. Throttle mousemove + touchstart for click-outside

**File:** `src/hooks/useIdleTimer.ts`, `src/components/Terminal/Terminal.tsx`

**Idle timer:** `mousemove` fires on every pixel movement. Add a 200ms throttle using a timestamp check (`Date.now()` comparison in the handler). Other events (keydown, click, touchstart) remain unthrottled.

**Click-outside handler:** Currently only listens to `mousedown`. Add `touchstart` so tap-away dismisses the suggestions panel on mobile.

## Out of Scope

- Image optimization (headshot.webp — already optimized)
- Code splitting beyond DOMPurify (bundle is already 85 KB gzip)
- Service worker / caching strategies
- Lighthouse audit remediation beyond these items

## Testing Strategy

- Existing 83 tests must continue passing
- MatrixRain has no unit tests (canvas-based) — verify visually
- DOMPurify lazy loading: verify `contact` and `man dmytro` still render HTML links
- Font loading: verify no FOIT (flash of invisible text) on slow connection
