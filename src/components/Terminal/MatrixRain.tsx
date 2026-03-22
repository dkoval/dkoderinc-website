import { useEffect, useRef } from 'react';
import { hexToRgba } from '../../constants';

// Half-width katakana (U+FF66–FF9D) + code symbols
const KATAKANA = Array.from({ length: 56 }, (_, i) => String.fromCharCode(0xFF66 + i));
const CODE_SYMBOLS = '{}[]<>=/;0123456789ABCDEF'.split('');
const CHAR_POOL = [...KATAKANA, ...CODE_SYMBOLS];

const FONT_SIZE = 14;
const FADE_ALPHA = 0.05;
const FONT = `${FONT_SIZE}px monospace`;

type Column = {
  y: number;
  speed: number;
  delay: number; // frames to wait before starting
};

const POOL_SIZE = 1024;
const RANDOM_POOL = new Uint16Array(POOL_SIZE);
let poolIndex = POOL_SIZE; // Force initial fill

const fillPool = () => {
  for (let i = 0; i < POOL_SIZE; i++) {
    RANDOM_POOL[i] = Math.floor(Math.random() * CHAR_POOL.length);
  }
  poolIndex = 0;
};

const randomChar = (): string => {
  if (poolIndex >= POOL_SIZE) fillPool();
  return CHAR_POOL[RANDOM_POOL[poolIndex++]];
};

export type RainColors = { primary: string; primaryDim: string; bg: string };

const initColumns = (width: number): Column[] => {
  const count = Math.floor(width / FONT_SIZE);
  return Array.from({ length: count }, () => ({
    y: Math.random() * -50,
    speed: 0.3 + Math.random() * 0.7,
    delay: Math.floor(Math.random() * 40),
  }));
};

type MatrixRainProps = {
  visible: boolean;
  colors: RainColors;
  onFadeOutComplete: () => void;
};

const RESIZE_DEBOUNCE = 150;

const MatrixRain = ({ visible, colors: colorsProp, onFadeOutComplete }: MatrixRainProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const columnsRef = useRef<Column[]>([]);
  const rafRef = useRef<number>(0);
  const cssDimsRef = useRef({ width: 0, height: 0 });
  const colorsRef = useRef(colorsProp);
  colorsRef.current = colorsProp;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let firstResize = true;

    const applySize = (width: number, height: number) => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cssDimsRef.current = { width, height };
      columnsRef.current = initColumns(width);
      ctx.font = FONT;
    };

    const resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;
      if (firstResize) {
        firstResize = false;
        applySize(width, height);
        return;
      }
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => applySize(width, height), RESIZE_DEBOUNCE);
    });
    resizeObserver.observe(canvas.parentElement!);

    let colors = colorsRef.current;
    let fadeColor = hexToRgba(colors.bg, FADE_ALPHA);
    let frameCount = 0;

    const draw = () => {
      if (frameCount++ % 60 === 0) {
        const latest = colorsRef.current;
        if (latest !== colors) {
          colors = latest;
          fadeColor = hexToRgba(colors.bg, FADE_ALPHA);
        }
      }

      const { width, height } = cssDimsRef.current;
      if (width === 0 || height === 0) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      ctx.fillStyle = fadeColor;
      ctx.fillRect(0, 0, width, height);

      const columns = columnsRef.current;
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];

        if (col.delay > 0) {
          col.delay--;
          continue;
        }

        const x = i * FONT_SIZE;
        const yPx = col.y * FONT_SIZE;

        ctx.fillStyle = colors.primary;
        ctx.fillText(randomChar(), x, yPx);

        if (yPx - FONT_SIZE > 0) {
          ctx.fillStyle = colors.primaryDim;
          ctx.fillText(randomChar(), x, yPx - FONT_SIZE);
        }

        col.y += col.speed;

        if (yPx > height) {
          col.y = 0;
          col.speed = 0.3 + Math.random() * 0.7;
          col.delay = Math.floor(Math.random() * 30);
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, []);

  const handleTransitionEnd = () => {
    if (!visible) {
      onFadeOutComplete();
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onTransitionEnd={handleTransitionEnd}
      className="absolute inset-0 w-full h-full"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 400ms ease-in-out',
        willChange: 'opacity',
        zIndex: 10,
      }}
    />
  );
};

export default MatrixRain;
