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

export interface MetricDiscoveryParams {
  time_range?: string;  // "1h", "24h", etc
  limit?: number;       // Max metrics to return
  filter?: string;      // Filter by metric name pattern
}

export interface MetricAttributesParams {
  metric_name: string;
  time_range?: string;
  sample_size?: number;
}

export interface MetricInfo {
  metric_name: string;
  description: string;
  type: 'Sum' | 'Gauge' | 'Histogram' | 'Summary';
  unit: string;
  timeseries: number;
  samples: number;
  lastReceived: number;
}

export interface MetricAttribute {
  key: string;
  value: string[];
  valueCount: number;
}

export interface MetricMetadata {
  name: string;
  description: string;
  type: string;
  unit: string;
  samples: number;
  timeSeriesTotal: number;
  timeSeriesActive: number;
  lastReceived: number;
  attributes: MetricAttribute[];
  metadata: {
    metric_type: string;
    temporality: string;
    monotonic: boolean;
  };
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
  limit?: number;  // For pagination hints
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