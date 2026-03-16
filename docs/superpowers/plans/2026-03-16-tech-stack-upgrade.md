# Tech Stack Upgrade Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade React 18→19, Vite 5→8, Tailwind 3→4, TypeScript 5.5→5.9, ESLint 9→10, and remove all deprecated patterns.

**Architecture:** Aggressive single-branch upgrade. Dependencies first, then code fixes (forwardRef, React.FC, imports), then config updates, then verification. Code fixes must happen atomically with the type upgrades since `@types/react@19` removes the global `React` namespace.

**Tech Stack:** React 19, Vite 8 (Rolldown), Tailwind CSS 4 (@tailwindcss/vite), TypeScript 5.9, ESLint 10, Vitest 4

**Spec:** `docs/superpowers/specs/2026-03-16-tech-stack-upgrade-design.md`

---

## Chunk 1: Dependencies & Config

### Task 1: Upgrade all dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove obsolete packages**

```bash
npm uninstall autoprefixer postcss
```

- [ ] **Step 2: Install new packages**

```bash
npm install --save-dev @tailwindcss/vite
```

- [ ] **Step 3: Upgrade all dependencies to latest**

```bash
npm install react@latest react-dom@latest dompurify@latest lucide-react@latest
npm install --save-dev vite@latest @vitejs/plugin-react@latest tailwindcss@latest typescript@latest eslint@latest typescript-eslint@latest eslint-plugin-react-hooks@latest eslint-plugin-react-refresh@latest @eslint/js@latest @types/react@latest @types/react-dom@latest @types/dompurify@latest globals@latest jsdom@latest @testing-library/jest-dom@latest @testing-library/react@latest @testing-library/user-event@latest vitest@latest
```

Note: If Vitest latest is incompatible with Vite 8, the error will surface in Task 6 verification. Check `npm ls vite` to confirm peer dep alignment.

- [ ] **Step 4: Verify node_modules installed cleanly**

```bash
npm ls --depth=0 2>&1 | head -5
```

Expected: No `ERESOLVE` or peer dependency errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: upgrade all dependencies to latest versions

React 18→19, Vite 5→8, Tailwind 3→4, TypeScript 5.5→5.9,
ESLint 9→10. Remove autoprefixer and postcss (built into
Tailwind 4). Add @tailwindcss/vite plugin."
```

### Task 2: Update config files

**Files:**
- Modify: `vite.config.ts`
- Modify: `src/index.css:1-3`
- Modify: `tsconfig.app.json:3-5`
- Modify: `eslint.config.js:15`
- Delete: `tailwind.config.js`
- Delete: `postcss.config.js`

- [ ] **Step 1: Update vite.config.ts**

Replace entire file with:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

- [ ] **Step 2: Update index.css Tailwind imports**

Replace lines 1-3 of `src/index.css`:

```css
/* Old: */
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

/* New: */
@import "tailwindcss";
```

All custom CSS below this line (theme variables, CRT effects, animations, scrollbar) stays unchanged.

- [ ] **Step 3: Update tsconfig.app.json target and lib**

Change `target` and `lib` in `tsconfig.app.json`:

```json
"target": "ES2022",
"lib": ["ES2023", "DOM", "DOM.Iterable"],
```

Was: `"target": "ES2020"`, `"lib": ["ES2020", "DOM", "DOM.Iterable"]`

- [ ] **Step 4: Update eslint.config.js ecmaVersion**

Change `ecmaVersion` in `eslint.config.js:13`:

```js
ecmaVersion: 2024,  // was 2020
```

- [ ] **Step 5: Delete obsolete config files**

```bash
rm tailwind.config.js postcss.config.js
```

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts src/index.css tsconfig.app.json eslint.config.js
git rm tailwind.config.js postcss.config.js
git commit -m "chore: update configs for Vite 8, Tailwind 4, TS 5.9, ESLint 10

Replace PostCSS-based Tailwind with @tailwindcss/vite plugin.
Simplify CSS imports to @import \"tailwindcss\". Bump TS target
to ES2022 and ESLint ecmaVersion to 2024. Delete tailwind.config.js
and postcss.config.js (no longer needed with Tailwind 4)."
```

---

## Chunk 2: React 19 Deprecation Fixes

### Task 3: Remove forwardRef from Terminal.tsx and Suggestions.tsx

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx:1,40,720-724`
- Modify: `src/components/Terminal/Suggestions.tsx:1,17-18,73-78`

- [ ] **Step 1: Update Terminal.tsx**

**Line 1** — Replace import:

```ts
/* Old: */
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useMemo } from 'react';

/* New: */
import { useState, useEffect, useRef, useImperativeHandle, useMemo, ChangeEvent, KeyboardEvent, Ref } from 'react';
```

**Line 40** — Replace forwardRef wrapper with plain function accepting ref as prop:

```ts
/* Old: */
const Terminal = forwardRef<TerminalHandle, TerminalProps>(({ onShutdown, onBell, playSound, soundEnabled, onSoundSet, onRevealStateChange }, ref) => {

/* New: */
const Terminal = ({ onShutdown, onBell, playSound, soundEnabled, onSoundSet, onRevealStateChange, ref }: TerminalProps & { ref?: Ref<TerminalHandle> }) => {
```

**Line 169** — Update ChangeEvent type:

```ts
/* Old: */
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {

/* New: */
const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
```

**Line 463** — Update KeyboardEvent type:

```ts
/* Old: */
const handleKeyDown = (e: React.KeyboardEvent) => {

/* New: */
const handleKeyDown = (e: KeyboardEvent) => {
```

**Lines 720-724** — Remove closing paren, displayName, and fix export:

```ts
/* Old: */
});

Terminal.displayName = 'Terminal';

export default Terminal;

/* New: */
};

export default Terminal;
```

- [ ] **Step 2: Update Suggestions.tsx**

**Line 1** — Remove `import React`:

```ts
/* Old: */
import React from 'react';

/* New: (delete this line entirely) */
```

**Add import at top of file:**

```ts
import { Ref } from 'react';
```

**Lines 17-18** — Replace forwardRef wrapper with ref prop:

```ts
/* Old: */
const Suggestions = React.forwardRef<HTMLDivElement, SuggestionsProps>(
  ({ suggestions, selectedIndex, onSelect, onMouseEnter, mode, themes, currentTheme, onBack }, ref) => {

/* New: */
const Suggestions = ({ suggestions, selectedIndex, onSelect, onMouseEnter, mode, themes, currentTheme, onBack, ref }: SuggestionsProps & { ref?: Ref<HTMLDivElement> }) => {
```

**Lines 73-78** — Remove closing paren/brace, displayName:

```ts
/* Old: */
  }
);

Suggestions.displayName = 'Suggestions';

export default Suggestions;

/* New: */
};

export default Suggestions;
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors related to forwardRef, or if there are other errors they will be from React.FC files (fixed in Task 4).

- [ ] **Step 4: Commit**

```bash
git add src/components/Terminal/Terminal.tsx src/components/Terminal/Suggestions.tsx
git commit -m "refactor: remove forwardRef (deprecated in React 19)

Terminal and Suggestions now accept ref as a regular prop.
Remove displayName assignments (unnecessary without forwardRef).
Convert React.ChangeEvent/KeyboardEvent to named imports."
```

### Task 4: Remove React.FC and clean up imports across all files

**Files:**
- Modify: `src/main.tsx:1-2,7-12`
- Modify: `src/App.tsx:1,51`
- Modify: `src/ThemeContext.tsx:1,33`
- Modify: `src/components/Sidebar.tsx:1,20`
- Modify: `src/components/BootSplash.tsx:1,14`
- Modify: `src/components/StatusBar.tsx:1,10`
- Modify: `src/components/TerminalWindow.tsx:1,5,11`
- Modify: `src/components/Terminal/AutoSuggestion.tsx:1,8`
- Modify: `src/components/Terminal/MatrixRain.tsx:52`
- Modify: `src/components/Terminal/commands.tsx:1`
- Modify: `src/test/helpers.tsx:1,5`
- Modify: `src/__tests__/ThemeContext.test.tsx:2,5`

- [ ] **Step 1: Update main.tsx**

```tsx
/* Old: */
import React from 'react';
import ReactDOM from 'react-dom/client';
...
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);

/* New: */
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
...
ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
```

- [ ] **Step 2: Update App.tsx**

```tsx
/* Old line 1: */
import React, { useState, useCallback, useRef, useEffect } from 'react';

/* New line 1: */
import { useState, useCallback, useRef, useEffect } from 'react';

/* Old line 51: */
const App: React.FC = () => {

/* New line 51: */
const App = () => {
```

- [ ] **Step 3: Update ThemeContext.tsx**

```tsx
/* Old line 1: */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

/* New line 1: */
import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';

/* Old line 33: */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

/* New line 33: */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
```

- [ ] **Step 4: Update Sidebar.tsx**

```tsx
/* Old line 1: */
import React, { useState, useEffect } from 'react';

/* New line 1: */
import { useState, useEffect } from 'react';

/* Old line 20: */
const Sidebar: React.FC = () => {

/* New line 20: */
const Sidebar = () => {
```

- [ ] **Step 5: Update BootSplash.tsx**

```tsx
/* Old line 1: */
import React, { useState, useEffect } from 'react';

/* New line 1: */
import { useState, useEffect } from 'react';

/* Old line 14: */
const BootSplash: React.FC<Props> = ({ onComplete }) => {

/* New line 14: */
const BootSplash = ({ onComplete }: Props) => {
```

- [ ] **Step 6: Update StatusBar.tsx**

```tsx
/* Old line 1: */
import React, { useState, useEffect } from 'react';

/* New line 1: */
import { useState, useEffect } from 'react';

/* Old line 10: */
const StatusBar: React.FC<StatusBarProps> = ({ onSoundToggle, soundEnabled = false }) => {

/* New line 10: */
const StatusBar = ({ onSoundToggle, soundEnabled = false }: StatusBarProps) => {
```

- [ ] **Step 7: Update TerminalWindow.tsx**

```tsx
/* Old line 1: */
import React from 'react';

/* New line 1: */
import { ReactNode } from 'react';

/* Old line 5: */
  children: React.ReactNode;

/* New line 5: */
  children: ReactNode;

/* Old line 11: */
const TerminalWindow: React.FC<Props> = ({ children, bellFlash, onSoundToggle, soundEnabled }) => (

/* New line 11: */
const TerminalWindow = ({ children, bellFlash, onSoundToggle, soundEnabled }: Props) => (
```

- [ ] **Step 8: Update AutoSuggestion.tsx**

```tsx
/* Old line 1: */
import React from 'react';

/* New: (delete this line entirely — no React references remain) */

/* Old line 8: */
const AutoSuggestion: React.FC<AutoSuggestionProps> = ({ inputCommand, suggestion }) => {

/* New: */
const AutoSuggestion = ({ inputCommand, suggestion }: AutoSuggestionProps) => {
```

- [ ] **Step 9: Update MatrixRain.tsx**

This file already lacks `import React` — only needs the `React.FC` removal on line 52:

```tsx
/* Old line 52: */
const MatrixRain: React.FC<MatrixRainProps> = ({ visible, onFadeOutComplete }) => {

/* New line 52: */
const MatrixRain = ({ visible, onFadeOutComplete }: MatrixRainProps) => {
```

- [ ] **Step 10: Update commands.tsx**

```tsx
/* Old line 1: */
import React from 'react';

/* New: (delete this line entirely — JSX works via automatic transform) */
```

- [ ] **Step 11: Update test/helpers.tsx**

```tsx
/* Old line 1: */
import React, { ReactElement } from 'react';

/* New line 1: */
import { ReactElement, ReactNode } from 'react';

/* Old line 5: */
const AllProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (

/* New line 5: */
const AllProviders = ({ children }: { children: ReactNode }) => (
```

- [ ] **Step 12: Update __tests__/ThemeContext.test.tsx**

```tsx
/* Old line 2: */
import React from 'react';

/* New: (delete this line entirely) */

/* Old line 5: */
const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (

/* New (import ReactNode at top): */
import { ReactNode } from 'react';
...
const wrapper = ({ children }: { children: ReactNode }) => (
```

Full updated imports for this file:

```tsx
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { ThemeProvider, useTheme } from '../ThemeContext';
```

- [ ] **Step 13: Verify test files need no changes**

Confirmed: `src/components/Terminal/__tests__/Terminal.test.tsx` and `src/components/Terminal/__tests__/Suggestions.test.tsx` do not use `import React`, `React.FC`, or `forwardRef`. No modifications needed.

- [ ] **Step 14: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 15: Commit**

```bash
git add src/main.tsx src/App.tsx src/ThemeContext.tsx src/components/Sidebar.tsx src/components/BootSplash.tsx src/components/StatusBar.tsx src/components/TerminalWindow.tsx src/components/Terminal/AutoSuggestion.tsx src/components/Terminal/MatrixRain.tsx src/components/Terminal/commands.tsx src/test/helpers.tsx src/__tests__/ThemeContext.test.tsx
git commit -m "refactor: remove React.FC and clean up React imports

Replace React.FC with plain typed function signatures across
all 10 component files. Remove unnecessary 'import React' —
use named imports (useState, ReactNode, etc.) where needed.
JSX files without React references rely on the automatic
transform (jsx: react-jsx, already configured)."
```

---

## Chunk 3: Verification

### Task 5: Run full verification suite

- [ ] **Step 1: TypeScript type check**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 2: Run all tests**

```bash
npm run test:ci
```

Expected: All 78 tests pass across 13 test files.

If Vitest errors with a Vite version mismatch, check:

```bash
npm ls vite
```

If Vitest 4.x is incompatible with Vite 8, upgrade Vitest:

```bash
npm install --save-dev vitest@latest
```

- [ ] **Step 3: Run linter**

```bash
npm run lint
```

Expected: Zero errors. If ESLint 10 plugin compatibility issues arise, check specific plugin errors and update accordingly.

- [ ] **Step 4: Run production build**

```bash
npm run build
```

Expected: Clean build with no warnings. Output in `dist/`.

- [ ] **Step 5: Start dev server and smoke test**

```bash
npm run dev
```

Manual checks:
- Boot splash animation plays
- All 4 themes work (green, amber, tokyo-night, one-dark-pro)
- Sound toggle works (StatusBar button + `sound on`/`sound off` command)
- All 10 commands produce output
- Suggestions panel opens on Tab
- Mobile toolbar works (resize to <768px)
- Shutdown sequence (CRT collapse → black → restart prompt)
- Matrix rain appears after 30s idle

- [ ] **Step 6: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address post-upgrade issues found during verification"
```

Only create this commit if fixes were needed. Skip if verification passed clean.

### Task 6: Push branch

- [ ] **Step 1: Push to remote**

```bash
git push -u origin arch/tech-stack
```
