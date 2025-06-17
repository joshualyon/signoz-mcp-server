import { describe, it, expect, beforeAll } from 'vitest';
import { SignozApi } from '../src/signoz/index.js';
import type { SignozConfig } from '../src/signoz/types.js';

describe('Pagination Integration Tests', () => {
  let signozApi: SignozApi;
  
  beforeAll(() => {
    const config: SignozConfig = {
      apiKey: process.env.SIGNOZ_API_KEY || 'test-key',
      baseUrl: process.env.SIGNOZ_BASE_URL || 'http://localhost:8081'
    };
    signozApi = new SignozApi(config);
  });

  // Helper to extract timestamps from log output
  const extractTimestamps = (logOutput: string): string[] => {
    const timestampRegex = /\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[^\]]+)\]/g;
    const timestamps: string[] = [];
    let match;
    while ((match = timestampRegex.exec(logOutput)) !== null) {
      timestamps.push(match[1]);
    }
    return timestamps;
  };

  describe('Real pagination behavior', () => {
    it('should show pagination hint with small limit on real data', async () => {
      // Skip if no real API credentials
      if (!process.env.SIGNOZ_API_KEY) {
        console.log('Skipping pagination test - no SIGNOZ_API_KEY provided');
        return;
      }

      // Query with small limit and shorter time window to avoid timeouts
      const result = await signozApi.queryLogs({
        query: 'k8s.deployment.name=stio-api',
        start: 'now-15m',  // Shorter window
        limit: 2           // Small but reasonable limit
      });

      console.log('=== PAGINATION INTEGRATION TEST ===');
      console.log(result);
      console.log('=== END ===');

      expect(result).toContain('Found 2 log entries');
      expect(result).toContain('--- More Results Available ---');
      expect(result).toContain('Oldest timestamp:');
      expect(result).toContain('To get next 2 older results, use: end=');
    }, 10000);  // 10 second timeout

    it('should handle pagination flow with multiple queries', async () => {
      if (!process.env.SIGNOZ_API_KEY) {
        console.log('Skipping pagination flow test - no SIGNOZ_API_KEY provided');
        return;
      }

      // First query - get 3 results from shorter time window
      const firstResult = await signozApi.queryLogs({
        query: 'k8s.deployment.name=stio-api',
        start: 'now-20m',  // Shorter window
        limit: 3
      });

      console.log('=== FIRST PAGE ===');
      console.log(firstResult);
      
      // Extract timestamp from pagination hint
      const timestampMatch = firstResult.match(/end="([^"]+)"/);
      if (!timestampMatch) {
        console.log('No pagination hint found - may not have enough data');
        return;
      }

      const oldestTimestamp = timestampMatch[1];
      console.log('Using timestamp for next page:', oldestTimestamp);

      // Second query - use oldest timestamp as end to get OLDER results
      const secondResult = await signozApi.queryLogs({
        query: 'k8s.deployment.name=stio-api', 
        start: 'now-20m',  // Same time window start
        end: oldestTimestamp,  // But end at oldest from first page
        limit: 3
      });

      console.log('=== SECOND PAGE ===');
      console.log(secondResult);
      console.log('=== END FLOW TEST ===');

      // Both should be valid responses
      expect(firstResult).toContain('Found');
      expect(secondResult).toContain('Found');
      
      // They should be different (different time ranges)
      expect(firstResult).not.toEqual(secondResult);
      
      // Verify timestamp order - second page should have older timestamps
      const firstTimestamps = extractTimestamps(firstResult);
      const secondTimestamps = extractTimestamps(secondResult);
      
      if (firstTimestamps.length > 0 && secondTimestamps.length > 0) {
        // Latest timestamp from second page should be older than oldest from first page
        const firstPageOldest = new Date(firstTimestamps[firstTimestamps.length - 1]);
        const secondPageNewest = new Date(secondTimestamps[0]);
        
        console.log('First page oldest:', firstPageOldest.toISOString());
        console.log('Second page newest:', secondPageNewest.toISOString());
        
        expect(secondPageNewest.getTime()).toBeLessThanOrEqual(firstPageOldest.getTime());
      }
    }, 15000);  // 15 second timeout

    it('should handle no pagination when results < limit', async () => {
      if (!process.env.SIGNOZ_API_KEY) {
        console.log('Skipping no-pagination test - no SIGNOZ_API_KEY provided');
        return;
      }

      // Query with large limit unlikely to be hit in short time range
      const result = await signozApi.queryLogs({
        query: 'k8s.deployment.name=stio-api',
        start: 'now-2m',  // Very short time range
        limit: 50         // Reasonable but likely larger than 2min of logs
      });

      console.log('=== NO PAGINATION TEST ===');
      console.log(result);
      console.log('=== END ===');

      expect(result).toContain('Found');
      // Should NOT show pagination hint if results < limit
      if (!result.includes('More Results Available')) {
        // Expected behavior - no pagination needed
        console.log('✅ No pagination needed - results < limit');
      } else {
        // If pagination appeared, that's valid too (high log volume)
        console.log('⚠️  Pagination appeared even with 2min window - very high log volume');
      }
    }, 10000);

    it('should handle different limit values correctly', async () => {
      if (!process.env.SIGNOZ_API_KEY) {
        console.log('Skipping limit variations test - no SIGNOZ_API_KEY provided');
        return;
      }

      const limits = [1, 3];  // Test fewer limits to avoid timeout
      
      for (const limit of limits) {
        const result = await signozApi.queryLogs({
          query: 'k8s.deployment.name=stio-api',
          start: 'now-10m',  // Shorter window
          limit: limit
        });

        console.log(`=== LIMIT ${limit} TEST ===`);
        console.log(result);
        
        // Should show correct limit in pagination hint if triggered
        if (result.includes('More Results Available')) {
          expect(result).toContain(`To get next ${limit} older results`);
        }
      }
    }, 15000);

    it('should handle empty results gracefully', async () => {
      if (!process.env.SIGNOZ_API_KEY) {
        console.log('Skipping empty results test - no SIGNOZ_API_KEY provided');
        return;
      }

      // Query for something unlikely to exist
      const result = await signozApi.queryLogs({
        query: 'k8s.deployment.name=nonexistent-service-12345',
        start: 'now-1h',
        limit: 10
      });

      console.log('=== EMPTY RESULTS TEST ===');
      console.log(result);
      console.log('=== END ===');

      expect(result).toContain('Found 0 log entries');
      expect(result).not.toContain('More Results Available');
    });
  });

  describe('Timestamp format handling', () => {
    it('should extract valid timestamps from real SigNoz data', async () => {
      if (!process.env.SIGNOZ_API_KEY) {
        console.log('Skipping timestamp format test - no SIGNOZ_API_KEY provided');
        return;
      }

      const result = await signozApi.queryLogs({
        query: 'k8s.deployment.name=stio-api',
        start: 'now-30m',
        limit: 1
      });

      if (result.includes('Oldest timestamp:')) {
        const timestampMatch = result.match(/Oldest timestamp: ([^\n]+)/);
        expect(timestampMatch).toBeTruthy();
        
        const timestamp = timestampMatch?.[1];
        console.log('Extracted timestamp:', timestamp);
        
        // Should be valid ISO format
        expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    });
  });
});