import { describe, it, expect, beforeAll } from 'vitest';
import { setupIntegrationTests } from './test-utils.js';

describe('Metrics Metadata Endpoint Tests', () => {
  const { shouldSkipIntegrationTests } = setupIntegrationTests();
  const baseUrl = process.env.SIGNOZ_BASE_URL || 'http://localhost:8081';
  const apiKey = process.env.SIGNOZ_API_KEY || 'test-key';

  describe('Test /api/v1/metrics/{metric}/metadata endpoint', () => {
    it.skipIf(shouldSkipIntegrationTests)('should get detailed metric attributes', async () => {

      // First get a metric name
      console.log('Step 1: Get available metrics');
      const metricsResponse = await fetch(`${baseUrl}/api/v1/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'SIGNOZ-API-KEY': apiKey,
        },
        body: JSON.stringify({
          filters: { items: [], op: "AND" },
          limit: 5,
          offset: 0,
          start: Date.now() - 3600000,
          end: Date.now()
        })
      });

      const metricsData = await metricsResponse.json();
      const firstMetric = metricsData.data?.metrics?.[0]?.metric_name;
      
      if (!firstMetric) {
        console.log('No metrics found');
        return;
      }

      console.log(`\nStep 2: Get metadata for metric: ${firstMetric}`);
      
      // Test the metadata endpoint
      const metadataResponse = await fetch(`${baseUrl}/api/v1/metrics/${firstMetric}/metadata`, {
        method: 'GET',
        headers: {
          'SIGNOZ-API-KEY': apiKey,
        }
      });

      console.log('Status:', metadataResponse.status, metadataResponse.statusText);
      
      if (metadataResponse.ok) {
        const metadata = await metadataResponse.json();
        console.log('\n=== METRIC METADATA ===');
        console.log('Name:', metadata.data?.name);
        console.log('Type:', metadata.data?.type);
        console.log('Description:', metadata.data?.description);
        console.log('Unit:', metadata.data?.unit);
        console.log('Samples:', metadata.data?.samples?.toLocaleString());
        console.log('Total Time Series:', metadata.data?.timeSeriesTotal?.toLocaleString());
        console.log('Active Time Series:', metadata.data?.timeSeriesActive?.toLocaleString());
        
        console.log('\n=== ATTRIBUTES (Labels) ===');
        if (metadata.data?.attributes) {
          metadata.data.attributes.forEach((attr: any) => {
            console.log(`\n${attr.key}:`);
            console.log(`  Unique values: ${attr.valueCount}`);
            if (attr.value && attr.value.length > 0) {
              console.log(`  Sample values: ${attr.value.slice(0, 5).join(', ')}${attr.value.length > 5 ? '...' : ''}`);
            }
          });
        }

        // Format as example queries
        console.log('\n=== EXAMPLE QUERIES ===');
        const metricName = metadata.data?.name;
        const firstAttr = metadata.data?.attributes?.[0];
        const secondAttr = metadata.data?.attributes?.[1];
        
        if (firstAttr && firstAttr.value?.length > 0) {
          console.log(`• ${metricName}{${firstAttr.key}="${firstAttr.value[0]}"}`);
        }
        
        if (firstAttr && secondAttr) {
          console.log(`• sum(rate(${metricName}[5m])) by (${firstAttr.key}, ${secondAttr.key})`);
        }
        
        if (metadata.data?.type === 'Histogram') {
          console.log(`• histogram_quantile(0.95, ${metricName})`);
        }
        
        console.log(`• rate(${metricName}[1m])`);
        
        // Test multiple metrics
        console.log('\n\n=== TESTING MULTIPLE METRICS ===');
        for (const metric of metricsData.data?.metrics?.slice(0, 3) || []) {
          const resp = await fetch(`${baseUrl}/api/v1/metrics/${metric.metric_name}/metadata`, {
            method: 'GET',
            headers: { 'SIGNOZ-API-KEY': apiKey }
          });
          
          if (resp.ok) {
            const data = await resp.json();
            console.log(`\n${metric.metric_name}:`);
            console.log(`  Attributes: ${data.data?.attributes?.map((a: any) => a.key).join(', ')}`);
          }
        }
      } else {
        console.log('Error:', await metadataResponse.text());
      }

    }, 30000);
  });
});