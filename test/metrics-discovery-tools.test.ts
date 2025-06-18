import { describe, it, expect, beforeAll } from 'vitest';
import { SignozApi } from '../src/signoz/index.js';
import type { SignozConfig } from '../src/signoz/types.js';
import { setupIntegrationTests } from './test-utils.js';

describe('Metrics Discovery Tools Tests', () => {
  const { shouldSkipIntegrationTests } = setupIntegrationTests();
  let signozApi: SignozApi;
  
  beforeAll(() => {
    const config: SignozConfig = {
      apiKey: process.env.SIGNOZ_API_KEY || 'test-key',
      baseUrl: process.env.SIGNOZ_BASE_URL || 'http://localhost:8081'
    };
    signozApi = new SignozApi(config);
  });

  describe('discover_metrics tool', () => {
    it.skipIf(shouldSkipIntegrationTests)('should discover available metrics', async () => {

      console.log('=== Testing discover_metrics ===');
      
      const result = await signozApi.discoverMetrics({
        time_range: "1h",
        limit: 10
      });

      console.log('Result preview:', result.substring(0, 500));
      
      expect(result).toContain('Metrics Discovery Results');
      expect(result).toContain('Top Metrics by Activity');
      expect(result).toContain('Example Queries');
      
      // Should not contain internal endpoint warnings
      expect(result).not.toContain('unofficial');
      expect(result).not.toContain('internal');
      
    }, 15000);
  });

  describe('discover_metric_attributes tool', () => {
    it.skipIf(shouldSkipIntegrationTests)('should discover metric attributes', async () => {

      console.log('=== Testing discover_metric_attributes ===');
      
      // First get a metric name
      const metricsResult = await signozApi.discoverMetrics({ limit: 5 });
      
      // Extract a metric name from the response (simple parsing)
      const lines = metricsResult.split('\n');
      let metricName = null;
      
      for (const line of lines) {
        if (line.startsWith('**') && line.includes('**') && !line.includes('Metrics') && !line.includes('Example')) {
          const match = line.match(/\*\*([^*]+)\*\*/);
          if (match) {
            metricName = match[1].trim();
            break;
          }
        }
      }
      
      if (!metricName) {
        console.log('No metric name found in discovery results');
        return;
      }
      
      console.log(`Testing attributes for metric: ${metricName}`);
      
      const result = await signozApi.discoverMetricAttributes({
        metric_name: metricName
      });

      console.log('Result preview:', result.substring(0, 500));
      
      expect(result).toContain(`Metric: ${metricName}`);
      expect(result).toContain('Type:');
      expect(result).toContain('Description:');
      
      // Should not contain internal endpoint warnings
      expect(result).not.toContain('unofficial');
      expect(result).not.toContain('internal');
      
    }, 20000);
  });

  describe('edge cases', () => {
    it.skipIf(shouldSkipIntegrationTests)('should handle non-existent metric gracefully', async () => {

      const result = await signozApi.discoverMetricAttributes({
        metric_name: "non_existent_metric_12345"
      });

      // API returns empty metadata for non-existent metrics instead of errors
      expect(result).toContain('Metric: non_existent_metric_12345');
      expect(result).toContain('No attribute information available');
      expect(result).not.toContain('unofficial'); // Should not expose internal details
      
    }, 10000);
  });
});