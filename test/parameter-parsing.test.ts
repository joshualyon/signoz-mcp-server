import { describe, it, expect } from 'vitest';

// Test the boolean parsing logic that should be in the server
function parseBoolean(value: any): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return Boolean(value);
}

describe('Parameter Parsing', () => {
  describe('parseBoolean', () => {
    it('should handle boolean values', () => {
      expect(parseBoolean(true)).toBe(true);
      expect(parseBoolean(false)).toBe(false);
    });

    it('should handle string values', () => {
      expect(parseBoolean('true')).toBe(true);
      expect(parseBoolean('TRUE')).toBe(true);
      expect(parseBoolean('True')).toBe(true);
      expect(parseBoolean('false')).toBe(false);
      expect(parseBoolean('FALSE')).toBe(false);
      expect(parseBoolean('False')).toBe(false);
      expect(parseBoolean('anything-else')).toBe(false);
    });

    it('should handle undefined and null', () => {
      expect(parseBoolean(undefined)).toBe(undefined);
      expect(parseBoolean(null)).toBe(undefined);
    });

    it('should handle numbers', () => {
      expect(parseBoolean(1)).toBe(true);
      expect(parseBoolean(0)).toBe(false);
      expect(parseBoolean(-1)).toBe(true);
    });

    it('should handle objects', () => {
      expect(parseBoolean({})).toBe(true);
      expect(parseBoolean([])).toBe(true);
    });
  });

  describe('MCP parameter scenarios', () => {
    it('should correctly parse MCP boolean parameters', () => {
      // These are the actual values that might come from MCP
      const mcpArgs = {
        verbose: 'false',  // This is the problem case!
        include_attrs: ['attr1', 'attr2'],
        limit: '10'  // Numbers might also come as strings
      };

      expect(parseBoolean(mcpArgs.verbose)).toBe(false);
      expect(typeof parseBoolean(mcpArgs.verbose)).toBe('boolean');
    });
  });
});