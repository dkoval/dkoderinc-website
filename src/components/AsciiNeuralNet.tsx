import React, { useState, useEffect, useRef, useCallback } from 'react';

// Grid dimensions
const ROWS = 12;
const COLS = 25;

// Node definitions: [id, col, row]
const NODES: [number, number, number][] = [
  // Input layer (x=2)
  [0, 2, 1],
  [1, 2, 4],
  [2, 2, 7],
  [3, 2, 10],
  // Hidden layer (x=12)
  [4, 12, 2],
  [5, 12, 5],
  [6, 12, 8],
  // Output layer (x=22)
  [7, 22, 3],
  [8, 22, 7],
];

// Full connectivity between adjacent layers
// Input (0-3) -> Hidden (4-6), Hidden (4-6) -> Output (7-8)
const CONNECTIONS: [number, number][] = [];
for (let i = 0; i <= 3; i++) {
  for (let h = 4; h <= 6; h++) {
    CONNECTIONS.push([i, h]);
  }
}
for (let h = 4; h <= 6; h++) {
  for (let o = 7; o <= 8; o++) {
    CONNECTIONS.push([h, o]);
  }
}

// Build the node position lookup
const nodePos = new Map<number, [number, number]>();
for (const [id, col, row] of NODES) {
  nodePos.set(id, [col, row]);
}

// Build static grid with nodes and connection midpoints
type CellType = { char: string; nodeId?: number };
const staticGrid: CellType[][] = [];
for (let r = 0; r < ROWS; r++) {
  staticGrid[r] = [];
  for (let c = 0; c < COLS; c++) {
    staticGrid[r][c] = { char: ' ' };
  }
}

// Place connection midpoints first
for (const [fromId, toId] of CONNECTIONS) {
  const [fc, fr] = nodePos.get(fromId)!;
  const [tc, tr] = nodePos.get(toId)!;
  const mc = Math.round((fc + tc) / 2);
  const mr = Math.round((fr + tr) / 2);
  if (staticGrid[mr] && staticGrid[mr][mc]) {
    staticGrid[mr][mc] = { char: '·' };
  }
}

// Place nodes (overwrite any midpoint)
for (const [id, col, row] of NODES) {
  staticGrid[row][col] = { char: '○', nodeId: id };
}

// Collect midpoint positions per connection for signal paths
const connectionMidpoints = new Map<string, [number, number]>();
for (const [fromId, toId] of CONNECTIONS) {
  const [fc, fr] = nodePos.get(fromId)!;
  const [tc, tr] = nodePos.get(toId)!;
  const mc = Math.round((fc + tc) / 2);
  const mr = Math.round((fr + tr) / 2);
  connectionMidpoints.set(`${fromId}-${toId}`, [mc, mr]);
}

const AsciiNeuralNet: React.FC = () => {
  const [activeNodes, setActiveNodes] = useState<Set<number>>(new Set());
  const [signalCells, setSignalCells] = useState<Set<string>>(new Set());
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const mountedRef = useRef(true);

  const fireSignal = useCallback(() => {
    // Pick a random path: input -> hidden -> output
    const inputId = Math.floor(Math.random() * 4);       // 0-3
    const hiddenId = 4 + Math.floor(Math.random() * 3);  // 4-6
    const outputId = 7 + Math.floor(Math.random() * 2);  // 7-8

    const path = [inputId, hiddenId, outputId];
    const mid1Key = `${inputId}-${hiddenId}`;
    const mid2Key = `${hiddenId}-${outputId}`;
    const mid1 = connectionMidpoints.get(mid1Key);
    const mid2 = connectionMidpoints.get(mid2Key);

    // Sequence: node0 -> midpoint1 -> node1 -> midpoint2 -> node2
    type Step = { type: 'node'; id: number } | { type: 'mid'; col: number; row: number };
    const steps: Step[] = [
      { type: 'node', id: path[0] },
    ];
    if (mid1) steps.push({ type: 'mid', col: mid1[0], row: mid1[1] });
    steps.push({ type: 'node', id: path[1] });
    if (mid2) steps.push({ type: 'mid', col: mid2[0], row: mid2[1] });
    steps.push({ type: 'node', id: path[2] });

    steps.forEach((step, i) => {
      const onTimeout = setTimeout(() => {
        if (!mountedRef.current) return;
        if (step.type === 'node') {
          setActiveNodes(prev => new Set(prev).add(step.id));
        } else {
          setSignalCells(prev => new Set(prev).add(`${step.row},${step.col}`));
        }

        // Turn off after 400ms
        const offTimeout = setTimeout(() => {
          if (!mountedRef.current) return;
          if (step.type === 'node') {
            setActiveNodes(prev => {
              const next = new Set(prev);
              next.delete(step.id);
              return next;
            });
          } else {
            setSignalCells(prev => {
              const next = new Set(prev);
              next.delete(`${step.row},${step.col}`);
              return next;
            });
          }
        }, 400);
        timeoutsRef.current.push(offTimeout);
      }, i * 400);
      timeoutsRef.current.push(onTimeout);
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Pulse: every 2s, brighten 1-2 random nodes briefly
    const pulseInterval = setInterval(() => {
      if (!mountedRef.current) return;
      const count = 1 + Math.floor(Math.random() * 2);
      const ids: number[] = [];
      for (let i = 0; i < count; i++) {
        ids.push(Math.floor(Math.random() * 9));
      }
      setActiveNodes(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.add(id));
        return next;
      });

      const offTimeout = setTimeout(() => {
        if (!mountedRef.current) return;
        setActiveNodes(prev => {
          const next = new Set(prev);
          ids.forEach(id => next.delete(id));
          return next;
        });
      }, 800);
      timeoutsRef.current.push(offTimeout);
    }, 2000);
    intervalsRef.current.push(pulseInterval);

    // Signal propagation: every 5-8s
    const scheduleSignal = () => {
      const delay = 5000 + Math.random() * 3000;
      const timeout = setTimeout(() => {
        if (!mountedRef.current) return;
        fireSignal();
        const nextInterval = scheduleSignal();
        if (nextInterval !== undefined) {
          timeoutsRef.current.push(nextInterval);
        }
      }, delay);
      timeoutsRef.current.push(timeout);
      return timeout;
    };
    scheduleSignal();

    return () => {
      mountedRef.current = false;
      timeoutsRef.current.forEach(clearTimeout);
      intervalsRef.current.forEach(clearInterval);
      timeoutsRef.current = [];
      intervalsRef.current = [];
    };
  }, [fireSignal]);

  return (
    <div className="neural-net-container flex-1 overflow-hidden font-mono" style={{ minHeight: 0 }}>
      <pre
        className="text-xs leading-tight select-none"
        style={{ color: '#00FF41' }}
      >
        {staticGrid.map((row, r) => (
          <div key={r}>
            {row.map((cell, c) => {
              if (cell.char === ' ') return <span key={c}> </span>;

              const isNodeActive = cell.nodeId !== undefined && activeNodes.has(cell.nodeId);
              const isMidActive = cell.nodeId === undefined && signalCells.has(`${r},${c}`);
              const bright = isNodeActive || isMidActive;

              return (
                <span
                  key={c}
                  className="transition-all duration-500"
                  style={{ opacity: bright ? 0.9 : 0.15 }}
                >
                  {cell.char}
                </span>
              );
            })}
          </div>
        ))}
      </pre>
    </div>
  );
};

export default AsciiNeuralNet;
