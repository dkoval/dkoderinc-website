# Terminal Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add switchable phosphor themes (green/amber/white/gruvbox), refine CRT effects, redesign command outputs, and improve mobile experience.

**Architecture:** CSS custom properties define all theme colors, swapped via `data-theme` attribute on `<html>`. A React context (`ThemeContext`) manages theme state and persists to localStorage. All hardcoded colors across every component are migrated to CSS variables. New `theme` command allows runtime switching with a phosphor transition animation.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 3, CSS custom properties, vanilla JS touch events.

**Note:** This project has no test infrastructure. Each task includes manual verification steps instead of automated tests.

---

### Task 1: Theme CSS Variables

Define all four theme palettes as CSS custom properties in `index.css`.

**Files:**
- Modify: `src/index.css:1-3` (add variables after tailwind imports)

**Step 1: Add theme variable definitions**

Insert after line 3 (`@import 'tailwindcss/utilities';`) in `src/index.css`:

```css
/* Theme: Green phosphor (P31) — default */
:root,
:root[data-theme="green"] {
  --terminal-primary: #00FF41;
  --terminal-primary-dim: #00CC33;
  --terminal-primary-dark: #005500;
  --terminal-bg: #0D0208;
  --terminal-surface: #111111;
  --terminal-border: #333333;
  --terminal-gray: #888888;
  --terminal-error: #FF3333;
  --terminal-glow: rgba(0, 255, 65, 0.4);
  --terminal-glow-soft: rgba(0, 255, 65, 0.15);
  --terminal-scanline: rgba(0, 255, 65, 0.03);
  --terminal-vignette: rgba(0, 10, 2, 0.5);
}

/* Theme: Amber phosphor (P3) */
:root[data-theme="amber"] {
  --terminal-primary: #FFB000;
  --terminal-primary-dim: #CC8C00;
  --terminal-primary-dark: #553A00;
  --terminal-bg: #0A0600;
  --terminal-surface: #111008;
  --terminal-border: #333333;
  --terminal-gray: #888888;
  --terminal-error: #FF6633;
  --terminal-glow: rgba(255, 176, 0, 0.4);
  --terminal-glow-soft: rgba(255, 176, 0, 0.15);
  --terminal-scanline: rgba(255, 176, 0, 0.03);
  --terminal-vignette: rgba(10, 6, 0, 0.5);
}

/* Theme: White phosphor */
:root[data-theme="white"] {
  --terminal-primary: #B0B0B0;
  --terminal-primary-dim: #888888;
  --terminal-primary-dark: #444444;
  --terminal-bg: #050505;
  --terminal-surface: #0E0E0E;
  --terminal-border: #333333;
  --terminal-gray: #606060;
  --terminal-error: #FF4444;
  --terminal-glow: rgba(176, 176, 176, 0.3);
  --terminal-glow-soft: rgba(176, 176, 176, 0.1);
  --terminal-scanline: rgba(176, 176, 176, 0.03);
  --terminal-vignette: rgba(5, 5, 5, 0.5);
}

/* Theme: Gruvbox (modern Easter egg) */
:root[data-theme="gruvbox"] {
  --terminal-primary: #EBDBB2;
  --terminal-primary-dim: #A89984;
  --terminal-primary-dark: #504945;
  --terminal-bg: #1D2021;
  --terminal-surface: #282828;
  --terminal-border: #333333;
  --terminal-gray: #928374;
  --terminal-error: #FB4934;
  --terminal-glow: rgba(235, 219, 178, 0.15);
  --terminal-glow-soft: rgba(235, 219, 178, 0.05);
  --terminal-scanline: rgba(0, 0, 0, 0.02);
  --terminal-vignette: rgba(0, 0, 0, 0.3);
  --terminal-accent-green: #B8BB26;
  --terminal-accent-yellow: #FABD2F;
  --terminal-accent-blue: #83A598;
  --terminal-accent-orange: #FE8019;
  --terminal-accent-purple: #D3869B;
}
```

**Step 2: Verify**

Run: `npm run dev`
Open browser. No visual changes should be visible — the `:root` (no data-theme) defaults to green, which matches current hardcoded values. Confirm no CSS errors in console.

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add CSS custom property theme definitions for green, amber, white, gruvbox"
```

---

### Task 2: Flash-Prevention Inline Script + Remove Unused Google Font

Add an inline script in `index.html` that sets `data-theme` from localStorage before first paint. Also remove the unused Google Fonts Inter CSS link.

**Files:**
- Modify: `index.html:8-12`

**Step 1: Update index.html**

Remove line 8 (unused Inter font). Add inline script before `<div id="root">`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/terminal-icon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Dmytro Koval - Experienced Backend Engineer</title>
    <script>
      (function() {
        var t = localStorage.getItem('dkoder-theme');
        if (t && ['green','amber','white','gruvbox'].includes(t)) {
          document.documentElement.setAttribute('data-theme', t);
        }
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 2: Verify**

Refresh page. No flash, no errors. Open DevTools → Elements → `<html>` should have no `data-theme` attribute (since localStorage is empty). Manually set `localStorage.setItem('dkoder-theme', 'amber')` in console, refresh — `<html>` should now have `data-theme="amber"` (no visual change yet since colors are still hardcoded). Clear localStorage after testing.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add theme flash-prevention script, remove unused Google Fonts import"
```

---

### Task 3: ThemeContext

Create a React context that manages theme state, syncs to localStorage and the `data-theme` DOM attribute.

**Files:**
- Create: `src/ThemeContext.tsx`
- Modify: `src/main.tsx` (wrap App in provider)

**Step 1: Create ThemeContext.tsx**

```tsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type ThemeName = 'green' | 'amber' | 'white' | 'gruvbox';

const VALID_THEMES: ThemeName[] = ['green', 'amber', 'white', 'gruvbox'];
const STORAGE_KEY = 'dkoder-theme';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'green',
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const getInitialTheme = (): ThemeName => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && VALID_THEMES.includes(stored as ThemeName)) {
    return stored as ThemeName;
  }
  return 'green';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(getInitialTheme);

  const setTheme = useCallback((newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

**Step 2: Wrap App in ThemeProvider**

Modify `src/main.tsx` — wrap `<App />` with `<ThemeProvider>`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './ThemeContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
```

**Step 3: Verify**

Run dev server. Open DevTools → Elements → `<html>` should have `data-theme="green"`. No visual changes yet. No errors in console.

**Step 4: Commit**

```bash
git add src/ThemeContext.tsx src/main.tsx
git commit -m "feat: add ThemeContext with localStorage persistence and DOM sync"
```

---

### Task 4: Migrate index.css to CSS Variables

Replace all hardcoded colors in `index.css` with CSS variable references. Add new CRT effects (flicker, global glow, prefers-reduced-motion).

**Files:**
- Modify: `src/index.css` (full file rewrite)

**Step 1: Rewrite index.css**

The full file should become (theme variable definitions from Task 1 at top, then):

```css
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

/* [Theme variable definitions from Task 1 go here] */

/* CRT scanline overlay */
body::before {
  content: '';
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    var(--terminal-scanline) 2px,
    var(--terminal-scanline) 3px
  );
  pointer-events: none;
  z-index: 9999;
}

/* CRT vignette */
body::after {
  content: '';
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(ellipse at center, transparent 55%, var(--terminal-vignette) 100%);
  pointer-events: none;
  z-index: 9998;
}

@font-face {
  font-family: 'Monaspace Neon';
  src: url('/fonts/MonaspaceNeon-Regular.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
}

@font-face {
  font-family: 'Monaspace Argon';
  src: url('/fonts/MonaspaceArgon-Regular.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
}

body {
  font-family: 'Monaspace Neon', monospace;
}

.font-mono {
  font-family: 'Monaspace Argon', monospace;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.animate-blink {
  animation: blink 1s step-end infinite;
}

/* Terminal scrollbar */
.terminal-scroll {
  scrollbar-width: thin;
  scrollbar-color: var(--terminal-border) transparent;
}

.terminal-scroll::-webkit-scrollbar {
  width: 5px;
}

.terminal-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.terminal-scroll::-webkit-scrollbar-thumb {
  background: var(--terminal-border);
  border-radius: 3px;
}

.terminal-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--terminal-primary);
}

/* CRT shutdown animation */
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

/* Phosphor glow — intense, for restart prompt */
.phosphor-glow {
  text-shadow: 0 0 8px var(--terminal-glow), 0 0 20px var(--terminal-glow-soft);
}

/* Terminal text glow — subtle, for all terminal text */
.terminal-glow {
  text-shadow: 0 0 4px var(--terminal-glow);
}

/* Subtle CRT flicker */
@keyframes flicker {
  0%, 100% { opacity: 1; }
  92% { opacity: 1; }
  93% { opacity: 0.97; }
  94% { opacity: 1; }
}

.crt-flicker {
  animation: flicker 4s infinite;
}

/* AI thinking spinner */
@keyframes spin-braille {
  0%   { content: '\2800\2800\280B'; }
  10%  { content: '\2800\2800\2819'; }
  20%  { content: '\2800\2800\2839'; }
  30%  { content: '\2800\2800\2838'; }
  40%  { content: '\2800\2800\283C'; }
  50%  { content: '\2800\2800\2834'; }
  60%  { content: '\2800\2800\2826'; }
  70%  { content: '\2800\2800\2827'; }
  80%  { content: '\2800\2800\2807'; }
  90%  { content: '\2800\2800\280F'; }
}

.ai-spinner::before {
  content: '\2800\2800\280B';
  animation: spin-braille 0.8s steps(1) infinite;
  color: var(--terminal-primary);
}

/* Theme transition overlay */
.theme-transition {
  transition: opacity 0.15s ease-in;
}

.theme-transition.active {
  opacity: 0.3;
}

.theme-transition.brighten {
  transition: opacity 0.25s ease-out;
  opacity: 1;
}

/* Disable flicker on mobile and for reduced motion */
@media (max-width: 767px) {
  .crt-flicker { animation: none; }
}

@media (prefers-reduced-motion: reduce) {
  .crt-flicker { animation: none; }
  .ai-spinner::before { animation: none; content: '...'; }
  .animate-blink { animation: none; }
}
```

**Important:** Remove the unused `.typewriter-effect` CSS (lines 62-84 in original). It's dead code.

**Step 2: Verify**

Run dev server. The site should now use CSS variables. Since the `:root` defaults match the old hardcoded values, the site should look identical. Test:
- Scanlines visible
- Vignette visible
- Spinner color correct
- Scrollbar colors correct
- Open DevTools → manually change `data-theme` to `amber` on `<html>` → all CSS-driven colors should change (scanlines, vignette, scrollbar, spinner). Components still show old hardcoded colors — that's expected, we migrate those next.

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: migrate index.css to CSS variables, add flicker and glow effects"
```

---

### Task 5: Migrate BootSplash Component

Replace hardcoded colors with CSS variables.

**Files:**
- Modify: `src/components/BootSplash.tsx`

**Step 1: Update colors**

Replace all hardcoded color values:
- Line 43: `background: '#000'` → `background: 'var(--terminal-bg)'`
- Line 46: `color: '#00FF41'` → `color: 'var(--terminal-primary)'`
- Line 51: `color: '#005500'` → `color: 'var(--terminal-primary-dark)'`

No other changes needed.

**Step 2: Verify**

Run dev server. Boot splash should look identical with green theme. In DevTools, change `data-theme="amber"` on `<html>` before refresh — boot text should appear in amber.

**Step 3: Commit**

```bash
git add src/components/BootSplash.tsx
git commit -m "feat: migrate BootSplash to theme CSS variables"
```

---

### Task 6: Migrate Sidebar Component

Replace hardcoded colors with CSS variables. Apply headshot filter that adapts to theme.

**Files:**
- Modify: `src/components/Sidebar.tsx`

**Step 1: Update colors and filter**

All `style={{ color: '#00FF41' }}` → `style={{ color: 'var(--terminal-primary)' }}`
All `style={{ color: '#888' }}` → `style={{ color: 'var(--terminal-gray)' }}`
All `borderColor: '#333'` → `borderColor: 'var(--terminal-border)' `
All `borderRight: '1px solid #333'` → `borderRight: '1px solid var(--terminal-border)'`

The headshot filter (`grayscale(100%) sepia(60%) hue-rotate(80deg) saturate(200%)`) is green-tinted. To make it theme-aware, add a CSS class in index.css:

Actually, the headshot filter is complex to make theme-aware without JavaScript. For simplicity, keep the green-tinted filter for green/gruvbox themes, use a sepia-only filter for amber, and a grayscale-only filter for white. This requires reading the theme in the component.

Import `useTheme` and apply conditional filter:

```tsx
import { useTheme } from '../ThemeContext';

// Inside component:
const { theme } = useTheme();

const headshotFilter = theme === 'amber'
  ? 'grayscale(100%) sepia(80%) saturate(200%)'
  : theme === 'white'
  ? 'grayscale(100%)'
  : 'grayscale(100%) sepia(60%) hue-rotate(80deg) saturate(200%)';
```

Apply `headshotFilter` to both desktop (line 29) and mobile (line 74) `<img>` style props.

**Step 2: Verify**

Run dev server. Sidebar should look identical. Manually set `data-theme="amber"` + refresh to verify amber tinting works. Check both desktop and mobile views.

**Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: migrate Sidebar to theme CSS variables with adaptive headshot filter"
```

---

### Task 7: Migrate TerminalWindow Component

Replace hardcoded colors with CSS variables. Make box-shadow and LED theme-aware.

**Files:**
- Modify: `src/components/TerminalWindow.tsx`

**Step 1: Update colors**

```tsx
const TerminalWindow: React.FC<Props> = ({ children }) => (
  <div
    className="flex flex-col flex-1 rounded overflow-hidden"
    style={{
      border: '1px solid var(--terminal-border)',
      boxShadow: '0 0 20px var(--terminal-glow), inset 0 0 20px var(--terminal-glow-soft)',
    }}
  >
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
    <div className="flex-1 overflow-hidden flex flex-col">
      {children}
    </div>
  </div>
);
```

Note: The 3 window control dots (red, orange, green) stay hardcoded — they're macOS chrome, not terminal phosphor colors.

**Step 2: Verify**

Verify terminal window border, glow, title bar, and LED all respond to theme changes.

**Step 3: Commit**

```bash
git add src/components/TerminalWindow.tsx
git commit -m "feat: migrate TerminalWindow to theme CSS variables"
```

---

### Task 8: Migrate Terminal Component

Replace all hardcoded colors. Add `terminal-glow` and `crt-flicker` classes.

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx`

**Step 1: Update getLineColor function (lines 403-411)**

```tsx
const getLineColor = (type: string): string => {
  switch (type) {
    case 'input': return '';
    case 'output': return 'text-gray-200';
    case 'error': return '';
    case 'spinner': return '';
    default: return 'text-white';
  }
};
```

For `input`, `error`, and `spinner` types, use inline styles instead of Tailwind classes since we need CSS variables. Update the render section (line 331-358) to apply inline color styles where needed:

- Input lines: `style={{ color: 'var(--terminal-primary)' }}`
- Error lines: `style={{ color: 'var(--terminal-error)' }}`
- Spinner green parts: already handled by `.ai-spinner` CSS class
- Output lines: keep `text-gray-200` (content text is neutral)

**Step 2: Update hardcoded colors throughout Terminal.tsx**

Key locations:
- Line 325: `bg-black` → `style={{ background: 'var(--terminal-bg)' }}`
- Line 328: `bg-black` → remove (inherited)
- Line 336: spinner `color: '#888'` → `color: 'var(--terminal-gray)'`
- Line 341: `color: '#00FF41'` → `color: 'var(--terminal-primary)'`
- Line 342: `color: '#555'` → `color: 'var(--terminal-primary-dark)'`
- Line 355: `color: '#555'` → `color: 'var(--terminal-primary-dark)'`
- Line 362: `border: '1px solid #333'` → `border: '1px solid var(--terminal-border)'`
- Line 362: `bg-black` → `background: 'var(--terminal-bg)'`
- Line 363: `color: '#00FF41'` → `color: 'var(--terminal-primary)'`
- Line 372: `color: '#00FF41'` → `color: 'var(--terminal-primary)'`

**Step 3: Add terminal-glow class**

On the `<section>` wrapper (line 325), add class `terminal-glow crt-flicker`:

```tsx
<section className="w-full flex flex-col flex-1 overflow-hidden p-4 terminal-glow crt-flicker"
  style={{ background: 'var(--terminal-bg)' }}>
```

**Step 4: Verify**

Run dev server. Terminal should look identical. Verify:
- Input text color
- Help entry colors
- Spinner color
- Timestamp color
- Input border color
- Subtle text glow is visible
- Subtle flicker visible on desktop (watch for ~4 seconds)
- No flicker on mobile viewport

**Step 5: Commit**

```bash
git add src/components/Terminal/Terminal.tsx
git commit -m "feat: migrate Terminal to theme CSS variables, add text glow and flicker"
```

---

### Task 9: Migrate Suggestions and AutoSuggestion

**Files:**
- Modify: `src/components/Terminal/Suggestions.tsx`
- Modify: `src/components/Terminal/AutoSuggestion.tsx`

**Step 1: Update Suggestions.tsx**

- Line 17: `background: '#000'` → `background: 'var(--terminal-bg)'`
- Line 17: `border: '1px solid #333'` → `border: '1px solid var(--terminal-border)'`
- Line 24: `background: '#111'` → `background: 'var(--terminal-surface)'`
- Line 30: `text-[#00FF41]` → remove class, add `style={{ color: 'var(--terminal-primary)' }}`
- Line 31: `color: '#555'` → `color: 'var(--terminal-primary-dark)'`

Also increase row height for mobile touch targets. Change `py-2` to `py-2 md:py-2` and add `min-h-[44px] md:min-h-0` to each button:

```tsx
className="w-full px-4 py-2 min-h-[44px] md:min-h-0 flex items-center space-x-3 text-left text-sm transition-colors"
```

**Step 2: Update AutoSuggestion.tsx**

- Line 13: `color: '#00FF41'` → `color: 'var(--terminal-primary)'`
- Line 14: `color: '#005500'` → `color: 'var(--terminal-primary-dark)'`

**Step 3: Verify**

Open suggestions dropdown. Colors should match theme. On mobile viewport, verify suggestion rows are at least 44px tall.

**Step 4: Commit**

```bash
git add src/components/Terminal/Suggestions.tsx src/components/Terminal/AutoSuggestion.tsx
git commit -m "feat: migrate Suggestions and AutoSuggestion to theme CSS variables, improve touch targets"
```

---

### Task 10: Migrate App.tsx

Replace all hardcoded colors in the app shell — shutdown messages, restart prompt, mobile toolbar, copyright bar.

**Files:**
- Modify: `src/App.tsx`

**Step 1: Update module-level constants (lines 9-10)**

```tsx
const MOBILE_BTN_STYLE = {
  background: 'var(--terminal-surface)',
  color: 'var(--terminal-primary)',
  border: '1px solid var(--terminal-border)',
} as const;

const MOBILE_BTN_STYLE_EMPHASIZED = {
  background: 'var(--terminal-primary)',
  color: 'var(--terminal-bg)',
  border: '1px solid var(--terminal-primary)',
} as const;
```

**Step 2: Update RESTART_LINES (line 29)**

```tsx
const RESTART_LINES = [
  { text: 'Reboot scheduled.' },
  { text: 'Waiting for user input...' },
];
```

Remove the `color` property — use `var(--terminal-gray)` inline in the JSX instead.

**Step 3: Update all JSX inline styles**

Key locations:
- Line 139: `background: '#000'` → `background: 'var(--terminal-bg)'`
- Line 146: `background: '#000'` → `background: 'var(--terminal-bg)'`
- Line 149: `color: '#00FF41'` → `color: 'var(--terminal-primary)'`
- Line 160: `background: '#000'` → `background: 'var(--terminal-bg)'`
- Line 166-173: Restart line colors → `color: 'var(--terminal-gray)'`
- Line 182-189: Final restart line `color: '#00FF41'` → `color: 'var(--terminal-primary)'`
- Line 215: `borderColor: '#333'` → `borderColor: 'var(--terminal-border)'`
- Line 233: `color: '#888'` → `color: 'var(--terminal-gray)'`
- Line 233: `borderColor: '#333'` → `borderColor: 'var(--terminal-border)'`
- Line 235: `color: '#888'` → `color: 'var(--terminal-gray)'`
- Line 236: `color: '#00FF41'` → `color: 'var(--terminal-primary)'`

**Step 4: Verify**

Test full flow: boot → commands → exit → shutdown → restart. All phases should use theme colors. Test mobile toolbar colors. Test copyright bar.

**Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: migrate App to theme CSS variables"
```

---

### Task 11: Migrate commands.tsx Icon Colors

Replace hardcoded `#00FF41` in icon class names.

**Files:**
- Modify: `src/components/Terminal/commands.tsx:6-13`

**Step 1: Update icon styles**

Every icon has `className="w-4 h-4 text-[#00FF41]"`. Change to use inline style:

```tsx
{ command: 'whoami', description: 'Display identity', icon: <User className="w-4 h-4" style={{ color: 'var(--terminal-primary)' }} /> },
```

Apply to all 8 suggestion entries.

**Step 2: Verify**

Open help output and suggestions dropdown. Icons should use the theme color.

**Step 3: Commit**

```bash
git add src/components/Terminal/commands.tsx
git commit -m "feat: migrate command icons to theme CSS variables"
```

---

### Task 12: Theme Command

Add the `theme` command to the terminal with a phosphor transition animation.

**Files:**
- Modify: `src/components/Terminal/commands.tsx` (add suggestion entry)
- Modify: `src/components/Terminal/Terminal.tsx` (handle theme command)
- Modify: `src/App.tsx` (add transition overlay div)

**Step 1: Add theme suggestion to commands.tsx**

Import `Palette` from lucide-react. Add to `suggestions` array:

```tsx
import { Cpu, Mail, Sparkles, User, Info, Clock, LogOut, History, Palette } from 'lucide-react';

// Add before 'clear' in the suggestions array:
{ command: 'theme', description: 'Switch color theme', icon: <Palette className="w-4 h-4" style={{ color: 'var(--terminal-primary)' }} /> },
```

**Step 2: Handle theme command in Terminal.tsx**

Import `useTheme` and `ThemeName`:

```tsx
import { useTheme, ThemeName } from '../../ThemeContext';
```

Inside the Terminal component, destructure:

```tsx
const { theme, setTheme } = useTheme();
```

In `handleCommand`, add a case for `theme` before the general command lookup. Handle it like `uptime` — inline in the timeout callback:

After the `if (trimmedCmd === 'uptime')` block (~line 143), add:

```tsx
} else if (trimmedCmd === 'theme' || trimmedCmd.startsWith('theme ')) {
  const arg = trimmedCmd.replace('theme', '').trim();
  const validThemes: ThemeName[] = ['green', 'amber', 'white', 'gruvbox'];

  if (!arg) {
    // Show current theme and options
    outputLines = [
      { content: `Current theme: ${theme}`, type: 'output' },
      { content: `Available: ${validThemes.join(', ')}`, type: 'output' },
      { content: `Usage: theme <name>`, type: 'output' },
    ];
  } else if (validThemes.includes(arg as ThemeName)) {
    const isGruvboxFirstTime = arg === 'gruvbox' && !localStorage.getItem('dkoder-gruvbox-seen');
    setTheme(arg as ThemeName);
    if (isGruvboxFirstTime) {
      localStorage.setItem('dkoder-gruvbox-seen', '1');
      outputLines = [
        { content: 'Monitor upgrade detected. Welcome to the 21st century.', type: 'output' },
      ];
    } else {
      outputLines = [
        { content: `Theme switched to ${arg}.`, type: 'output' },
      ];
    }
  } else {
    outputLines = [
      { content: `Unknown theme: ${arg}. Available: ${validThemes.join(', ')}`, type: 'error' },
    ];
  }
```

Also update the `isHtml` guard — `theme` does not produce HTML, so no change needed there.

**Step 3: Add transition overlay to App.tsx**

Import `useState` (already imported) and add a transition overlay:

```tsx
const [themeTransition, setThemeTransition] = useState(false);
```

Expose `triggerThemeTransition` via a new context or a simpler approach: since the theme command is in Terminal.tsx which already has access to ThemeContext, we can add a `transitioning` state to the ThemeContext itself.

**Simpler approach:** Add transition state to ThemeContext:

In `ThemeContext.tsx`, add:

```tsx
interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  transitioning: boolean;
}

// In ThemeProvider:
const [transitioning, setTransitioning] = useState(false);

const setTheme = useCallback((newTheme: ThemeName) => {
  setTransitioning(true);
  setTimeout(() => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    setTimeout(() => setTransitioning(false), 50);
  }, 150);
}, []);
```

In `App.tsx`, consume `transitioning`:

```tsx
const { transitioning } = useTheme();
```

Add a transition overlay div inside the root div, before the boot splash:

```tsx
{/* Theme transition overlay */}
<div
  className="fixed inset-0 z-[9500] pointer-events-none"
  style={{
    background: 'var(--terminal-bg)',
    opacity: transitioning ? 0.7 : 0,
    transition: transitioning ? 'opacity 0.15s ease-in' : 'opacity 0.25s ease-out',
  }}
/>
```

Import `useTheme`:

```tsx
import { useTheme } from './ThemeContext';
```

**Step 4: Handle 'theme' in the suggestions/autocomplete**

The `theme` command takes arguments, but the autocomplete only matches the command name. Since `theme` is in the suggestions array, typing `th` will autocomplete to `theme`. After that, the user types the theme name manually. This matches the existing UX pattern — no special handling needed.

However, we need to handle `theme green` etc. as commands. Currently `handleCommand` looks up `commands[trimmedCmd]` which won't find `theme green`. The inline handling added in Step 2 (checking `trimmedCmd.startsWith('theme')`) handles this before the commands map lookup.

**Step 5: Verify**

- Type `theme` → shows current theme and options
- Type `theme amber` → screen dims briefly, colors switch to amber
- Type `theme gruvbox` → Easter egg message appears, colors switch to gruvbox
- Type `theme gruvbox` again → normal "Theme switched" message (Easter egg only once)
- Type `theme invalid` → error message
- Refresh page → theme persists
- Trigger `exit` → shutdown sequence uses current theme colors → restart → theme still persisted

**Step 6: Commit**

```bash
git add src/ThemeContext.tsx src/components/Terminal/Terminal.tsx src/components/Terminal/commands.tsx src/App.tsx
git commit -m "feat: add theme command with phosphor transition animation and gruvbox Easter egg"
```

---

### Task 13: Whoami Command Redesign

Add ASCII art DK logo with side-by-side info layout on desktop, text-only on mobile.

**Files:**
- Modify: `src/components/Terminal/commands.tsx` (replace whoami output)
- Modify: `src/components/Terminal/Terminal.tsx` (responsive whoami rendering)

**Step 1: Create desktop and mobile whoami outputs**

In `commands.tsx`, replace the `whoami` entry:

```tsx
whoami: [
  'Dmytro Koval',
  'Focus:    Backend & Distributed Systems',
],
whoamiDesktop: [
  '  ██████╗ ██╗  ██╗      Dmytro Koval',
  '  ██╔══██╗██║ ██╔╝      ─────────────────────────────',
  '  ██║  ██║█████╔╝       Focus: Backend & Distributed Systems',
  '  ██║  ██║██╔═██╗',
  '  ██████╔╝██║  ██╗',
  '  ╚═════╝ ╚═╝  ╚═╝',
],
```

**Step 2: Handle responsive rendering in Terminal.tsx**

In the command output section of `handleCommand` (inside the setTimeout callback), add a case for `whoami` similar to `uptime`:

```tsx
} else if (trimmedCmd === 'whoami') {
  const key = isMobile ? 'whoami' : 'whoamiDesktop';
  const output = commands[key];
  outputLines = output.map(line => ({
    content: line,
    type: 'output' as const,
  }));
```

**Step 3: Ensure preformatted rendering**

The ASCII art needs `white-space: pre` to preserve alignment. The whoami desktop output lines contain leading spaces. The terminal already uses `font-mono` and the content is plain text, so spacing should be preserved. Add `whitespace-pre` to the output `<p>` tag for output lines.

In the terminal render section, for non-HTML, non-helpEntry, non-spinner output lines, wrap content in a span if the line starts with spaces:

Actually, simpler: add `style={{ whiteSpace: 'pre' }}` to all output lines. This is a minimal change — find the line rendering `line.content` (around line 351-353 in Terminal.tsx) and add:

```tsx
) : (
  <span style={{ whiteSpace: 'pre' }}>{line.content}</span>
)}
```

**Step 4: Verify**

- Desktop: `whoami` shows ASCII art with info aligned to the right
- Mobile: `whoami` shows only the two text lines
- The ASCII art block characters align correctly
- Theme colors apply to the output

**Step 5: Commit**

```bash
git add src/components/Terminal/commands.tsx src/components/Terminal/Terminal.tsx
git commit -m "feat: redesign whoami with ASCII art DK logo and responsive layout"
```

---

### Task 14: Contact Command Redesign

Replace inline SVG icons with Unicode symbols, wrap in box-drawing frame.

**Files:**
- Modify: `src/components/Terminal/commands.tsx` (replace contact output)
- Modify: `src/components/Terminal/Terminal.tsx` (update isHtml handling for contact)

**Step 1: Replace contact output in commands.tsx**

Replace the `contact` entry with HTML that uses box-drawing and Unicode icons. The links remain clickable:

```tsx
contact: [
  '╭─ Contact ─────────────────────────────╮',
  '│                                       │',
  '<a href="https://github.com/dkoval" target="_blank" rel="noopener noreferrer" style="color: var(--terminal-primary); text-decoration: none;">│  ◆  github.com/dkoval                  │</a>',
  '<a href="https://linkedin.com/in/dmytrokoval" target="_blank" rel="noopener noreferrer" style="color: var(--terminal-primary); text-decoration: none;">│  ◆  linkedin.com/in/dmytrokoval        │</a>',
  '<a href="https://twitter.com/dkovalbuzz" target="_blank" rel="noopener noreferrer" style="color: var(--terminal-primary); text-decoration: none;">│  ◆  twitter.com/dkovalbuzz             │</a>',
  '<a href="mailto:dkoderinc@gmail.com" target="_blank" rel="noopener noreferrer" style="color: var(--terminal-primary); text-decoration: none;">│  ✉  dkoderinc@gmail.com                │</a>',
  '│                                       │',
  '╰───────────────────────────────────────╯',
],
```

The non-link lines (box border) are plain text. The link lines are HTML. We need to mark which lines are HTML.

**Step 2: Update isHtml detection**

Currently `isHtml` is set to `true` for all lines when `trimmedCmd === 'contact'`. This still works — DOMPurify will pass through the plain-text box-drawing lines unchanged. The `white-space: pre` from Task 13 will preserve alignment. No change needed to the isHtml logic.

However, we need DOMPurify to allow the `style` attribute on `<a>` tags. Check the current DOMPurify config (Terminal.tsx line 348):

```tsx
DOMPurify.sanitize(line.content, { ADD_ATTR: ['target'] })
```

Add `'style'` to ADD_ATTR:

```tsx
DOMPurify.sanitize(line.content, { ADD_ATTR: ['target', 'style'] })
```

**Step 3: Verify**

- `contact` shows box-drawing frame with Unicode symbols
- Links are clickable and open in new tabs
- Alignment is correct with monospace font
- Colors use theme variables via inline style

**Step 4: Commit**

```bash
git add src/components/Terminal/commands.tsx src/components/Terminal/Terminal.tsx
git commit -m "feat: redesign contact with box-drawing frame and Unicode icons"
```

---

### Task 15: Uptime Command Redesign

Replace current multi-line output with authentic single-line `uptime` format.

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx` (update uptime output generation, ~lines 143-149)

**Step 1: Rewrite uptime output**

Replace the current uptime block:

```tsx
if (trimmedCmd === 'uptime') {
  const seconds = Math.floor((Date.now() - PAGE_LOAD_TIME) / 1000);
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  // Cosmetic load averages — seeded from session time, drift slowly
  const base = (Date.now() % 100) / 100;
  const load1 = (0.3 + base * 0.4).toFixed(2);
  const load5 = (0.2 + base * 0.25).toFixed(2);
  const load15 = (0.05 + base * 0.15).toFixed(2);
  outputLines = [
    { content: ` ${timeStr} up ${formatUptime(seconds)},  1 user,  load average: ${load1}, ${load5}, ${load15}`, type: 'output' },
  ];
```

**Step 2: Verify**

Run `uptime` command. Should show single line like:
```
 14:24:07 up 3m 12s,  1 user,  load average: 0.42, 0.31, 0.12
```

Load averages should be different each time (based on session time modulo).

**Step 3: Commit**

```bash
git add src/components/Terminal/Terminal.tsx
git commit -m "feat: redesign uptime output to match real uptime format"
```

---

### Task 16: Man Dmytro Formatting

Style man page section headers differently from body text. Since man page content is plain text (not HTML), we need a way to render section headers in primary color and body in dim.

**Files:**
- Modify: `src/components/Terminal/commands.tsx` (add metadata markers)
- Modify: `src/components/Terminal/Terminal.tsx` (handle man page styling)

**Step 1: Approach**

The simplest approach: make `man dmytro` lines HTML so we can apply inline styles. This avoids complex rendering logic.

Replace `'man dmytro'` in commands.tsx:

```tsx
'man dmytro': [
  '<span style="color: var(--terminal-gray)">DMYTRO(1)                    User Commands                    DMYTRO(1)</span>',
  '',
  '<span style="color: var(--terminal-primary)">NAME</span>',
  '<span style="color: var(--terminal-gray)">       dmytro - a software engineer who builds things that scale</span>',
  '',
  '<span style="color: var(--terminal-primary)">SYNOPSIS</span>',
  '<span style="color: var(--terminal-gray)">       dmytro [--backend] [--distributed] [--java|--kotlin] [problem...]</span>',
  '',
  '<span style="color: var(--terminal-primary)">DESCRIPTION</span>',
  '<span style="color: var(--terminal-gray)">       Dmytro Koval is a Senior Software Engineer with 15+ years of</span>',
  '<span style="color: var(--terminal-gray)">       experience building robust, scalable, and efficient server-side</span>',
  '<span style="color: var(--terminal-gray)">       applications. Specializes in microservices, event-driven</span>',
  '<span style="color: var(--terminal-gray)">       architecture, and high-performance distributed systems.</span>',
  '',
  '<span style="color: var(--terminal-primary)">OPTIONS</span>',
  '<span style="color: var(--terminal-gray)">       --backend          Preferred mode of operation</span>',
  '<span style="color: var(--terminal-gray)">       --distributed      Excels in this environment</span>',
  '<span style="color: var(--terminal-gray)">       --mentoring        Also available</span>',
  '',
  '<span style="color: var(--terminal-primary)">BUGS</span>',
  '<span style="color: var(--terminal-gray)">       None known. Reports welcome at: dkoderinc@gmail.com</span>',
  '',
  '<span style="color: var(--terminal-primary)">SEE ALSO</span>',
  '<span style="color: var(--terminal-gray)">       skills(1), history(1), contact(1)</span>',
  '',
  '<span style="color: var(--terminal-gray)">DKODER INC.                       2026                       DMYTRO(1)</span>',
],
```

**Step 2: Update isHtml guard in Terminal.tsx**

Find the `isHtml` assignment (~line 156):

```tsx
isHtml: trimmedCmd === 'contact',
```

Change to:

```tsx
isHtml: trimmedCmd === 'contact' || trimmedCmd === 'man dmytro',
```

**Step 3: Verify**

Run `man dmytro`. Section headers should be in primary (green/amber/white/gruvbox) color, body text in gray. All text preserved verbatim.

**Step 4: Commit**

```bash
git add src/components/Terminal/commands.tsx src/components/Terminal/Terminal.tsx
git commit -m "feat: style man dmytro with colored section headers"
```

---

### Task 17: Mobile Swipe Gestures

Add vertical swipe detection on the terminal output area for command history navigation.

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx`

**Step 1: Add swipe detection**

Add touch tracking refs inside the Terminal component:

```tsx
const touchStartY = useRef<number | null>(null);
```

Add touch event handlers on the terminal output div (ref `terminalRef`):

```tsx
const handleTouchStart = (e: React.TouchEvent) => {
  touchStartY.current = e.touches[0].clientY;
};

const handleTouchEnd = (e: React.TouchEvent) => {
  if (touchStartY.current === null) return;
  const deltaY = touchStartY.current - e.changedTouches[0].clientY;
  touchStartY.current = null;
  const MIN_SWIPE = 50;
  if (Math.abs(deltaY) < MIN_SWIPE) return;
  if (deltaY > 0) {
    actionUp(); // swipe up → previous command
  } else {
    actionDown(); // swipe down → next command
  }
};
```

Apply to the terminal output div:

```tsx
<div
  ref={terminalRef}
  className="flex-1 overflow-y-auto overflow-x-hidden mb-4 text-sm terminal-scroll"
  style={{ background: 'var(--terminal-bg)' }}
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
>
```

**Step 2: Verify**

On mobile (or Chrome DevTools mobile emulator):
- Swipe up on terminal output → fills input with previous command from history
- Swipe down → next command
- Short swipes (< 50px) are ignored
- Normal scrolling still works (horizontal/short vertical)

**Step 3: Commit**

```bash
git add src/components/Terminal/Terminal.tsx
git commit -m "feat: add swipe gestures for command history on mobile"
```

---

### Task 18: Mobile Haptic Feedback

Add subtle vibration on mobile toolbar button presses.

**Files:**
- Modify: `src/App.tsx` (add vibrate call to button onClick)

**Step 1: Add haptic feedback**

In the mobile toolbar button `onClick` handler (line 223):

```tsx
onClick={() => {
  navigator.vibrate?.(10);
  terminalRef.current?.handleMobileAction(action);
}}
```

**Step 2: Verify**

On a real mobile device (not emulator — vibration doesn't work in emulators), tap toolbar buttons. Should feel a subtle 10ms vibration. On desktop/unsupported devices, no error occurs.

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add haptic feedback on mobile toolbar buttons"
```

---

### Task 19: Final Cleanup and Verification

Full end-to-end verification pass.

**Files:** None (verification only)

**Step 1: Build check**

```bash
npm run build
```

Verify no TypeScript errors, no build warnings.

**Step 2: Lint check**

```bash
npm run lint
```

Fix any lint errors.

**Step 3: Full manual test matrix**

Test each theme (green, amber, white, gruvbox) across:

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Boot splash colors | ✓ | ✓ |
| Help output | ✓ | ✓ |
| `whoami` (ASCII art / text-only) | ✓ | ✓ |
| `skills` (progress bars) | ✓ | ✓ |
| `man dmytro` (colored headers) | ✓ | ✓ |
| `history` | ✓ | ✓ |
| `contact` (box-drawing, clickable links) | ✓ | ✓ |
| `uptime` (real format) | ✓ | ✓ |
| `theme` (switch, transition, Easter egg) | ✓ | ✓ |
| `clear` | ✓ | ✓ |
| `exit` → shutdown → restart | ✓ | ✓ |
| Theme persistence across reload | ✓ | ✓ |
| Scanlines + vignette | ✓ | ✓ |
| Text glow | ✓ | ✓ |
| Flicker (desktop only) | ✓ | N/A |
| `prefers-reduced-motion` | ✓ | ✓ |
| Scrollbar colors | ✓ | ✓ |
| Sidebar colors + headshot filter | ✓ | ✓ |
| Terminal window glow + LED | ✓ | ✓ |
| Mobile toolbar colors | N/A | ✓ |
| Mobile swipe gestures | N/A | ✓ |
| Mobile haptic feedback | N/A | ✓ (device) |
| Mobile touch targets (44px) | N/A | ✓ |
| Copyright bar colors | ✓ | ✓ |

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: final cleanup from end-to-end verification"
```

Only if there are fixes needed. Skip if everything passes.
