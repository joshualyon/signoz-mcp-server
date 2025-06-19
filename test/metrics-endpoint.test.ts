import { describe, it, expect, beforeAll } from 'vitest';
import { setupIntegrationTests } from './test-utils.js';

describe('Metrics Endpoint Discovery Tests', () => {
  const { shouldSkipIntegrationTests } = setupIntegrationTests();
  const baseUrl = process.env.SIGNOZ_API_URL || 'http://localhost:8081';
  const apiKey = process.env.SIGNOZ_API_KEY || 'test-key';

  describe('Direct /metrics endpoint', () => {
    it.skipIf(shouldSkipIntegrationTests)('should test various endpoints for metric discovery', async () => {

      console.log('=== Testing Metrics Discovery Endpoints ===\n');

      // Test 1: Try the /metrics endpoint from UI
      console.log('1. Testing /api/v1/metrics:');
      try {
        const response = await fetch(`${baseUrl}/api/v1/metrics`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'SIGNOZ-API-KEY': apiKey,
          },
          body: JSON.stringify({
            filters: {
              items: [],
              op: "AND"
            },
            orderBy: {
              columnName: "samples",
              order: "desc"
            },
            limit: 10,
            offset: 0,
            start: Date.now() - 3600000, // 1 hour ago
            end: Date.now()
          })
        });
        
        console.log('Status:', response.status, response.statusText);
        if (response.ok) {
          const data = await response.json();
          console.log('Success! Response:', JSON.stringify(data, null, 2).substring(0, 1000));
        } else {
          console.log('Error:', await response.text());
        }
      } catch (error: any) {
        console.log('Failed:', error.message);
      }

      // Test 2: Try metrics autocomplete endpoint
      console.log('\n2. Testing /api/v1/metrics/autocomplete:');
      try {
        const response = await fetch(`${baseUrl}/api/v1/metrics/autocomplete`, {
          method: 'GET',
          headers: {
            'SIGNOZ-API-KEY': apiKey,
          }
        });
        
        console.log('Status:', response.status, response.statusText);
        if (response.ok) {
          const data = await response.json();
          console.log('Success! Response:', JSON.stringify(data, null, 2).substring(0, 1000));
        } else {
          console.log('Error:', await response.text());
        }
      } catch (error: any) {
        console.log('Failed:', error.message);
      }

      // Test 3: Try query_range with composite query for metrics
      console.log('\n3. Testing composite query for metric discovery:');
      try {
        const compositeQuery = {
          compositeQuery: {
            queryType: "promql",
            panelType: "value",
            promQueries: {
              "A": {
                query: "group by (__name__)({__name__=~\".+\"})",
                disabled: false
              }
            }
          }
        };

        const response = await fetch(`${baseUrl}/api/v4/query_range`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'SIGNOZ-API-KEY': apiKey,
          },
          body: JSON.stringify({
            start: (Date.now() - 300000) * 1000000, // 5 min ago in nanoseconds
            end: Date.now() * 1000000,
            step: 60,
            ...compositeQuery
          })
        });
        
        console.log('Status:', response.status, response.statusText);
        if (response.ok) {
          const data = await response.json();
          console.log('Success! Response has', data.data?.result?.length || 0, 'results');
          if (data.data?.result?.[0]) {
            console.log('First result:', JSON.stringify(data.data.result[0], null, 2).substring(0, 500));
          }
        } else {
          console.log('Error:', await response.text());
        }
      } catch (error: any) {
        console.log('Failed:', error.message);
      }

      // Test 4: Try a simple metric query
      console.log('\n4. Testing simple metric query pattern:');
      try {
        const compositeQuery = {
          compositeQuery: {
            queryType: "promql",
            panelType: "value",
            promQueries: {
              "A": {
                query: "up", // Common metric that should exist
                disabled: false
              }
            }
          }
        };

        const response = await fetch(`${baseUrl}/api/v4/query_range`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'SIGNOZ-API-KEY': apiKey,
          },
          body: JSON.stringify({
            start: (Date.now() - 300000) * 1000000, // 5 min ago in nanoseconds
            end: Date.now() * 1000000,
            step: 60,
            ...compositeQuery
          })
        });
        
        console.log('Status:', response.status, response.statusText);
        if (response.ok) {
          const data = await response.json();
          console.log('Success! Response:', JSON.stringify(data, null, 2).substring(0, 1000));
        } else {
          console.log('Error:', await response.text());
        }
      } catch (error: any) {
        console.log('Failed:', error.message);
      }

    }, 30000); // 30 second timeout
  });
});