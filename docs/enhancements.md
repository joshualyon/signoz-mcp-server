# SigNoz MCP Server Enhancements

This document tracks specific improvements identified through testing and usage.

## 🚨 Critical Issues

### 1. Response Size Optimization
**Issue:** Log queries with full attributes exceed MCP token limits
- 100 log entries = 44K+ tokens (exceeded 25K limit)
- 20 log entries = manageable but still verbose

**Solution:**
- Default to minimal attribute set: `timestamp`, `level`, `service`/`deployment`, `body`
- Add `verbose` parameter to show all attributes when needed
- Add `include_attributes`/`exclude_attributes` for custom filtering

### 2. Pagination Support
**Issue:** No pagination mechanism for large result sets
- Users can't access results beyond the limit
- No indication of total available results

**Research Needed:**
- How does SigNoz UI handle pagination?
- Test with large time ranges to see API behavior
- Likely timestamp-based pagination (oldest timestamp → next start time)

## 🔧 Planned Improvements

### Phase 1: Immediate (High Priority)

#### A. Attribute Filtering for query_logs
**New Parameters:**
```typescript
verbose?: boolean;           // Show all attributes (default: false)
include_attributes?: string[]; // Specific attributes to include
exclude_attributes?: string[]; // Specific attributes to exclude
```

**Default Minimal Attributes:**
- `timestamp` - When the log occurred
- `level`/`severityText` - Log level (error, info, etc.)
- `service.name` or `k8s.deployment.name` - Service identifier
- `body` - Main log message

**Hidden by Default:**
- `log.file.path`, `log.iostream` - File system details
- `k8s.node.uid`, `k8s.pod.uid` - Kubernetes internal IDs
- `signoz.component` - SigNoz internals
- `host.name` - Unless specifically requested

#### B. Simplified Log Level Filtering
**New Parameter:**
```typescript
level?: "error" | "warn" | "info" | "debug" | "trace";
```

**Benefits:**
- Easier than remembering query syntax: `level=error`
- Can combine with other query filters
- Matches SigNoz UI pattern

#### C. Improved Time Syntax
**Current:** `"now-30m"`, `"now-1h"`
**New:** `"30m"`, `"1h"`, `"2d"`

**Implementation:**
- Maintain backward compatibility with `now-X` format
- New format assumes "ago to now" if only start provided
- Support ranges: `start="1h", end="30m"` = 1 hour ago to 30 minutes ago

### Phase 2: Enhanced Features (Medium Priority)

#### D. Pagination Implementation
**Approach:** Timestamp-based pagination
```typescript
// Response includes pagination metadata
{
  logs: [...],
  pagination: {
    total_estimated: 1247,
    showing: "1-100",
    next_cursor: "2025-06-17T21:15:00Z",
    has_more: true
  }
}
```

**Usage:**
```typescript
// First page
query_logs({ query: "level=error", limit: 100 })

// Next page  
query_logs({ 
  query: "level=error", 
  limit: 100,
  end: "2025-06-17T21:15:00Z"  // Use cursor from previous response
})
```

#### E. Response Format Improvements
**Compact Format (non-verbose):**
```
[ERROR] [21:20:19] stio-api: Action failed for rule haHFihZr2rOWrCqCpXNg
[INFO]  [21:20:19] stio-api: HTTP 200 POST /worker/rule/eventhandler
[WARN]  [21:20:18] stio-api: Variable context.response.code not found
```

**Verbose Format:**
Current detailed format with all attributes

#### F. Query Result Metadata
**Add to all responses:**
- Total time range queried
- Number of results returned vs estimated total
- Query execution time
- Suggestions for refinement if results are large

### Phase 3: Code Organization (Medium Priority)

#### G. Extract SignozApi Module
**Current Structure:**
```
src/server.ts - Everything in one file
```

**Target Structure:**
```
src/
├── server.ts          # MCP server logic only
├── signoz/
│   ├── api.ts          # SigNoz API client
│   ├── types.ts        # Type definitions
│   ├── query-builder.ts # Query construction
│   └── response-formatter.ts # Response formatting
└── test/
    ├── api-test.ts     # Direct API testing
    └── integration-test.ts # End-to-end tests
```

**Benefits:**
- Testable SigNoz API module independent of MCP
- Reusable for other integrations
- Better separation of concerns
- Easier to add new SigNoz endpoints

## 📝 Testing Strategy

### API Pagination Testing
1. Create test with very wide time range (24+ hours)
2. Set small limit (5-10 entries)
3. Examine response for pagination hints
4. Test timestamp-based continuation
5. Document actual SigNoz pagination behavior

### Response Size Testing  
1. Test various attribute filtering combinations
2. Measure token usage with different verbosity levels
3. Find optimal default attribute set
4. Test with different log types (structured vs unstructured)

### Time Format Testing
1. Test backward compatibility with existing format
2. Validate new simplified syntax
3. Test edge cases (future times, invalid formats)
4. Ensure consistent behavior across time zones

## 🎯 Success Metrics

**Response Size:**
- Default queries stay under 10K tokens for 50+ log entries
- Users can access full details when needed via verbose mode

**Usability:**
- Common queries require fewer parameters
- Pagination allows access to large result sets
- Time ranges are intuitive to specify

**Code Quality:**
- SignozApi module is independently testable
- Clear separation between MCP and SigNoz concerns
- Easy to add new SigNoz endpoints

## 🚀 Implementation Order

1. **Extract SignozApi module** - Enables better testing
2. **Add attribute filtering** - Immediate response size improvement  
3. **Add level parameter** - Easier log filtering
4. **Simplify time syntax** - Better user experience
5. **Research pagination** - Test actual SigNoz behavior
6. **Implement pagination** - Complete large result set access
7. **Polish response formatting** - Final UX improvements