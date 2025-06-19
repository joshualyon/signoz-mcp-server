import { describe, it, expect, beforeAll } from 'vitest';
import { setupIntegrationTests } from './test-utils.js';

describe('Metrics Autocomplete Tests', () => {
  const { shouldSkipIntegrationTests } = setupIntegrationTests();
  const baseUrl = process.env.SIGNOZ_API_URL || 'http://localhost:8081';
  const apiKey = process.env.SIGNOZ_API_KEY || 'test-key';

  describe('Autocomplete endpoint', () => {
    it.skipIf(shouldSkipIntegrationTests)('should explore autocomplete responses', async () => {

      // Test raw response text
      console.log('Testing /api/v1/metrics/autocomplete (raw response):');
      try {
        const response = await fetch(`${baseUrl}/api/v1/metrics/autocomplete`, {
          method: 'GET',
          headers: {
            'SIGNOZ-API-KEY': apiKey,
          }
        });
        
        console.log('Status:', response.status, response.statusText);
        const text = await response.text();
        console.log('Raw response (first 500 chars):', text.substring(0, 500));
        console.log('Response length:', text.length);
        
        // Check if it's plain text with newlines
        if (text.includes('\n')) {
          const metrics = text.trim().split('\n').filter(m => m);
          console.log('\nFound', metrics.length, 'metrics');
          console.log('First 10 metrics:');
          metrics.slice(0, 10).forEach(m => console.log(`  - ${m}`));
        }
      } catch (error: any) {
        console.log('Failed:', error.message);
      }

      // Test with query parameter
      console.log('\n\nTesting with query parameter:');
      try {
        const response = await fetch(`${baseUrl}/api/v1/metrics/autocomplete?query=http`, {
          method: 'GET',
          headers: {
            'SIGNOZ-API-KEY': apiKey,
          }
        });
        
        console.log('Status:', response.status, response.statusText);
        const text = await response.text();
        console.log('Filtered response (first 500 chars):', text.substring(0, 500));
      } catch (error: any) {
        console.log('Failed:', error.message);
      }

      // Test metric attributes endpoint
      console.log('\n\nTesting metric attributes:');
      try {
        const response = await fetch(`${baseUrl}/api/v1/metrics/apisix_http_status/attributes`, {
          method: 'GET',
          headers: {
            'SIGNOZ-API-KEY': apiKey,
          }
        });
        
        console.log('Status:', response.status, response.statusText);
        if (response.ok) {
          const data = await response.json();
          console.log('Attributes:', JSON.stringify(data, null, 2).substring(0, 1000));
        } else {
          console.log('Error:', await response.text());
        }
      } catch (error: any) {
        console.log('Failed:', error.message);
      }

    }, 30000);
  });
});