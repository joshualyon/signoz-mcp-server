import { describe, it, expect, beforeAll } from 'vitest';
import { setupIntegrationTests } from './test-utils.js';

describe('Metrics Attributes Discovery Tests', () => {
  const { shouldSkipIntegrationTests } = setupIntegrationTests();
  const baseUrl = process.env.SIGNOZ_API_URL || 'http://localhost:8081';
  const apiKey = process.env.SIGNOZ_API_KEY || 'test-key';

  describe('Discover metric attributes', () => {
    it.skipIf(shouldSkipIntegrationTests)('should find attributes using query_range with filters', async () => {

      // First, get a metric name from the metrics list
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
      console.log('Using metric:', firstMetric);

      // Try to get data for this metric to see its labels
      console.log('\nStep 2: Query metric data to discover labels');
      const compositeQuery = {
        compositeQuery: {
          queryType: "promql",
          panelType: "value",
          promQueries: {
            "A": {
              query: firstMetric || "apisix_http_status",
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
          start: (Date.now() - 300000) * 1000000, // 5 min ago
          end: Date.now() * 1000000,
          step: 60,
          ...compositeQuery
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Query response status:', data.status);
        
        // Extract unique labels from the response
        const labels = new Set<string>();
        const labelValues: Record<string, Set<string>> = {};
        
        if (data.data?.result?.[0]?.list) {
          const series = data.data.result[0].list;
          console.log(`Found ${series.length} time series`);
          
          // Analyze first few series for labels
          series.slice(0, 5).forEach((s: any, idx: number) => {
            console.log(`\nSeries ${idx + 1}:`, JSON.stringify(s.metric, null, 2));
            
            Object.entries(s.metric || {}).forEach(([key, value]) => {
              if (key !== '__name__') {
                labels.add(key);
                if (!labelValues[key]) {
                  labelValues[key] = new Set();
                }
                labelValues[key].add(String(value));
              }
            });
          });
          
          console.log('\nDiscovered labels:');
          labels.forEach(label => {
            const values = Array.from(labelValues[label]).slice(0, 5);
            console.log(`  ${label}: ${values.join(', ')}${labelValues[label].size > 5 ? '...' : ''}`);
          });
        }
      }

      // Try builder query for metrics
      console.log('\n\nStep 3: Try builder query approach');
      const builderQuery = {
        compositeQuery: {
          queryType: "builder",
          panelType: "value",
          builderQueries: {
            "A": {
              queryName: "A",
              dataSource: "metrics",
              aggregateOperator: "avg",
              aggregateAttribute: {
                key: firstMetric || "apisix_http_status",
                dataType: "float64",
                type: "Gauge",
                isColumn: true,
                isJSON: false
              },
              timeAggregation: "avg",
              disabled: false,
              filters: {
                op: "AND",
                items: []
              },
              groupBy: [],
              limit: 10
            }
          }
        }
      };

      const builderResponse = await fetch(`${baseUrl}/api/v4/query_range`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'SIGNOZ-API-KEY': apiKey,
        },
        body: JSON.stringify({
          start: (Date.now() - 300000) * 1000000,
          end: Date.now() * 1000000,
          step: 60,
          ...builderQuery
        })
      });

      if (builderResponse.ok) {
        const data = await builderResponse.json();
        console.log('Builder query response:', JSON.stringify(data, null, 2).substring(0, 1000));
      }

    }, 30000);
  });
});