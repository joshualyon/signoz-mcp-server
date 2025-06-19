import { describe, it, expect } from 'vitest';
import { ResponseFormatter } from '../src/signoz/formatters.js';

describe('Empty Series Test', () => {
  it('should handle empty data series correctly', () => {
    // Mock response with series that has no data points
    const mockResponseWithEmptySeries = {
      data: {
        resultType: 'matrix',
        result: [{
          metric: { job: 'test-job', instance: 'localhost:8080' },
          values: [] // Empty values array
        }]
      }
    };

    const result = ResponseFormatter.formatMetricsResponse(
      mockResponseWithEmptySeries,
      'http_requests_total',
      1705314000000,
      1705315000000,
      '1m'
    );

    console.log('=== EMPTY SERIES TEST OUTPUT ===');
    console.log(result);
    console.log('=== END OUTPUT ===');

    // Should still show series header
    expect(result).toContain('--- Series 1 ---');
    expect(result).toContain('Labels: {"job":"test-job","instance":"localhost:8080"}');
    
    // Should show warning about no data points
    expect(result).toContain('⚠️  No data points in this series');
    
    // Should not have any data point timestamps (time range header is okay)
    expect(result).not.toMatch(/  \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // No indented timestamps
  });

  it('should handle response with no result series', () => {
    const mockResponseNoSeries = {
      data: {
        resultType: 'matrix',
        result: [] // No series at all
      }
    };

    const result = ResponseFormatter.formatMetricsResponse(
      mockResponseNoSeries,
      'nonexistent_metric',
      1705314000000,
      1705315000000,
      '1m'
    );

    console.log('=== NO SERIES TEST OUTPUT ===');
    console.log(result);
    console.log('=== END OUTPUT ===');

    // Should still show basic query info
    expect(result).toContain('Metrics query result');
    expect(result).toContain('Query: nonexistent_metric');
    expect(result).toContain('Result type: matrix');
    
    // Should NOT show any series headers
    expect(result).not.toContain('Series 1');
    expect(result).not.toContain('Data points:');
  });

  it('should handle completely empty response', () => {
    const mockEmptyResponse = {
      data: null
    };

    const result = ResponseFormatter.formatMetricsResponse(
      mockEmptyResponse,
      'invalid_metric',
      1705314000000,
      1705315000000,
      '1m'
    );

    console.log('=== EMPTY RESPONSE TEST OUTPUT ===');
    console.log(result);
    console.log('=== END OUTPUT ===');

    // Should still show basic query info
    expect(result).toContain('Metrics query result');
    expect(result).toContain('Query: invalid_metric');
    
    // Should not show result type or any series info
    expect(result).not.toContain('Result type:');
    expect(result).not.toContain('Series 1');
  });

  it('should handle mixed series - some with data, some empty', () => {
    const mockMixedResponse = {
      data: {
        resultType: 'matrix',
        result: [
          {
            metric: { job: 'web-server', instance: 'web-1' },
            values: [
              [1705314600000, '42.5'],
              [1705314660000, '43.0']
            ]
          },
          {
            metric: { job: 'web-server', instance: 'web-2' },
            values: [] // Empty series
          },
          {
            metric: { job: 'api-server', instance: 'api-1' },
            values: [
              [1705314600000, '15.2']
            ]
          }
        ]
      }
    };

    const result = ResponseFormatter.formatMetricsResponse(
      mockMixedResponse,
      'http_requests_per_second',
      1705314000000,
      1705315000000,
      '1m'
    );

    console.log('=== MIXED SERIES TEST OUTPUT ===');
    console.log(result);
    console.log('=== END OUTPUT ===');

    // Should show all three queries
    expect(result).toContain('=== Query 1 ===');
    expect(result).toContain('=== Query 2 ===');
    expect(result).toContain('=== Query 3 ===');
    
    // Query 1 should have data
    expect(result).toContain('Data points: 2');
    expect(result).toContain('42.5');
    
    // Query 2 should show no data points warning
    expect(result).toContain('⚠️  No data points in this series');
    
    // Query 3 should have 1 data point
    expect(result).toContain('Data points: 1');
    expect(result).toContain('15.2');
  });
});