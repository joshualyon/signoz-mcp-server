// Query construction logic for SigNoz API

import { 
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
    
    return {
      start: startTime * 1000000, // Convert to nanoseconds for metrics
      end: endTime * 1000000,
      step: step,
      query: params.query,
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