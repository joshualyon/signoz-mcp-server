import { describe, it, expect } from 'vitest';
import { TimeUtils } from '../src/signoz/time-utils.js';

describe('TimeUtils', () => {
  describe('parseTimeParam', () => {
    it('should return current time when no parameter provided', () => {
      const result = TimeUtils.parseTimeParam();
      const now = Date.now();
      expect(result).toBeCloseTo(now, -2); // Within ~100ms
    });

    it('should parse relative time with "now-" format', () => {
      const result = TimeUtils.parseTimeParam('now-30m');
      const expected = Date.now() - (30 * 60 * 1000);
      expect(result).toBeCloseTo(expected, -3); // Within ~1 second
    });

    it('should parse simple relative time format', () => {
      const result = TimeUtils.parseTimeParam('30m');
      const expected = Date.now() - (30 * 60 * 1000);
      expect(result).toBeCloseTo(expected, -3); // Within ~1 second
    });

    it('should parse different time units', () => {
      const now = Date.now();
      
      // Minutes
      const mins = TimeUtils.parseTimeParam('15m');
      expect(mins).toBeCloseTo(now - (15 * 60 * 1000), -3);
      
      // Hours  
      const hours = TimeUtils.parseTimeParam('2h');
      expect(hours).toBeCloseTo(now - (2 * 60 * 60 * 1000), -3);
      
      // Days
      const days = TimeUtils.parseTimeParam('1d');
      expect(days).toBeCloseTo(now - (24 * 60 * 60 * 1000), -3);
    });

    it('should parse ISO timestamp strings', () => {
      const isoString = '2024-01-15T10:30:00Z';
      const result = TimeUtils.parseTimeParam(isoString);
      const expected = Date.parse(isoString);
      expect(result).toBe(expected);
    });

    it('should fall back to current time for invalid formats', () => {
      const result = TimeUtils.parseTimeParam('invalid-format');
      const now = Date.now();
      expect(result).toBeCloseTo(now, -2);
    });
  });

  describe('formatTimestamp', () => {
    it('should return string timestamps as-is', () => {
      const timestamp = '2024-01-15T10:30:00Z';
      const result = TimeUtils.formatTimestamp(timestamp);
      expect(result).toBe(timestamp);
    });

    it('should convert nanoseconds to ISO string', () => {
      // Nanoseconds (> 1e15)
      const nanoseconds = 1705314600000000000; // 2024-01-15T10:30:00Z in nanoseconds
      const result = TimeUtils.formatTimestamp(nanoseconds);
      expect(result).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should convert milliseconds to ISO string', () => {
      // Milliseconds
      const milliseconds = 1705314600000; // 2024-01-15T10:30:00Z in milliseconds
      const result = TimeUtils.formatTimestamp(milliseconds);
      expect(result).toBe('2024-01-15T10:30:00.000Z');
    });
  });

  describe('validateTimeRange', () => {
    it('should not throw for valid time ranges', () => {
      expect(() => {
        TimeUtils.validateTimeRange('now-1h', 'now');
      }).not.toThrow();
    });

    it('should throw for invalid time ranges', () => {
      expect(() => {
        TimeUtils.validateTimeRange('now', 'now-1h');
      }).toThrow('Invalid time range');
    });

    it('should not throw when only start or end provided', () => {
      expect(() => {
        TimeUtils.validateTimeRange('now-1h');
      }).not.toThrow();
      
      expect(() => {
        TimeUtils.validateTimeRange(undefined, 'now');
      }).not.toThrow();
    });
  });

  describe('parseStepParam', () => {
    it('should parse step parameters correctly', () => {
      expect(TimeUtils.parseStepParam('30s')).toBe(30);
      expect(TimeUtils.parseStepParam('5m')).toBe(300);
      expect(TimeUtils.parseStepParam('1h')).toBe(3600);
      expect(TimeUtils.parseStepParam('1d')).toBe(86400);
    });

    it('should default to 60 seconds for invalid formats', () => {
      expect(TimeUtils.parseStepParam('invalid')).toBe(60);
    });
  });
});