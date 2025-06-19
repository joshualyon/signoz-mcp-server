# Metrics Discovery Implementation Plan - Final

## Discoveries from Testing ✅

### ⚠️ What Works (But With Caveats)
1. **`POST /api/v1/metrics` endpoint** - Excellent for listing metrics (**INTERNAL/UNDOCUMENTED**)
   - Returns metric names, types, descriptions, sample counts, and series counts
   - Supports filtering, sorting, and pagination  
   - Used by SigNoz UI, works with API keys
   - **Risk:** Could change without notice as it's not officially documented

2. **`GET /api/v1/metrics/{metric_name}/metadata` endpoint** - Perfect for attributes! (**INTERNAL/UNDOCUMENTED**)
   - Returns all labels with sample values and cardinality counts
   - Includes rich metadata (type, unit, temporality, descriptions)
   - Much better than trying to extract from PromQL queries
   - **Risk:** No stability guarantees as it's an internal endpoint

3. **Metrics querying via composite queries**
   - PromQL: Use `promQueries` within `compositeQuery`
   - Builder: Use `builderQueries` with `dataSource: "metrics"`
   - ClickHouse: Use `chQueries` for direct SQL

### ❌ What Doesn't Work  
1. **Raw PromQL queries** - Must be wrapped in composite query structure
2. **`/api/v1/metrics/autocomplete`** - Returns HTML (frontend route)
3. **Simple metric name patterns** - Need proper endpoint structure

### 🔄 Official Alternatives (For Reference)

If the internal endpoints become unavailable, we could fall back to:

1. **ClickHouse Queries via `/api/v4/query_range`** (Official)
   - Use `chQueries` with direct ClickHouse SQL
   - Query `signoz_metrics.time_series_v4` tables directly
   - More complex but officially supported

2. **PromQL Discovery Patterns** (Official but Limited)
   - Use broad queries like `{__name__=~".+"}` to discover metrics
   - Extract labels from returned time series data
   - Slower and less comprehensive than internal endpoints

3. **Builder Queries for Metrics** (Official)
   - Use `builderQueries` with `dataSource: "metrics"`
   - Can aggregate and explore metric dimensions
   - More limited than direct metadata access

## Implementation Plan ✅

### Phase 1: `discover_metrics` Tool (Ready to Implement)

**Implementation:**
```typescript
async discoverMetrics(params: MetricDiscoveryParams): Promise<string> {
  const response = await this.client.makeRequest('/api/v1/metrics', {
    method: 'POST',
    body: JSON.stringify({
      filters: { items: [], op: "AND" },
      orderBy: { columnName: "samples", order: "desc" },
      limit: params.limit || 50,
      offset: 0,
      start: Date.now() - TimeUtils.parseTimeParam(params.time_range || "1h") * 1000,
      end: Date.now()
    })
  });
  
  return ResponseFormatter.formatMetricsList(response.data.metrics);
}
```

### Phase 2: `discover_metric_attributes` Tool (Ready to Implement)

**Implementation using the perfect endpoint we found:**
```typescript
async discoverMetricAttributes(params: MetricAttributesParams): Promise<string> {
  const response = await this.client.makeRequest(`/api/v1/metrics/${params.metric_name}/metadata`);
  return ResponseFormatter.formatMetricAttributes(response.data);
}
```

**Output Format:**
```
# Metric: http_client_duration_bucket

**Type:** Histogram | **Unit:** ms
**Description:** Measures the duration of outbound HTTP requests.
**Activity:** 1,437M samples | 617K total series | 34K active series

## 🏷️ Labels (Attributes)

**net_peer_name** (354 unique values)
  Sample values: login.microsoftonline.com, api.smartthings.com, api.twilio.com
  
**http_status_code** (22 unique values)  
  Sample values: 200, 404, 500, 201, 424

**http_method** (4 unique values)
  Sample values: POST, GET, PUT, DELETE

**service_name** (1 unique value)
  Sample values: stio-api

## 🔍 Example Queries
• http_client_duration_bucket{http_method="POST"}
• sum(rate(http_client_duration_bucket[5m])) by (service_name, http_status_code)  
• histogram_quantile(0.95, http_client_duration_bucket{service_name="stio-api"})
```

### Phase 3: Enhanced Metrics Querying (Fix Current Implementation)

**Current Issue:** Metrics queries use simple query string instead of composite query structure.

**Fix:**
```typescript
// Current (broken)
return {
  start: startTime * 1000000,
  end: endTime * 1000000, 
  step: step,
  query: params.query,  // ❌ This won't work
};

// Fixed (working)
return {
  start: startTime * 1000000,
  end: endTime * 1000000,
  step: step,
  compositeQuery: {
    queryType: "promql",
    panelType: "graph", 
    promQueries: {
      "A": {
        query: params.query,
        disabled: false,
        name: "A"
      }
    }
  }
};
```

## Implementation Recommendations

### 🚨 Important Considerations for Internal Endpoints

1. **Error Handling:** Implement robust error handling for endpoint changes
2. **User Warnings:** Clearly warn users these are unofficial endpoints  
3. **Fallback Strategy:** Have plan for official alternatives if endpoints break
4. **Documentation:** Document the risk/benefit tradeoff clearly
5. **Version Monitoring:** Test endpoints against new SigNoz releases

### 📋 Implementation Approach

**Pros of Using Internal Endpoints:**
- ✅ Complete, rich metric metadata
- ✅ Excellent performance (optimized ClickHouse queries)
- ✅ Perfect attribute discovery with cardinality
- ✅ Exactly what users need for metrics exploration

**Cons of Using Internal Endpoints:**
- ❌ Could break without notice in SigNoz updates
- ❌ No official support if issues arise
- ❌ Not recommended by SigNoz for external use

**Recommendation:** Implement with clear warnings and robust error handling. The benefits are significant enough to justify the risk if users understand the tradeoffs.

## Recommended Implementation Order

### 1. Implement `discover_metrics` (2 hours)
- [x] Create new types for metrics discovery
- [x] Add client method for `/api/v1/metrics`
- [x] Create formatter for metric list
- [x] Add tool to server.ts
- [x] Write tests

### 2. Enhanced Metrics Query (1 hour)
- [x] Update metrics query builder to use promQueries
- [x] Fix composite query structure
- [x] Test with various PromQL queries

### 3. Basic Attribute Discovery (2 hours)
- [ ] Implement sample-based label extraction
- [ ] Handle empty results gracefully
- [ ] Provide helpful examples even without labels

### 4. Documentation (30 min)
- [ ] Update README with metrics examples
- [ ] Add to usage-examples.md
- [ ] Update help tool

## Type Definitions

```typescript
interface MetricInfo {
  metric_name: string;
  description: string;
  type: 'Sum' | 'Gauge' | 'Histogram' | 'Summary';
  unit: string;
  timeseries: number;
  samples: number;
  lastReceived: number;
}

interface MetricDiscoveryParams {
  time_range?: string;  // "1h", "24h", etc
  limit?: number;       // Max metrics to return
  filter?: string;      // Filter by metric name pattern
}

interface MetricAttributesParams {
  metric_name: string;
  time_range?: string;
  sample_size?: number;
}
```

## Success Criteria
- ✅ Users can list all available metrics
- ✅ Metrics show useful metadata (type, sample count)
- ✅ Clear categorization of metrics
- ✅ Example queries provided
- ⚠️  Label discovery works when data is available
- ✅ Fast response times (< 2 seconds)

## Next Steps
1. Start with basic `discover_metrics` implementation
2. Test with real SigNoz instance
3. Iterate on attribute discovery based on actual data availability
4. Consider caching metric metadata for performance