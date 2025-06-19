# SigNoz MCP Server Type System Analysis

## Current State

We've identified that the SigNoz API has two orthogonal concepts that determine the response:

### 1. Data Type (determined by `dataSource`)
- **`dataSource: 'metrics'`** → Querying metrics data
- **`dataSource: 'logs'`** → Querying logs data  
- **`dataSource: 'traces'`** → Querying traces data

### 2. Response Format (determined by `panelType`)
- **`panelType: 'graph'`** → data in `result[].series` (time series format)
- **`panelType: 'list'`** → data in `result[].list` (list format)
- **`panelType: 'table'`** → data in `result[].table` (tabular format)
- **`panelType: 'value'`** → data in single value format
- **`panelType: 'trace'`** → data in trace format

### Current Implementation Issues
The current implementation has type safety issues where we're:
1. Using `any` types in the client
2. Validating responses at the formatter level (wrong layer)
3. Conflating data type with display format
4. Not properly typing based on the actual data being queried

## Key Insight

The `QueryRangeRequest` contains two important fields that together determine the response:
- `compositeQuery.builderQueries[].dataSource` - Determines WHAT data we're querying (metrics/logs/traces)
- `compositeQuery.panelType` - Determines HOW that data is structured in the response (series/list/table)

While `panelType` determines the response structure, it doesn't determine the data type. A metrics query typically uses `panelType: 'graph'` but could also use `panelType: 'table'` for tabular display.

## Implementation Options

### Option 1: Smart Validation Based on Data Type and Panel Type

```typescript
// schemas.ts
export const MetricsResultSchema = z.object({
  queryName: z.string(),
  series: z.array(SeriesSchema),
  list: z.undefined(),
  table: z.undefined(),
});

export const LogsResultSchema = z.object({
  queryName: z.string(),
  list: z.array(RowSchema),
  series: z.undefined(),
  table: z.undefined(),
});

export const TableResultSchema = z.object({
  queryName: z.string(),
  table: TableSchema,
  series: z.undefined(),
  list: z.undefined(),
});

// Response schemas by panel type
const ResponseSchemaMap = {
  graph: QueryRangeResponseSchema.extend({
    data: QueryRangeDataSchema.extend({
      result: z.array(MetricsResultSchema)
    })
  }),
  list: QueryRangeResponseSchema.extend({
    data: QueryRangeDataSchema.extend({
      result: z.array(LogsResultSchema)
    })
  }),
  table: QueryRangeResponseSchema.extend({
    data: QueryRangeDataSchema.extend({
      result: z.array(TableResultSchema)
    })
  }),
  // ... other panel types
};

// Smart parsing function
export function parseQueryRangeResponse(
  data: unknown, 
  request: QueryRangeRequest
): QueryRangeResponse {
  const panelType = request.compositeQuery.panelType;
  const schema = ResponseSchemaMap[panelType];
  
  if (!schema) {
    throw new Error(`Unknown panel type: ${panelType}`);
  }
  
  return schema.parse(data);
}
```

**Pros:**
- No extra parameters needed
- Type safety maintained
- Request determines response validation
- Single queryRange method

**Cons:**
- Coupling between request and response validation

### Option 2: Type-Specific Client Methods (Recommended)

```typescript
// client.ts
class SignozClient {
  async queryMetrics(request: MetricsQueryRequest): Promise<MetricsResponse> {
    const response = await this.makeRequest('/api/v4/query_range', request);
    return parseMetricsResponse(response);
  }

  async queryLogs(request: LogsQueryRequest): Promise<LogsResponse> {
    const response = await this.makeRequest('/api/v4/query_range', request);
    return parseLogsResponse(response);
  }

  async queryTable(request: TableQueryRequest): Promise<TableResponse> {
    const response = await this.makeRequest('/api/v4/query_range', request);
    return parseTableResponse(response);
  }
}
```

**Pros:**
- Clear separation by data type (metrics vs logs vs traces)
- Type-specific methods are self-documenting
- Each method knows its data type and typical response format
- Doesn't conflate panel type with data type
- Easier to understand what you're querying

**Cons:**
- More methods to maintain
- All hit the same endpoint anyway

### Option 3: Generic with Schema Parameter

```typescript
// This is what we want to avoid - passing schema as parameter
async queryRange<T>(
  request: QueryRangeRequest,
  responseSchema: z.Schema<T>
): Promise<T> {
  const response = await this.makeRequest('/api/v4/query_range', request);
  return responseSchema.parse(response);
}
```

**Pros:**
- Maximum flexibility

**Cons:**
- Caller must know which schema to use
- Extra parameter is clunky
- Breaks encapsulation

## Recommended Architecture

```
┌─────────────────┐
│   MCP Server    │
├─────────────────┤
│   SignozApi     │ ← Business logic, orchestration
├─────────────────┤
│  SignozClient   │ ← HTTP + validation (separate methods by data type)
├─────────────────┤
│ ResponseFormatter│ ← Pure presentation (receives typed data)
└─────────────────┘
```

### Implementation Plan

1. **Update Client with Type-Specific Methods**
```typescript
// client.ts
export class SignozClient {
  async queryMetrics(request: MetricsQueryRequest): Promise<MetricsQueryResponse> {
    const rawResponse = await this.makeRequest('/api/v4/query_range', request);
    return MetricsQueryResponseSchema.parse(rawResponse);
  }
  
  async queryLogs(request: LogsQueryRequest): Promise<LogsQueryResponse> {
    const rawResponse = await this.makeRequest('/api/v4/query_range', request);
    return LogsQueryResponseSchema.parse(rawResponse);
  }
  
  // Keep generic method for flexibility
  async queryRange(request: QueryRangeRequest): Promise<QueryRangeResponse> {
    const rawResponse = await this.makeRequest('/api/v4/query_range', request);
    return QueryRangeResponseSchema.parse(rawResponse);
  }
}
```

2. **Create Typed Request/Response Types in Zod**
```typescript
// schemas.ts - All types derived from Zod
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

export interface MetricsResponse extends QueryRangeResponse {
  data: {
    result: Array<{
      queryName: string;
      series: Series[];
    }>;
  };
}

export interface LogsResponse extends QueryRangeResponse {
  data: {
    result: Array<{
      queryName: string;
      list: Row[];
    }>;
  };
}
```

3. **Update Formatters to Accept Typed Data**
```typescript
// formatters.ts
static formatMetricsResponse(response: MetricsResponse, ...): string {
  // No validation needed - work with typed data
  response.data.result.forEach(result => {
    result.series.forEach(series => {
      // TypeScript knows series exists!
    });
  });
}
```

## Benefits of This Approach

1. **Type Safety**: End-to-end type safety from request to response
2. **Fail Fast**: Validation happens at API boundary (client level)
3. **Clear Separation**: Each layer has a single responsibility
4. **No Magic**: The request determines the response type naturally
5. **Maintainable**: Adding new query types is straightforward

## Migration Path

1. Keep existing validation in SignozApi temporarily
2. Implement smart validation in client
3. Update formatters to expect typed responses
4. Remove validation from SignozApi
5. Clean up any remaining `any` types

## Future Considerations

- As new panel types are added, we just need to:
  1. Add the result schema
  2. Add to ResponseSchemaMap
  3. Create corresponding TypeScript types
  
- If SigNoz adds new data sources, we follow the same pattern

## Conclusion

The recommended approach (Option 2 - Type-Specific Methods) provides clear separation between different data types while maintaining flexibility for different display formats. The key insights are:

1. **`dataSource` determines the data type** (metrics vs logs vs traces)
2. **`panelType` determines the response format** (how that data is structured)
3. **These are orthogonal concerns** and shouldn't be conflated

By having separate methods for different data types, we make the API clearer and more type-safe without incorrectly coupling panel types to data types.