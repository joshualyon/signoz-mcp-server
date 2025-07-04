import { describe, it, expect } from 'vitest';
import { ResponseFormatter } from '../src/signoz/formatters.js';

describe('ResponseFormatter', () => {
  const mockLogEntry = {
    timestamp: 1705314600000000000, // Nanoseconds - valid format
    data: {
      body: 'Test log message',
      attributes_string: {
        level: 'error',
        severityText: 'error',
        'http.request.id': 'abc-123',
        'labels.module': 'api'
      },
      resources_string: {
        'service.name': 'test-service',
        'k8s.deployment.name': 'test-api',
        'k8s.namespace.name': 'production',
        'log.file.path': '/var/log/test.log',
        'k8s.node.uid': 'node-123',
        'signoz.component': 'otel-agent'
      }
    }
  };

  describe('formatLogEntries', () => {
    it('should format empty log array', () => {
      const result = ResponseFormatter.formatLogEntries([]);
      expect(result).toBe('Found 0 log entries\n\n');
    });

    it('should format single log entry in compact mode (default)', () => {
      const result = ResponseFormatter.formatLogEntries([mockLogEntry]);
      
      expect(result).toContain('Found 1 log entries');
      expect(result).toContain('[2024-01-15T10:30:00.000Z] [error] [test-service]');
      expect(result).toContain('Test log message');
      
      // Should NOT include ANY attributes in compact mode
      expect(result).not.toContain('Attributes:');
      expect(result).not.toContain('http.request.id');
      expect(result).not.toContain('labels.module');
      expect(result).not.toContain('k8s.namespace.name');
      expect(result).not.toContain('log.file.path');
    });

    it('should format single log entry in verbose mode', () => {
      const result = ResponseFormatter.formatLogEntries([mockLogEntry], { verbose: true });
      
      expect(result).toContain('Found 1 log entries');
      expect(result).toContain('[2024-01-15T10:30:00.000Z] [error] [test-service]');
      expect(result).toContain('Test log message');
      
      // Should include ALL attributes in verbose mode
      expect(result).toContain('http.request.id=abc-123');
      expect(result).toContain('log.file.path=/var/log/test.log');
      expect(result).toContain('k8s.node.uid=node-123');
      expect(result).toContain('signoz.component=otel-agent');
    });

    it('should respect explicit include_attributes', () => {
      const result = ResponseFormatter.formatLogEntries([mockLogEntry], {
        include_attributes: ['http.request.id', 'k8s.namespace.name']
      });
      
      expect(result).toContain('http.request.id=abc-123');
      expect(result).toContain('k8s.namespace.name=production');
      
      // Should NOT include other attributes
      expect(result).not.toContain('labels.module=api');
      expect(result).not.toContain('log.file.path');
    });

    it('should respect explicit exclude_attributes (no effect in compact mode)', () => {
      const result = ResponseFormatter.formatLogEntries([mockLogEntry], {
        exclude_attributes: ['http.request.id', 'labels.module']
      });
      
      // In new minimal approach, compact mode shows no attributes regardless
      expect(result).not.toContain('Attributes:');
      expect(result).not.toContain('http.request.id');
      expect(result).not.toContain('labels.module');
      expect(result).not.toContain('k8s.namespace.name');
    });

    it('should handle missing service name gracefully', () => {
      const entryWithoutService = {
        ...mockLogEntry,
        data: {
          ...mockLogEntry.data,
          resources_string: {
            'k8s.namespace.name': 'production'
          }
        }
      };
      
      const result = ResponseFormatter.formatLogEntries([entryWithoutService]);
      expect(result).toContain('[unknown]');
    });

    it('should prefer k8s.deployment.name over service.name', () => {
      const result = ResponseFormatter.formatLogEntries([mockLogEntry]);
      expect(result).toContain('[test-service]'); // service.name is used since it exists
      
      const entryWithDeployment = {
        ...mockLogEntry,
        data: {
          ...mockLogEntry.data,
          resources_string: {
            'k8s.deployment.name': 'my-deployment'
          }
        }
      };
      
      const result2 = ResponseFormatter.formatLogEntries([entryWithDeployment]);
      expect(result2).toContain('[my-deployment]');
    });
  });

  describe('formatMetricsResponse', () => {
    it('should format metrics response correctly', () => {
      const mockResponse = {
        status: 'success',
        data: {
          resultType: 'matrix',
          result: [{
            queryName: 'A',
            series: [{
              labels: { job: 'test-job' },
              values: [
                { timestamp: 1705314600000, value: '42.5' },
                { timestamp: 1705314660000, value: '43.0' }
              ]
            }]
          }]
        }
      };

      const result = ResponseFormatter.formatMetricsResponse(
        mockResponse,
        ['test_metric'],
        1705314000000000,
        1705315000000000,
        '1m'
      );

      // Check for new CSV format headers
      expect(result).toContain('# Metrics Query Result');
      expect(result).toContain('# Step: 1m');
      expect(result).toContain('# Data Points: 2');
      
      // Check for CSV table format with actual metric name
      expect(result).toContain('|unix_millis|test_metric|');
      expect(result).toContain('|1705314600000|42.5|');
      expect(result).toContain('|1705314660000|43|');
    });

    it('should format multiple series with labels', () => {
      const mockResponse = {
        status: 'success',
        data: {
          resultType: 'matrix',
          result: [{
            queryName: 'A',
            series: [
              {
                labels: { job: 'test-job', instance: 'host1' },
                values: [
                  { timestamp: 1705314600000, value: '42.5' },
                  { timestamp: 1705314660000, value: '43.0' }
                ]
              },
              {
                labels: { job: 'test-job', instance: 'host2' },
                values: [
                  { timestamp: 1705314600000, value: '38.2' },
                  { timestamp: 1705314660000, value: '39.1' }
                ]
              }
            ]
          }]
        }
      };

      const result = ResponseFormatter.formatMetricsResponse(
        mockResponse,
        ['test_metric'],
        1705314000000000,
        1705315000000000,
        '1m'
      );

      // Should show multiple series
      expect(result).toContain('Found 2 series across 1 metric(s)');
      expect(result).toContain('## Series 1');
      expect(result).toContain('## Series 2');
      expect(result).toContain('{"job":"test-job","instance":"host1"}');
      expect(result).toContain('{"job":"test-job","instance":"host2"}');
    });

    it('should handle empty data gracefully', () => {
      const mockResponse = {
        status: 'success',
        data: {
          resultType: 'matrix',
          result: []
        }
      };

      const result = ResponseFormatter.formatMetricsResponse(
        mockResponse,
        ['test_metric'],
        1705314000000000,
        1705315000000000,
        '1m'
      );

      expect(result).toContain('❌ Query executed successfully but returned no results');
      expect(result).toContain('Expanding the time range');
    });
  });

  describe('formatTracesResponse', () => {
    it('should return placeholder message', () => {
      const result = ResponseFormatter.formatTracesResponse('test_query');
      expect(result).toContain('Traces query functionality to be implemented');
      expect(result).toContain('test_query');
    });
  });
});