import { useState, useEffect } from 'react';

type Props = { onComplete: () => void };

const LINES = [
  'DKODER BIOS v2.6.0',
  'CPU: Senior Engineer @ 15+ years',
  'RAM: 640K skills (should be enough)',
  'Checking distributed systems... OK',
  'Mounting /home/dkoval............. OK',
  'Starting bash...',
];

const BootSplash = ({ onComplete }: Props) => {
  const [visibleLines, setVisibleLines] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    LINES.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), i * 350));
    });
    timers.push(setTimeout(() => setDone(true), LINES.length * 350 + 400));
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (done) {
      const t = setTimeout(onComplete, 300);
      return () => clearTimeout(t);
    }
  }, [done, onComplete]);

  useEffect(() => {
    const handler = () => onComplete();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col justify-center items-start p-8 md:p-16"
      style={{ background: 'var(--terminal-bg)', transition: done ? 'opacity 0.3s' : undefined, opacity: done ? 0 : 1 }}
    >
      {LINES.slice(0, visibleLines).map((line, i) => (
        <p key={i} className="font-mono text-sm mb-1" style={{ color: 'var(--terminal-primary)' }}>
          {line}
        </p>
      ))}
      {visibleLines > 0 && (
        <span className="font-mono text-xs mt-4" style={{ color: 'var(--terminal-primary-dark)' }}>
          [Press any key to skip]
        </span>
      )}
    </div>
  );
};

export default BootSplash;
