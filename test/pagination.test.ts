import { describe, it, expect } from 'vitest';
import { ResponseFormatter } from '../src/signoz/formatters.js';

describe('Pagination', () => {
  const mockLogEntries = [
    {
      timestamp: '2024-01-15T10:30:00Z',
      data: {
        body: 'Newest log entry',
        attributes_string: { level: 'info' },
        resources_string: { 'service.name': 'test-service' }
      }
    },
    {
      timestamp: '2024-01-15T10:29:00Z', 
      data: {
        body: 'Middle log entry',
        attributes_string: { level: 'info' },
        resources_string: { 'service.name': 'test-service' }
      }
    },
    {
      timestamp: '2024-01-15T10:28:00Z',
      data: {
        body: 'Oldest log entry',
        attributes_string: { level: 'info' },
        resources_string: { 'service.name': 'test-service' }
      }
    }
  ];

  describe('formatLogEntries with pagination', () => {
    it('should not show pagination hint when results < limit', () => {
      const result = ResponseFormatter.formatLogEntries(mockLogEntries, { 
        limit: 5 // More than we have
      });
      
      expect(result).not.toContain('More Results Available');
      expect(result).not.toContain('Oldest timestamp');
      expect(result).not.toContain('To get next');
    });

    it('should show pagination hint when results = limit', () => {
      const result = ResponseFormatter.formatLogEntries(mockLogEntries, { 
        limit: 3 // Exactly what we have
      });
      
      console.log('=== PAGINATION OUTPUT ===');
      console.log(result);
      console.log('=== END OUTPUT ===');
      
      expect(result).toContain('--- More Results Available ---');
      expect(result).toContain('Oldest timestamp: 2024-01-15T10:28:00Z');
      expect(result).toContain('To get next 3 older results, use: end="2024-01-15T10:28:00Z"');
    });

    it('should not show pagination hint when no limit specified', () => {
      const result = ResponseFormatter.formatLogEntries(mockLogEntries);
      
      expect(result).not.toContain('More Results Available');
    });

    it('should handle empty results gracefully', () => {
      const result = ResponseFormatter.formatLogEntries([], { limit: 10 });
      
      expect(result).toBe('Found 0 log entries\n\n');
      expect(result).not.toContain('More Results Available');
    });

    it('should handle entries without timestamps', () => {
      const badEntries = [
        {
          // Missing timestamp
          data: {
            body: 'Entry without timestamp',
            attributes_string: { level: 'info' },
            resources_string: { 'service.name': 'test-service' }
          }
        }
      ];

      const result = ResponseFormatter.formatLogEntries(badEntries, { limit: 1 });
      
      // Should not crash, should not show pagination
      expect(result).toContain('Found 1 log entries');
      expect(result).not.toContain('More Results Available');
    });
  });

  describe('extractOldestTimestamp helper', () => {
    it('should extract timestamp from oldest entry', () => {
      // Test the private method indirectly through pagination output
      const result = ResponseFormatter.formatLogEntries(mockLogEntries, { limit: 3 });
      
      // Should use the last entry's timestamp (oldest)
      expect(result).toContain('2024-01-15T10:28:00Z');
    });
  });
});