# Terminal Commands Redesign

**Date:** 2026-03-03
**Status:** Approved

## Goal

Tighten the terminal command set: remove low-value commands, redesign `whoami` into a standout moment, and add a `history` command for career storytelling. Keep 8 total commands — every one earns its place.

## Tone

Professional content, clever UNIX framing. Same balanced tone as the existing `man dmytro`.

## Changes

### Remove: `uname -a`

Output (`Linux dkoderinc 6.1.0-backend ...`) doesn't attract users or convey useful info.

### Remove: `projects`

Sidebar already links to GitHub. Frees a slot for something more interesting.

### Redesign: `whoami`

Replace the single `/etc/passwd` line with an expanded format:

```
dkoval:x:1000:1000:Dmytro Koval:/home/dkoval:/bin/bash

Login:    dkoval
Name:     Dmytro Koval
Role:     Senior Software Engineer
Focus:    Backend & Distributed Systems
Stack:    Java · Kotlin · Kafka
Exp:      15+ years
Location: Toronto, CA
Shell:    /bin/bash
Status:   Open to opportunities
```

The passwd line stays as a recognizable header. The expanded fields below make it actually informative.

### New: `history`

Career timeline styled as shell history output:

```
    1  Started professional software development
    2  First enterprise Java project — fell in love with the JVM
    3  Adopted microservices architecture early
    4  Deep dive into Apache Kafka & event-driven systems
    5  Tried Kotlin for backend development — absolutely loved it
    6  Architecting distributed systems at scale
    7  Pushing backend engineering initiatives forward
    8  Building with OSS and AI
    9  Still shipping. Still learning.
```

Numbered entries like real `history` output. No years — the progression speaks for itself.

## Final Command Set (8 commands)

| # | Command | Suggestion hint | Icon | Status |
|---|---------|-----------------|------|--------|
| 1 | `whoami` | Display identity | User | Redesigned |
| 2 | `man dmytro` | Manual page | Info | Unchanged |
| 3 | `skills` | View technical expertise | Cpu | Unchanged |
| 4 | `history` | View career timeline | Clock | New |
| 5 | `contact` | Get contact information | Mail | Unchanged |
| 6 | `uptime` | Session uptime | Clock | Unchanged |
| 7 | `clear` | Clear terminal screen | Sparkles | Unchanged |
| 8 | `exit` | Terminate the current session | LogOut | Unchanged |

## Files to Modify

- `src/components/Terminal/commands.tsx` — Update suggestions array (remove 2, add 1, reorder), update commands map (remove 2 entries, redesign whoami, add history)
- No changes needed to `Terminal.tsx` — all commands use the existing static output path

## Out of Scope

- No changes to `man dmytro`, `skills`, `contact`, `uptime`, `clear`, `exit`
- No changes to Terminal component logic
- No changes to Sidebar
