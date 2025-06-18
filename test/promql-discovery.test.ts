import { describe, it, expect, beforeAll } from 'vitest';
import { SignozApi } from '../src/signoz/index.js';
import type { SignozConfig } from '../src/signoz/types.js';
import { setupIntegrationTests } from './test-utils.js';

describe('PromQL Metric Discovery Tests', () => {
  const { shouldSkipIntegrationTests } = setupIntegrationTests();
  let signozApi: SignozApi;
  
  beforeAll(() => {
    const config: SignozConfig = {
      apiKey: process.env.SIGNOZ_API_KEY || 'test-key',
      baseUrl: process.env.SIGNOZ_BASE_URL || 'http://localhost:8081'
    };
    signozApi = new SignozApi(config);
  });

  describe('Metric discovery via PromQL', () => {
    it.skipIf(shouldSkipIntegrationTests)('should attempt to discover metrics using label queries', async () => {

      console.log('=== Testing PromQL Discovery Approaches ===\n');

      // Approach 1: Try to get metric names via group
      console.log('1. Testing group by __name__ approach:');
      try {
        const result1 = await signozApi.queryMetrics({
          query: 'group by (__name__)({__name__=~".+"})',
          start: 'now-5m',
          end: 'now'
        });
        console.log('Result preview:', result1.substring(0, 500));
      } catch (error: any) {
        console.log('Failed:', error.message);
      }

      // Approach 2: Try to match all metrics with limit
      console.log('\n2. Testing wildcard match:');
      try {
        const result2 = await signozApi.queryMetrics({
          query: '{__name__=~".+"}',
          start: 'now-2m',  // Very short window
          end: 'now'
        });
        console.log('Result preview:', result2.substring(0, 500));
      } catch (error: any) {
        console.log('Failed:', error.message);
      }

      // Approach 3: Try specific metric pattern
      console.log('\n3. Testing specific pattern (http metrics):');
      try {
        const result3 = await signozApi.queryMetrics({
          query: '{__name__=~"http.*"}',
          start: 'now-5m',
          end: 'now'
        });
        console.log('Result preview:', result3.substring(0, 500));
      } catch (error: any) {
        console.log('Failed:', error.message);
      }

      // Approach 4: Try to get unique series
      console.log('\n4. Testing count approach:');
      try {
        const result4 = await signozApi.queryMetrics({
          query: 'count by (__name__)({__name__=~".+"})',
          start: 'now-5m',
          end: 'now'
        });
        console.log('Result preview:', result4.substring(0, 500));
      } catch (error: any) {
        console.log('Failed:', error.message);
      }

    }, 30000); // 30 second timeout for discovery tests
  });
});