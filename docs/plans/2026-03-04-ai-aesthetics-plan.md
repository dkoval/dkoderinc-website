# AI Aesthetics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add AI "thinking" spinner to terminal command output and an animated ASCII neural network to the sidebar.

**Architecture:** Two independent features. The terminal spinner introduces async command handling — a brief braille animation plays before output renders. The sidebar gets a new `AsciiNeuralNet` component that fills remaining vertical space with a slowly animating ASCII art neural network.

**Tech Stack:** React 18, TypeScript, CSS animations, setInterval for ticker updates.

---

### Task 1: Add AI thinking spinner to terminal

**Files:**
- Modify: `src/components/Terminal/types.ts`
- Modify: `src/components/Terminal/Terminal.tsx`
- Modify: `src/index.css`

**Step 1: Add spinner type to TerminalLine**

In `src/components/Terminal/types.ts`, add `'spinner'` to the `type` union:

```ts
export interface TerminalLine {
  content: string;
  type: 'input' | 'output' | 'error' | 'success' | 'spinner';
  isHtml?: boolean;
  timestamp?: string;
  helpEntry?: { commandIndex: number };
}
```

**Step 2: Add spinner CSS animation**

In `src/index.css`, add a braille spinner keyframe animation:

```css
/* AI thinking spinner */
@keyframes spin-braille {
  0%   { content: '⠋'; }
  10%  { content: '⠙'; }
  20%  { content: '⠹'; }
  30%  { content: '⠸'; }
  40%  { content: '⠼'; }
  50%  { content: '⠴'; }
  60%  { content: '⠦'; }
  70%  { content: '⠧'; }
  80%  { content: '⠇'; }
  90%  { content: '⠏'; }
}

.ai-spinner::before {
  content: '⠋';
  animation: spin-braille 0.8s steps(1) infinite;
  color: #00FF41;
}
```

**Step 3: Modify handleCommand for async spinner**

In `src/components/Terminal/Terminal.tsx`, modify `handleCommand` (lines 94-165). The logic:

1. For commands that produce output (not `clear`, `exit`, empty input), first append the input line + a spinner line
2. After a delay (600ms), replace the spinner line with real output
3. `clear` and `exit` remain synchronous (no spinner)
4. `uptime` also gets the spinner treatment since it produces output

Add a ref to track the spinner timeout for cleanup:

```ts
const spinnerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

Clean it up in a useEffect cleanup.

Replace the command output logic in `handleCommand` — after the early returns for `clear` and `exit`:

```ts
// Add input line + spinner
const inputLine: TerminalLine = {
  content: `$ ${trimmedCmd}`,
  type: 'input',
  timestamp: getCurrentTime(),
};
const spinnerLine: TerminalLine = {
  content: 'processing query...',
  type: 'spinner',
};

setTerminalOutput(prev => [...prev, inputLine, spinnerLine]);
setCommandHistory(prev => [...prev, trimmedCmd].slice(-MAX_HISTORY));
setHistoryIndex(-1);
setInputCommand('');
setAutoSuggestion(null);

// After delay, replace spinner with real output
spinnerTimeoutRef.current = setTimeout(() => {
  // Build the real output lines (uptime special case + commands map + error)
  let outputLines: TerminalLine[];

  if (trimmedCmd === 'uptime') {
    const seconds = Math.floor((Date.now() - PAGE_LOAD_TIME) / 1000);
    outputLines = [
      { content: ` up ${formatUptime(seconds)} (this session)`, type: 'output' },
      { content: ` up 15+ years (career)`, type: 'output' },
      { content: ` load average: 0.42, 0.15, 0.07`, type: 'output' },
    ];
  } else {
    const output = commands[trimmedCmd as keyof typeof commands] || `Command not found: ${cmd}`;
    outputLines = Array.isArray(output)
      ? output.map(line => ({
          content: line,
          type: 'output' as const,
          isHtml: trimmedCmd === 'contact',
        }))
      : [{
          content: output,
          type: output.startsWith('Command not found') ? 'error' as const : 'output' as const,
        }];
  }

  // Replace spinner line with real output
  setTerminalOutput(prev => {
    const lastSpinnerIndex = prev.findLastIndex(l => l.type === 'spinner');
    if (lastSpinnerIndex === -1) return [...prev, ...outputLines];
    return [...prev.slice(0, lastSpinnerIndex), ...outputLines];
  });
}, 600);
```

**Step 4: Render spinner line in terminal output**

In the terminal output rendering (line 316-340), add handling for the spinner type. In the `<p>` element content area, add a case:

```tsx
{line.type === 'spinner' ? (
  <span className="inline-flex items-center gap-2">
    <span className="ai-spinner" />
    <span style={{ color: '#888' }}>{line.content}</span>
  </span>
) : line.helpEntry ? (
  // ... existing helpEntry rendering
```

**Step 5: Add spinner color to getLineColor**

In `getLineColor` function (line 391-398), add the spinner case:

```ts
case 'spinner': return 'text-[#00FF41]';
```

**Step 6: Clean up timeout on unmount**

Add cleanup in the existing useEffect or a new one:

```ts
useEffect(() => {
  return () => {
    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current);
    }
  };
}, []);
```

**Step 7: Verify in browser**

Run: `npm run dev`
- Type `skills` — should see spinner for ~600ms, then real output
- Type `clear` — should clear immediately, no spinner
- Type `exit` — should shutdown immediately, no spinner
- Type `uptime` — should see spinner, then uptime output
- Type garbage — should see spinner, then error

**Step 8: Commit**

```bash
git add src/components/Terminal/types.ts src/components/Terminal/Terminal.tsx src/index.css
git commit -m "feat: add AI thinking spinner to terminal commands"
```

---

### Task 2: Create animated ASCII neural network component

**Files:**
- Create: `src/components/AsciiNeuralNet.tsx`

**Step 1: Create the AsciiNeuralNet component**

Create `src/components/AsciiNeuralNet.tsx`:

```tsx
import { useState, useEffect, useRef, useCallback } from 'react';

// Define a neural network topology as nodes with x,y positions and connections
interface Node {
  x: number;  // column position (0-based)
  y: number;  // row position (0-based)
  id: number;
}

interface Connection {
  from: number;  // node id
  to: number;    // node id
}

// Fixed topology - 3 layers resembling a simple neural network
const NODES: Node[] = [
  // Input layer (left)
  { x: 2, y: 1, id: 0 },
  { x: 2, y: 4, id: 1 },
  { x: 2, y: 7, id: 2 },
  { x: 2, y: 10, id: 3 },
  // Hidden layer (middle)
  { x: 12, y: 2, id: 4 },
  { x: 12, y: 5, id: 5 },
  { x: 12, y: 8, id: 6 },
  // Output layer (right)
  { x: 22, y: 3, id: 7 },
  { x: 22, y: 7, id: 8 },
];

const CONNECTIONS: Connection[] = [
  // Input -> Hidden (full connections)
  { from: 0, to: 4 }, { from: 0, to: 5 }, { from: 0, to: 6 },
  { from: 1, to: 4 }, { from: 1, to: 5 }, { from: 1, to: 6 },
  { from: 2, to: 4 }, { from: 2, to: 5 }, { from: 2, to: 6 },
  { from: 3, to: 4 }, { from: 3, to: 5 }, { from: 3, to: 6 },
  // Hidden -> Output (full connections)
  { from: 4, to: 7 }, { from: 4, to: 8 },
  { from: 5, to: 7 }, { from: 5, to: 8 },
  { from: 6, to: 7 }, { from: 6, to: 8 },
];

const GRID_COLS = 25;
const GRID_ROWS = 12;

const buildGrid = (): string[][] => {
  const grid: string[][] = Array.from({ length: GRID_ROWS }, () =>
    Array(GRID_COLS).fill(' ')
  );

  // Draw connections as simple lines between nodes
  for (const conn of CONNECTIONS) {
    const from = NODES[conn.from];
    const to = NODES[conn.to];
    // Draw a simple character at the midpoint to suggest a connection
    const midX = Math.round((from.x + to.x) / 2);
    const midY = Math.round((from.y + to.y) / 2);
    if (midY >= 0 && midY < GRID_ROWS && midX >= 0 && midX < GRID_COLS) {
      grid[midY][midX] = '·';
    }
  }

  // Draw nodes (overwrite connection chars)
  for (const node of NODES) {
    if (node.y < GRID_ROWS && node.x < GRID_COLS) {
      grid[node.y][node.x] = '○';
    }
  }

  return grid;
};

const STATIC_GRID = buildGrid();

const AsciiNeuralNet: React.FC = () => {
  const [activeNodes, setActiveNodes] = useState<Set<number>>(new Set());
  const [signalPath, setSignalPath] = useState<number[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulse random nodes
  useEffect(() => {
    const pulse = setInterval(() => {
      const count = 1 + Math.floor(Math.random() * 2);
      const ids = new Set<number>();
      for (let i = 0; i < count; i++) {
        ids.add(Math.floor(Math.random() * NODES.length));
      }
      setActiveNodes(ids);
    }, 2000);
    return () => clearInterval(pulse);
  }, []);

  // Signal propagation: pick a random path through the layers
  const fireSignal = useCallback(() => {
    const inputNode = NODES[Math.floor(Math.random() * 4)]; // ids 0-3
    const hiddenNode = NODES[4 + Math.floor(Math.random() * 3)]; // ids 4-6
    const outputNode = NODES[7 + Math.floor(Math.random() * 2)]; // ids 7-8
    const path = [inputNode.id, hiddenNode.id, outputNode.id];

    // Animate through path
    setSignalPath([path[0]]);
    setTimeout(() => setSignalPath([path[0], path[1]]), 400);
    setTimeout(() => setSignalPath([path[0], path[1], path[2]]), 800);
    setTimeout(() => setSignalPath([]), 1200);
  }, []);

  useEffect(() => {
    // Fire a signal every 5-8 seconds
    const scheduleNext = () => {
      const delay = 5000 + Math.random() * 3000;
      intervalRef.current = setTimeout(() => {
        fireSignal();
        scheduleNext();
      }, delay) as unknown as ReturnType<typeof setInterval>;
    };
    scheduleNext();
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current as unknown as number);
    };
  }, [fireSignal]);

  const getNodeClass = (nodeId: number): string => {
    if (signalPath.includes(nodeId)) return 'text-[#00FF41] brightness-150';
    if (activeNodes.has(nodeId)) return 'text-[#00FF41] opacity-40';
    return 'text-[#00FF41] opacity-15';
  };

  return (
    <div
      className="flex-1 overflow-hidden font-mono text-xs leading-tight select-none"
      style={{ minHeight: 0 }}
    >
      <pre className="whitespace-pre" style={{ color: '#00FF41', opacity: 0.15 }}>
        {STATIC_GRID.map((row, y) => (
          <div key={y}>
            {row.map((char, x) => {
              // Check if this position is a node
              const node = NODES.find(n => n.x === x && n.y === y);
              if (node) {
                return (
                  <span
                    key={x}
                    className={`transition-all duration-500 ${getNodeClass(node.id)}`}
                    style={{ opacity: undefined }}
                  >
                    {char}
                  </span>
                );
              }
              return <span key={x}>{char}</span>;
            })}
          </div>
        ))}
      </pre>
    </div>
  );
};

export default AsciiNeuralNet;
```

**Step 2: Verify the component renders standalone**

Run: `npm run dev`
Temporarily import and render in Sidebar to check it looks right before integrating.

**Step 3: Commit**

```bash
git add src/components/AsciiNeuralNet.tsx
git commit -m "feat: create AsciiNeuralNet component"
```

---

### Task 3: Integrate AsciiNeuralNet into sidebar

**Files:**
- Modify: `src/components/Sidebar.tsx`

**Step 1: Import and add AsciiNeuralNet to sidebar**

In `src/components/Sidebar.tsx`:

1. Add import at top:
```ts
import AsciiNeuralNet from './AsciiNeuralNet';
```

2. Inside the desktop `<aside>` element (after the known_hosts div, before `</aside>`), add:
```tsx
{/* Animated ASCII neural network */}
<AsciiNeuralNet />
```

The `<aside>` already has `flex flex-col` and the `AsciiNeuralNet` uses `flex-1` so it will fill the remaining vertical space.

**Step 2: Verify in browser**

Run: `npm run dev`
- Desktop: ASCII neural net should appear below social links, filling remaining sidebar space
- Nodes should pulse every ~2 seconds (subtle opacity changes)
- Signal should propagate every ~5-8 seconds (brief brightness pulse left-to-right)
- Mobile: nothing changes — the mobile top bar is separate

**Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add ASCII neural network to sidebar"
```

---

### Task 4: Visual polish and verification

**Files:**
- Possibly: `src/components/AsciiNeuralNet.tsx` (tune values)
- Possibly: `src/index.css` (tune spinner timing)

**Step 1: Full visual verification**

Run: `npm run dev` and test:
- [ ] Terminal spinner appears for all output-producing commands
- [ ] Spinner disappears cleanly when output renders (no stacking)
- [ ] `clear` and `exit` have no spinner
- [ ] ASCII neural net fills sidebar empty space
- [ ] Animations are subtle, not distracting
- [ ] No performance issues (check DevTools Performance tab)
- [ ] Mobile layout unaffected
- [ ] CRT scanlines and vignette still render over everything

**Step 2: Tune if needed**

- Spinner duration: adjust the `600` ms timeout in Terminal.tsx
- Node pulse frequency: adjust the `2000` ms interval in AsciiNeuralNet
- Signal frequency: adjust the `5000 + Math.random() * 3000` range
- Opacity values: adjust `opacity-15` / `opacity-40` for dim/active states

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: polish AI aesthetics visual effects"
```
