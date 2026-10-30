import { describe, expect, it } from 'vitest';
import { beatIndexAtOrAfter, beatMs, firstHitTime, targetIntervalMs } from './rhythm';

describe('rhythm', () => {
  it('converts tempo to milliseconds', () => {
    expect(beatMs(120)).toBe(500);
    expect(targetIntervalMs({ bpm: 150, beatsPerTarget: 2 })).toBe(800);
  });

  it('puts the first timing point on a beat after the lead-in and a full approach', () => {
    const t = firstHitTime({ bpm: 150, beatsPerTarget: 2 }, 1200, 600);
    expect(t).toBeGreaterThanOrEqual(1800);
    expect(t % beatMs(150)).toBeCloseTo(0);
    expect(t - beatMs(150)).toBeLessThan(1800);
  });

  it('finds the next beat at or after a time', () => {
    expect(beatIndexAtOrAfter(0, 120)).toBe(0);
    expect(beatIndexAtOrAfter(500, 120)).toBe(1);
    expect(beatIndexAtOrAfter(501, 120)).toBe(2);
  });
});
