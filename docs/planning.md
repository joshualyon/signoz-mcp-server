# Signoz MCP Server Planning

## Overview
This MCP server will expose Signoz observability data (logs, metrics, and traces) to Claude, enabling natural language queries against monitoring data.

## Signoz API Integration
- **API Version**: v4 (available in Signoz 0.85+)
- **Main Endpoint**: `/api/v4/query_range/` - Unified interface for querying logs, metrics, and traces
- **Authentication**: API Key based

## Proposed MCP Tools

### 1. Query Logs (`query_logs`) ✅
Query and analyze application logs from Signoz.

**Current Parameters:**
- `query`: Log query string (required) - Simple syntax: key=value, key~value, key!=value
- `start`: Start time (ISO 8601, Unix timestamp, or "now-Xm/h/d" format)
- `end`: End time (optional, defaults to now)
- `limit`: Maximum number of results (default: 100)

**Planned Enhancements:**
- `level`: Log level filter (error, warn, info, debug, trace) - easier than query syntax
- `verbose`: Boolean to show all attributes (default: false)
- `include_attributes`: Array of specific attributes to include
- `exclude_attributes`: Array of attributes to exclude
- Simplified time syntax: "30m" instead of "now-30m"

**Use Cases:**
- Search for error messages
- Analyze application behavior
- Debug specific issues
- Monitor application health

### 2. Query Metrics (`query_metrics`)
Query metrics data using PromQL syntax.

**Parameters:**
- `query`: PromQL query string (required)
- `start`: Start time
- `end`: End time
- `step`: Query resolution (e.g., '1m', '5m')

**Use Cases:**
- Monitor resource utilization
- Analyze performance metrics
- Create custom alerting queries
- Track SLIs/SLOs

### 3. Query Traces (`query_traces`)
Query distributed traces to understand request flow.

**Parameters:**
- `query`: Trace query string (required)
- `start`: Start time
- `end`: End time
- `limit`: Maximum number of results

**Use Cases:**
- Debug latency issues
- Understand service dependencies
- Analyze request flow
- Identify bottlenecks

## Future Tool Ideas

### 4. Get Service Overview (`get_service_overview`)
Get a high-level overview of a specific service including error rates, latency, and throughput.

### 5. Get Alert Status (`get_alert_status`)
Retrieve current alert status and recent alert history.

### 6. Compare Time Ranges (`compare_time_ranges`)
Compare metrics/logs between different time periods to identify anomalies.

### 7. Get Top Errors (`get_top_errors`)
Retrieve the most frequent errors in a given time range.

### 8. Service Dependencies (`get_service_dependencies`)
Analyze service dependencies and communication patterns.

## Implementation Considerations

### Authentication ✅
- ✅ Store API key securely (environment variable)
- ⏳ Support for multiple Signoz instances (future)

### Query Building ✅
- ✅ Simple filter syntax implemented (key=value, key~value, key!=value)
- ✅ AND operator support
- ⏳ Natural language to query translation helpers (future)
- ⏳ Common query templates (future)
- ⏳ Query validation (future)

### Response Formatting 🔧
- ✅ Basic structured presentation
- 🔧 **CRITICAL:** Need attribute filtering to reduce verbosity
- 🔧 **CRITICAL:** Need better pagination for large datasets
- ⏳ Visualization suggestions (future)

### Error Handling ✅
- ✅ Network failures handled
- ✅ Invalid queries handled
- ✅ Authentication errors handled
- ⏳ API rate limiting (not implemented, may not be needed)

### Performance 🔧
- 🔧 **CRITICAL:** Response size optimization needed
- 🔧 **CRITICAL:** Pagination implementation needed
- ⏳ Response caching (future)
- ⏳ Query optimization (future)

### Code Organization 🔧
- 🔧 **NEXT:** Extract SignozApi module from MCP server
- 🔧 **NEXT:** Separate concerns for better testability
- 🔧 **NEXT:** Create standalone test utilities

## Current Status (As of Testing)

✅ **Completed:**
- Basic log querying with `/api/v4/query_range/` endpoint
- Simplified filter syntax for log queries
- Time range parsing with relative time support
- Connection testing and error handling
- Log attribute discovery tool
- MCP server integration working

🔧 **Issues Identified:**
- **Response Size:** Even 20 log entries with full attributes exceeded 25K token limit
- **Verbose Output:** Too many irrelevant attributes (k8s.node.uid, log.file.path, etc.)
- **Time Syntax:** Current "now-30m" syntax could be simplified to "30m"
- **Pagination:** Unknown how SigNoz handles pagination beyond result limits

## Next Steps

### Phase 1: Core Improvements (High Priority)

1. **Response Optimization**
   - ✅ Reduce default attribute verbosity
   - Add `verbose` boolean parameter to show all attributes
   - Add `include_attributes`/`exclude_attributes` arrays for custom filtering
   - Default to essential fields only: timestamp, level, service/deployment, body

2. **Enhanced Log Filtering**
   - Add dedicated `level` parameter (enum: error, warn, info, debug, trace)
   - Simplify time syntax: "30m", "1h", "2d" instead of "now-30m"
   - Maintain backward compatibility with existing syntax

3. **Code Refactoring**
   - Extract SignozApi into separate module for better testability
   - Create dedicated test scripts that use the extracted API module
   - Separate MCP server logic from SigNoz API logic

### Phase 2: Advanced Features (Medium Priority)

4. **Pagination Research & Implementation**
   - Test SigNoz API pagination behavior with large result sets
   - Implement timestamp-based pagination (likely approach based on SigNoz UI)
   - Add metadata showing "showing X-Y of estimated Z results"
   - Provide guidance for next page queries

5. **Query Enhancement**
   - Add query validation and suggestions
   - Implement common query templates
   - Add query result summarization for large datasets

6. **Performance & UX**
   - Add response time tracking
   - Implement smart result limits based on content size
   - Add query result caching for frequently accessed data

### Phase 3: Future Enhancements (Low Priority)

7. **Advanced Tools**
   - Service overview dashboard
   - Alert status monitoring
   - Time range comparisons
   - Top errors analysis

8. **Integration Improvements**
   - Multiple SigNoz instance support
   - Enhanced error handling and diagnostics
   - Query optimization suggestions

## Testing Insights

**Real-world Usage Patterns:**
- Users query specific deployments frequently (k8s.deployment.name=X)
- Error-level filtering is common
- Most queries are for recent time ranges (15m-1h)
- Full attribute output is overwhelming and rarely needed

**API Behavior:**
- SigNoz v4 API works as documented
- Response format is consistent and parseable
- Authentication via SIGNOZ-API-KEY header
- Time ranges in milliseconds for API calls

**Performance Considerations:**
- Even small result sets can be verbose due to attribute count
- Token limit exceeded with 100 entries, workable with 20
- Response formatting significantly impacts readability