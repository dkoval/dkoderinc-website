# Remove Swipe-to-Navigate-History Gesture Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the swipe gesture that conflicts with native touch scrolling on mobile, restoring clean scroll behavior.

**Architecture:** Pure deletion of ~15 lines from Terminal.tsx — one ref, two handler functions, two JSX props. No new code. Mobile toolbar buttons already provide history navigation.

**Tech Stack:** React 18, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-14-remove-swipe-history-gesture-design.md`

---

## File Structure

- Modify: `src/components/Terminal/Terminal.tsx` (delete swipe-related code)
- Update: `MEMORY.md` (remove swipe gesture references from project documentation)

---

## Chunk 1: Remove swipe gesture and update docs

### Task 1: Remove swipe gesture code from Terminal.tsx

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx:51,556-570,589-590`

- [ ] **Step 1: Delete `touchStartY` ref**

Remove line 51:
```typescript
// DELETE this line:
const touchStartY = useRef<number | null>(null);
```

- [ ] **Step 2: Delete `handleTouchStart` and `handleTouchEnd` functions**

Remove lines 556-570:
```typescript
// DELETE this entire block:
const handleTouchStart = (e: React.TouchEvent) => {
  touchStartY.current = e.touches[0].clientY;
};

const handleTouchEnd = (e: React.TouchEvent) => {
  if (touchStartY.current === null) return;
  const deltaY = touchStartY.current - e.changedTouches[0].clientY;
  touchStartY.current = null;
  if (Math.abs(deltaY) < 50) return;
  if (deltaY > 0) {
    actionUp();
  } else {
    actionDown();
  }
};
```

- [ ] **Step 3: Remove `onTouchStart`/`onTouchEnd` props from the scrollable div**

In the JSX, remove the two touch handler props from the `terminalRef` div (lines 589-590):
```tsx
// BEFORE:
<div
  ref={terminalRef}
  className="h-full overflow-y-auto overflow-x-hidden text-sm terminal-scroll"
  style={{...}}
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
>

// AFTER:
<div
  ref={terminalRef}
  className="h-full overflow-y-auto overflow-x-hidden text-sm terminal-scroll"
  style={{...}}
>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors (no other code references the deleted symbols)

- [ ] **Step 5: Verify dev server runs**

Run: `npm run dev` (check it starts without errors, then stop)

- [ ] **Step 6: Commit**

```bash
git add src/components/Terminal/Terminal.tsx
git commit -m "Remove swipe-to-navigate-history gesture on mobile

The vertical swipe gesture on the terminal output area conflicted with
native touch scrolling. Mobile toolbar buttons already provide history
navigation, making the gesture redundant."
```

### Task 2: Update MEMORY.md

**Files:**
- Modify: `.claude/projects/-Users-null-projects-dkoderinc-website/memory/MEMORY.md`

- [ ] **Step 1: Remove swipe gesture references**

Remove these lines from the "Patterns & Conventions" section:
```
- Swipe up/down on terminal area navigates command history (50px threshold)
```

- [ ] **Step 2: Commit**

```bash
git add .claude/projects/-Users-null-projects-dkoderinc-website/memory/MEMORY.md
git commit -m "docs: remove swipe gesture reference from memory"
```
