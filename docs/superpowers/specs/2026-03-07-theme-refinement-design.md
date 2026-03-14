# Theme Refinement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace white, darcula, and gruvbox themes with Tokyo Night and One Dark Pro.

**Architecture:** Swap CSS custom property blocks, update the TypeScript union type and theme array, sync the inline FOUC-prevention script, update headshot filter map, and replace the gruvbox Easter egg with two new ones.

**Tech Stack:** React 18, TypeScript, CSS custom properties, Vite

---

### Task 1: Update CSS theme definitions

**Files:**
- Modify: `src/index.css:40-94` (remove white, gruvbox, darcula blocks; add tokyo-night and one-dark-pro)

**Step 1: Remove the three old theme blocks and add two new ones**

Replace lines 40-94 (the white, gruvbox, and darcula theme blocks) with:

```css
/* Theme: Tokyo Night */
:root[data-theme="tokyo-night"] {
  --terminal-primary: #7AA2F7;
  --terminal-primary-dim: #565F89;
  --terminal-primary-dark: #3B4261;
  --terminal-bg: #1A1B26;
  --terminal-surface: #24283B;
  --terminal-border: #3B4261;
  --terminal-gray: #565F89;
  --terminal-error: #F7768E;
  --terminal-output: #A9B1D6;
  --terminal-glow: rgba(122, 162, 247, 0.15);
  --terminal-glow-soft: rgba(122, 162, 247, 0.05);
  --terminal-scanline: rgba(0, 0, 0, 0.02);
  --terminal-vignette: rgba(0, 0, 0, 0.3);
}

/* Theme: One Dark Pro */
:root[data-theme="one-dark-pro"] {
  --terminal-primary: #61AFEF;
  --terminal-primary-dim: #5C6370;
  --terminal-primary-dark: #4B5263;
  --terminal-bg: #282C34;
  --terminal-surface: #2C313A;
  --terminal-border: #3E4452;
  --terminal-gray: #5C6370;
  --terminal-error: #E06C75;
  --terminal-output: #ABB2BF;
  --terminal-glow: rgba(97, 175, 239, 0.15);
  --terminal-glow-soft: rgba(97, 175, 239, 0.05);
  --terminal-scanline: rgba(0, 0, 0, 0.02);
  --terminal-vignette: rgba(0, 0, 0, 0.25);
}
```

**Step 2: Commit**

```bash
git add src/index.css
git commit -m "Replace white/darcula/gruvbox CSS themes with tokyo-night and one-dark-pro"
```

---

### Task 2: Update ThemeContext type and array

**Files:**
- Modify: `src/ThemeContext.tsx:3,6`

**Step 1: Update the ThemeName type (line 3)**

Replace:
```ts
export type ThemeName = 'green' | 'amber' | 'white' | 'darcula' | 'gruvbox';
```
With:
```ts
export type ThemeName = 'green' | 'amber' | 'tokyo-night' | 'one-dark-pro';
```

**Step 2: Update VALID_THEMES array (line 6)**

Replace:
```ts
export const VALID_THEMES: ThemeName[] = ['green', 'amber', 'white', 'darcula', 'gruvbox'];
```
With:
```ts
export const VALID_THEMES: ThemeName[] = ['green', 'amber', 'tokyo-night', 'one-dark-pro'];
```

**Step 3: Commit**

```bash
git add src/ThemeContext.tsx
git commit -m "Update ThemeName type and VALID_THEMES for new themes"
```

---

### Task 3: Update index.html FOUC-prevention script

**Files:**
- Modify: `index.html:11`

**Step 1: Update the inline theme list**

Replace:
```js
if (t && ['green','amber','white','darcula','gruvbox'].includes(t)) {
```
With:
```js
if (t && ['green','amber','tokyo-night','one-dark-pro'].includes(t)) {
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "Sync index.html inline theme list with new themes"
```

---

### Task 4: Update Sidebar headshot filters

**Files:**
- Modify: `src/components/Sidebar.tsx:6-12`

**Step 1: Replace the HEADSHOT_FILTERS map**

Replace:
```ts
const HEADSHOT_FILTERS: Record<ThemeName, string> = {
  green: 'grayscale(100%) sepia(60%) hue-rotate(80deg) saturate(200%)',
  amber: 'grayscale(100%) sepia(80%) saturate(200%)',
  white: 'grayscale(100%)',
  darcula: 'grayscale(100%) brightness(0.9) contrast(1.1)',
  gruvbox: 'grayscale(100%) sepia(40%) saturate(150%)',
};
```
With:
```ts
const HEADSHOT_FILTERS: Record<ThemeName, string> = {
  green: 'grayscale(100%) sepia(60%) hue-rotate(80deg) saturate(200%)',
  amber: 'grayscale(100%) sepia(80%) saturate(200%)',
  'tokyo-night': 'grayscale(100%) sepia(20%) hue-rotate(190deg) saturate(200%) brightness(0.9)',
  'one-dark-pro': 'grayscale(100%) sepia(15%) hue-rotate(180deg) saturate(150%) brightness(0.9)',
};
```

**Step 2: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "Update headshot filters for tokyo-night and one-dark-pro"
```

---

### Task 5: Replace Easter egg logic in Terminal

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx:188-194`

**Step 1: Replace the gruvbox Easter egg with two new Easter eggs**

Replace:
```ts
          const isGruvboxFirstTime = arg === 'gruvbox' && !localStorage.getItem('dkoder-gruvbox-seen');
          setTheme(arg as ThemeName);
          if (isGruvboxFirstTime) {
            localStorage.setItem('dkoder-gruvbox-seen', '1');
            outputLines = [
              { content: 'Monitor upgrade detected. Welcome to the 21st century.', type: 'output' },
            ];
          } else {
```
With:
```ts
          const easterEggs: Partial<Record<ThemeName, { key: string; message: string }>> = {
            'tokyo-night': { key: 'dkoder-tokyo-night-seen', message: 'Welcome to Neo-Tokyo. The night shift begins.' },
            'one-dark-pro': { key: 'dkoder-one-dark-pro-seen', message: 'Dark mode activated. Your eyes will thank you.' },
          };
          const egg = easterEggs[arg as ThemeName];
          const isFirstTime = egg && !localStorage.getItem(egg.key);
          setTheme(arg as ThemeName);
          if (isFirstTime) {
            localStorage.setItem(egg.key, '1');
            outputLines = [
              { content: egg.message, type: 'output' },
            ];
          } else {
```

**Step 2: Commit**

```bash
git add src/components/Terminal/Terminal.tsx
git commit -m "Replace gruvbox Easter egg with tokyo-night and one-dark-pro Easter eggs"
```

---

### Task 6: Visual verification

**Step 1: Run the dev server**

```bash
npm run dev
```

**Step 2: Verify each theme visually**

For each theme (green, amber, tokyo-night, one-dark-pro):
1. Type `theme <name>` in terminal — confirm it switches
2. Check headshot photo has correct color tint
3. Check CRT glow/scanline effect looks right
4. Check the suggestions panel → theme sub-menu renders correctly
5. Check auto-suggestion works: type `theme tok` → should suggest `theme tokyo-night`
6. On mobile viewport (Chrome DevTools): confirm suggestions panel renders at correct touch-target size (min-h-[44px])

**Step 3: Verify Easter eggs**

1. Clear localStorage: `localStorage.clear()` in console
2. Type `theme tokyo-night` → should show "Welcome to Neo-Tokyo. The night shift begins."
3. Type `theme tokyo-night` again → should show "Theme switched to tokyo-night."
4. Type `theme one-dark-pro` → should show "Dark mode activated. Your eyes will thank you."

**Step 4: Verify migration**

1. In console: `localStorage.setItem('dkoder-theme', 'gruvbox')`
2. Refresh page → should fall back to green theme

**Step 5: Build check**

```bash
npm run build
```
Expected: Clean build, no TypeScript errors (exhaustive ThemeName checking in Sidebar will catch missing entries at compile time).
