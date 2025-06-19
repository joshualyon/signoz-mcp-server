# Signoz API v4 Reference

Source: https://signoz.io/openAPISpec/api.yaml  
> Local snapshot: [./signoz_openapi.yaml](./signoz_openapi.yaml)

A human readable, interactive version of the SigNoz API documentation is also available at:  
> https://signoz.io/api-reference/

## POST /api/v4/query_range

This endpoint provides a unified interface to query metrics, logs, and traces data with different query types.

### Authentication
- Header: `SIGNOZ-API-KEY: <TOKEN>`

### Request Body Structure

```typescript
{
  start: number;        // Start time in epoch milliseconds
  end: number;          // End time in epoch milliseconds  
  step: number;         // Step/aggregation interval in seconds
  compositeQuery: {
    queryType: "builder" | "clickhouse_sql" | "promql";
    panelType: "graph" | "table" | "value" | "list" | "trace";
    builderQueries?: {
      [key: string]: BuilderQuery;
    };
    promQueries?: {
      [key: string]: PromQuery;
    };
    chQueries?: {
      [key: string]: ClickHouseQuery;
    };
  };
  variables?: object;   // Optional template variables
  noCache?: boolean;    // Bypass cache (default: false)
  formatForWeb?: boolean; // Format for web display (default: true)
}
```

### BuilderQuery Structure (for logs)

```typescript
{
  queryName: string;           // Query identifier (e.g., "A")
  dataSource: "logs";          // Data source type
  aggregateOperator: "noop";   // Use "noop" for raw log queries
  aggregateAttribute: {        // Required but can be empty for logs
    key: "",
    dataType: "",
    type: "",
    isColumn: false,
    isJSON: false
  };
  expression: string;          // Usually same as queryName
  disabled: false;
  stepInterval: number;        // In seconds
  filters: {
    op: "AND" | "OR";
    items: Array<{
      key: {
        key: string;           // Attribute name (e.g., "k8s.deployment.name")
        dataType: "string";    // Data type
        type: "tag" | "resource"; // "resource" for k8s.*, "tag" for others
        isColumn: boolean;     // true for "body", "timestamp"
      };
      op: "=" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "nin" | "contains" | "ncontains";
      value: string | string[];
    }>;
  };
  limit?: number;             // Result limit
  orderBy?: Array<{
    columnName: "timestamp";
    order: "asc" | "desc";
  }>;
  groupBy?: AttributeKey[];
  having?: Having[];
}
```

### Common Filter Operators
- `=` (maps to `in`) - Exact match
- `!=` (maps to `nin`) - Not equals
- `contains` - Contains substring
- `ncontains` - Does not contain
- `>`, `<`, `>=`, `<=` - Comparison operators

### Examples

#### Basic Logs Query
```json
{
  "start": 1742602572000,
  "end": 1742604372000,
  "step": 60,
  "compositeQuery": {
    "queryType": "builder",
    "panelType": "list",
    "builderQueries": {
      "A": {
        "queryName": "A",
        "dataSource": "logs",
        "aggregateOperator": "noop",
        "aggregateAttribute": {
          "key": "",
          "dataType": "",
          "type": "",
          "isColumn": false,
          "isJSON": false
        },
        "expression": "A",
        "disabled": false,
        "stepInterval": 60,
        "filters": {
          "op": "AND",
          "items": [{
            "key": {
              "key": "k8s.deployment.name",
              "dataType": "string",
              "type": "resource",
              "isColumn": false
            },
            "op": "in",
            "value": "stio-api"
          }]
        },
        "limit": 100,
        "orderBy": [{
          "columnName": "timestamp",
          "order": "desc"
        }]
      }
    }
  }
}
```

### Error Responses

```json
{
  "status": "error",
  "errorType": "bad_data",
  "error": "composite query is required"
}
```

Common errors:
- "composite query is required" - Missing compositeQuery field
- "composite query must contain at least one query type" - No queries in builderQueries/promQueries/chQueries