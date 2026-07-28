import { describe, expect, it } from 'vitest';
import { calculateGhostConfidence } from '../../../backend/src/schrodinger/palimpsestV2.js';

describe('Palimpsest v2', () => {
  describe('calculateGhostConfidence', () => {
    it('returns high score for older endpoints returning 200', () => {
      const score = calculateGhostConfidence(2020, 200);
      expect(score).toBeGreaterThan(60);
    });

    it('returns moderate score for 403 endpoints', () => {
      const score = calculateGhostConfidence(2022, 403);
      expect(score).toBeGreaterThan(40);
    });

    it('clamps confidence score between 0 and 100', () => {
      expect(calculateGhostConfidence(1990, 200)).toBe(100);
      expect(calculateGhostConfidence(2026, 404)).toBeLessThan(30);
    });
  });
});
