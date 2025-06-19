// SignozApi Type Definitions

// Re-export all types from schemas for convenience
export type {
  // Response types
  QueryRangeResponse,
  MetricsResponse,
  LogsResponse,
  MetricsDiscoveryResponse,
  MetricMetadataResponse,
  Result,
  Series,
  Point,
  Row,
  Table,
  LogEntry,
  MetricInfo,
  MetricMetadata,
  // Request types
  QueryRangeRequest,
  MetricsQueryRequest,
  LogsQueryRequest,
  // Tool param types
  LogQueryParams,
  MetricsQueryParams,
  DiscoveryParams,
  MetricDiscoveryParams,
  MetricAttributesParams,
  // Time types
  TimeParam,
  // Filter types
  FilterItem,
} from './schemas.js';

export interface SignozConfig {
  apiKey: string;
  baseUrl: string;
}

// TracesQueryParams not yet in schemas.ts
export interface TracesQueryParams {
  query: string;
  start?: string;
  end?: string;
  limit?: number;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

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