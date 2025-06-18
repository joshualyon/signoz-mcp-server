import { describe, it, expect, vi } from 'vitest';
import { TimestampUtils, validateTimestampParams, TIMESTAMP_CONSTRAINTS } from '../src/signoz/timestamp-types.js';

describe('Timestamp Types and Utilities', () => {
  
  describe('TimestampUtils.detectTimestampUnit', () => {
    it('should detect timestamp units correctly', () => {
      const now = Date.now();
      
      expect(TimestampUtils.detectTimestampUnit(Math.floor(now / 1000))).toBe('seconds');
      expect(TimestampUtils.detectTimestampUnit(now)).toBe('milliseconds');
      expect(TimestampUtils.detectTimestampUnit(now * 1000)).toBe('microseconds');
      expect(TimestampUtils.detectTimestampUnit(now * 1000000)).toBe('nanoseconds');
      
      expect(TimestampUtils.detectTimestampUnit(123)).toBe('unknown');
    });
  });

  describe('TimestampUtils.isReasonableTimestamp', () => {
    it('should validate reasonable timestamps', () => {
      const now = Date.now();
      
      // Reasonable timestamps
      expect(TimestampUtils.isReasonableTimestamp(now)).toBe(true);
      expect(TimestampUtils.isReasonableTimestamp(now - 30 * 60 * 1000)).toBe(true); // 30 min ago
      expect(TimestampUtils.isReasonableTimestamp(now + 60 * 60 * 1000)).toBe(true);  // 1 hour future
      
      // Unreasonable timestamps
      expect(TimestampUtils.isReasonableTimestamp(1000)).toBe(false); // 1970
      expect(TimestampUtils.isReasonableTimestamp(now * 1000)).toBe(false); // Far future (microseconds)
      expect(TimestampUtils.isReasonableTimestamp(now + 2 * 365 * 24 * 60 * 60 * 1000)).toBe(false); // 2 years future
    });
  });

  describe('TimestampUtils.autoConvertToMilliseconds', () => {
    it('should auto-convert different timestamp units', () => {
      const nowMs = Date.now();
      const nowSec = Math.floor(nowMs / 1000);
      const nowMicro = nowMs * 1000;
      
      // Test seconds conversion (will lose millisecond precision)
      const convertedFromSec = TimestampUtils.autoConvertToMilliseconds(nowSec);
      expect(convertedFromSec).toBeCloseTo(nowMs, -3); // Within 1 second
      
      // Test milliseconds passthrough
      const convertedFromMs = TimestampUtils.autoConvertToMilliseconds(nowMs);
      expect(convertedFromMs).toBe(nowMs);
      
      // Test microseconds conversion
      const convertedFromMicro = TimestampUtils.autoConvertToMilliseconds(nowMicro);
      expect(convertedFromMicro).toBeCloseTo(nowMs, -2);
    });

    it('should throw for unreasonable timestamps', () => {
      expect(() => {
        TimestampUtils.autoConvertToMilliseconds(123); // Too few digits
      }).toThrow();
      
      expect(() => {
        TimestampUtils.autoConvertToMilliseconds(1); // Way too small
      }).toThrow();
    });
  });

  describe('TimestampUtils.formatSafely', () => {
    it('should format valid timestamps', () => {
      const now = Date.now();
      const formatted = TimestampUtils.formatSafely(now);
      
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(formatted).not.toContain('<invalid');
    });

    it('should handle invalid timestamps gracefully', () => {
      expect(TimestampUtils.formatSafely(NaN)).toContain('<invalid timestamp:');
      expect(TimestampUtils.formatSafely(Infinity)).toContain('<invalid timestamp:');
      
      // Test far future timestamp that becomes invalid date
      const farFuture = Date.now() * 1000000; // Nanoseconds
      const result = TimestampUtils.formatSafely(farFuture);
      
      // Should either format correctly or show invalid
      expect(result).toMatch(/(\d{4}-\d{2}-\d{2}T|<invalid timestamp:)/);
    });
  });

  describe('validateTimestampParams', () => {
    it('should pass valid timestamp parameters', () => {
      const now = Date.now();
      const validParams = {
        start: now - 3600000, // 1 hour ago
        end: now,
        step: '1m'
      };
      
      expect(() => {
        validateTimestampParams(validParams);
      }).not.toThrow();
    });

    it('should throw for invalid time ranges', () => {
      const now = Date.now();
      const invalidParams = {
        start: now, // start after end
        end: now - 3600000,
        step: '1m'
      };
      
      expect(() => {
        validateTimestampParams(invalidParams);
      }).toThrow('Invalid time range');
    });

    it('should warn for unreasonable timestamps', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const unreasonableParams = {
        start: 1000, // Year 1970
        end: Date.now(),
        step: '1m'
      };
      
      expect(() => {
        validateTimestampParams(unreasonableParams);
      }).not.toThrow(); // Should warn, not throw
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: start timestamp')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('TIMESTAMP_CONSTRAINTS', () => {
    it('should have reasonable constraints', () => {
      const now = Date.now();
      
      expect(TIMESTAMP_CONSTRAINTS.MIN_REASONABLE_MS).toBeLessThan(now);
      expect(TIMESTAMP_CONSTRAINTS.MAX_REASONABLE_MS).toBeGreaterThan(now);
      
      expect(TIMESTAMP_CONSTRAINTS.EXPECTED_DIGITS.seconds).toBe(10);
      expect(TIMESTAMP_CONSTRAINTS.EXPECTED_DIGITS.milliseconds).toBe(13);
      expect(TIMESTAMP_CONSTRAINTS.EXPECTED_DIGITS.microseconds).toBe(16);
      expect(TIMESTAMP_CONSTRAINTS.EXPECTED_DIGITS.nanoseconds).toBe(19);
    });
  });

  describe('TypeScript branded types', () => {
    it('should allow type-safe timestamp handling', () => {
      const ms = TimestampUtils.toMilliseconds(Date.now());
      const sec = TimestampUtils.toSeconds(Math.floor(Date.now() / 1000));
      
      // These should be properly typed but work at runtime
      expect(typeof ms).toBe('number');
      expect(typeof sec).toBe('number');
      
      // Type safety test (compilation time)
      const testMs: number = ms; // Should work
      const testSec: number = sec; // Should work
      
      expect(testMs).toBe(ms);
      expect(testSec).toBe(sec);
    });
  });
});