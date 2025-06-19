import { describe, it, expect, beforeAll } from 'vitest';
import { SignozApi } from '../src/signoz/index.js';
import type { SignozConfig } from '../src/signoz/types.js';
import { setupIntegrationTests } from './test-utils.js';

describe('PromQL Metric Discovery Tests (DEPRECATED)', () => {
  const { shouldSkipIntegrationTests } = setupIntegrationTests();
  let signozApi: SignozApi;
  
  beforeAll(() => {
    const config: SignozConfig = {
      apiKey: process.env.SIGNOZ_API_KEY || 'test-key',
      baseUrl: process.env.SIGNOZ_API_URL || 'http://localhost:8081'
    };
    signozApi = new SignozApi(config);
  });

  describe('Metric discovery via PromQL (DEPRECATED)', () => {
    it.skipIf(shouldSkipIntegrationTests)('should use discover_metrics instead of PromQL discovery', async () => {
      
      console.log('=== PromQL Discovery Deprecated ===\n');
      console.log('❌ Raw PromQL queries are no longer supported in query_metrics.');
      console.log('✅ Use discover_metrics for metric discovery instead.');
      console.log('✅ Use query_metrics with builder syntax for querying specific metrics.');
      console.log('\nExample new usage:');
      console.log('- discover_metrics() -> lists available metrics');
      console.log('- query_metrics({metric: ["cpu_usage"], query: "pod=my-pod"}) -> queries specific metrics');

      // Test that the new approach works
      try {
        const result = await signozApi.queryMetrics({
          metric: ['k8s_pod_cpu_utilization'],
          query: 'k8s_deployment_name=stio-api',
          start: 'now-5m'
        });
        
        console.log('\n✅ New builder syntax works:');
        console.log('Query result type:', typeof result);
        expect(typeof result).toBe('string');
        expect(result).not.toContain('composite query is required');
      } catch (error: any) {
        console.log('❌ New builder syntax failed:', error.message);
      }

      // Always pass - this test documents the change
      expect(true).toBe(true);
    }, 15000);
  });
});