// Query construction logic for SigNoz API

import type { 
  LogQueryParams, 
  MetricsQueryParams, 
  TracesQueryParams, 
  QueryRangeRequest, 
  Filter, 
  CompositeQuery 
} from './types.js';
import { TimeUtils } from './time-utils.js';

export class QueryBuilder {
  /**
   * Build logs query for SigNoz API
   */
  static buildLogsQuery(params: LogQueryParams): QueryRangeRequest {
    const startTime = TimeUtils.parseTimeParam(params.start || "now-1h");
    const endTime = TimeUtils.parseTimeParam(params.end || "now");
    
    // Build composite query structure
    const compositeQuery = this.buildLogsCompositeQuery(params.query || "", params.limit || 100);
    
    return {
      start: startTime,
      end: endTime,
      step: 60, // 60 second step
      ...compositeQuery
    };
  }

  /**
   * Build metrics query for SigNoz API
   */
  static buildMetricsQuery(params: MetricsQueryParams): QueryRangeRequest {
    const startTime = TimeUtils.parseTimeParam(params.start || "now-1h");
    const endTime = TimeUtils.parseTimeParam(params.end || "now");
    const step = TimeUtils.parseStepParam(params.step || "1m");
    
    // Build filters from query string
    const filters: Filter[] = [];
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
    const builderQueries: { [key: string]: any } = {};
    params.metric.forEach((metricName, index) => {
      const queryName = String.fromCharCode(65 + index); // A, B, C, etc.
      
      builderQueries[queryName] = {
        queryName: queryName,
        dataSource: "metrics",
        aggregateOperator: params.aggregation || "avg",
        aggregateAttribute: {
          key: metricName,
          type: "Gauge", // Default type, could be detected from discovery
          id: `${metricName}--float64--Gauge--true`,
          isColumn: true,
          isJSON: false,
          dataType: "float64"
        },
        timeAggregation: params.aggregation || "avg",
        spaceAggregation: params.aggregation || "avg",
        functions: [],
        filters: {
          op: "AND",
          items: filters
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
      compositeQuery: {
        queryType: "builder",
        panelType: "graph",
        fillGaps: false,
        builderQueries: builderQueries
      }
    };
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
      query: params.query,
    };
  }

  /**
   * Build composite query structure for logs
   * Parse simple filter syntax like "k8s.deployment.name=stio-api AND level=error"
   */
  private static buildLogsCompositeQuery(filter: string, limit: number = 100): CompositeQuery {
    const filters: Filter[] = [];
    
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
      compositeQuery: {
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
  static parseFilters(filterString: string): Filter[] {
    const filters: Filter[] = [];
    
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