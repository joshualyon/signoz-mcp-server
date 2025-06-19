import { describe, it, expect } from 'vitest';
import { QueryBuilder } from '../src/signoz/query-builder.js';

describe('User Scenario Tests', () => {
  describe('Backwards time range scenario', () => {
    it('should provide helpful error for user example query', () => {
      // User's example that was confusing:
      // start: "2h", end: "1h" (2 hours ago to 1 hour ago - this is actually valid!)
      // start: "1h", end: "2h" (1 hour ago to 2 hours ago - this is backwards!)
      
      expect(() => {
        QueryBuilder.buildMetricsQuery({
          metric: ['k8s_pod_cpu_request_utilization'],
          aggregation: 'avg',
          group_by: [],
          start: '1h',  // 1 hour ago  
          end: '2h',    // 2 hours ago (backwards!)
          step: '1m'
        });
      }).toThrow('Invalid time range: start (1h) must be before end (2h)');
    });

    it('should allow valid backwards-looking time range', () => {
      // This should work: 2 hours ago to 1 hour ago
      expect(() => {
        QueryBuilder.buildMetricsQuery({
          metric: ['k8s_pod_cpu_request_utilization'],
          aggregation: 'avg',
          group_by: [],
          start: '2h',  // 2 hours ago
          end: '1h',    // 1 hour ago (valid range)
          step: '1m'
        });
      }).not.toThrow();
    });

    it('should suggest defaults when no time range provided', () => {
      const request = QueryBuilder.buildMetricsQuery({
        metric: ['k8s_pod_cpu_request_utilization'],
        aggregation: 'avg'
      });
      
      // Should default to reasonable 1-hour range
      const duration = request.end - request.start;
      const oneHour = 60 * 60 * 1000;
      
      expect(duration).toBeCloseTo(oneHour, -2); // Within 100ms
      expect(request.start).toBeLessThan(request.end);
    });
  });

  describe('Common time range patterns', () => {
    it('should handle "recent data" pattern', () => {
      expect(() => {
        QueryBuilder.buildMetricsQuery({
          metric: ['cpu_usage'],
          start: '30m',  // 30 minutes ago
          end: 'now'     // now
        });
      }).not.toThrow();
    });

    it('should handle "historical data" pattern', () => {
      expect(() => {
        QueryBuilder.buildMetricsQuery({
          metric: ['cpu_usage'],
          start: '24h',  // 24 hours ago (1 day ago)
          end: '1h'      // 1 hour ago (23-hour window)
        });
      }).not.toThrow();
    });

    it('should reject empty time range', () => {
      expect(() => {
        QueryBuilder.buildMetricsQuery({
          metric: ['cpu_usage'],
          start: 'now',
          end: 'now'
        });
      }).toThrow('start and end are the same');
    });
  });
});