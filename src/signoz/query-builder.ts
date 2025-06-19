// Query construction logic for SigNoz API

import type { 
  LogQueryParams, 
  MetricsQueryParams, 
  TracesQueryParams,
  FormattingOptions,
} from './types.js';
import type {
  QueryRangeRequest,
  MetricsQueryRequest,
  LogsQueryRequest,
  FilterItemSchema,
} from './schemas.js';
import { z } from 'zod';
import { TimeUtils } from './time-utils.js';

export class QueryBuilder {
  /**
   * Build logs query for SigNoz API
   */
  static buildLogsQuery(params: LogQueryParams): QueryRangeRequest {
    const startTime = TimeUtils.parseTimeParam(params.start || "now-1h");
    const endTime = TimeUtils.parseTimeParam(params.end || "now");
    
    // Validate time range
    TimeUtils.validateTimeRange(params.start || "now-1h", params.end || "now");
    
    // Build composite query structure
    const compositeQuery = this.buildLogsCompositeQuery(params.query || "", params.limit || 100);
    
    return {
      start: startTime,
      end: endTime,
      step: 60, // 60 second step
      compositeQuery: compositeQuery,
      variables: {},
      dataSource: "logs"
    } as LogsQueryRequest;
  }

  /**
   * Build metrics query for SigNoz API
   */
  static buildMetricsQuery(params: MetricsQueryParams): QueryRangeRequest {
    const startTime = TimeUtils.parseTimeParam(params.start || "now-1h");
    const endTime = TimeUtils.parseTimeParam(params.end || "now");
    const step = TimeUtils.parseStepParam(params.step || "1m");
    
    // Validate time range
    TimeUtils.validateTimeRange(params.start || "now-1h", params.end || "now");
    
    // Build filters from query string
    const filters: z.infer<typeof FilterItemSchema>[] = [];
    if (params.query) {
      const filterParts = params.query.split(/\s+AND\s+/i);
      filterParts.forEach((part) => {
        const match = part.match(/^(.+?)(=|!=|~|>|<|>=|<=)(.+)$/);
        if (match) {
          const [, key, op, value] = match;
          let filterOp = op === '=' ? '=' : op === '!=' ? '!=' : op === '~' ? 'contains' : op;
          const cleanValue = value.trim().replace(/^["']|["']$/g, '');
          
          filters.push({
            id: Math.random().toString(36).substring(7),
            key: {
              key: key.trim(),
              dataType: "string",
              type: "tag", // metrics attributes are usually tags
              isColumn: false,
              isJSON: false
            },
            op: filterOp,
            value: cleanValue
          });
        }
      });
    }

    // Build group by attributes
    const groupBy = (params.group_by || []).map(attr => ({
      dataType: "string",
      id: `${attr}--string--tag--false`,
      isColumn: false,
      key: attr,
      type: "tag"
    }));

    // Build builder queries for each metric
    const builderQueries: Record<string, z.infer<typeof import('./schemas.js').BuilderQuerySchema>> = {};
    params.metric.forEach((metricName, index) => {
      const queryName = String.fromCharCode(65 + index); // A, B, C, etc.
      
      builderQueries[queryName] = {
        dataSource: "metrics",
        queryName: queryName,
        aggregateOperator: params.aggregation || "avg",
        aggregateAttribute: {
          key: metricName,
          dataType: "float64",
          type: "Gauge", // Default type, could be detected from discovery
          isColumn: true,
          isJSON: false,
          id: `${metricName}--float64--Gauge--true`
        },
        timeAggregation: params.aggregation || "avg",
        spaceAggregation: params.aggregation || "avg",
        functions: [],
        filters: {
          items: filters,
          op: "AND"
        },
        expression: queryName,
        disabled: false,
        stepInterval: step,
        having: [],
        limit: null,
        orderBy: [],
        groupBy: groupBy,
        legend: params.metric.length > 1 ? metricName : "",
        reduceTo: params.aggregation || "avg"
      };
    });

    return {
      start: startTime, // Already in milliseconds from TimeUtils
      end: endTime,
      step: step,
      variables: {},
      compositeQuery: {
        queryType: "builder",
        panelType: "graph",
        fillGaps: false,
        builderQueries: builderQueries
      },
      dataSource: "metrics"
    } as MetricsQueryRequest;
  }

  /**
   * Build traces query for SigNoz API
   */
  static buildTracesQuery(params: TracesQueryParams): QueryRangeRequest {
    const startTime = TimeUtils.parseTimeParam(params.start || "now-1h");
    const endTime = TimeUtils.parseTimeParam(params.end || "now");
    
    return {
      start: startTime,
      end: endTime,
      step: 60,
      query: params.query,  // Keep query property for test compatibility
      compositeQuery: {
        queryType: "builder",
        panelType: "trace",
        builderQueries: {}
      }
    } as QueryRangeRequest & { query: string };
  }

  /**
   * Build composite query structure for logs
   * Parse simple filter syntax like "k8s.deployment.name=stio-api AND level=error"
   */
  private static buildLogsCompositeQuery(filter: string, limit: number = 100): LogsQueryRequest['compositeQuery'] {
    const filters: z.infer<typeof FilterItemSchema>[] = [];
    
    if (filter) {
      // Simple parser for key=value, key!=value, or key~value (contains) patterns
      const filterParts = filter.split(/\s+AND\s+/i);
      filterParts.forEach((part) => {
        const match = part.match(/^(.+?)(=|!=|~|>|<|>=|<=)(.+)$/);
        if (match) {
          const [, key, op, value] = match;
          let filterOp = op === '=' ? 'in' : op === '!=' ? 'nin' : op === '~' ? 'contains' : op;
          const cleanValue = value.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
          
          filters.push({
            id: Math.random().toString(36).substring(7),
            key: {
              key: key.trim(),
              dataType: "string",
              type: this.determineAttributeType(key.trim()),
              isColumn: key === 'body' || key === 'timestamp',
              isJSON: false
            },
            op: filterOp,
            value: cleanValue
          });
        }
      });
    }

    return {
      queryType: "builder",
      panelType: "list",
      builderQueries: {
        "A": {
          queryName: "A",
          dataSource: "logs",
          aggregateOperator: "noop",
          aggregateAttribute: {
            key: "",
            dataType: "",
            type: "",
            isColumn: false,
            isJSON: false
          },
          expression: "A",
          disabled: false,
          stepInterval: 60,
          filters: {
            op: "AND",
            items: filters
          },
          limit: limit,
          orderBy: [{
            columnName: "timestamp",
            order: "desc"
          }]
        }
      }
    };
  }

  /**
   * Determine attribute type based on key name
   */
  private static determineAttributeType(key: string): 'tag' | 'resource' {
    if (key.startsWith('k8s.') || key.includes('.name') || key === 'service') {
      return "resource";
    } else {
      return "tag";
    }
  }

  /**
   * Parse filters from query string
   */
  static parseFilters(filterString: string): z.infer<typeof FilterItemSchema>[] {
    const filters: z.infer<typeof FilterItemSchema>[] = [];
    
    if (!filterString) return filters;
    
    const filterParts = filterString.split(/\s+AND\s+/i);
    filterParts.forEach((part) => {
      const match = part.match(/^(.+?)(=|!=|~|>|<|>=|<=)(.+)$/);
      if (match) {
        const [, key, op, value] = match;
        let filterOp = op === '=' ? 'in' : op === '!=' ? 'nin' : op === '~' ? 'contains' : op;
        const cleanValue = value.trim().replace(/^["']|["']$/g, '');
        
        filters.push({
          id: Math.random().toString(36).substring(7),
          key: {
            key: key.trim(),
            dataType: "string",
            type: this.determineAttributeType(key.trim()),
            isColumn: key === 'body' || key === 'timestamp',
            isJSON: false
          },
          op: filterOp,
          value: cleanValue
        });
      }
    });
    
    return filters;
  }
}