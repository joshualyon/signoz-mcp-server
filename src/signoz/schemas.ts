import { z } from 'zod';

// ============================================
// Time and Common Schemas
// ============================================

// Time parameter types
export const RelativeTimeSchema = z.string().regex(/^\d+[smhd]$/, {
  message: "Invalid relative time format. Use format like '1h', '30m', '2d'"
});

export const TimeParamSchema = z.union([
  RelativeTimeSchema,
  z.literal('now'),
  z.string().datetime(), // ISO string
  z.string().regex(/^\d{10,13}$/), // Unix timestamp as string
]);

// Point schema - timestamp and string value
export const PointSchema = z.object({
  timestamp: z.number(),
  value: z.string(), // API always returns values as strings
});

// Series schema - for time series data
export const SeriesSchema = z.object({
  labels: z.record(z.string()).optional(),
  labelsArray: z.array(z.record(z.string())).nullable().optional(),
  values: z.array(PointSchema),
});

// Row schema - for list data
export const RowSchema = z.object({
  timestamp: z.string(),
  data: z.record(z.any()),
});

// Table schemas
export const TableColumnSchema = z.object({
  name: z.string(),
  queryName: z.string().optional(),
  isValueColumn: z.boolean().optional(),
});

export const TableRowSchema = z.object({
  data: z.record(z.any()),
});

export const TableSchema = z.object({
  columns: z.array(TableColumnSchema),
  rows: z.array(TableRowSchema),
});

// Result schema - each query result
export const ResultSchema = z.object({
  queryName: z.string(),
  series: z.array(SeriesSchema).optional(),
  predictedSeries: z.array(SeriesSchema).optional(),
  upperBoundSeries: z.array(SeriesSchema).optional(),
  lowerBoundSeries: z.array(SeriesSchema).optional(),
  anomalyScores: z.array(SeriesSchema).optional(),
  list: z.array(RowSchema).optional(),
  table: TableSchema.optional(),
});

// Inner response data schema
export const QueryRangeDataSchema = z.object({
  contextTimeout: z.boolean().optional(),
  contextTimeoutMessage: z.string().optional(),
  resultType: z.string().optional(),
  result: z.array(ResultSchema),
});

// Main response schema with status wrapper
export const QueryRangeResponseSchema = z.object({
  status: z.string(),
  data: QueryRangeDataSchema,
});

// ============================================
// Specific Response Types by Data Type
// ============================================

// Metrics Response (typically with panelType: 'graph')
export const MetricsResultSchema = z.object({
  queryName: z.string(),
  series: z.array(SeriesSchema),
  list: z.never().optional(),
  table: z.never().optional(),
});

export const MetricsResponseSchema = z.object({
  status: z.string(),
  data: z.object({
    contextTimeout: z.boolean().optional(),
    contextTimeoutMessage: z.string().optional(),
    resultType: z.string().optional(),
    result: z.array(MetricsResultSchema),
  }),
});

// Logs Response (typically with panelType: 'list')
export const LogEntrySchema = z.object({
  timestamp: z.string(),
  data: z.object({
    body: z.string(),
    attributes_string: z.record(z.string()).optional(),
    resources_string: z.record(z.string()).optional(),
    severity_text: z.string().optional(),
    severity_number: z.number().optional(),
  }),
});

export const LogsResultSchema = z.object({
  queryName: z.string(),
  list: z.array(LogEntrySchema),
  series: z.never().optional(),
  table: z.never().optional(),
});

export const LogsResponseSchema = z.object({
  status: z.string(),
  data: z.object({
    contextTimeout: z.boolean().optional(),
    contextTimeoutMessage: z.string().optional(),
    resultType: z.string().optional(),
    result: z.array(LogsResultSchema),
  }),
});

// ============================================
// Discovery and Metadata Schemas
// ============================================

export const MetricInfoSchema = z.object({
  metric_name: z.string(),
  description: z.string(),
  type: z.enum(['Sum', 'Gauge', 'Histogram', 'Summary']),
  unit: z.string(),
  timeseries: z.number(),
  samples: z.number(),
  lastReceived: z.number(),
});

export const MetricsDiscoveryResponseSchema = z.object({
  status: z.enum(['success', 'error']),
  data: z.object({
    metrics: z.array(MetricInfoSchema),
    total: z.number(),
  }),
});

export const MetricAttributeSchema = z.object({
  key: z.string(),
  value: z.array(z.string()),
  valueCount: z.number(),
});

export const MetricMetadataSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.string(),
  unit: z.string(),
  samples: z.number(),
  timeSeriesTotal: z.number(),
  timeSeriesActive: z.number(),
  lastReceived: z.number(),
  attributes: z.array(MetricAttributeSchema).nullable(), // Can be null
  metadata: z.object({
    metric_type: z.string(),
    temporality: z.string(),
    monotonic: z.boolean(),
  }),
});

export const MetricMetadataResponseSchema = z.object({
  status: z.enum(['success', 'error']),
  data: MetricMetadataSchema,
});

// ============================================
// Infer TypeScript types from schemas
// ============================================

export type Point = z.infer<typeof PointSchema>;
export type Series = z.infer<typeof SeriesSchema>;
export type Row = z.infer<typeof RowSchema>;
export type Table = z.infer<typeof TableSchema>;
export type Result = z.infer<typeof ResultSchema>;
export type QueryRangeData = z.infer<typeof QueryRangeDataSchema>;
export type QueryRangeResponse = z.infer<typeof QueryRangeResponseSchema>;

export type LogEntry = z.infer<typeof LogEntrySchema>;
export type MetricsResponse = z.infer<typeof MetricsResponseSchema>;
export type LogsResponse = z.infer<typeof LogsResponseSchema>;
export type MetricInfo = z.infer<typeof MetricInfoSchema>;
export type MetricsDiscoveryResponse = z.infer<typeof MetricsDiscoveryResponseSchema>;
export type MetricMetadata = z.infer<typeof MetricMetadataSchema>;
export type MetricMetadataResponse = z.infer<typeof MetricMetadataResponseSchema>;
export type TimeParam = z.infer<typeof TimeParamSchema>;

// Request schemas
export const AttributeKeySchema = z.object({
  key: z.string(),
  dataType: z.string().optional(),
  type: z.string().optional(),
  isColumn: z.boolean().optional(),
  isJSON: z.boolean().optional(),
  id: z.string().optional(),
});

export const FilterItemSchema = z.object({
  key: AttributeKeySchema,
  value: z.any().optional(),
  op: z.string(),
  id: z.string().optional(),
});

// Type exports for easier use
export type FilterItem = z.infer<typeof FilterItemSchema>;

export const FilterSetSchema = z.object({
  op: z.enum(['AND', 'OR']),
  items: z.array(FilterItemSchema),
});

export const BuilderQuerySchema = z.object({
  dataSource: z.enum(['metrics', 'logs', 'traces']),
  queryName: z.string(),
  aggregateOperator: z.string().optional(),
  aggregateAttribute: AttributeKeySchema.optional(),
  timeAggregation: z.string().optional(),
  spaceAggregation: z.string().optional(),
  functions: z.array(z.any()).optional(),
  filters: FilterSetSchema.optional(),
  expression: z.string(),
  disabled: z.boolean().optional(),
  stepInterval: z.number(),
  having: z.array(z.any()).optional(),
  limit: z.number().nullable().optional(),
  orderBy: z.array(z.any()).optional(),
  groupBy: z.array(AttributeKeySchema).optional(),
  legend: z.string().optional(),
  reduceTo: z.string().optional(),
});

export const CompositeQuerySchema = z.object({
  queryType: z.enum(['builder', 'clickhouse_sql', 'promql']),
  panelType: z.enum(['graph', 'table', 'value', 'list', 'trace']),
  fillGaps: z.boolean().optional(),
  builderQueries: z.record(BuilderQuerySchema).optional(),
  unit: z.string().optional(),
});

// Base request schema
export const QueryRangeRequestSchema = z.object({
  start: z.number(),
  end: z.number(),
  step: z.number(),
  compositeQuery: CompositeQuerySchema,
  variables: z.record(z.any()).optional(),
  dataSource: z.string().optional(),
});

// Specific request types for different data sources
export const MetricsQueryRequestSchema = QueryRangeRequestSchema.extend({
  compositeQuery: CompositeQuerySchema.extend({
    builderQueries: z.record(BuilderQuerySchema.extend({
      dataSource: z.literal('metrics'),
    })),
  }),
});

export const LogsQueryRequestSchema = QueryRangeRequestSchema.extend({
  compositeQuery: CompositeQuerySchema.extend({
    builderQueries: z.record(BuilderQuerySchema.extend({
      dataSource: z.literal('logs'),
    })),
  }),
});

// ============================================
// MCP Tool Input Schemas
// ============================================

export const LogQueryParamsSchema = z.object({
  query: z.string().optional(),
  start: TimeParamSchema.optional(),
  end: TimeParamSchema.optional(),
  limit: z.number().optional(),
  verbose: z.boolean().optional(),
  include_attributes: z.array(z.string()).optional(),
  exclude_attributes: z.array(z.string()).optional(),
  level: z.enum(['error', 'warn', 'info', 'debug', 'trace']).optional(),
});

export const MetricsQueryParamsSchema = z.object({
  metric: z.array(z.string()),
  query: z.string().optional(),
  aggregation: z.string().optional(),
  group_by: z.array(z.string()).optional(),
  start: TimeParamSchema.optional(),
  end: TimeParamSchema.optional(),
  step: z.string().optional(),
});

export const DiscoveryParamsSchema = z.object({
  sample_size: z.number().optional(),
  time_range: z.string().optional(),
});

export const MetricDiscoveryParamsSchema = z.object({
  time_range: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  filter: z.string().optional(),
});

export const MetricAttributesParamsSchema = z.object({
  metric_name: z.string(),
  time_range: z.string().optional(),
  sample_size: z.number().optional(),
});

// Type exports for request schemas
export type QueryRangeRequest = z.infer<typeof QueryRangeRequestSchema>;
export type MetricsQueryRequest = z.infer<typeof MetricsQueryRequestSchema>;
export type LogsQueryRequest = z.infer<typeof LogsQueryRequestSchema>;
export type LogQueryParams = z.infer<typeof LogQueryParamsSchema>;
export type MetricsQueryParams = z.infer<typeof MetricsQueryParamsSchema>;
export type DiscoveryParams = z.infer<typeof DiscoveryParamsSchema>;
export type MetricDiscoveryParams = z.infer<typeof MetricDiscoveryParamsSchema>;
export type MetricAttributesParams = z.infer<typeof MetricAttributesParamsSchema>;

// ============================================
// Helper Functions
// ============================================

// Generic safe parse helper
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    const errors = result.error.flatten();
    return { 
      success: false, 
      error: `Invalid structure: ${JSON.stringify(errors.fieldErrors)}`
    };
  }
}

// Specific helpers for backward compatibility
export function parseQueryRangeResponse(data: unknown): QueryRangeResponse {
  return QueryRangeResponseSchema.parse(data);
}

export function safeParseQueryRangeResponse(data: unknown): 
  | { success: true; data: QueryRangeResponse }
  | { success: false; error: string } {
  return safeParse(QueryRangeResponseSchema, data);
}