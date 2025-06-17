// Test setup file for Vitest
// Configure global test environment

// Mock console.error to avoid noise in tests unless explicitly testing logging
const originalConsoleError = console.error;
global.console.error = (...args: any[]) => {
  // Only show console.error in tests if SHOW_LOGS environment variable is set
  if (process.env.SHOW_LOGS) {
    originalConsoleError(...args);
  }
};

// Reset console.error for specific tests that need it
export function enableConsoleLogging() {
  global.console.error = originalConsoleError;
}

export function disableConsoleLogging() {
  global.console.error = () => {};
}