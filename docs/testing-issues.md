# Testing Issues and Known Problems

## Integration Test Failures

### Issue: Brittle Integration Tests
**File:** `test/signoz-api.integration.test.ts`
**Status:** 2/59 tests failing (57 pass)

**Problem Description:**
Integration tests make assumptions about the content and log levels of data in the SigNoz instance, causing failures when actual data doesn't match expectations.

**Specific Failures:**

1. **`should filter attributes in compact mode`** (line ~61)
   ```
   Expected to contain: "[ERROR]"
   Received: "[INFO]" (actual log: "HTTP 200 POST /worker/rule/timertaskhandler")
   ```
   - Test expects ERROR level logs but `stio-api` deployment only had INFO logs in test window
   - Uses hard-coded expectation: `expect(result).toContain('[ERROR]')`

2. **`should parse different time formats correctly`** 
   - Also appears to have data-dependent expectations
   - Full error details were truncated in test output

**Root Cause:**
Tests assume specific log content/levels will be present rather than working with whatever data actually exists in the SigNoz instance.

**Impact:** 
- Tests fail sporadically based on actual log data
- Integration tests are unreliable for CI/CD
- Makes it hard to verify real functionality

**Proposed Solutions:**

### Option 1: Data-Agnostic Tests
Modify tests to work with whatever data is available:
```typescript
// Instead of expecting specific log levels
expect(result).toContain('[ERROR]') || expect(result).toContain('[INFO]') || expect(result).toContain('[WARN]');

// Better: Test that some valid log level exists
expect(result).toMatch(/\[(ERROR|WARN|INFO|DEBUG|TRACE)\]/);
```

### Option 2: Test Data Setup
Create known test data or use a dedicated test namespace/deployment with predictable log patterns.

### Option 3: Mock Integration Tests
Use mock responses for consistent behavior, keep minimal real API tests.

### Option 4: Flexible Expectations
Query for actual available data first, then test against that:
```typescript
// Query what's actually available
const discovery = await signozApi.discoverLogAttributes({...});
// Then test filtering based on discovered attributes
```

**Recommended Approach:**
Combination of Options 1 and 4 - make tests data-agnostic while using discovery to understand available data.

**Files to Update:**
- `test/signoz-api.integration.test.ts` - Fix brittle expectations
- Consider adding `test/signoz-api.mock.test.ts` - Consistent mock-based tests

**Environment Context:**
- Tests run against `http://localhost:8081` (local SigNoz instance)
- Uses `stio-api` deployment for test queries
- API key: Available in `.env` file
- Connection tests pass - API integration works correctly