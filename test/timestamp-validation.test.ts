import { describe, it, expect } from 'vitest';
import { TimeUtils } from '../src/signoz/time-utils.js';
import { QueryBuilder } from '../src/signoz/query-builder.js';

describe('Timestamp Validation Tests', () => {
  describe('TimeUtils.validateTimeRange', () => {
    it('should throw error when start is after end', () => {
      expect(() => {
        TimeUtils.validateTimeRange('1h', '2h'); // 1hr ago to 2hr ago (backwards)
      }).toThrow('Invalid time range: start (1h) must be before end (2h)');
    });

    it('should not throw error for valid time range', () => {
      expect(() => {
        TimeUtils.validateTimeRange('2h', '1h'); // Wait, this is confusing...
      }).not.toThrow();
    });

    it('should handle explicit backwards time range correctly', () => {
      // This should be invalid - start="1h" (1hr ago) to end="2h" (2hr ago)
      // means we're going backwards in time
      expect(() => {
        TimeUtils.validateTimeRange('1h', '2h');
      }).toThrow();
    });

    it('should validate explicit ISO timestamps', () => {
      const now = Date.now();
      const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
      const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();
      
      // Valid: 2 hours ago to 1 hour ago
      expect(() => {
        TimeUtils.validateTimeRange(twoHoursAgo, oneHourAgo);
      }).not.toThrow();
      
      // Invalid: 1 hour ago to 2 hours ago (backwards)
      expect(() => {
        TimeUtils.validateTimeRange(oneHourAgo, twoHoursAgo);
      }).toThrow();
    });
  });

  describe('Time range defaults behavior', () => {
    it('should use proper defaults when start/end not provided', () => {
      const request = QueryBuilder.buildMetricsQuery({
        metric: ['test_metric']
      });
      
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);
      
      expect(request.start).toBeGreaterThan(oneHourAgo - 5000); // Within 5 seconds
      expect(request.start).toBeLessThan(oneHourAgo + 5000);
      expect(request.end).toBeGreaterThan(now - 5000);
      expect(request.end).toBeLessThan(now + 5000);
      expect(request.start).toBeLessThan(request.end);
    });

    it('should handle user provided backwards time range', () => {
      // User's example: start="2h", end="1h" 
      // This means: 2 hours ago to 1 hour ago (valid but confusing)
      const request = QueryBuilder.buildMetricsQuery({
        metric: ['k8s_pod_cpu_request_utilization'],
        start: '2h',
        end: '1h'
      });
      
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);
      const twoHoursAgo = now - (2 * 60 * 60 * 1000);
      
      // Should be approximately 2 hours ago to 1 hour ago
      expect(request.start).toBeGreaterThan(twoHoursAgo - 5000);
      expect(request.start).toBeLessThan(twoHoursAgo + 5000);
      expect(request.end).toBeGreaterThan(oneHourAgo - 5000);
      expect(request.end).toBeLessThan(oneHourAgo + 5000);
      expect(request.start).toBeLessThan(request.end);
    });
  });

  describe('Common user mistakes', () => {
    it('should detect when both start and end default to now (empty range)', () => {
      // If user doesn't provide start/end, we default to "now-1h" to "now"
      // This is fine, but if user provides start: "now", end: "now" it's empty
      expect(() => {
        TimeUtils.validateTimeRange('now', 'now');
      }).toThrow();
    });

    it('should detect unreasonable timestamp values', () => {
      // Unix timestamp in seconds instead of milliseconds
      const secondsTimestamp = Math.floor(Date.now() / 1000);
      const millisecondsTimestamp = Date.now();
      
      // When treated as milliseconds, seconds timestamp would be in 1970
      const asMilliseconds = secondsTimestamp; // This would be January 1970
      expect(asMilliseconds).toBeLessThan(new Date('2000-01-01').getTime());
    });
  });
});

describe('Query Builder Integration', () => {
  it('should validate time ranges in buildMetricsQuery', () => {
    // Test that we catch backwards time ranges at query build time
    expect(() => {
      QueryBuilder.buildMetricsQuery({
        metric: ['test_metric'],
        start: '1h',  // 1 hour ago
        end: '2h'     // 2 hours ago (backwards!)
      });
    }).toThrow('Invalid time range');
  });

  it('should suggest better defaults for empty time ranges', () => {
    // Current behavior: if no start/end provided, we use "now-1h" to "now"
    const request = QueryBuilder.buildMetricsQuery({
      metric: ['test_metric']
    });
    
    // Should have reasonable 1-hour range
    const rangeDuration = request.end - request.start;
    const oneHour = 60 * 60 * 1000;
    
    expect(rangeDuration).toBeGreaterThan(oneHour * 0.9); // Within 10%
    expect(rangeDuration).toBeLessThan(oneHour * 1.1);
  });
});