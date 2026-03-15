# Sound Command Enhancements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add sound command autocomplete with on/off arguments, improve StatusBar sound indicator styling, and add synthesized shutdown/reboot sound effects.

**Architecture:** Four targeted file edits — extend the sound engine with two new sound types, refactor the sound command handler to mirror the theme command pattern, add conditional styling to the StatusBar button, and wire shutdown/reboot sounds into App.tsx's state machine.

**Tech Stack:** React 18, TypeScript, Web Audio API (existing useSoundEngine)

**Spec:** `docs/superpowers/specs/2026-03-14-sound-command-enhancements-design.md`

---

## Chunk 1: Sound Engine & Terminal Changes

### Task 1: Export SoundType and add new sound types

**Files:**
- Modify: `src/hooks/useSoundEngine.ts:3` (SoundType union)
- Modify: `src/hooks/useSoundEngine.ts:55-90` (play() switch)

- [ ] **Step 1: Export `SoundType` and add new members**

At line 3, change:
```typescript
type SoundType = 'keypress' | 'execute' | 'error' | 'themeSwitch' | 'boot';
```
to:
```typescript
export type SoundType = 'keypress' | 'execute' | 'error' | 'themeSwitch' | 'boot' | 'shutdown' | 'systemType';
```

- [ ] **Step 2: Add `shutdown` case to the `play()` switch**

After the `boot` case (line 88), before the closing `}` of the switch, add:

```typescript
      case 'shutdown': {
        const notes = [660, 440, 220];
        notes.forEach((freq, i) => {
          setTimeout(() => playTone(freq, 80, 'sine', 0.04), i * 50);
        });
        break;
      }
```

This mirrors the `boot` case (ascending 330→440→660) but descends 660→440→220 with slightly different timing (50ms stagger vs 70ms).

- [ ] **Step 3: Add `systemType` case to the `play()` switch**

After the new `shutdown` case, add:

```typescript
      case 'systemType':
        playTone(600, 20, 'sine', 0.02);
        break;
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSoundEngine.ts
git commit -m "feat: add shutdown and systemType sounds to sound engine"
```

---

### Task 2: Sound command autocomplete and handler refactor

**Files:**
- Modify: `src/components/Terminal/Terminal.tsx:117-139` (updateAutoSuggestion)
- Modify: `src/components/Terminal/Terminal.tsx:260-265` (sound command handler)

- [ ] **Step 1: Add sound argument autocomplete**

In `updateAutoSuggestion` (line 117-139), add this block after the `theme ` check (after line 132) and before the generic command fallback (line 134):

```typescript
    // Suggest sound arguments: "sound o" → "sound on" / "sound of" → "sound off"
    if (lower.startsWith('sound ') && lower.length > 6) {
      const partial = lower.slice(6);
      const match = ['on', 'off'].find(s => s.startsWith(partial));
      if (match) {
        setAutoSuggestion(`sound ${match}`);
        return;
      }
    }
```

- [ ] **Step 2: Refactor sound command handler**

Replace lines 260-265:
```typescript
      } else if (trimmedCmd === 'sound' || trimmedCmd === 'sound on' || trimmedCmd === 'sound off') {
        const wantOn = trimmedCmd === 'sound' ? !soundEnabled : trimmedCmd === 'sound on';
        onSoundSet?.(wantOn);
        outputLines = [
          { content: `Sound ${wantOn ? 'enabled' : 'disabled'}.`, type: 'output' },
        ];
```

With:
```typescript
      } else if (trimmedCmd === 'sound' || trimmedCmd.startsWith('sound ')) {
        const arg = trimmedCmd.replace('sound', '').trim();
        if (!arg) {
          outputLines = [
            { content: `Sound: ${soundEnabled ? 'on' : 'off'}`, type: 'output' },
            { content: `Usage: sound <on|off>`, type: 'output' },
          ];
        } else if (arg === 'on') {
          onSoundSet?.(true);
          outputLines = [
            { content: 'Sound enabled.', type: 'output' },
          ];
        } else if (arg === 'off') {
          onSoundSet?.(false);
          outputLines = [
            { content: 'Sound disabled.', type: 'output' },
          ];
        } else {
          outputLines = [
            { content: `Unknown option: ${arg}. Usage: sound <on|off>`, type: 'error' },
          ];
        }
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Terminal/Terminal.tsx
git commit -m "feat: add sound command autocomplete and help output"
```

---

### Task 3: StatusBar sound indicator styling

**Files:**
- Modify: `src/components/StatusBar.tsx:46-53` (sound button)

- [ ] **Step 1: Update sound button styling**

Replace lines 46-53:
```typescript
            <button
              className="status-bar-item cursor-pointer bg-transparent border-none p-0 font-mono"
              style={{ color: 'var(--terminal-gray)', fontSize: 'inherit' }}
              onClick={onSoundToggle}
              title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            >
              ♪ {soundEnabled ? 'on' : 'off'}
            </button>
```

With:
```typescript
            <button
              className="status-bar-item cursor-pointer bg-transparent border-none p-0 font-mono"
              style={{
                color: soundEnabled ? 'var(--terminal-primary)' : 'var(--terminal-gray)',
                fontSize: 'inherit',
                textDecoration: soundEnabled ? 'none' : 'line-through',
              }}
              onClick={onSoundToggle}
              title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            >
              ♪ {soundEnabled ? 'on' : 'off'}
            </button>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/StatusBar.tsx
git commit -m "feat: add conditional styling to StatusBar sound indicator"
```

---

## Chunk 2: Shutdown/Reboot Sounds

### Task 4: Wire shutdown and reboot sounds into App.tsx

**Files:**
- Modify: `src/App.tsx:90-93` (handleShutdown callback)
- Modify: `src/App.tsx:136-156` (typing animation useEffect)

- [ ] **Step 1: Play shutdown sound in handleShutdown**

Replace lines 90-93:
```typescript
  const handleShutdown = useCallback(() => {
    setShutdownPhase('messages');
    setShutdownLines(0);
  }, []);
```

With:
```typescript
  const handleShutdown = useCallback(() => {
    sound.play('shutdown');
    setShutdownPhase('messages');
    setShutdownLines(0);
  }, [sound.play]);
```

Note: use `sound.play` (a `useCallback`-wrapped function) rather than `sound` (a fresh object each render) for a more precise dependency.

- [ ] **Step 2: Play systemType sound per character during restart typing**

In the typing animation effect (lines 136-156), modify the character-increment timer at line 143. Replace:

```typescript
      const timer = setTimeout(() => setTypingChar(c => c + 1), 50);
```

With:

```typescript
      const timer = setTimeout(() => {
        sound.play('systemType');
        setTypingChar(c => c + 1);
      }, 50);
```

Important: `sound.play` is called inside the timer callback. Do NOT add `sound` to the effect's dependency array — the effect should continue to depend only on `[shutdownPhase, typingLine, typingChar]` to avoid re-triggering the animation. Add an ESLint suppression comment above the dependency array at line 156:

```typescript
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shutdownPhase, typingLine, typingChar]);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`

Verify:
1. Type `sound` → shows current state + usage
2. Type `sound on` / `sound off` → enables/disables with message
3. Type `sound foo` → error message
4. Type `sound o` → autocomplete suggests `sound on`
5. Type `sound of` → autocomplete suggests `sound off`
6. StatusBar: `♪ on` is bright (terminal-primary), `♪ off` is gray with strikethrough
7. Enable sound, type `exit` → hear descending tones during shutdown
8. Restart prompt typing → hear soft per-character tones
9. After restart → hear existing boot sound

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add shutdown and reboot typing sound effects"
```
