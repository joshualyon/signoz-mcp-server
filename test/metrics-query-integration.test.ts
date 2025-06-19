import { describe, it, expect, beforeAll } from 'vitest';
import { SignozApi } from '../src/signoz/index.js';
import type { SignozConfig, MetricsQueryParams } from '../src/signoz/types.js';
import { setupIntegrationTests } from './test-utils.js';

describe('Metrics Query Integration Tests', () => {
  const { shouldSkipIntegrationTests } = setupIntegrationTests();
  let signozApi: SignozApi;
  
  beforeAll(() => {
    const config: SignozConfig = {
      apiKey: process.env.SIGNOZ_API_KEY || 'test-key',
      baseUrl: process.env.SIGNOZ_API_URL || 'http://localhost:8081'
    };
    signozApi = new SignozApi(config);
  });

  describe('new builder query structure', () => {
    it.skipIf(shouldSkipIntegrationTests)('should query single metric with filters', async () => {
      const params: MetricsQueryParams = {
        metric: ['k8s_pod_cpu_utilization'],
        query: 'k8s_deployment_name=stio-api',
        aggregation: 'avg',
        start: 'now-30m',
        step: '1m'
      };

      console.log('=== Testing New Metrics Builder Query ===');
      console.log('Params:', JSON.stringify(params, null, 2));

      const result = await signozApi.queryMetrics(params);
      
      console.log('Result:', result);
      console.log('=== End Test ===');

      expect(result).toContain('k8s_pod_cpu_utilization');
      expect(typeof result).toBe('string');
      
      // Should not contain the old "composite query is required" error
      expect(result).not.toContain('composite query is required');
    }, 10000);

    it.skipIf(shouldSkipIntegrationTests)('should query multiple metrics', async () => {
      const params: MetricsQueryParams = {
        metric: ['k8s_pod_cpu_utilization', 'k8s_pod_memory_usage'],
        query: 'k8s_namespace_name=default',
        aggregation: 'max',
        start: 'now-15m',
        step: '1m'
      };

      console.log('=== Testing Multiple Metrics Query ===');
      console.log('Params:', JSON.stringify(params, null, 2));

      const result = await signozApi.queryMetrics(params);
      
      console.log('Result:', result);
      console.log('=== End Test ===');

      expect(result).toContain('|unix_millis|k8s_pod_cpu_utilization|k8s_pod_memory_usage|');
      expect(typeof result).toBe('string');
      
      // Should not contain the old error
      expect(result).not.toContain('composite query is required');
    }, 10000);

    it.skipIf(shouldSkipIntegrationTests)('should query with grouping', async () => {
      const params: MetricsQueryParams = {
        metric: ['k8s_pod_cpu_utilization'],
        query: 'k8s_deployment_name=stio-api',
        group_by: ['k8s_pod_name'],
        aggregation: 'avg',
        start: 'now-20m',
        step: '2m'
      };

      console.log('=== Testing Metrics Query with Grouping ===');
      console.log('Params:', JSON.stringify(params, null, 2));

      const result = await signozApi.queryMetrics(params);
      
      console.log('Result:', result);
      console.log('=== End Test ===');

      expect(result).toContain('k8s_pod_cpu_utilization');
      expect(typeof result).toBe('string');
      
      // Should not contain errors
      expect(result).not.toContain('composite query is required');
      expect(result).not.toContain('Error querying metrics');
    }, 10000);
  });
});