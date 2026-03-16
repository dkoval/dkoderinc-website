# Tech Stack Upgrade — 2026 Modernization

## Problem

The project's core dependencies are 1-3 major versions behind current stable releases as of March 2026. React 18, Vite 5, and Tailwind CSS 3 are all superseded. Multiple React deprecation patterns (`forwardRef`, `React.FC`) exist throughout the codebase. Build tooling misses significant performance improvements (Rolldown, Oxide engine).

## Approach

Aggressive single-branch upgrade of all major dependencies simultaneously, using official codemods and migration tools where available. This is a personal portfolio site with comprehensive test coverage (78 tests, 13 files), making an all-at-once approach low-risk.

## Dependency Changes

### Upgrades

| Package | From | To | Breaking? |
|---|---|---|---|
| `react` | ^18.3.1 | ^19.2.4 | Yes |
| `react-dom` | ^18.3.1 | ^19.2.4 | Yes |
| `vite` | ^5.4.2 | ^8.0.0 | Yes |
| `@vitejs/plugin-react` | ^4.3.1 | ^6.0.1 | Yes |
| `tailwindcss` | ^3.4.1 | ^4.2.1 | Yes |
| `typescript` | ^5.5.3 | ^5.9.0 | No |
| `eslint` | ^9.9.1 | ^10.0.3 | Yes |
| `typescript-eslint` | ^8.3.0 | latest stable | Yes |
| `eslint-plugin-react-hooks` | ^5.1.0-rc.0 | latest stable | No |
| `eslint-plugin-react-refresh` | ^0.4.11 | latest stable | No |
| `@types/react` | ^18.3.5 | ^19.x | Yes |
| `@types/react-dom` | ^18.3.0 | ^19.x | Yes |
| `lucide-react` | ^0.344.0 | ^0.577.0 | No |
| `dompurify` | ^3.1.7 | ^3.3.3 | No |
| `@types/dompurify` | ^3.0.5 | latest | No |
| `globals` | ^15.9.0 | latest | No |
| `jsdom` | ^29.0.0 | latest | No |
| `@testing-library/jest-dom` | ^6.9.1 | latest | No |
| `@testing-library/react` | ^16.3.2 | latest | No |
| `@testing-library/user-event` | ^14.6.1 | latest | No |

### Additions

| Package | Version | Purpose |
|---|---|---|
| `@tailwindcss/vite` | ^4.2.1 | Vite-native Tailwind 4 plugin (replaces PostCSS setup) |

### Removals

| Package | Reason |
|---|---|
| `autoprefixer` | Built into Tailwind 4 |
| `postcss` | No longer needed with `@tailwindcss/vite` |

## Deprecation Fixes

### React 19: Remove `forwardRef` (deprecated)

`ref` is now a regular prop on function components. `forwardRef` still works but triggers deprecation warnings.

**Files affected:**
- `src/components/Terminal/Terminal.tsx` — Remove `forwardRef` wrapper, accept `ref` as prop parameter alongside destructured props. `useImperativeHandle(ref, ...)` stays as-is.
- `src/components/Terminal/Suggestions.tsx` — Remove `React.forwardRef` wrapper, accept `ref` as prop.

### React 19: Replace `React.FC` (discouraged)

`React.FC` is not removed but is officially discouraged. It adds no value over plain typed function signatures and has historically caused issues with implicit `children` typing.

**Files affected (10):**
- `src/App.tsx` — `React.FC` → plain function
- `src/ThemeContext.tsx` — `React.FC<{ children: React.ReactNode }>` → typed function param
- `src/components/Sidebar.tsx` — `React.FC` → plain function
- `src/components/BootSplash.tsx` — `React.FC<Props>` → typed function param
- `src/components/StatusBar.tsx` — `React.FC<StatusBarProps>` → typed function param
- `src/components/TerminalWindow.tsx` — `React.FC<Props>` → typed function param
- `src/components/Terminal/AutoSuggestion.tsx` — `React.FC<AutoSuggestionProps>` → typed function param
- `src/components/Terminal/MatrixRain.tsx` — `React.FC<MatrixRainProps>` → typed function param
- `src/test/helpers.tsx` — `React.FC<{ children: React.ReactNode }>` → typed function param
- `src/__tests__/ThemeContext.test.tsx` — `React.FC<{ children: React.ReactNode }>` → typed function param

### React 19: Clean up unnecessary `import React`

With `"jsx": "react-jsx"` (automatic transform, already configured), `import React` is unnecessary in files that only use it for JSX. After removing `React.FC`, most files won't need the namespace import at all — only named imports (`useState`, `useEffect`, etc.).

**Files where `import React` can be removed entirely** (after `React.FC` removal):
- `src/main.tsx` (keep `ReactDOM` import)
- `src/components/TerminalWindow.tsx`
- `src/components/Terminal/AutoSuggestion.tsx`
- `src/components/Terminal/commands.tsx`
- `src/components/Terminal/Suggestions.tsx`
- `src/__tests__/ThemeContext.test.tsx`

**Files where `import React` becomes named imports only:**
- All component files that import hooks (`useState`, `useEffect`, `useRef`, etc.) already use named imports — just drop the `React` default import.

## Config File Changes

### `vite.config.ts` — Add Tailwind plugin, keep test config

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

### `src/index.css` — Tailwind 4 import syntax

Lines 1-3 change from:
```css
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';
```
To:
```css
@import "tailwindcss";
```

All custom CSS below (theme variables, CRT effects, animations, scrollbar) remains unchanged — standard CSS, no Tailwind utility renames involved.

### `tsconfig.app.json` — Bump target/lib

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"]
  }
}
```

### `eslint.config.js` — Bump ecmaVersion

```js
languageOptions: {
  ecmaVersion: 2024,  // was 2020
  globals: globals.browser,
},
```

### Files to delete

- `tailwind.config.js` — Tailwind 4 uses CSS-first config; auto content detection
- `postcss.config.js` — Replaced by `@tailwindcss/vite` plugin

## Test Updates

Test files referencing `forwardRef` or `React.FC` patterns need updating:
- `src/components/Terminal/__tests__/Terminal.test.tsx` — Update if mocking `forwardRef`
- `src/components/Terminal/__tests__/Suggestions.test.tsx` — Update if asserting ref behavior

All 78 existing tests must pass after the upgrade. The test infrastructure itself (Vitest 4.1.0, testing-library, jsdom) is already current.

## What Does NOT Change

- `index.html` — inline theme script untouched
- Custom CSS — all animations, CRT effects, scrollbar styling are standard CSS
- Sound engine, idle timer, matrix rain — pure hooks/canvas, no framework-level changes
- Project structure — no file moves or reorganization
- Tailwind utility classes — no renamed utilities (`bg-gradient-to-*`, `flex-shrink-*`, `flex-grow-*`) are used in this project

## Verification

1. `npm run build` — clean production build, no warnings
2. `npm run test:ci` — all 78 tests pass
3. `npm run lint` — no ESLint errors
4. Manual smoke test — dev server, all 4 themes, sound toggle, boot/shutdown sequences, mobile toolbar
