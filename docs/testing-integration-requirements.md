# Integration Test Requirements

## Problem Solved

Previously, integration tests would silently "pass" when the required `SIGNOZ_API_KEY` environment variable was missing. This created false positives where the test suite appeared successful but integration tests weren't actually running.

## Solution

Integration tests now properly handle missing environment variables:

### 1. **Environment Validation Test**
Each integration test file includes a validation test that fails hard when requirements aren't met:

```typescript
const hasApiKey = !!process.env.SIGNOZ_API_KEY;
const skipIntegrationTests = process.env.SKIP_INTEGRATION_TESTS === '1';

describe('test environment validation', () => {
  it('should have required environment variables for integration tests', () => {
    if (skipIntegrationTests) {
      console.log('Integration tests explicitly skipped via SKIP_INTEGRATION_TESTS=1');
      return;
    }
    
    if (!hasApiKey) {
      throw new Error(`Integration tests require SIGNOZ_API_KEY environment variable.`);
    }
    
    expect(hasApiKey).toBe(true);
  });
});
```

### 2. **Conditional Test Skipping**
Integration tests use vitest's `skipIf` to properly mark tests as skipped:

```typescript
it.skipIf(!hasApiKey || skipIntegrationTests)('should test integration functionality', async () => {
  // Test code here
});
```

## Test Behavior

### Without API Key
```bash
$ bun test test/metrics-discovery-tools.test.ts
❌ FAIL: "Integration tests require SIGNOZ_API_KEY environment variable"
⏭️  SKIP: 3 integration tests properly skipped
Result: 0 pass, 3 skip, 1 fail
```

### With Skip Flag
```bash
$ SKIP_INTEGRATION_TESTS=1 bun test test/metrics-discovery-tools.test.ts
✅ PASS: Environment validation (integration tests explicitly skipped)
⏭️  SKIP: 3 integration tests properly skipped  
Result: 1 pass, 3 skip, 0 fail
```

### With API Key
```bash
$ SIGNOZ_API_KEY=your-key bun test test/metrics-discovery-tools.test.ts
✅ PASS: Environment validation
✅ PASS: Integration test 1
✅ PASS: Integration test 2
✅ PASS: Integration test 3
Result: 4 pass, 0 skip, 0 fail
```

## Benefits

1. **No False Positives:** Tests fail clearly when requirements aren't met
2. **Clear Visibility:** Test output shows exactly what was skipped vs what passed
3. **CI/CD Friendly:** Can explicitly skip integration tests or require API keys
4. **Developer Experience:** Clear error messages explain what's needed

## Environment Variables

### Automatic .env Loading
Bun automatically loads `.env` files for both the main application and tests. Simply create or update `.env` in the project root:

```bash
# .env
SIGNOZ_API_KEY=your-actual-api-key
SIGNOZ_API_URL=http://localhost:8081
```

### Available Variables
- `SIGNOZ_API_KEY`: Required for integration tests to run
- `SIGNOZ_API_URL`: Optional, defaults to `http://localhost:8081`  
- `SKIP_INTEGRATION_TESTS=1`: Explicitly skip all integration tests

This ensures integration tests either run properly with real API credentials or fail/skip clearly, eliminating the false positive problem.