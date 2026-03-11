import { useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../ThemeContext';

// Half-width katakana (U+FF66–FF9D) + code symbols
const KATAKANA = Array.from({ length: 56 }, (_, i) => String.fromCharCode(0xFF66 + i));
const CODE_SYMBOLS = '{}[]<>=/;0123456789ABCDEF'.split('');
const CHAR_POOL = [...KATAKANA, ...CODE_SYMBOLS];

const FONT_SIZE = 14;
const FADE_ALPHA = 0.05;

type Column = {
  y: number;
  speed: number;
  delay: number; // frames to wait before starting
};

const randomChar = () => CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)];

type MatrixRainProps = {
  /** Controls CSS opacity transition for fade in/out */
  visible: boolean;
  /** Called when the fade-out transition ends (so parent can unmount) */
  onFadeOutComplete: () => void;
};

const MatrixRain: React.FC<MatrixRainProps> = ({ visible, onFadeOutComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const columnsRef = useRef<Column[]>([]);
  const rafRef = useRef<number>(0);
  const { theme } = useTheme();

  // Read theme colors from CSS custom properties
  const getColors = useCallback(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      primary: style.getPropertyValue('--terminal-primary').trim(),
      primaryDim: style.getPropertyValue('--terminal-primary-dim').trim(),
      bg: style.getPropertyValue('--terminal-bg').trim(),
    };
  }, []);

  // Parse hex color to rgba string
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const initColumns = useCallback((width: number): Column[] => {
    const count = Math.floor(width / FONT_SIZE);
    return Array.from({ length: count }, () => ({
      y: Math.random() * -50, // stagger start positions above viewport
      speed: 0.3 + Math.random() * 0.7, // variable fall speed
      delay: Math.floor(Math.random() * 40), // stagger initial appearance
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ResizeObserver to keep canvas sized to container
    const resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      canvas.width = width;
      canvas.height = height;
      columnsRef.current = initColumns(width);
    });
    resizeObserver.observe(canvas.parentElement!);

    let colors = getColors();
    // Re-read colors periodically to handle theme changes
    let frameCount = 0;

    const draw = () => {
      // Re-read colors every 60 frames (~1s) to pick up theme changes
      if (frameCount++ % 60 === 0) {
        colors = getColors();
      }

      const { width, height } = canvas;
      if (width === 0 || height === 0) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      // Fade trail: draw semi-transparent bg over previous frame
      ctx.fillStyle = hexToRgba(colors.bg, FADE_ALPHA);
      ctx.fillRect(0, 0, width, height);

      ctx.font = `${FONT_SIZE}px monospace`;

      const columns = columnsRef.current;
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];

        // Handle initial delay
        if (col.delay > 0) {
          col.delay--;
          continue;
        }

        const x = i * FONT_SIZE;
        const yPx = col.y * FONT_SIZE;

        // Lead character: bright primary color
        ctx.fillStyle = colors.primary;
        ctx.fillText(randomChar(), x, yPx);

        // Trail character (one step behind): dimmer
        ctx.fillStyle = colors.primaryDim;
        if (yPx - FONT_SIZE > 0) {
          ctx.fillText(randomChar(), x, yPx - FONT_SIZE);
        }

        col.y += col.speed;

        // Reset column when it passes the bottom (with random delay)
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
    };
  }, [theme, getColors, initColumns]);

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
        zIndex: 10,
      }}
    />
  );
};

export default MatrixRain;
