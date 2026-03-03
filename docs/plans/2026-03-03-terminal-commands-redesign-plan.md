# Terminal Commands Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove `uname -a` and `projects` commands, redesign `whoami` with expanded /etc/passwd format, add `history` career timeline command, and update cross-references.

**Architecture:** Single-file change to `commands.tsx` — update the `suggestions` array and `commands` map. One minor fix to `man dmytro` SEE ALSO section (remove `projects(1)` reference, add `history(1)`).

**Tech Stack:** React, TypeScript, lucide-react icons

---

### Task 1: Remove `uname -a` and `projects` from suggestions and commands

**Files:**
- Modify: `src/components/Terminal/commands.tsx:1-15` (suggestions array + imports)
- Modify: `src/components/Terminal/commands.tsx:56-92` (commands map entries)

**Step 1: Update imports**

Remove `FolderOpen` from the lucide-react import (was used by `projects` suggestion). Add `History` for the new `history` command.

```tsx
import { Cpu, Mail, Sparkles, User, Info, Clock, LogOut, History } from 'lucide-react';
```

**Step 2: Update suggestions array**

Remove the `projects` entry (line 9) and `uname -a` entry (line 12). Add `history` entry. New array:

```tsx
export const suggestions: CommandSuggestion[] = [
  { command: 'whoami', description: 'Display identity', icon: <User className="w-4 h-4 text-[#00FF41]" /> },
  { command: 'man dmytro', description: 'Manual page', icon: <Info className="w-4 h-4 text-[#00FF41]" /> },
  { command: 'skills', description: 'View technical expertise', icon: <Cpu className="w-4 h-4 text-[#00FF41]" /> },
  { command: 'history', description: 'View career timeline', icon: <History className="w-4 h-4 text-[#00FF41]" /> },
  { command: 'contact', description: 'Get contact information', icon: <Mail className="w-4 h-4 text-[#00FF41]" /> },
  { command: 'uptime', description: 'Session uptime', icon: <Clock className="w-4 h-4 text-[#00FF41]" /> },
  { command: 'clear', description: 'Clear terminal screen', icon: <Sparkles className="w-4 h-4 text-[#00FF41]" /> },
  { command: 'exit', description: 'Terminate the current session', icon: <LogOut className="w-4 h-4 text-[#00FF41]" /> },
];
```

**Step 3: Remove `uname -a` and `projects` entries from commands map**

Delete these two blocks:

```tsx
// DELETE:
'uname -a': [
  'Linux dkoderinc 6.1.0-backend #1 SMP PREEMPT Tue Jan 1 00:00:00 UTC 2026 x86_64 GNU/Linux',
],
// DELETE:
projects: [
  'GitHub Projects:',
  '',
  '  See pinned repositories and contributions at:',
  '  <a href="https://github.com/dkoval" ...>https://github.com/dkoval</a>',
],
```

**Step 4: Verify dev server renders correctly**

Run: `npm run dev`
Open browser. Press Tab — should see 8 suggestions (no `uname -a`, no `projects`). Type `uname -a` — should show "Command not found". Type `projects` — should show "Command not found".

**Step 5: Commit**

```bash
git add src/components/Terminal/commands.tsx
git commit -m "Remove uname -a and projects commands"
```

---

### Task 2: Redesign `whoami` command output

**Files:**
- Modify: `src/components/Terminal/commands.tsx:53-55` (whoami entry in commands map)

**Step 1: Replace whoami output**

Replace the single passwd line with the expanded format:

```tsx
whoami: [
  'dkoval:x:1000:1000:Dmytro Koval:/home/dkoval:/bin/bash',
  '',
  'Login:    dkoval',
  'Name:     Dmytro Koval',
  'Role:     Senior Software Engineer',
  'Focus:    Backend & Distributed Systems',
  'Stack:    Java \u00b7 Kotlin \u00b7 Kafka',
  'Exp:      15+ years',
  'Location: Toronto, CA',
  'Shell:    /bin/bash',
  'Status:   Open to opportunities',
],
```

**Step 2: Verify in browser**

Type `whoami` in terminal — should show the passwd line header followed by a blank line then the key-value pairs. Check alignment of the field labels.

**Step 3: Commit**

```bash
git add src/components/Terminal/commands.tsx
git commit -m "Redesign whoami with expanded /etc/passwd profile card"
```

---

### Task 3: Add `history` command

**Files:**
- Modify: `src/components/Terminal/commands.tsx` (add history entry to commands map)

**Step 1: Add history entry to commands map**

Add after the `whoami` entry:

```tsx
history: [
  '    1  Started professional software development',
  '    2  First enterprise Java project \u2014 fell in love with the JVM',
  '    3  Adopted microservices architecture early',
  '    4  Deep dive into Apache Kafka & event-driven systems',
  '    5  Tried Kotlin for backend development \u2014 absolutely loved it',
  '    6  Architecting distributed systems at scale',
  '    7  Pushing backend engineering initiatives forward',
  '    8  Building with OSS and AI',
  '    9  Still shipping. Still learning.',
],
```

**Step 2: Verify in browser**

Type `history` — should show numbered career milestones with right-aligned numbers and consistent spacing.

**Step 3: Commit**

```bash
git add src/components/Terminal/commands.tsx
git commit -m "Add history command with career timeline"
```

---

### Task 4: Fix `man dmytro` SEE ALSO cross-reference

**Files:**
- Modify: `src/components/Terminal/commands.tsx:83` (SEE ALSO line in man dmytro)

**Step 1: Update SEE ALSO**

The current line references `projects(1)` which no longer exists. Replace with `history(1)`:

```tsx
// Before:
'       skills(1), projects(1), contact(1)',
// After:
'       skills(1), history(1), contact(1)',
```

**Step 2: Verify in browser**

Type `man dmytro` — SEE ALSO should show `skills(1), history(1), contact(1)`.

**Step 3: Commit**

```bash
git add src/components/Terminal/commands.tsx
git commit -m "Update man dmytro SEE ALSO to reference history instead of projects"
```

---

### Task 5: Final visual verification

**Step 1: Full command walkthrough**

Run through every command in the terminal and verify output:
- `whoami` — expanded passwd card
- `man dmytro` — SEE ALSO updated
- `skills` — unchanged
- `history` — career timeline
- `contact` — unchanged
- `uptime` — unchanged
- `clear` — clears screen
- `exit` — shutdown animation
- Tab key — shows 8 suggestions in correct order
- Type garbage — "Command not found"

**Step 2: Check `help` output**

The help command auto-generates from the `suggestions` array, so it should already reflect the new command set. Verify all 8 commands appear in help.
