# SigNoz MCP Server Enhancements

This document tracks specific improvements identified through testing and usage.

## ✅ Successfully Completed

### 1. Response Size Optimization - COMPLETED
**Issue:** Log queries with full attributes exceeded MCP token limits
- 100 log entries = 44K+ tokens (exceeded 25K limit)
- 20 log entries = manageable but still verbose

**Solution IMPLEMENTED:**
- ✅ Default to minimal attribute set: `[timestamp] [level] [service-context] message`
- ✅ Added `verbose` parameter to show all attributes when needed
- ✅ Added `include_attributes`/`exclude_attributes` for custom filtering
- ✅ Smart service context: prefers `service.name`, falls back to `namespace/deployment`

**Results:**
- Clean, scannable output by default
- Dramatic improvement in readability
- Users can access full details when debugging
- Flexible attribute selection for specific use cases

### 2. Attribute Filtering for query_logs - COMPLETED
**Implemented Parameters:**
```typescript
verbose?: boolean;           // Show all attributes (default: false) - WORKING
include_attributes?: string[]; // Specific attributes to include - WORKING
exclude_attributes?: string[]; // Specific attributes to exclude - WORKING
level?: "error" | "warn" | "info" | "debug" | "trace"; // WORKING
```

**Default Minimal Output Format:**
```
[2025-06-17T22:26:42Z] [INFO] [default/stio-api]
Set variable $GridPower value as 1.3377999999999999.

[2025-06-17T22:26:41Z] [ERROR] [api-gateway]
Database connection timeout after 30s
```

**Smart Service Context:**
- `[service-name]` when `service.name` available
- `[namespace/deployment]` for Kubernetes services
- `[unknown]` for fallback cases

### 3. Code Organization - COMPLETED
**Target Structure ACHIEVED:**
```
src/
├── server.ts          # MCP server logic only
├── signoz/
│   ├── api.ts          # SigNoz API client
│   ├── types.ts        # Type definitions
│   ├── query-builder.ts # Query construction
│   └── formatters.ts   # Response formatting
└── test/
    ├── minimal-formatting.test.ts # New formatting tests
    └── [other test files] # Comprehensive test suite
```

**Benefits REALIZED:**
- ✅ Testable SigNoz API module independent of MCP (59/59 tests passing)
- ✅ Reusable for other integrations
- ✅ Better separation of concerns
- ✅ Easy to add new SigNoz endpoints

### 4. Pagination Implementation - COMPLETED ✅
**Issue:** No pagination mechanism for large result sets
- Users can't access results beyond the limit
- No indication of total available results

**Solution IMPLEMENTED:**
- ✅ Timestamp-based pagination using oldest result timestamp
- ✅ Clear AI-friendly instructions: "To get next X older results, use: end=timestamp"
- ✅ Works with any query and time range
- ✅ No data overlap or gaps
- ✅ Comprehensive integration testing with real SigNoz data

**Example Output:**
```
--- More Results Available ---
Oldest timestamp: 2025-06-17T23:09:19.025991988Z
To get next 100 older results, use: end="2025-06-17T23:09:19.025991988Z"
```

## 🚨 Remaining Critical Issues

*No critical issues remaining*

## 🔧 Planned Improvements

### Phase 1: Future Improvements (Medium Priority)

#### A. Improved Time Syntax (Remaining)
**Current:** `"now-30m"`, `"now-1h"`
**Planned:** `"30m"`, `"1h"`, `"2d"`

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

#### C. Response Format Improvements - COMPLETED
**Compact Format (non-verbose) - IMPLEMENTED:**
```
[2025-06-17T22:26:42Z] [ERROR] [default/stio-api]
Action failed for rule haHFihZr2rOWrCqCpXNg

[2025-06-17T22:26:41Z] [INFO] [default/stio-api]
HTTP 200 POST /worker/rule/eventhandler

[2025-06-17T22:26:40Z] [WARN] [default/stio-api]
Variable context.response.code not found
```

**Verbose Format - IMPLEMENTED:**
Detailed format with all attributes when `verbose: true`

#### F. Query Result Metadata
**Add to all responses:**
- Total time range queried
- Number of results returned vs estimated total
- Query execution time
- Suggestions for refinement if results are large

### Phase 3: Code Organization (Medium Priority)


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

**Response Size - ✅ ACHIEVED:**
- ✅ Default queries are clean and scannable (minimal formatting working perfectly)
- ✅ Users can access full details when needed via verbose mode
- ✅ Custom attribute selection for specific debugging needs

**Usability - ✅ ACHIEVED:**
- ✅ Common queries require fewer parameters (level parameter, smart defaults)
- ⏳ Pagination allows access to large result sets (still needed)
- ✅ Time ranges work reliably with current syntax

**Code Quality - ✅ ACHIEVED:**
- ✅ SignozApi module is independently testable (59/59 tests passing)
- ✅ Clear separation between MCP and SigNoz concerns
- ✅ Easy to add new SigNoz endpoints (modular structure)

## 🚀 Implementation Order

✅ **COMPLETED:**
1. ✅ **Extract SignozApi module** - Enables better testing
2. ✅ **Add attribute filtering** - Immediate response size improvement  
3. ✅ **Add level parameter** - Easier log filtering
4. ✅ **Polish response formatting** - Dramatic UX improvements
5. ✅ **Boolean parameter parsing** - Fixed string "false" handling
6. ✅ **Comprehensive testing** - 59/59 tests passing

⏳ **REMAINING:**
7. **Simplify time syntax** - Better user experience ("30m" vs "now-30m")
8. **Research pagination** - Test actual SigNoz behavior
9. **Implement pagination** - Complete large result set access