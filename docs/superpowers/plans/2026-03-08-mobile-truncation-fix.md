# Mobile Output Truncation Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix terminal command output truncation on mobile viewports by creating mobile-optimized variants for `skills` and tightening `history` output.

**Architecture:** Add a `skillsMobile` command variant in `commands.tsx` with shorter 6-char bars and tighter spacing. Update `history` to remove excess indent and shorten long lines (single variant for both viewports). Select `skillsMobile` vs `skills` in `Terminal.tsx` using the existing `isMobile` hook, same pattern as `whoami`/`whoamiDesktop`.

**Tech Stack:** React, TypeScript

---

### Task 1: Update `skills` desktop to 5-level scale

**Files:**
- Modify: `src/components/Terminal/commands.tsx:18-36`

**Step 1: Update the desktop `skills` output**

Replace the current `skills` array with the 5-level proportional bar scale (12-char bars):
- learning: `██░░░░░░░░░░` (2/12)
- basic: `████░░░░░░░░` (4/12)
- familiar: `██████░░░░░░` (6/12)
- proficient: `████████░░░░` (8/12)
- expert: `████████████` (12/12)

```typescript
skills: [
  'Programming Languages:',
  '  Java    ████████████ expert',
  '  Kotlin  ████████████ expert',
  '  Scala   ████████░░░░ proficient',
  '  Python  ██████░░░░░░ familiar',
  '',
  'System Design:',
  '  Microservices      ████████████ expert',
  '  Event-driven arch  ████████████ expert',
  '  API design         ████████████ expert',
  '',
  'Core Technologies:',
  '  Spring Boot        ████████████ expert',
  '  Project Reactor    ████████░░░░ proficient',
  '  Apache Kafka       ████████████ expert',
  '  Elasticsearch      ████████░░░░ proficient',
  '  Postgres/MySQL     ████████░░░░ proficient',
],
```

Note: The desktop `skills` output already happens to use correct bar proportions for expert (12/12), proficient (8/12), and familiar (6/12). No actual changes needed — but verify visually that it matches the 5-level scale above.

**Step 2: Commit**

```bash
git add src/components/Terminal/commands.tsx
git commit -m "chore: verify skills desktop bars match 5-level scale"
```

Skip this commit if no changes were needed.

---

### Task 2: Add `skillsMobile` variant

**Files:**
- Modify: `src/components/Terminal/commands.tsx`

**Step 1: Add `skillsMobile` to the commands map**

Add after the `skills` entry. Use 6-char bars with tighter spacing:
- learning: `█░░░░░` (1/6)
- basic: `██░░░░` (2/6)
- familiar: `███░░░` (3/6)
- proficient: `████░░` (4/6)
- expert: `██████` (6/6)

```typescript
skillsMobile: [
  'Languages:',
  '  Java    ██████ expert',
  '  Kotlin  ██████ expert',
  '  Scala   ████░░ proficient',
  '  Python  ███░░░ familiar',
  '',
  'System Design:',
  '  Microservices  ██████ expert',
  '  Event-driven   ██████ expert',
  '  API design     ██████ expert',
  '',
  'Core Tech:',
  '  Spring Boot  ██████ expert',
  '  Reactor      ████░░ proficient',
  '  Kafka        ██████ expert',
  '  Elastic      ████░░ proficient',
  '  Postgres     ████░░ proficient',
],
```

Key mobile adaptations:
- Section headers shortened ("Programming Languages" → "Languages", "Core Technologies" → "Core Tech")
- Skill names shortened where needed ("Event-driven arch" → "Event-driven", "Project Reactor" → "Reactor", "Elasticsearch" → "Elastic", "Postgres/MySQL" → "Postgres")
- 6-char bars instead of 12

**Step 2: Commit**

```bash
git add src/components/Terminal/commands.tsx
git commit -m "feat: add mobile-optimized skills variant with shorter bars"
```

---

### Task 3: Wire up `skillsMobile` selection in Terminal.tsx

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx`

**Step 1: Add `skills` to the `isMobile` selection pattern**

Find the `whoami` command handling (around line 167-171) and add the same pattern for `skills`. Look for where commands are dispatched and add:

```typescript
if (trimmedCmd === 'skills') {
  const key = isMobile ? 'skillsMobile' : 'skills';
  outputLines = commands[key].map(line => ({
    content: line,
    type: 'output' as const,
  }));
}
```

This should be placed alongside the existing `whoami` special-case handling, before the generic command lookup.

**Step 2: Verify the `skills` command is no longer handled by the generic fallback**

Make sure the generic `commands[trimmedCmd]` lookup won't also try to render `skills`. The early handling with explicit `outputLines` assignment should prevent this — confirm the existing control flow.

**Step 3: Test manually**

Run: `npm run dev`

- Open in browser, use mobile responsive mode (Pixel 9 Pro XL dimensions: 412x922)
- Type `skills` — should show 6-char bars, shortened labels
- Switch to desktop width — should show 12-char bars, full labels

**Step 4: Commit**

```bash
git add src/components/Terminal/Terminal.tsx
git commit -m "feat: select mobile/desktop skills variant based on viewport"
```

---

### Task 4: Tighten `history` output

**Files:**
- Modify: `src/components/Terminal/commands.tsx:56-66`

**Step 1: Update the `history` array**

Remove the 4-space left indent and shorten long lines:

```typescript
history: [
  ' 1  Started professional software development',
  ' 2  First enterprise Java project — hooked on the JVM',
  ' 3  Adopted microservices architecture early',
  ' 4  Deep dive into Kafka & event-driven systems',
  ' 5  Tried Kotlin for backend — loved it',
  ' 6  Architecting distributed systems at scale',
  ' 7  Pushing backend engineering forward',
  ' 8  Building with OSS and AI',
  ' 9  Still shipping. Still learning.',
],
```

Changes from current:
- Leading indent: `    ` (4 spaces) → ` ` (1 space)
- Line 2: "fell in love with the JVM" → "hooked on the JVM"
- Line 4: "Apache Kafka & event-driven systems" → "Kafka & event-driven systems"
- Line 5: "Tried Kotlin for backend development — absolutely loved it" → "Tried Kotlin for backend — loved it"
- Line 7: "Pushing backend engineering initiatives forward" → "Pushing backend engineering forward"

**Step 2: Test manually**

Run: `npm run dev`

- Mobile viewport: `history` should fit without truncation
- Desktop viewport: `history` should still look clean with tighter indent

**Step 3: Commit**

```bash
git add src/components/Terminal/commands.tsx
git commit -m "fix: tighten history output to prevent mobile truncation"
```

---

### Task 5: Final verification

**Step 1: Test all commands on mobile viewport**

Run: `npm run dev`

Open mobile responsive mode and verify each command:
- `skills` — 6-char bars, no truncation
- `history` — no truncation, consistent indent
- `whoami` — already has mobile variant, should be fine
- `man dmytro` — HTML, not touched, verify no regression
- `contact` — HTML, not touched, verify no regression
- `uptime` — short output, verify no regression
- `theme` — handled inline, verify no regression

**Step 2: Test on desktop viewport**

Same commands — verify no regressions on desktop output.

**Step 3: Final commit (if any tweaks needed)**

```bash
git add -A
git commit -m "fix: mobile output truncation adjustments"
```
