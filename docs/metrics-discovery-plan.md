# Metrics Discovery Implementation Plan

## Overview
This document outlines approaches for implementing metric discovery functionality in the SigNoz MCP server, similar to the existing `discover_log_attributes` feature.

## Goals
1. **`discover_metrics`** - List all available metric names with metadata
2. **`discover_metric_attributes`** - Show labels/dimensions for specific metrics

## Current State Analysis

### What We Have
- ✅ Metrics querying via PromQL (`/api/v4/query_range`)
- ✅ Basic metrics response formatting
- ✅ Working pattern from `discover_log_attributes`

### What We Need
- Access to metric metadata (names, labels)
- Efficient way to discover available metrics
- Understanding of metric cardinality/usage

### Known Information
From SigNoz documentation:
- Metrics stored in `timeseries_v4` (metadata) and `samples_v4` (values)
- UI uses `/metrics` endpoint with filters and pagination
- Each metric has `metric_name` and `labels` (tags)

## Implementation Approaches

### Approach 1: Using PromQL Queries (Limited but Immediate)

**Pros:**
- Works with existing infrastructure
- No new query types needed

**Cons:**
- PromQL not designed for discovery
- Limited ability to list all metrics

**Implementation:**
```typescript
// Try broad PromQL patterns
const queries = [
  '{__name__=~".+"}',  // Match all metrics (may timeout)
  'sum by (__name__)({__name__=~".+"})' // Group by metric name
];
```

### Approach 2: Extend for ClickHouse Queries (Recommended)

**Pros:**
- Direct access to metric metadata tables
- Efficient discovery queries
- Full control over output

**Cons:**
- Requires extending QueryBuilder
- Need to understand SigNoz's ClickHouse schema

**Implementation Steps:**

1. **Extend Types:**
```typescript
interface ChQuery {
  query: string;
  dataSource: 'metrics';
}

interface CompositeQuery {
  // ... existing fields
  chQueries?: {
    [key: string]: ChQuery;
  };
}
```

2. **Discovery Queries:**

```sql
-- List all metric names with sample count
SELECT 
  metric_name,
  COUNT(DISTINCT fingerprint) as series_count,
  MAX(unix_milli) as last_seen
FROM signoz_metrics.timeseries_v4
WHERE unix_milli >= {{start_time}}
GROUP BY metric_name
ORDER BY series_count DESC
LIMIT 100;

-- Get labels for specific metric
SELECT 
  DISTINCT JSONExtractKeys(labels) as label_keys,
  labels
FROM signoz_metrics.timeseries_v4
WHERE metric_name = '{{metric_name}}'
  AND unix_milli >= {{start_time}}
LIMIT 10;
```

### Approach 3: Research `/metrics` Endpoint (Investigation Needed)

**Pros:**
- Purpose-built for metric discovery
- Used by SigNoz UI

**Cons:**
- Not documented in public API
- May be internal/unstable

**Research Needed:**
1. Test if `/metrics` endpoint accepts SIGNOZ-API-KEY
2. Analyze response format
3. Check if it's stable across versions

## Proposed Implementation Plan

### Phase 1: Investigation (Immediate)
1. Test PromQL discovery queries with small time windows
2. Attempt to use `/metrics` endpoint with API key
3. Document findings

### Phase 2: Basic Implementation
1. If PromQL works adequately:
   - Implement `discover_metrics` using PromQL patterns
   - Add time window limits to prevent timeouts
   
2. If `/metrics` endpoint is accessible:
   - Create dedicated client method
   - Parse and format response

### Phase 3: Full Implementation (If Needed)
1. Extend types to support `chQueries`
2. Add ClickHouse query builder
3. Implement direct table queries
4. Add caching for discovered metrics

## Example Usage

### discover_metrics
```bash
# Basic discovery
discover_metrics({
  time_range: "15m",  // Short window to prevent timeout
  limit: 50
})

# Output:
Available Metrics (50 most active):
• http_request_duration_seconds (1,234 series)
  Last seen: 2 minutes ago
  
• cpu_usage_percent (567 series)
  Last seen: 1 minute ago
  
• memory_usage_bytes (890 series)
  Last seen: 1 minute ago
```

### discover_metric_attributes
```bash
# Discover labels for specific metric
discover_metric_attributes({
  metric_name: "http_request_duration_seconds",
  sample_size: 10
})

# Output:
Metric: http_request_duration_seconds

Common Labels:
• method: GET, POST, PUT, DELETE
• status_code: 200, 201, 400, 404, 500
• service: api-gateway, user-service, payment-service
• endpoint: /api/v1/users, /api/v1/orders

Example Queries:
• http_request_duration_seconds{method="GET"}
• http_request_duration_seconds{service="api-gateway", status_code="500"}
• rate(http_request_duration_seconds[5m])
```

## Next Steps
1. Start with Approach 1 (PromQL) for quick wins
2. Investigate `/metrics` endpoint availability
3. Based on findings, decide if chQueries support is needed
4. Implement in phases to deliver value incrementally

## Success Criteria
- Users can discover available metrics without prior knowledge
- Discovery includes helpful metadata (series count, last seen)
- Label discovery enables precise metric queries
- Performance is acceptable (< 5 second response time)
- Clear examples guide users to effective queries