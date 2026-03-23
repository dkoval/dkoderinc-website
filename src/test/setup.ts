import '@testing-library/jest-dom';

// matchMedia mock — default: desktop, no reduced motion
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// IntersectionObserver mock
class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds = [0];
  constructor(private callback: IntersectionObserverCallback) {
    // Fire synchronously so behavior is deterministic regardless of timer mode
    callback(
      [{ isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry],
      this
    );
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// AudioContext mock
const mockGainNode = {
  gain: {
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
};

const mockOscillator = {
  type: 'sine' as OscillatorType,
  frequency: { value: 0 },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
};

class MockAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  resume = vi.fn().mockResolvedValue(undefined);
  createOscillator = vi.fn(() => ({ ...mockOscillator }));
  createGain = vi.fn(() => ({
    ...mockGainNode,
    gain: { ...mockGainNode.gain },
  }));
}
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: MockAudioContext,
});

// requestAnimationFrame — passthrough for fake-timer control
window.requestAnimationFrame = (cb: FrameRequestCallback) =>
  setTimeout(() => cb(performance.now()), 0) as unknown as number;
window.cancelAnimationFrame = (id: number) => clearTimeout(id);

// Default matchMedia predicate (all queries return false = mobile, no reduced motion)
const defaultMatchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

// Clean up between tests
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  // Reset matchMedia to default so per-test overrides don't bleed
  (window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation(defaultMatchMedia);
});
