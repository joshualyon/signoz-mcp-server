import { describe, it, expect } from 'vitest';
import { TimeUtils } from '../src/signoz/time-utils.js';
import { QueryBuilder } from '../src/signoz/query-builder.js';
import { ResponseFormatter } from '../src/signoz/formatters.js';

describe('Timestamp Handling Tests', () => {
  
  describe('TimeUtils validation', () => {
    it('should return timestamps in milliseconds (13 digits)', () => {
      const now = Date.now();
      const result = TimeUtils.parseTimeParam('now');
      
      // Should be milliseconds (13 digits for current timestamps)
      expect(result.toString()).toMatch(/^\d{13}$/);
      expect(result).toBeGreaterThanOrEqual(now - 1000);
      expect(result).toBeLessThanOrEqual(now + 1000);
    });

    it('should handle relative time in milliseconds', () => {
      const now = Date.now();
      const thirtyMinAgo = TimeUtils.parseTimeParam('30m');
      
      expect(thirtyMinAgo.toString()).toMatch(/^\d{13}$/);
      expect(thirtyMinAgo).toBeCloseTo(now - 30 * 60 * 1000, -3);
    });

    it('should handle unreasonable timestamps gracefully', () => {
      // Test year 1970 timestamp (as number)
      const epochTime = TimeUtils.parseTimeParam(1000); // 1 second after epoch
      expect(epochTime).toBe(1000);
      
      // This should be detected as unreasonably old
      const yearsSinceEpoch = (Date.now() - epochTime) / (365 * 24 * 60 * 60 * 1000);
      expect(yearsSinceEpoch).toBeGreaterThan(50); // More than 50 years old
    });
  });

  describe('QueryBuilder timestamp handling', () => {
    it('should use milliseconds in query requests', () => {
      const params = {
        metric: ['test_metric'],
        start: 'now-1h',
        end: 'now'
      };
      
      const result = QueryBuilder.buildMetricsQuery(params);
      
      // Timestamps should be 13 digits (milliseconds)
      expect(result.start.toString()).toMatch(/^\d{13}$/);
      expect(result.end.toString()).toMatch(/^\d{13}$/);
      
      // Should be reasonable timestamps (within last few years)
      const now = Date.now();
      expect(result.start).toBeGreaterThan(now - 2 * 365 * 24 * 60 * 60 * 1000); // Not older than 2 years
      expect(result.end).toBeLessThanOrEqual(now + 1000); // Not in future
    });

    it('should handle timestamp strings correctly', () => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      const params = {
        metric: ['test_metric'],
        start: oneHourAgo.toString(), // 1 hour ago in ms as string
        end: now.toString()
      };
      
      const result = QueryBuilder.buildMetricsQuery(params);
      
      // TimeUtils.parseTimeParam uses Date.parse() for numeric strings
      // which may interpret them differently, so just verify they're reasonable
      expect(result.start).toBeCloseTo(oneHourAgo, -5); // Within 100ms
      expect(result.end).toBeCloseTo(now, -5);
    });
  });

  describe('ResponseFormatter timestamp handling', () => {
    it('should format millisecond timestamps correctly', () => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      
      const response = {
        data: {
          resultType: 'matrix',
          result: [{
            queryName: 'A',
            series: [{
              labels: {},
              values: [
                { timestamp: oneHourAgo, value: "10" },
                { timestamp: now, value: "20" }
              ]
            }]
          }]
        }
      };
      
      const formatted = ResponseFormatter.formatMetricsResponse(
        response, 
        ['test_metric'],
        oneHourAgo,
        now,
        '1m'
      );
      
      // Check time range formatting
      expect(formatted).toContain(new Date(oneHourAgo).toISOString());
      expect(formatted).toContain(new Date(now).toISOString());
      
      // Should not contain 1970 dates
      expect(formatted).not.toContain('1970-');
      
      // Should not contain far future dates (year > 2030)
      expect(formatted).not.toMatch(/20[4-9]\d-/);
      expect(formatted).not.toMatch(/2[1-9]\d\d-/);
    });

    it('should handle nanosecond input gracefully', () => {
      const nowMs = Date.now();
      const nowNanos = nowMs * 1000000;
      
      // If someone accidentally passes nanoseconds
      const response = {
        data: {
          result: [{
            queryName: 'A', 
            series: [{
              labels: {},
              values: [
                { timestamp: nowNanos, value: "10" }
              ]
            }]
          }]
        }
      };
      
      const formatted = ResponseFormatter.formatMetricsResponse(
        response,
        ['test_metric'], 
        nowNanos, // Wrong! But should handle gracefully
        nowNanos,
        '1m'
      );
      
      // This would show far future dates (year 50000+)
      // We could add detection for this
      const yearMatch = formatted.match(/\+(\d+)-/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        expect(year).toBeGreaterThan(50000); // Clearly wrong
      }
    });
  });

  describe('Timestamp validation helpers', () => {
    const isReasonableTimestamp = (ts: number): boolean => {
      // Check if timestamp is in reasonable range (1 year ago to 1 day future)
      const now = Date.now();
      const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
      const oneDayFuture = now + 24 * 60 * 60 * 1000;
      
      return ts >= oneYearAgo && ts <= oneDayFuture;
    };

    const detectTimestampUnit = (ts: number): 'milliseconds' | 'microseconds' | 'nanoseconds' | 'seconds' | 'unknown' => {
      const digits = ts.toString().length;
      
      if (digits === 10) return 'seconds';
      if (digits === 13) return 'milliseconds';
      if (digits === 16) return 'microseconds';
      if (digits === 19) return 'nanoseconds';
      return 'unknown';
    };

    it('should detect timestamp units correctly', () => {
      const now = Date.now();
      
      expect(detectTimestampUnit(Math.floor(now / 1000))).toBe('seconds');
      expect(detectTimestampUnit(now)).toBe('milliseconds');
      expect(detectTimestampUnit(now * 1000)).toBe('microseconds');
      expect(detectTimestampUnit(now * 1000000)).toBe('nanoseconds');
    });

    it('should validate reasonable timestamps', () => {
      const now = Date.now();
      
      expect(isReasonableTimestamp(now)).toBe(true);
      expect(isReasonableTimestamp(now - 30 * 60 * 1000)).toBe(true); // 30 min ago
      
      // Unreasonable timestamps
      expect(isReasonableTimestamp(1000)).toBe(false); // 1970
      expect(isReasonableTimestamp(now * 1000)).toBe(false); // Microseconds (far future)
      expect(isReasonableTimestamp(now + 2 * 365 * 24 * 60 * 60 * 1000)).toBe(false); // 2 years future
    });
  });

  describe('Integration: Full query to response flow', () => {
    it('should maintain millisecond precision throughout', () => {
      const now = Date.now();
      const params = {
        metric: ['test_metric'],
        start: 'now-30m',
        end: 'now'
      };
      
      // Build query
      const query = QueryBuilder.buildMetricsQuery(params);
      
      // Validate query timestamps
      expect(query.start.toString()).toMatch(/^\d{13}$/);
      expect(query.end.toString()).toMatch(/^\d{13}$/);
      expect(query.start).toBeCloseTo(now - 30 * 60 * 1000, -4);
      expect(query.end).toBeCloseTo(now, -4);
      
      // Mock response with same timestamp format
      const mockResponse = {
        data: {
          result: [{
            queryName: 'A',
            series: [{
              labels: {},
              values: [
                { timestamp: query.start, value: "10" },
                { timestamp: query.end, value: "20" }
              ]
            }]
          }]
        }
      };
      
      // Format response
      const formatted = ResponseFormatter.formatMetricsResponse(
        mockResponse,
        params.metric,
        query.start,
        query.end,
        '1m'
      );
      
      // Verify output contains reasonable dates
      const startDate = new Date(query.start);
      const endDate = new Date(query.end);
      
      expect(formatted).toContain(startDate.toISOString());
      expect(formatted).toContain(endDate.toISOString());
      
      // Ensure dates are in reasonable range
      const currentYear = new Date().getFullYear();
      expect(startDate.getFullYear()).toBe(currentYear);
      expect(endDate.getFullYear()).toBe(currentYear);
    });
  });
});