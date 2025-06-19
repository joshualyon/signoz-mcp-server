import { describe, it, expect } from 'vitest';
import { QueryBuilder } from '../src/signoz/query-builder.js';

describe('Query Format Comparison', () => {
  it('should generate query format matching SigNoz UI', () => {
    const request = QueryBuilder.buildMetricsQuery({
      metric: ['k8s_pod_cpu_request_utilization'],
      aggregation: 'avg',
      start: '1h',
      end: 'now',
      step: '1m'
    });

    console.log('=== OUR GENERATED QUERY ===');
    console.log(JSON.stringify(request, null, 2));

    // Expected structure based on SigNoz UI
    const expectedStructure = {
      start: expect.any(Number),
      end: expect.any(Number), 
      step: 60,
      variables: {},
      compositeQuery: {
        queryType: "builder",
        panelType: "graph",
        fillGaps: false,
        builderQueries: {
          A: {
            dataSource: "metrics",
            queryName: "A",
            aggregateOperator: "avg",
            aggregateAttribute: {
              key: "k8s_pod_cpu_request_utilization",
              dataType: "float64",
              type: "Gauge",
              isColumn: true,
              isJSON: false,
              id: "k8s_pod_cpu_request_utilization--float64--Gauge--true"
            },
            timeAggregation: "avg",
            spaceAggregation: "avg",
            functions: [],
            filters: {
              items: [],
              op: "AND"
            },
            expression: "A",
            disabled: false,
            stepInterval: 60,
            having: [],
            limit: null,
            orderBy: [],
            groupBy: [],
            legend: "",
            reduceTo: "avg"
          }
        }
      },
      dataSource: "metrics"
    };

    expect(request).toMatchObject(expectedStructure);
    
    // Specific checks
    expect(request.variables).toEqual({});
    expect(request.dataSource).toBe('metrics');
    expect(request.compositeQuery.builderQueries.A.dataSource).toBe('metrics');
    expect(request.compositeQuery.builderQueries.A.stepInterval).toBe(60);
  });

  it('should match SigNoz UI field ordering and structure', () => {
    const request = QueryBuilder.buildMetricsQuery({
      metric: ['k8s_container_cpu_request_utilization']
    });

    // Check that we have all the required fields
    expect(request).toHaveProperty('start');
    expect(request).toHaveProperty('end');
    expect(request).toHaveProperty('step');
    expect(request).toHaveProperty('variables');
    expect(request).toHaveProperty('compositeQuery');
    expect(request).toHaveProperty('dataSource');

    // Check compositeQuery structure
    const cq = request.compositeQuery;
    expect(cq).toHaveProperty('queryType', 'builder');
    expect(cq).toHaveProperty('panelType', 'graph');
    expect(cq).toHaveProperty('fillGaps', false);
    expect(cq).toHaveProperty('builderQueries');

    // Check builder query A structure
    const queryA = cq.builderQueries.A;
    expect(queryA.dataSource).toBe('metrics');
    expect(queryA.aggregateAttribute.key).toBe('k8s_container_cpu_request_utilization');
    expect(queryA.filters).toEqual({ items: [], op: "AND" });
  });
});