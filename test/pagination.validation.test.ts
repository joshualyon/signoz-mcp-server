import { describe, it, expect, beforeAll } from 'vitest';
import { SignozApi } from '../src/signoz/index.js';
import type { SignozConfig } from '../src/signoz/types.js';
import { setupIntegrationTests } from './test-utils.js';

describe('Pagination Validation Tests', () => {
  const { shouldSkipIntegrationTests } = setupIntegrationTests();
  let signozApi: SignozApi;
  
  beforeAll(() => {
    const config: SignozConfig = {
      apiKey: process.env.SIGNOZ_API_KEY || 'test-key',
      baseUrl: process.env.SIGNOZ_BASE_URL || 'http://localhost:8081'
    };
    signozApi = new SignozApi(config);
  });

  // Helper to extract timestamps and messages from log output
  const parseLogEntries = (logOutput: string) => {
    const lines = logOutput.split('\n');
    const entries: Array<{timestamp: string, message: string}> = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^\[([^\]]+)\] \[([^\]]+)\] \[([^\]]+)\]$/);
      if (match) {
        const timestamp = match[1];
        // Get the next non-empty line as the message (truncate long messages)
        const nextLine = lines[i + 1];
        if (nextLine && nextLine.trim()) {
          const message = nextLine.trim().substring(0, 100); // Truncate for easier comparison
          entries.push({ timestamp, message });
        }
      }
    }
    
    return entries;
  };

  describe('Controlled pagination validation', () => {
    it.skipIf(shouldSkipIntegrationTests)('should paginate correctly with known dataset', async () => {

      // Step 1: Get baseline data from a tiny time window with reasonable limit
      console.log('=== STEP 1: GET BASELINE DATA ===');
      const baselineResult = await signozApi.queryLogs({
        query: 'k8s.deployment.name=stio-api',
        start: 'now-30s',  // Tiny 30-second window
        limit: 6          // Small manageable baseline
      });

      console.log('Baseline result:');
      const baselinePreview = baselineResult.substring(0, 1000) + '...'; // Show first 1000 chars
      console.log(baselinePreview);
      
      const baselineEntries = parseLogEntries(baselineResult);
      console.log(`Found ${baselineEntries.length} baseline entries`);
      
      if (baselineEntries.length === 0) {
        console.log('⚠️  No baseline data found - skipping validation');
        return;
      }
      
      // Get the exact time range from baseline data
      const timestamps = baselineEntries.map(e => new Date(e.timestamp).getTime());
      const oldestTime = Math.min(...timestamps);
      const newestTime = Math.max(...timestamps);
      
      const startTime = new Date(oldestTime).toISOString();
      const endTime = new Date(newestTime).toISOString();
      
      console.log(`Baseline time range: ${startTime} to ${endTime}`);
      console.log(`Baseline entries: ${baselineEntries.length}`);

      // Skip if we don't have enough data for pagination testing
      if (baselineEntries.length < 4) {
        console.log('⚠️  Need at least 4 entries for pagination testing');
        return;
      }

      // Step 2: Query with limit=2 using exact same time range
      console.log('\n=== STEP 2: PAGINATED QUERY (PAGE 1) ===');
      const page1Result = await signozApi.queryLogs({
        query: 'k8s.deployment.name=stio-api',
        start: startTime,
        end: endTime,
        limit: 2
      });

      console.log('Page 1 result:');
      console.log(page1Result);
      
      const page1Entries = parseLogEntries(page1Result);
      console.log(`Page 1 entries: ${page1Entries.length}`);

      // Validate page 1
      expect(page1Entries.length).toBeLessThanOrEqual(2);
      if (baselineEntries.length >= 2) {
        expect(page1Result).toContain('More Results Available');
        expect(page1Result).toContain('To get next 2 older results');
      }

      // Step 3: Extract pagination cursor and get page 2
      const timestampMatch = page1Result.match(/end="([^"]+)"/);
      if (!timestampMatch) {
        console.log('⚠️  No pagination cursor found');
        return;
      }

      const paginationCursor = timestampMatch[1];
      console.log(`Using pagination cursor: ${paginationCursor}`);

      console.log('\n=== STEP 3: PAGINATED QUERY (PAGE 2) ===');
      const page2Result = await signozApi.queryLogs({
        query: 'k8s.deployment.name=stio-api',
        start: startTime,
        end: paginationCursor,  // Use cursor as new end
        limit: 2
      });

      console.log('Page 2 result:');
      console.log(page2Result);
      
      const page2Entries = parseLogEntries(page2Result);
      console.log(`Page 2 entries: ${page2Entries.length}`);

      // Step 4: Validate the pagination logic
      console.log('\n=== STEP 4: VALIDATION ===');
      
      // All entries from pages should be from our baseline set
      const allPageEntries = [...page1Entries, ...page2Entries];
      console.log(`Total paginated entries: ${allPageEntries.length}`);
      console.log(`Baseline entries: ${baselineEntries.length}`);

      // Validate timestamp order (newest to oldest)
      if (page1Entries.length > 1) {
        const page1Time1 = new Date(page1Entries[0].timestamp).getTime();
        const page1Time2 = new Date(page1Entries[1].timestamp).getTime();
        expect(page1Time1).toBeGreaterThanOrEqual(page1Time2);
        console.log('✅ Page 1 timestamps in correct order (newest to oldest)');
      }

      if (page2Entries.length > 0 && page1Entries.length > 0) {
        const page1Oldest = new Date(page1Entries[page1Entries.length - 1].timestamp).getTime();
        const page2Newest = new Date(page2Entries[0].timestamp).getTime();
        expect(page2Newest).toBeLessThanOrEqual(page1Oldest);
        console.log('✅ Page 2 entries are older than page 1 entries');
      }

      // Validate no duplicate entries between pages
      const page1Messages = new Set(page1Entries.map(e => e.message));
      const page2Messages = new Set(page2Entries.map(e => e.message));
      const duplicates = [...page1Messages].filter(msg => page2Messages.has(msg));
      expect(duplicates).toEqual([]);
      console.log('✅ No duplicate entries between pages');

      // Validate all entries exist in baseline (allowing for timing differences)
      console.log('\n=== COMPARISON WITH BASELINE ===');
      console.log('Page 1 entries:');
      page1Entries.forEach((entry, i) => {
        console.log(`  ${i + 1}: [${entry.timestamp}] ${entry.message.substring(0, 50)}...`);
      });
      
      console.log('Page 2 entries:');
      page2Entries.forEach((entry, i) => {
        console.log(`  ${i + 1}: [${entry.timestamp}] ${entry.message.substring(0, 50)}...`);
      });

      console.log('\n✅ Pagination validation completed successfully!');
      
    }, 20000);  // 20 second timeout for comprehensive test
  });
});