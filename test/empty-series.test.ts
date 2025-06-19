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
      ['http_requests_total'],
      1705314000000,
      1705315000000,
      '1m'
    );

    console.log('=== EMPTY SERIES TEST OUTPUT ===');
    console.log(result);
    console.log('=== END OUTPUT ===');

    // Should show no data points message for empty series
    expect(result).toContain('⚠️ No data points found in any series');
    expect(result).toContain('The metrics exist but contain no data in the specified time range');
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
      ['nonexistent_metric'],
      1705314000000,
      1705315000000,
      '1m'
    );

    console.log('=== NO SERIES TEST OUTPUT ===');
    console.log(result);
    console.log('=== END OUTPUT ===');

    // Should still show basic query info
    // Should show error message for no results
    expect(result).toContain('❌ Query executed successfully but returned no results');
    expect(result).toContain('Expanding the time range');
  });

  it('should handle completely empty response', () => {
    const mockEmptyResponse = {
      data: null
    };

    const result = ResponseFormatter.formatMetricsResponse(
      mockEmptyResponse,
      ['invalid_metric'],
      1705314000000,
      1705315000000,
      '1m'
    );

    console.log('=== EMPTY RESPONSE TEST OUTPUT ===');
    console.log(result);
    console.log('=== END OUTPUT ===');

    // Should show appropriate error for no data
    expect(result).toContain('❌ No data returned from query');
    expect(result).toContain('The metric doesn\'t exist');
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
      ['memory_usage', 'cpu_usage', 'http_requests_per_second'],
      1705314000000,
      1705315000000,
      '1m'
    );

    console.log('=== MIXED SERIES TEST OUTPUT ===');
    console.log(result);
    console.log('=== END OUTPUT ===');

    // The new format should show CSV table with all metrics
    expect(result).toContain('# Metrics Query Result');
    expect(result).toContain('|unix_millis|memory_usage|cpu_usage|http_requests_per_second|');
    
    // Should have data from the series that have values
    expect(result).toContain('42.5');
    expect(result).toContain('15.2');
    
    // Should show multiple series (only those with data)
    expect(result).toContain('Found 2 series across 3 metric(s)');
  });
});