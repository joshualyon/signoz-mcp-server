// SignozApi Type Definitions

export interface SignozConfig {
  apiKey: string;
  baseUrl: string;
}

export interface LogQueryParams {
  query?: string;
  start?: string;
  end?: string;
  limit?: number;
  verbose?: boolean;
  include_attributes?: string[];
  exclude_attributes?: string[];
  level?: LogLevel;
}

export interface MetricsQueryParams {
  query: string;
  start?: string;
  end?: string;
  step?: string;
}

export interface TracesQueryParams {
  query: string;
  start?: string;
  end?: string;
  limit?: number;
}

export interface DiscoveryParams {
  sample_size?: number;
  time_range?: string;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LogEntry {
  timestamp: string;
  level: string;
  service: string;
  body: string;
  attributes?: Record<string, string>;
  resources?: Record<string, string>;
}

export interface QueryRangeRequest {
  start: number;
  end: number;
  step?: number;
  compositeQuery?: any;
  query?: string;
}

export interface ConnectionResult {
  success: boolean;
  responseTime: number;
  serverInfo?: any;
  error?: string;
}

export interface FormattingOptions {
  verbose?: boolean;
  include_attributes?: string[];
  exclude_attributes?: string[];
}

export interface Filter {
  id: string;
  key: {
    key: string;
    dataType: string;
    type: string;
    isColumn: boolean;
    isJSON: boolean;
  };
  op: string;
  value: string;
}

export interface CompositeQuery {
  compositeQuery: {
    queryType: string;
    panelType: string;
    builderQueries: {
      [key: string]: {
        queryName: string;
        dataSource: string;
        aggregateOperator: string;
        aggregateAttribute: {
          key: string;
          dataType: string;
          type: string;
          isColumn: boolean;
          isJSON: boolean;
        };
        expression: string;
        disabled: boolean;
        stepInterval: number;
        filters: {
          op: string;
          items: Filter[];
        };
        limit: number;
        orderBy: Array<{
          columnName: string;
          order: string;
        }>;
      };
    };
  };
}