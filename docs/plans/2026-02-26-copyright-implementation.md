# Copyright Section Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a terminal-themed copyright to the sidebar (desktop) and below the terminal (mobile).

**Architecture:** Add copyright markup directly to `Sidebar.tsx` for desktop and `App.tsx` for mobile. Delete orphaned `Footer.tsx`. No new components or dependencies needed.

**Tech Stack:** React, TypeScript, Tailwind CSS, inline styles (matching existing patterns)

---

### Task 1: Add desktop copyright to Sidebar

**Files:**
- Modify: `src/components/Sidebar.tsx:19-66` (the `<aside>` element)

**Step 1: Add copyright section to sidebar**

In `src/components/Sidebar.tsx`, after the known_hosts `</div>` (line 65) and before the closing `</aside>` (line 66), add the copyright block. Also add `mt-auto` spacer to push it to the bottom:

```tsx
        {/* Copyright */}
        <div className="mt-auto font-mono text-xs pt-4">
          <p style={{ color: '#888' }}>$ cat /etc/copyright</p>
          <p style={{ color: '#00FF41' }}>&copy; {new Date().getFullYear()} DKoder Inc.</p>
          <p style={{ color: '#888' }}>All rights reserved.</p>
        </div>
```

**Step 2: Verify the build compiles**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add terminal-themed copyright to desktop sidebar"
```

---

### Task 2: Add mobile copyright to App

**Files:**
- Modify: `src/App.tsx:34-50` (below mobile keyboard bar)

**Step 1: Add mobile copyright below keyboard bar**

In `src/App.tsx`, after the mobile keyboard `</div>` (line 50) and before the closing `</div>` (line 51), add:

```tsx
        {/* Mobile copyright */}
        <div
          className="flex md:hidden justify-center shrink-0 py-2 font-mono text-xs"
          style={{ color: '#666', paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          &copy; {new Date().getFullYear()} DKoder Inc.
        </div>
```

Note: Move `paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))'` from the keyboard bar to this new copyright div, since this is now the bottommost element. Update the keyboard bar's style to remove its `paddingBottom` override.

Change line 37 from:
```tsx
          style={{ borderColor: '#333', paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
```
to:
```tsx
          style={{ borderColor: '#333' }}
```

**Step 2: Verify the build compiles**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add mobile copyright below terminal"
```

---

### Task 3: Delete orphaned Footer.tsx

**Files:**
- Delete: `src/components/Footer.tsx`

**Step 1: Verify Footer is not imported anywhere**

Run: `grep -r "Footer" src/ --include="*.tsx" --include="*.ts"`
Expected: Only `src/components/Footer.tsx` itself matches (no imports).

**Step 2: Delete the file**

```bash
rm src/components/Footer.tsx
```

**Step 3: Verify the build still compiles**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 4: Commit**

```bash
git add src/components/Footer.tsx
git commit -m "chore: remove orphaned Footer component"
```

---

### Task 4: Visual verification

**Step 1: Start dev server and verify desktop**

Run: `npm run dev`

Open browser at the dev URL. Verify:
- Copyright appears at the very bottom of the left sidebar
- `$ cat /etc/copyright` label is in gray (#888)
- `© 2026 DKoder Inc.` is in neon green (#00FF41)
- `All rights reserved.` is in gray (#888)
- Text is monospace, small (`text-xs`)

**Step 2: Verify mobile**

Resize browser to mobile width (< 768px). Verify:
- Copyright appears below the keyboard bar
- Text is centered, gray (#666), small
- Bottom padding respects safe area
