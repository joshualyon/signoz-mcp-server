import { describe, it, expect } from 'vitest';
import { QueryBuilder } from '../src/signoz/query-builder.js';
import type { MetricsQueryParams } from '../src/signoz/types.js';

describe('Metrics Builder Query Tests', () => {
  describe('single metric query', () => {
    it('should build basic composite query for single metric', () => {
      const params: MetricsQueryParams = {
        metric: ['k8s_pod_cpu_utilization'],
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-01T01:00:00Z',
        step: '1m'
      };

      const result = QueryBuilder.buildMetricsQuery(params);

      expect(result.compositeQuery).toBeDefined();
      expect(result.compositeQuery.queryType).toBe('builder');
      expect(result.compositeQuery.panelType).toBe('graph');
      expect(result.compositeQuery.builderQueries).toBeDefined();
      expect(result.compositeQuery.builderQueries?.['A']).toBeDefined();
      
      const queryA = result.compositeQuery.builderQueries?.['A'];
      expect(queryA?.dataSource).toBe('metrics');
      expect(queryA?.aggregateAttribute?.key).toBe('k8s_pod_cpu_utilization');
      expect(queryA?.aggregateOperator).toBe('avg');
      expect(queryA?.filters?.items).toHaveLength(0);
      expect(queryA?.groupBy).toHaveLength(0);
    });

    it('should build query with filters', () => {
      const params: MetricsQueryParams = {
        metric: ['k8s_pod_cpu_utilization'],
        query: 'k8s_deployment_name=stio-api AND k8s_namespace_name=default',
        aggregation: 'max',
        start: '2024-01-01T00:00:00Z'
      };

      const result = QueryBuilder.buildMetricsQuery(params);
      const queryA = result.compositeQuery.builderQueries?.['A'];
      
      expect(queryA?.aggregateOperator).toBe('max');
      expect(queryA?.filters?.items).toHaveLength(2);
      expect(queryA?.filters?.items?.[0]?.key.key).toBe('k8s_deployment_name');
      expect(queryA?.filters?.items?.[0]?.op).toBe('=');
      expect(queryA?.filters?.items?.[0]?.value).toBe('stio-api');
      expect(queryA?.filters?.items?.[1]?.key.key).toBe('k8s_namespace_name');
      expect(queryA?.filters?.items?.[1]?.value).toBe('default');
    });

    it('should build query with group by', () => {
      const params: MetricsQueryParams = {
        metric: ['k8s_pod_cpu_utilization'],
        group_by: ['k8s_pod_name', 'k8s_namespace_name'],
        start: '2024-01-01T00:00:00Z'
      };

      const result = QueryBuilder.buildMetricsQuery(params);
      const queryA = result.compositeQuery.builderQueries?.['A'];
      
      expect(queryA?.groupBy).toHaveLength(2);
      expect(queryA?.groupBy?.[0]?.key).toBe('k8s_pod_name');
      expect(queryA?.groupBy?.[1]?.key).toBe('k8s_namespace_name');
    });
  });

  describe('multiple metrics query', () => {
    it('should build composite query for multiple metrics', () => {
      const params: MetricsQueryParams = {
        metric: ['k8s_pod_cpu_utilization', 'k8s_pod_memory_usage'],
        query: 'k8s_deployment_name=stio-api',
        start: '2024-01-01T00:00:00Z'
      };

      const result = QueryBuilder.buildMetricsQuery(params);
      
      expect(result.compositeQuery.builderQueries?.['A']).toBeDefined();
      expect(result.compositeQuery.builderQueries?.['B']).toBeDefined();
      
      const queryA = result.compositeQuery.builderQueries?.['A'];
      const queryB = result.compositeQuery.builderQueries?.['B'];
      
      expect(queryA?.aggregateAttribute?.key).toBe('k8s_pod_cpu_utilization');
      expect(queryB?.aggregateAttribute?.key).toBe('k8s_pod_memory_usage');
      
      // Both should have the same filters
      expect(queryA?.filters?.items).toHaveLength(1);
      expect(queryB?.filters?.items).toHaveLength(1);
      expect(queryA?.filters?.items?.[0]?.key.key).toBe('k8s_deployment_name');
      expect(queryB?.filters?.items?.[0]?.key.key).toBe('k8s_deployment_name');
      
      // Multiple metrics should have legends
      expect(queryA?.legend).toBe('k8s_pod_cpu_utilization');
      expect(queryB?.legend).toBe('k8s_pod_memory_usage');
    });
  });

  describe('filter parsing', () => {
    it('should parse different filter operators', () => {
      const params: MetricsQueryParams = {
        metric: ['test_metric'],
        query: 'name=value AND status!=error AND message~timeout',
        start: '2024-01-01T00:00:00Z'
      };

      const result = QueryBuilder.buildMetricsQuery(params);
      const queryA = result.compositeQuery.builderQueries?.['A'];
      
      expect(queryA?.filters?.items).toHaveLength(3);
      expect(queryA?.filters?.items?.[0]?.op).toBe('=');
      expect(queryA?.filters?.items?.[1]?.op).toBe('!=');
      expect(queryA?.filters?.items?.[2]?.op).toBe('contains');
    });
  });
});