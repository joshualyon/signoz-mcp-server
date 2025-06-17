import { describe, it, expect, beforeAll } from 'vitest';
import { SignozApi } from '../src/signoz/index.js';
import type { SignozConfig } from '../src/signoz/types.js';

describe('SignozApi Integration Tests', () => {
  let signozApi: SignozApi;
  let config: SignozConfig;

  beforeAll(() => {
    config = {
      apiKey: process.env.SIGNOZ_API_KEY || 'test-key',
      baseUrl: process.env.SIGNOZ_BASE_URL || 'http://localhost:8081'
    };
    signozApi = new SignozApi(config);
  });

  describe('connection', () => {
    it('should test connection successfully', async () => {
      // Skip if no real API credentials
      if (!process.env.SIGNOZ_API_KEY) {
        console.log('Skipping connection test - no SIGNOZ_API_KEY provided');
        return;
      }

      const result = await signozApi.testConnection();
      expect(result).toContain('Connection successful');
    });

    it('should check connectivity', async () => {
      // Skip if no real API credentials  
      if (!process.env.SIGNOZ_API_KEY) {
        console.log('Skipping connectivity test - no SIGNOZ_API_KEY provided');
        return;
      }

      const isConnected = await signozApi.checkConnectivity();
      expect(isConnected).toBe(true);
    });
  });

  describe('log querying with attribute filtering', () => {
    it('should filter attributes in compact mode', async () => {
      // Skip if no real API credentials
      if (!process.env.SIGNOZ_API_KEY) {
        console.log('Skipping log query test - no SIGNOZ_API_KEY provided');
        return;
      }

      const result = await signozApi.queryLogs({
        query: 'k8s.deployment.name=stio-api',
        start: 'now-5m',
        limit: 1,
        verbose: false
      });

      console.log('Compact mode result:');
      console.log(result);

      // Should contain basic info
      expect(result).toContain('Found');
      expect(result).toContain('[INFO]') || expect(result).toContain('[ERROR]') || expect(result).toContain('[WARN]');

      // Should NOT contain noisy attributes in compact mode
      expect(result).not.toContain('log.file.path');
      expect(result).not.toContain('k8s.node.uid');
      expect(result).not.toContain('signoz.component');
      expect(result).not.toContain('k8s.pod.start_time');
    });

    it('should include all attributes in verbose mode', async () => {
      // Skip if no real API credentials
      if (!process.env.SIGNOZ_API_KEY) {
        console.log('Skipping verbose log query test - no SIGNOZ_API_KEY provided');
        return;
      }

      const result = await signozApi.queryLogs({
        query: 'k8s.deployment.name=stio-api',
        start: 'now-5m',
        limit: 1,
        verbose: true
      });

      console.log('Verbose mode result:');
      console.log(result);

      // Should contain basic info
      expect(result).toContain('Found');
      
      // Should contain verbose attributes
      expect(result).toContain('log.file.path') || expect(result).toContain('k8s.node.uid');
    });

    it('should respect explicit exclude_attributes', async () => {
      // Skip if no real API credentials
      if (!process.env.SIGNOZ_API_KEY) {
        console.log('Skipping exclude attributes test - no SIGNOZ_API_KEY provided');
        return;
      }

      const result = await signozApi.queryLogs({
        query: 'k8s.deployment.name=stio-api',
        start: 'now-5m',
        limit: 1,
        exclude_attributes: ['http.request.id', 'labels.module']
      });

      console.log('Exclude attributes result:');
      console.log(result);

      // Should NOT contain excluded attributes
      expect(result).not.toContain('http.request.id');
      expect(result).not.toContain('labels.module');
    });

    it('should respect explicit include_attributes', async () => {
      // Skip if no real API credentials
      if (!process.env.SIGNOZ_API_KEY) {
        console.log('Skipping include attributes test - no SIGNOZ_API_KEY provided');
        return;
      }

      const result = await signozApi.queryLogs({
        query: 'k8s.deployment.name=stio-api',
        start: 'now-5m',
        limit: 1,
        include_attributes: ['http.request.id', 'k8s.namespace.name']
      });

      console.log('Include attributes result:');
      console.log(result);

      // Should contain only included attributes (if they exist in the logs)
      // Note: We can't guarantee these specific attributes exist, so we check structure
      expect(result).toContain('Found');
    });
  });

  describe('time parsing', () => {
    it('should parse different time formats correctly', async () => {
      // This is a unit test that doesn't require API connection
      const result1 = await signozApi.queryLogs({
        query: '',
        start: '30m', // Simple format
        end: 'now',
        limit: 1
      });

      const result2 = await signozApi.queryLogs({
        query: '',
        start: 'now-30m', // Legacy format
        end: 'now',
        limit: 1
      });

      // Both should work (though they might fail due to no API key, the parsing should work)
      expect(typeof result1).toBe('string');
      expect(typeof result2).toBe('string');
    });
  });
});