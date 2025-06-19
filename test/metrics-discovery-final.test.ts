import { describe, it, expect, beforeAll } from 'vitest';
import { setupIntegrationTests } from './test-utils.js';

describe('Final Metrics Discovery Approach', () => {
  const { shouldSkipIntegrationTests } = setupIntegrationTests();
  const baseUrl = process.env.SIGNOZ_API_URL || 'http://localhost:8081';
  const apiKey = process.env.SIGNOZ_API_KEY || 'test-key';

  describe('Complete discovery workflow', () => {
    it.skipIf(shouldSkipIntegrationTests)('should discover metrics and their attributes', async () => {

      // 1. List available metrics
      console.log('=== DISCOVER METRICS ===\n');
      const metricsResponse = await fetch(`${baseUrl}/api/v1/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'SIGNOZ-API-KEY': apiKey,
        },
        body: JSON.stringify({
          filters: { items: [], op: "AND" },
          orderBy: { columnName: "samples", order: "desc" },
          limit: 20,
          offset: 0,
          start: Date.now() - 900000, // 15 min
          end: Date.now()
        })
      });

      const metricsData = await metricsResponse.json();
      console.log('Found', metricsData.data?.metrics?.length || 0, 'metrics\n');
      
      // Display metrics in a nice format
      console.log('Top metrics by sample count:');
      metricsData.data?.metrics?.slice(0, 10).forEach((m: any) => {
        console.log(`• ${m.metric_name}`);
        console.log(`  Type: ${m.type}, Samples: ${m.samples.toLocaleString()}, Series: ${m.timeseries}`);
        if (m.description) {
          console.log(`  Description: ${m.description}`);
        }
        console.log('');
      });

      // 2. Get attributes for a specific metric
      const targetMetric = metricsData.data?.metrics?.find((m: any) => 
        m.metric_name.includes('http') || m.metric_name.includes('request')
      )?.metric_name || metricsData.data?.metrics?.[0]?.metric_name;

      if (!targetMetric) {
        console.log('No metrics found to analyze');
        return;
      }

      console.log(`\n=== DISCOVER ATTRIBUTES FOR: ${targetMetric} ===\n`);
      
      // Use a very recent time range and limit results
      const compositeQuery = {
        compositeQuery: {
          queryType: "promql",
          panelType: "value",
          promQueries: {
            "A": {
              query: `${targetMetric}[1m]`, // Get raw samples from last minute
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
          start: (Date.now() - 60000) * 1000000, // 1 min ago
          end: Date.now() * 1000000,
          step: 60,
          ...compositeQuery
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Try alternative: instant query
        console.log('Trying instant query...');
        const instantQuery = {
          compositeQuery: {
            queryType: "promql", 
            panelType: "value",
            promQueries: {
              "A": {
                query: targetMetric,
                disabled: false
              }
            }
          }
        };

        const instantResponse = await fetch(`${baseUrl}/api/v4/query_range`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'SIGNOZ-API-KEY': apiKey,
          },
          body: JSON.stringify({
            start: (Date.now() - 120000) * 1000000, // 2 min window
            end: Date.now() * 1000000,
            step: 120, // Larger step
            ...instantQuery
          })
        });

        if (instantResponse.ok) {
          const instantData = await instantResponse.json();
          console.log('Response structure:', JSON.stringify(instantData, null, 2).substring(0, 500));
          
          // Check different possible response structures
          let series: any[] = [];
          
          // Try different paths where series data might be
          if (instantData.data?.result?.[0]?.list) {
            series = instantData.data.result[0].list;
          } else if (instantData.data?.result?.[0]?.values) {
            // Might be in a different format
            console.log('Found values format');
          } else if (instantData.data?.result) {
            // Direct result array
            series = instantData.data.result;
          }

          if (series.length > 0) {
            console.log(`\nFound ${series.length} series`);
            
            // Collect all unique labels
            const labelMap: Record<string, Set<string>> = {};
            
            series.slice(0, 10).forEach((s: any, idx: number) => {
              const metric = s.metric || s.labels || {};
              console.log(`\nSeries ${idx + 1} labels:`, metric);
              
              Object.entries(metric).forEach(([key, value]) => {
                if (key !== '__name__') {
                  if (!labelMap[key]) {
                    labelMap[key] = new Set();
                  }
                  labelMap[key].add(String(value));
                }
              });
            });
            
            console.log('\n=== DISCOVERED LABELS ===');
            Object.entries(labelMap).forEach(([label, values]) => {
              const valueArray = Array.from(values);
              console.log(`\n${label}:`);
              console.log(`  Values: ${valueArray.slice(0, 5).join(', ')}${values.size > 5 ? ` ... (${values.size} total)` : ''}`);
            });
            
            console.log('\n=== EXAMPLE QUERIES ===');
            console.log(`• ${targetMetric}{${Object.keys(labelMap)[0]}="${Array.from(labelMap[Object.keys(labelMap)[0]])[0]}"}`);
            console.log(`• sum(rate(${targetMetric}[5m])) by (${Object.keys(labelMap).slice(0, 2).join(', ')})`);
            console.log(`• histogram_quantile(0.95, ${targetMetric})`);
          } else {
            console.log('No series data found in response');
            console.log('Full response:', JSON.stringify(instantData, null, 2));
          }
        }
      }

    }, 30000);
  });
});