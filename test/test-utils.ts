/**
 * Shared testing utilities for integration test environment validation
 */

import { describe, it, expect } from 'vitest';

export interface TestEnvironment {
  hasApiKey: boolean;
  skipIntegrationTests: boolean;
}

/**
 * Checks current test environment status
 */
export function getTestEnvironment(): TestEnvironment {
  return {
    hasApiKey: !!process.env.SIGNOZ_API_KEY,
    skipIntegrationTests: process.env.SKIP_INTEGRATION_TESTS === '1'
  };
}

/**
 * Creates environment validation test that fails hard when requirements aren't met.
 * Call this once per integration test file to ensure proper environment setup.
 * 
 * @example
 * ```typescript
 * import { createEnvironmentValidationTest } from './test-utils.js';
 * 
 * describe('My Integration Tests', () => {
 *   createEnvironmentValidationTest();
 *   
 *   // Your integration tests here...
 * });
 * ```
 */
export function createEnvironmentValidationTest(): void {
  const env = getTestEnvironment();
  
  describe('test environment validation', () => {
    it('should have required environment variables for integration tests', () => {
      if (env.skipIntegrationTests) {
        console.log('Integration tests explicitly skipped via SKIP_INTEGRATION_TESTS=1');
        return;
      }
      
      if (!env.hasApiKey) {
        throw new Error(`
Integration tests require SIGNOZ_API_KEY environment variable.

Either:
1. Set SIGNOZ_API_KEY=your-api-key to run integration tests
2. Set SKIP_INTEGRATION_TESTS=1 to skip integration tests

Currently: SIGNOZ_API_KEY=${process.env.SIGNOZ_API_KEY ? 'set' : 'not set'}
        `);
      }
      
      expect(env.hasApiKey).toBe(true);
    });
  });
}

/**
 * Helper to conditionally skip integration tests based on environment.
 * Use with vitest's skipIf for individual test cases.
 * 
 * @example
 * ```typescript
 * import { shouldSkipIntegrationTests } from './test-utils.js';
 * 
 * it.skipIf(shouldSkipIntegrationTests())('should test integration functionality', async () => {
 *   // Test code here
 * });
 * ```
 */
export function shouldSkipIntegrationTests(): boolean {
  const env = getTestEnvironment();
  return !env.hasApiKey || env.skipIntegrationTests;
}

/**
 * Convenience wrapper that combines environment validation + skipIf logic.
 * Use this for a complete integration test setup.
 * 
 * @example
 * ```typescript
 * import { setupIntegrationTests } from './test-utils.js';
 * 
 * describe('My Integration Tests', () => {
 *   const { shouldSkipIntegrationTests } = setupIntegrationTests();
 *   
 *   it.skipIf(shouldSkipIntegrationTests)('should test integration functionality', async () => {
 *     // Test code here
 *   });
 * });
 * ```
 */
export function setupIntegrationTests() {
  createEnvironmentValidationTest();
  
  return {
    shouldSkipIntegrationTests: shouldSkipIntegrationTests(),
    environment: getTestEnvironment()
  };
}