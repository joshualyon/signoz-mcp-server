# Testing and Environment Variable Setup

## Problem Summary

We discovered that integration tests were giving false positives - appearing to pass when the required `SIGNOZ_API_KEY` environment variable was missing, but actually just silently skipping.

## Environment Variable Loading Issues

### The Challenge
- **Bun**: Automatically loads `.env` files when running `bun test {file}` 
- **Vitest**: Does NOT automatically load `.env` files when running `vitest` commands
- **Result**: `bun run test:ui` (which runs `vitest --ui`) failed with `SIGNOZ_API_KEY=not set`

### Current Status (Temporary Solution)
We temporarily switched to using `bun test` for all test scripts:

```json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch", 
    "test:ui": "bun test",  // ❌ This loses vitest UI feature!
    "test:unit": "bun test test/*.test.ts",
    "test:integration": "bun test test/*.integration.test.ts"
  }
}
```

### Issues with Current Approach

1. **Lost Vitest UI**: `test:ui` no longer uses vitest's web UI feature
2. **Mixed Test Runners**: Using `bun test` to run vitest-style tests
3. **Dependencies**: Still dependent on vitest for test utilities (describe, it, expect)
4. **Feature Loss**: Missing vitest's advanced reporting, debugging, and UI features

## Preferred Solution (TODO)

Use vitest properly with environment loading via vitest config:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load .env files and merge into process.env
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, val] of Object.entries(env)) {
    process.env[key] = val;
  }

  return {
    test: {
      // vitest config
    }
  };
});
```

**Benefits:**
- Keeps vitest UI functionality
- Automatic .env loading 
- Full vitest feature set
- Consistent test runner

## Integration Test Environment Validation

### Problem
Tests were silently "passing" when API keys were missing instead of failing clearly.

### Solution: Reusable Testing Utility
Created `test/test-utils.ts` with reusable functions to eliminate repetition:

```typescript
// test/test-utils.ts
export function setupIntegrationTests() {
  createEnvironmentValidationTest();  // Adds environment validation test
  
  return {
    shouldSkipIntegrationTests: shouldSkipIntegrationTests(),
    environment: getTestEnvironment()
  };
}
```

### Usage in Test Files
```typescript
import { setupIntegrationTests } from './test-utils.js';

describe('My Integration Tests', () => {
  const { shouldSkipIntegrationTests } = setupIntegrationTests();
  
  // Individual tests with readable syntax
  it.skipIf(shouldSkipIntegrationTests)('should test integration functionality', async () => {
    // Test code here - only runs when API key is available
  });
});
```

### Benefits
- **🔄 Reusable**: One utility for all integration test files
- **📖 Readable**: `it.skipIf(shouldSkipIntegrationTests)` reads like natural language  
- **✅ Consistent**: Same validation pattern across all files
- **🛡️ Fail-fast**: Hard failures when environment is wrong, not silent skips

### Test Behavior
- **Without API Key**: Test fails hard with clear error message
- **With SKIP_INTEGRATION_TESTS=1**: Tests properly skip with explanation  
- **With API Key**: All tests run normally

## Files Updated with Reusable Utility
- ✅ `test/test-utils.ts` - **NEW**: Reusable testing utility
- ✅ `test/metrics-discovery-tools.test.ts` - Updated to use utility  
- ✅ `test/pagination.integration.test.ts` - Updated to use utility
- ✅ **ALL REMAINING FILES COMPLETED** (10/10 total):
  - ✅ `test/metrics-metadata-endpoint.test.ts`
  - ✅ `test/metrics-discovery-final.test.ts` 
  - ✅ `test/metrics-attributes.test.ts`
  - ✅ `test/metrics-autocomplete.test.ts`
  - ✅ `test/metrics-endpoint.test.ts`
  - ✅ `test/promql-discovery.test.ts`
  - ✅ `test/pagination.validation.test.ts`
  - ✅ `test/signoz-api.integration.test.ts`

## ✅ **STATUS: COMPLETE**

### **Environment Loading: ✅ SOLVED**
- Vitest properly loads `.env` files via `loadEnv` configuration
- Full vitest UI functionality restored (`bun run test:ui` works perfectly)
- No additional dependencies required

### **Integration Test Standardization: ✅ COMPLETE**
- **10/10 integration test files** using standardized utility
- **No more false positives** - tests fail hard when environment is wrong
- **Readable syntax** throughout: `it.skipIf(shouldSkipIntegrationTests)`
- **Consistent pattern** across entire test suite

### **Benefits Achieved**
- 🔄 **DRY Principle**: No code duplication across test files
- 📖 **Readability**: Natural language test syntax
- 🛡️ **Reliability**: Hard failures prevent silent skips
- 🎯 **Maintainability**: Single utility to update for changes
- ✅ **Consistency**: Same pattern across all integration tests

## Environment Variables

```bash
# .env (automatically loaded by bun, needs config for vitest)
SIGNOZ_API_KEY=your-actual-api-key
SIGNOZ_BASE_URL=http://localhost:8081

# Optional: Skip integration tests entirely
SKIP_INTEGRATION_TESTS=1
```