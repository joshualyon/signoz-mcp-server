import { describe, it, expect } from 'vitest';
import { ResponseFormatter } from '../src/signoz/formatters.js';

describe('Offset Pagination Tests', () => {
  describe('formatMetricsList with offset', () => {
    it('should show correct pagination ranges with offset', () => {
      const metrics = new Array(10).fill(null).map((_, i) => ({
        metric_name: `metric_${i}`,
        type: 'Gauge',
        unit: '',
        samples: 1000,
        timeseries: 5,
        description: `Description ${i}`
      }));

      // Test with offset 0 (first page)
      const page1 = ResponseFormatter.formatMetricsList(metrics, 10, 100, 0);
      expect(page1).toContain('Found 10 of 100 metrics (showing 1-10)');
      expect(page1).toContain('discover_metrics({limit: 10, offset: 10})');

      // Test with offset 10 (second page)  
      const page2 = ResponseFormatter.formatMetricsList(metrics, 10, 100, 10);
      expect(page2).toContain('Found 10 of 100 metrics (showing 11-20)');
      expect(page2).toContain('discover_metrics({limit: 10, offset: 20})');

      // Test with offset 90 (last page)
      const page10 = ResponseFormatter.formatMetricsList(metrics, 10, 100, 90);
      expect(page10).toContain('Found 10 of 100 metrics (showing 91-100)');
      expect(page10).toContain('discover_metrics({limit: 10, offset: 100})');
    });

    it('should handle pagination when no total is available', () => {
      const metrics = new Array(5).fill(null).map((_, i) => ({
        metric_name: `metric_${i}`,
        type: 'Gauge',
        unit: '',
        samples: 1000,
        timeseries: 5,
        description: `Description ${i}`
      }));

      const result = ResponseFormatter.formatMetricsList(metrics, 5, undefined, 20);
      expect(result).toContain('Found 5 metrics (limit reached - more may exist)');
      expect(result).toContain('discover_metrics({limit: 5, offset: 25})');
    });

    it('should work without offset parameter (backward compatibility)', () => {
      const metrics = [{
        metric_name: 'test_metric',
        type: 'Counter',
        unit: '',
        samples: 1000,
        timeseries: 5,
        description: 'Test metric'
      }];

      const result = ResponseFormatter.formatMetricsList(metrics, 10, 50);
      expect(result).toContain('Found 1 of 50 metrics');
      // Should not show pagination since we're under the limit
      expect(result).not.toContain('More metrics available');
    });
  });
});