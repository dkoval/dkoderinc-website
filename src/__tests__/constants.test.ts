import { formatUptime } from '../constants';

describe('formatUptime', () => {
  it('returns "0s" for 0 seconds', () => {
    expect(formatUptime(0)).toBe('0s');
  });

  it('formats seconds only', () => {
    expect(formatUptime(45)).toBe('45s');
  });

  it('formats minutes and seconds', () => {
    expect(formatUptime(125)).toBe('2m 5s');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatUptime(3661)).toBe('1h 1m 1s');
  });

  it('formats days, hours, minutes, and seconds', () => {
    expect(formatUptime(90061)).toBe('1d 1h 1m 1s');
  });

  it('omits zero components at exact boundaries', () => {
    expect(formatUptime(60)).toBe('1m');
    expect(formatUptime(3600)).toBe('1h');
    expect(formatUptime(86400)).toBe('1d');
  });
});
