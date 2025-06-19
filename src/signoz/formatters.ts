// Response formatting logic for SigNoz API responses

import type { FormattingOptions } from './types.js';
import type { 
  LogEntry, 
  MetricsResponse, 
  LogsResponse,
  MetricInfo,
  MetricMetadata,
  Series,
  Point,
} from './schemas.js';
import { TimeUtils } from './time-utils.js';

export class ResponseFormatter {

  /**
   * Safely format a timestamp, handling invalid dates
   */
  private static formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return `<invalid timestamp: ${timestamp}>`;
    }
    return date.toISOString();
  }

  /**
   * Format log entries for display
   */
  static formatLogEntries(logs: LogEntry[], options: FormattingOptions = {}): string {
    let formattedText = `Found ${logs.length} log entries\n\n`;
    
    if (logs.length === 0) {
      return formattedText;
    }

    logs.forEach((entry: LogEntry) => {
      if (options.verbose) {
        formattedText += this.formatVerboseLog(entry);
      } else {
        formattedText += this.formatCompactLog(entry, options);
      }
      formattedText += '\n';
    });

    // Add pagination hint if we hit the limit
    if (options.limit && logs.length === options.limit && logs.length > 0) {
      const oldestTimestamp = this.extractOldestTimestamp(logs);
      if (oldestTimestamp) {
        formattedText += `\n--- More Results Available ---\n`;
        formattedText += `Oldest timestamp: ${oldestTimestamp}\n`;
        formattedText += `To get next ${options.limit} older results, use: end="${oldestTimestamp}"\n`;
      }
    }

    return formattedText;
  }

  /**
   * Format a numeric value with appropriate precision
   */
  private static formatMetricValue(value: string | number): string {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numValue)) {
      return String(value); // Return as-is if not a number
    }
    
    // Check if it's an integer
    if (Number.isInteger(numValue)) {
      return numValue.toString();
    }
    
    // Format with up to 3 decimal places, removing trailing zeros
    return numValue.toFixed(3).replace(/\.?0+$/, '');
  }

  /**
   * Format metrics response for display
   */
  static formatMetricsResponse(response: unknown, metricNames: string[], startTime: number, endTime: number, step: string): string {
    // Check if we have the expected response structure
    const data = (response as any)?.data;
    if (!response || !data || !data.result) {
      let formattedText = `❌ No data returned from query.\n\n`;
      formattedText += `This could mean:\n`;
      formattedText += `• The metric doesn't exist - try discover_metrics to see available metrics\n`;
      formattedText += `• No data exists in the specified time range\n`;
      formattedText += `• The query filters are too restrictive\n`;
      formattedText += `• There's an issue with the SigNoz API\n\n`;
      formattedText += `Debugging suggestions:\n`;
      formattedText += `• Use discover_metrics to verify metric names\n`;
      formattedText += `• Try a longer time range (e.g., start="24h", end="now")\n`;
      formattedText += `• Remove query filters temporarily\n`;
      formattedText += `• Check if the metric has data in SigNoz UI\n`;
      return formattedText;
    }

    const results = data.result;
    
    if (!results || results.length === 0) {
      let formattedText = `❌ Query executed successfully but returned no results.\n\n`;
      formattedText += `This means the metric exists but no data matches your filters.\n\n`;
      formattedText += `Try:\n`;
      formattedText += `• Expanding the time range\n`;
      formattedText += `• Removing or adjusting query filters\n`;
      formattedText += `• Using discover_metric_attributes to see available labels\n`;
      return formattedText;
    }

    // Collect all series data across all queries
    const allSeriesData: Map<string, { labels: any, values: Map<number, string[]> }> = new Map();
    const allTimestamps: Set<number> = new Set();

    // Process each query result
    results.forEach((result: any, index: number) => {
      // Handle both SigNoz format (series array) and Prometheus format (single result with metric/values)
      let series: any[] = [];
      
      if (result.series) {
        series = result.series;
      } else if (result.metric && result.values) {
        series = [{
          labels: result.metric,
          values: result.values.map(([timestamp, value]: [number, string]) => ({
            timestamp,
            value
          }))
        }];
      }
      
      // Process each series
      series.forEach((s: any, seriesIndex: number) => {
        if (!s.values || s.values.length === 0) return;
        
        // Create a unique key for this series based on labels
        const labelStr = s.labels ? JSON.stringify(s.labels) : `series_${seriesIndex}`;
        
        if (!allSeriesData.has(labelStr)) {
          allSeriesData.set(labelStr, {
            labels: s.labels || {},
            values: new Map()
          });
        }
        
        const seriesData = allSeriesData.get(labelStr)!;
        
        // Add values for this metric to the series
        s.values.forEach((v: any) => {
          allTimestamps.add(v.timestamp);
          
          if (!seriesData.values.has(v.timestamp)) {
            seriesData.values.set(v.timestamp, new Array(results.length).fill(''));
          }
          
          const values = seriesData.values.get(v.timestamp)!;
          values[index] = this.formatMetricValue(v.value);
        });
      });
    });

    // Convert to sorted array of timestamps
    // TODO: For very large datasets (10k+ points), consider streaming approach
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    
    // If no data points found
    if (sortedTimestamps.length === 0) {
      return `⚠️ No data points found in any series.\n\nThe metrics exist but contain no data in the specified time range.`;
    }

    // Build CSV-style output
    let formattedText = '';
    
    // Add metadata header
    formattedText += `# Metrics Query Result\n`;
    formattedText += `# Time Range: ${this.formatTimestamp(startTime)} to ${this.formatTimestamp(endTime)}\n`;
    formattedText += `# Step: ${step}\n`;
    formattedText += `# Data Points: ${sortedTimestamps.length}\n\n`;

    // If multiple series, we need to handle them differently
    if (allSeriesData.size > 1) {
      // Multiple series - show each series separately with its labels
      formattedText += `Found ${allSeriesData.size} series across ${metricNames.length} metric(s)\n\n`;
      
      let seriesNum = 1;
      allSeriesData.forEach((seriesData, labelStr) => {
        formattedText += `## Series ${seriesNum}\n`;
        formattedText += `Labels: ${labelStr}\n\n`;
        
        // Create table header
        formattedText += `|unix_millis|${metricNames.join('|')}|\n`;
        formattedText += `|${'-'.repeat(11)}|${metricNames.map(() => '-'.repeat(10)).join('|')}|\n`;
        
        // Add data rows
        sortedTimestamps.forEach(timestamp => {
          const values = seriesData.values.get(timestamp);
          if (values) {
            formattedText += `|${timestamp}|${values.join('|')}|\n`;
          }
        });
        
        formattedText += '\n';
        seriesNum++;
      });
    } else {
      // Single series (or aggregated) - simpler format
      const seriesData = allSeriesData.values().next().value;
      
      // Create table header
      formattedText += `|unix_millis|${metricNames.join('|')}|\n`;
      formattedText += `|${'-'.repeat(11)}|${metricNames.map(() => '-'.repeat(10)).join('|')}|\n`;
      
      // Add data rows
      sortedTimestamps.forEach(timestamp => {
        const values = seriesData.values.get(timestamp) || new Array(metricNames.length).fill('');
        formattedText += `|${timestamp}|${values.join('|')}|\n`;
      });
    }

    return formattedText;
  }

  /**
   * Format traces response for display
   */
  static formatTracesResponse(query: string): string {
    return `Traces query functionality to be implemented. Query: ${query}`;
  }

  /**
   * Format metrics list for display
   */
  static formatMetricsList(metrics: MetricInfo[], limit?: number, total?: number, offset?: number): string {
    if (!metrics || metrics.length === 0) {
      return `No metrics found in the specified time range.`;
    }

    const count = metrics.length;
    const hasTotal = total !== undefined && total !== null;
    const wasLimited = limit && count >= limit;
    
    let header = `Found ${count}`;
    if (hasTotal) {
      header += ` of ${total}`;
    }
    header += ` metrics`;
    
    if (wasLimited && hasTotal) {
      const startNum = (offset || 0) + 1;
      const endNum = (offset || 0) + count;
      header += ` (showing ${startNum}-${endNum})`;
    } else if (wasLimited) {
      header += ` (limit reached - more may exist)`;
    }

    // Create markdown table with all metrics
    let formattedText = `${header}\n\n`;
    formattedText += `|Metric|Type|Unit|Samples|Series|Description|\n`;
    formattedText += `|------|----|----|----|------|-----------|\n`;

    metrics.forEach((metric) => {
      const name = metric.metric_name || '';
      const type = metric.type || '';
      const unit = metric.unit || '';
      const samples = this.formatNumber(metric.samples || 0);
      const series = this.formatNumber(metric.timeseries || 0);
      const description = (metric.description || '').replace(/\|/g, '\\|'); // Escape pipes in descriptions
      
      formattedText += `|${name}|${type}|${unit}|${samples}|${series}|${description}|\n`;
    });

    // Add example queries
    const firstMetric = metrics[0];
    if (firstMetric) {
      formattedText += `\n**Example queries:**\n`;
      formattedText += `• metric: ["${firstMetric.metric_name}"], aggregation: "avg"\n`;
      formattedText += `• discover_metric_attributes({metric_name: "${firstMetric.metric_name}"})\n`;
    }

    // Add pagination note
    if (wasLimited) {
      const nextOffset = (offset || 0) + count;
      formattedText += `\n**More metrics available.** `;
      if (hasTotal) {
        formattedText += `To see metrics ${nextOffset + 1}-${Math.min(nextOffset + (limit || 200), total)}, use:\n`;
      } else {
        formattedText += `To see additional metrics, use:\n`;
      }
      formattedText += `discover_metrics({limit: ${limit || 200}, offset: ${nextOffset}})`;
    }

    return formattedText;
  }

  /**
   * Format numbers for compact display
   */
  private static formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1).replace('.0', '') + 'K';
    }
    return num.toString();
  }

  /**
   * Format metric attributes/metadata for display
   */
  static formatMetricAttributes(metadata: MetricMetadata): string {
    if (!metadata) {
      return `Error: Unable to retrieve metric metadata.

This could mean:
- The metric name doesn't exist
- The metric has no available metadata
- The internal endpoint is not available

Try running discover_metrics first to see available metrics.`;
    }

    if (!metadata.name) {
      return `Error: Invalid or empty metric metadata received.

The metric may not exist or may not have any associated metadata.
Run discover_metrics to see available metrics.`;
    }

    // Decode URL-encoded metric name
    const decodedName = decodeURIComponent(metadata.name);
    
    let formattedText = `# Metric: ${decodedName}

**Type:** ${metadata.type || 'unknown'} | **Unit:** ${metadata.unit || 'none'}
**Description:** ${metadata.description || 'No description available'}
**Activity:** ${(metadata.samples || 0).toLocaleString()} samples | ${(metadata.timeSeriesTotal || 0).toLocaleString()} total series | ${(metadata.timeSeriesActive || 0).toLocaleString()} active series

`;

    if (metadata.metadata) {
      formattedText += `**Metadata:** Temporality: ${metadata.metadata.temporality || 'unknown'} | Monotonic: ${metadata.metadata.monotonic || false}\n\n`;
    }

    if (metadata.attributes && metadata.attributes.length > 0) {
      formattedText += `## 🏷️ Labels (Attributes)\n\n`;
      
      // Sort attributes by value count (most diverse first)
      const sortedAttrs = [...metadata.attributes].sort((a, b) => (b.valueCount || 0) - (a.valueCount || 0));
      
      sortedAttrs.forEach((attr) => {
        formattedText += `**${attr.key}** (${(attr.valueCount || 0).toLocaleString()} unique values)\n`;
        if (attr.value && attr.value.length > 0) {
          const sampleValues = attr.value.slice(0, 5).join(', ');
          const hasMore = attr.value.length > 5 || attr.valueCount > attr.value.length;
          formattedText += `  Sample values: ${sampleValues}${hasMore ? '...' : ''}\n`;
        }
        formattedText += '\n';
      });

      formattedText += `## 🔍 Example Queries\n*Based on discovered labels:*\n\n`;
      
      const metricName = metadata.name;
      const firstAttr = sortedAttrs[0];
      const secondAttr = sortedAttrs[1];
      
      if (firstAttr && firstAttr.value?.length > 0) {
        formattedText += `**Filter by ${firstAttr.key}:**\n`;
        formattedText += `• metric: ["${metricName}"], query: "${firstAttr.key}=${firstAttr.value[0]}"\n\n`;
      }
      
      if (firstAttr && secondAttr) {
        formattedText += `**Aggregate with grouping:**\n`;
        formattedText += `• metric: ["${metricName}"], group_by: ["${firstAttr.key}", "${secondAttr.key}"], aggregation: "sum"\n`;
        formattedText += `• metric: ["${metricName}"], group_by: ["${firstAttr.key}"], aggregation: "avg"\n\n`;
      }
      
      if (metadata.type === 'Histogram') {
        formattedText += `**Histogram metrics:**\n`;
        formattedText += `• metric: ["${metricName}"], aggregation: "avg" - Average values\n`;
        formattedText += `• metric: ["${metricName}"], aggregation: "max" - Maximum values\n\n`;
      }
      
      formattedText += `**Common aggregations:**\n`;
      formattedText += `• metric: ["${metricName}"], aggregation: "avg" - Average over time\n`;
      formattedText += `• metric: ["${metricName}"], aggregation: "sum" - Total/cumulative values\n`;
      formattedText += `• metric: ["${metricName}"], aggregation: "max" - Peak values\n`;
      if (firstAttr) {
        formattedText += `• metric: ["${metricName}"], group_by: ["${firstAttr.key}"], aggregation: "sum"\n`;
      }
    } else {
      formattedText += `## 🏷️ Labels (Attributes)\n\nNo attribute information available for this metric.\n\n`;
      formattedText += `## 🔍 Basic Queries\n\n`;
      formattedText += `• metric: ["${metadata.name}"]\n`;
      formattedText += `• metric: ["${metadata.name}"], aggregation: "avg"\n`;
      if (metadata.type === 'Histogram') {
        formattedText += `• metric: ["${metadata.name}"], aggregation: "max"\n`;
      }
    }

    return formattedText;
  }


  /**
   * Format compact log entry (default mode) - minimal output
   */
  private static formatCompactLog(entry: LogEntry, options: FormattingOptions): string {
    const timestamp = TimeUtils.formatTimestamp(entry.timestamp || entry.ts || entry.time);
    const body = entry.data?.body || '';
    const level = entry.data?.attributes_string?.level || entry.data?.severity_text || 'INFO';
    const serviceContext = this.buildServiceContext(entry.data);
    
    let formattedText = `[${timestamp}] [${level}] [${serviceContext}]\n`;
    formattedText += `${body}\n`;
    
    // In compact mode, only show attributes if explicitly requested
    if (options.include_attributes && options.include_attributes.length > 0) {
      const attributes = entry.data?.attributes_string || {};
      const resources = entry.data?.resources_string || {};
      const allAttributes = { ...attributes, ...resources };
      
      const includedAttrs = options.include_attributes
        .filter(key => allAttributes[key] !== undefined)
        .map(key => `${key}=${allAttributes[key]}`);
      
      if (includedAttrs.length > 0) {
        formattedText += `Attributes: ${includedAttrs.join(' ')}\n`;
      }
    }
    
    return formattedText;
  }

  /**
   * Format verbose log entry (all attributes)
   */
  private static formatVerboseLog(entry: LogEntry): string {
    const timestamp = TimeUtils.formatTimestamp(entry.timestamp || entry.ts || entry.time);
    const body = entry.data?.body || '';
    const level = entry.data?.attributes_string?.level || entry.data?.severity_text || 'INFO';
    const serviceContext = this.buildServiceContext(entry.data);
    
    let formattedText = `[${timestamp}] [${level}] [${serviceContext}]\n`;
    formattedText += `${body}\n`;
    
    // Add all attributes
    const attributes = entry.data?.attributes_string || {};
    const resources = entry.data?.resources_string || {};
    const relevantKeys = Object.keys({...attributes, ...resources})
      .filter(k => !['body', 'level', 'severity_text', 'service.name', 'k8s.deployment.name', 'k8s.namespace.name'].includes(k));
    
    if (relevantKeys.length > 0) {
      formattedText += `Attributes: `;
      relevantKeys.forEach(key => {
        const value = attributes[key] || resources[key];
        formattedText += `${key}=${value} `;
      });
      formattedText += '\n';
    }
    
    return formattedText;
  }

  /**
   * Build intelligent service context from available data
   */
  private static buildServiceContext(data: LogEntry['data']): string {
    const resources = data?.resources_string || {};
    
    // Try service.name first (explicit service identification)
    if (resources['service.name']) {
      return resources['service.name'];
    }
    
    // Build k8s context: namespace/deployment or namespace/pod
    const namespace = resources['k8s.namespace.name'];
    const deployment = resources['k8s.deployment.name'];
    const pod = resources['k8s.pod.name'];
    const container = resources['k8s.container.name'];
    
    if (namespace && deployment) {
      return `${namespace}/${deployment}`;
    } else if (namespace && pod) {
      return `${namespace}/${pod}`;
    } else if (namespace && container) {
      return `${namespace}/${container}`;
    } else if (deployment) {
      return deployment;
    } else if (pod) {
      return pod;
    } else if (container) {
      return container;
    }
    
    return 'unknown';
  }

  /**
   * Extract the oldest timestamp from log entries for pagination
   */
  private static extractOldestTimestamp(logs: LogEntry[]): string | null {
    if (logs.length === 0) return null;

    // Logs should be sorted newest to oldest, so last entry is oldest
    const oldestEntry = logs[logs.length - 1];
    if (!oldestEntry?.timestamp) return null;

    // Format timestamp consistently
    return TimeUtils.formatTimestamp(oldestEntry.timestamp);
  }
}