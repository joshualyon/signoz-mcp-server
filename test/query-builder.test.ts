import { describe, it, expect } from 'vitest';
import { QueryBuilder } from '../src/signoz/query-builder.js';

describe('QueryBuilder', () => {
  describe('buildLogsQuery', () => {
    it('should build basic logs query', () => {
      const result = QueryBuilder.buildLogsQuery({
        query: 'level=error',
        limit: 50
      });

      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('end');
      expect(result).toHaveProperty('step', 60);
      expect(result).toHaveProperty('compositeQuery');
      
      const builderQuery = result.compositeQuery.builderQueries?.A;
      expect(builderQuery).toBeDefined();
      expect(builderQuery!.dataSource).toBe('logs');
      expect(builderQuery!.limit).toBe(50);
      expect(builderQuery?.filters?.items).toHaveLength(1);
      
      const filter = builderQuery?.filters?.items?.[0];
      expect(filter?.key.key).toBe('level');
      expect(filter?.op).toBe('in');
      expect(filter?.value).toBe('error');
    });

    it('should parse multiple filters with AND', () => {
      const result = QueryBuilder.buildLogsQuery({
        query: 'level=error AND k8s.deployment.name=test-api'
      });

      const filters = result.compositeQuery.builderQueries?.A?.filters?.items;
      expect(filters).toHaveLength(2);
      
      expect(filters?.[0]?.key.key).toBe('level');
      expect(filters?.[0]?.value).toBe('error');
      
      expect(filters?.[1]?.key.key).toBe('k8s.deployment.name');
      expect(filters?.[1]?.value).toBe('test-api');
      expect(filters?.[1]?.key.type).toBe('resource'); // k8s attributes should be resource type
    });

    it('should parse different operators', () => {
      const result = QueryBuilder.buildLogsQuery({
        query: 'level!=debug AND body~timeout AND count>10'
      });

      const filters = result.compositeQuery.builderQueries?.A?.filters?.items;
      expect(filters).toHaveLength(3);
      
      expect(filters?.[0]?.op).toBe('nin'); // != becomes nin
      expect(filters?.[1]?.op).toBe('contains'); // ~ becomes contains  
      expect(filters?.[2]?.op).toBe('>'); // > stays >
    });

    it('should determine correct attribute types', () => {
      const result = QueryBuilder.buildLogsQuery({
        query: 'k8s.pod.name=test AND service=api AND body~error AND level=info'
      });

      const filters = result.compositeQuery.builderQueries?.A?.filters?.items;
      
      // k8s attributes should be resource type
      const k8sFilter = filters?.find((f: any) => f.key.key === 'k8s.pod.name');
      expect(k8sFilter?.key.type).toBe('resource');
      
      // service should be resource type
      const serviceFilter = filters?.find((f: any) => f.key.key === 'service');
      expect(serviceFilter?.key.type).toBe('resource');
      
      // body should have empty type since it's a column
      const bodyFilter = filters?.find((f: any) => f.key.key === 'body');
      expect(bodyFilter?.key.type).toBe('');
      expect(bodyFilter?.key.isColumn).toBe(true);
      
      const levelFilter = filters?.find((f: any) => f.key.key === 'level');
      expect(levelFilter?.key.type).toBe('tag');
    });

    it('should handle quoted values', () => {
      const result = QueryBuilder.buildLogsQuery({
        query: 'body~"connection failed" AND service="my-api"'
      });

      const filters = result.compositeQuery.builderQueries?.A?.filters?.items;
      expect(filters?.[0]?.value).toBe('connection failed');
      expect(filters?.[1]?.value).toBe('my-api');
    });

    it('should use default time range when not specified', () => {
      const result = QueryBuilder.buildLogsQuery({ query: 'level=error' });
      const now = Date.now();
      const expectedStart = now - (60 * 60 * 1000); // 1 hour ago
      
      expect(result.end).toBeCloseTo(now, -3);
      expect(result.start).toBeCloseTo(expectedStart, -3);
    });
  });

  describe('buildMetricsQuery', () => {
    it('should build metrics query with composite query structure', () => {
      const result = QueryBuilder.buildMetricsQuery({
        metric: ['k8s_pod_cpu_utilization'],
        query: 'k8s_deployment_name=stio-api',
        aggregation: 'avg',
        start: 'now-1h',
        end: 'now',
        step: '5m'
      });

      expect(result).toHaveProperty('compositeQuery');
      expect(result.compositeQuery).toHaveProperty('queryType', 'builder');
      expect(result.compositeQuery).toHaveProperty('panelType', 'graph');
      expect(result.compositeQuery.builderQueries).toHaveProperty('A');
      expect(result).toHaveProperty('step', 300); // 5 minutes in seconds
      
      // Should be in milliseconds for metrics API v4
      expect(result.start).toBeGreaterThan(1e12);
      expect(result.end).toBeGreaterThan(1e12);
      
      const queryA = result.compositeQuery.builderQueries?.['A'];
      expect(queryA?.aggregateAttribute?.key).toBe('k8s_pod_cpu_utilization');
      expect(queryA?.dataSource).toBe('metrics');
      expect(queryA?.aggregateOperator).toBe('avg');
    });
  });

  describe('buildTracesQuery', () => {
    it('should build traces query', () => {
      const result = QueryBuilder.buildTracesQuery({
        query: 'service=api-gateway',
        start: 'now-30m',
        end: 'now'
      });

      expect(result).toHaveProperty('query', 'service=api-gateway');
      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('end');
    });
  });

  describe('parseFilters', () => {
    it('should parse empty filter string', () => {
      const result = QueryBuilder.parseFilters('');
      expect(result).toHaveLength(0);
    });

    it('should parse single filter', () => {
      const result = QueryBuilder.parseFilters('level=error');
      expect(result).toHaveLength(1);
      expect(result[0].key.key).toBe('level');
      expect(result[0].value).toBe('error');
    });

    it('should ignore malformed filters', () => {
      const result = QueryBuilder.parseFilters('level=error AND malformed-filter AND service=api');
      expect(result).toHaveLength(2); // Should skip the malformed one
      expect(result[0].key.key).toBe('level');
      expect(result[1].key.key).toBe('service');
    });
  });
});