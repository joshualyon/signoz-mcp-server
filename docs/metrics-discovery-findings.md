# Metrics Discovery Implementation - Final Findings

## Summary

After thorough investigation, SigNoz provides excellent **UNOFFICIAL/INTERNAL** endpoints for metrics discovery:

### ⚠️ IMPORTANT: These are Undocumented Internal Endpoints

**Risk Warning:** These endpoints are used internally by the SigNoz UI and are **NOT officially documented**. They:
- Could change or be removed without notice in future SigNoz releases  
- Have no official stability guarantees
- Are not recommended by SigNoz for external use
- Should be used with caution in production systems

### ✅ Working Internal Endpoints

1. **`POST /api/v1/metrics`** - List all metrics with metadata
2. **`GET /api/v1/metrics/{metric_name}/metadata`** - Get detailed metric attributes

These endpoints work perfectly with API keys but come with the above stability caveats.

## Detailed Findings

### 1. Metrics List Endpoint: `POST /api/v1/metrics`

**Request:**
```json
{
  "filters": { "items": [], "op": "AND" },
  "orderBy": { "columnName": "samples", "order": "desc" },
  "limit": 50,
  "offset": 0,
  "start": 1750254821723,
  "end": 1750258421723
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "metrics": [
      {
        "metric_name": "apisix_http_status",
        "description": "HTTP status codes per service in APISIX",
        "type": "Sum",
        "unit": "",
        "timeseries": 15689,
        "samples": 7530720,
        "lastReceived": 0
      }
    ]
  }
}
```

### 2. Metric Metadata Endpoint: `GET /api/v1/metrics/{metric_name}/metadata`

**Response:**
```json
{
  "status": "success",
  "data": {
    "name": "http_client_duration_bucket",
    "description": "Measures the duration of outbound HTTP requests.",
    "type": "Histogram",
    "unit": "ms",
    "samples": 1437772416,
    "timeSeriesTotal": 617539,
    "timeSeriesActive": 34416,
    "lastReceived": 1750258732520,
    "attributes": [
      {
        "key": "net_peer_name",
        "value": ["login.microsoftonline.com", "api.smartthings.com", ...],
        "valueCount": 354
      },
      {
        "key": "http_status_code", 
        "value": ["200", "404", "500", ...],
        "valueCount": 22
      }
    ],
    "metadata": {
      "metric_type": "Histogram",
      "temporality": "Cumulative",
      "monotonic": false
    }
  }
}
```

### 3. PromQL vs Builder Queries

**For Metrics Discovery**: Use the undocumented endpoints (much better)
**For Metrics Querying**: Use either:
- `promQueries` with PromQL expressions
- `builderQueries` for metrics dataSource
- `chQueries` for direct ClickHouse SQL

The confusion about "composite query required" was because raw PromQL queries must be wrapped in the composite query structure.

## Underlying ClickHouse Queries

Based on server logs, the endpoints use these optimized queries:

**For metrics list:**
```sql
SELECT t.metric_name AS metric_name, 
       ANY_VALUE(t.description) AS description, 
       ANY_VALUE(t.type) AS metric_type, 
       ANY_VALUE(t.unit) AS metric_unit, 
       uniq(t.fingerprint) AS timeseries, 
       uniq(metric_name) OVER() AS total 
FROM signoz_metrics.distributed_time_series_v4 AS t 
WHERE unix_milli BETWEEN 1750251600000 AND 1750258384133 
  AND NOT startsWith(metric_name, 'signoz_') 
  AND __normalized = true 
GROUP BY t.metric_name 
ORDER BY timeseries desc 
LIMIT 50 OFFSET 0;
```

**For metric attributes:**
```sql
SELECT kv.1 AS key, 
       arrayMap(x -> trim(BOTH '"' FROM x), groupUniqArray(1000)(kv.2)) AS values, 
       length(groupUniqArray(10000)(kv.2)) AS valueCount 
FROM signoz_metrics.distributed_time_series_v4_1week 
ARRAY JOIN arrayFilter(x -> NOT startsWith(x.1, '__'), JSONExtractKeysAndValuesRaw(labels)) AS kv 
WHERE metric_name = 'http_client_duration_bucket' 
  AND __normalized=true 
GROUP BY kv.1 
ORDER BY valueCount DESC;
```

## Implementation Strategy

### Phase 1: `discover_metrics` Tool ✅ Ready
- Use `POST /api/v1/metrics` endpoint
- Format into categories (HTTP, System, K8s, etc.)
- Show activity metrics (samples, time series)
- Provide example queries

### Phase 2: `discover_metric_attributes` Tool ✅ Ready  
- Use `GET /api/v1/metrics/{metric_name}/metadata` endpoint
- Show all labels with sample values and cardinality
- Generate context-aware example queries
- Handle different metric types (Histogram, Gauge, Sum)

### Phase 3: Enhanced Metrics Querying
- Fix current metrics querying to use proper composite query structure
- Support both PromQL and builder approaches
- Add better response formatting

## Sample Implementation

### discover_metrics
```typescript
async discoverMetrics(params: MetricDiscoveryParams): Promise<string> {
  const response = await this.client.fetch('/api/v1/metrics', {
    method: 'POST',
    body: JSON.stringify({
      filters: { items: [], op: "AND" },
      orderBy: { columnName: "samples", order: "desc" },
      limit: params.limit || 50,
      start: Date.now() - TimeUtils.parseTime(params.time_range || "1h") * 1000,
      end: Date.now()
    })
  });
  
  return ResponseFormatter.formatMetricsList(response.data.metrics);
}
```

### discover_metric_attributes  
```typescript
async discoverMetricAttributes(params: MetricAttributesParams): Promise<string> {
  const response = await this.client.fetch(`/api/v1/metrics/${params.metric_name}/metadata`);
  return ResponseFormatter.formatMetricAttributes(response.data);
}
```

## Advantages of This Approach

1. **Complete Attribute Discovery** - Gets all labels with actual values
2. **Real Cardinality Data** - Shows how many unique values each label has
3. **Rich Metadata** - Type, unit, temporality, description
4. **High Performance** - Optimized ClickHouse queries under the hood
5. **No Query Complexity** - Simple HTTP endpoints vs complex PromQL discovery

## Next Steps

1. ✅ Document endpoints and test them
2. ⏳ Implement both discovery tools using these endpoints
3. ⏳ Fix current metrics querying with proper composite query structure
4. ⏳ Add comprehensive testing

This approach gives us enterprise-grade metrics discovery capabilities using SigNoz's own optimized internal APIs.