// Response formatting logic for SigNoz API responses

import { LogEntry, FormattingOptions } from './types.js';
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
  static formatLogEntries(logs: any[], options: FormattingOptions = {}): string {
    let formattedText = `Found ${logs.length} log entries\n\n`;
    
    if (logs.length === 0) {
      return formattedText;
    }

    logs.forEach((entry: any) => {
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
   * Format metrics response for display
   */
  static formatMetricsResponse(response: any, query: string, startTime: number, endTime: number, step: string): string {
    let formattedText = `Metrics query result\n\n`;
    formattedText += `Query: ${query}\n`;
    formattedText += `Time range: ${this.formatTimestamp(startTime)} to ${this.formatTimestamp(endTime)}\n`;
    formattedText += `Step: ${step}\n\n`;
    
    if (response.data?.result) {
      formattedText += `Result type: ${response.data.resultType}\n\n`;
      response.data.result.forEach((series: any, index: number) => {
        formattedText += `--- Series ${index + 1} ---\n`;
        if (series.metric) {
          formattedText += `Metric labels: ${JSON.stringify(series.metric)}\n`;
        }
        if (series.values) {
          formattedText += `Data points: ${series.values.length}\n`;
          // Show first few and last few values
          if (series.values.length > 6) {
            formattedText += `First 3 values:\n`;
            series.values.slice(0, 3).forEach((v: any) => {
              formattedText += `  ${this.formatTimestamp(v[0])}: ${v[1]}\n`;
            });
            formattedText += `...\n`;
            formattedText += `Last 3 values:\n`;
            series.values.slice(-3).forEach((v: any) => {
              formattedText += `  ${this.formatTimestamp(v[0])}: ${v[1]}\n`;
            });
          } else {
            series.values.forEach((v: any) => {
              formattedText += `  ${this.formatTimestamp(v[0])}: ${v[1]}\n`;
            });
          }
        }
        formattedText += '\n';
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
  static formatMetricsList(metrics: any[]): string {
    if (!metrics || metrics.length === 0) {
      return `No metrics found in the specified time range.`;
    }

    let formattedText = `# Metrics Discovery Results

Found ${metrics.length} metrics

## 📊 Top Metrics by Activity\n\n`;

    // Sort metrics by samples and show top ones
    const sortedMetrics = [...metrics].sort((a, b) => (b.samples || 0) - (a.samples || 0));
    
    sortedMetrics.slice(0, 15).forEach((metric: any) => {
      formattedText += `**${metric.metric_name}** (${metric.type})\n`;
      formattedText += `  Samples: ${(metric.samples || 0).toLocaleString()} | Series: ${(metric.timeseries || 0).toLocaleString()}\n`;
      if (metric.description) {
        formattedText += `  Description: ${metric.description}\n`;
      }
      if (metric.unit && metric.unit !== '') {
        formattedText += `  Unit: ${metric.unit}\n`;
      }
      formattedText += '\n';
    });

    // Group metrics by type for easier browsing
    const groupedMetrics = this.groupMetricsByCategory(metrics);
    
    if (Object.keys(groupedMetrics).length > 1) {
      formattedText += `## 📈 Metric Categories\n\n`;
      Object.entries(groupedMetrics).forEach(([category, categoryMetrics]) => {
        formattedText += `**${category} (${categoryMetrics.length})**\n`;
        categoryMetrics.slice(0, 8).forEach((metric: any) => {
          formattedText += `- ${metric.metric_name}\n`;
        });
        if (categoryMetrics.length > 8) {
          formattedText += `- ... and ${categoryMetrics.length - 8} more\n`;
        }
        formattedText += '\n';
      });
    }

    formattedText += `## 🔍 Example Queries\n\n`;
    
    // Generate smart examples based on discovered metrics
    const firstMetric = sortedMetrics[0];
    if (firstMetric) {
      formattedText += `**Basic queries:**\n`;
      formattedText += `• ${firstMetric.metric_name}\n`;
      if (firstMetric.type === 'Histogram') {
        formattedText += `• histogram_quantile(0.95, ${firstMetric.metric_name})\n`;
      }
      formattedText += `• rate(${firstMetric.metric_name}[5m])\n`;
      formattedText += `• sum(${firstMetric.metric_name}) by (service_name)\n\n`;
    }
    
    formattedText += `**To explore metric labels:**\n`;
    formattedText += `Use discover_metric_attributes({metric_name: "${firstMetric?.metric_name || 'metric_name'}"})`;

    return formattedText;
  }

  /**
   * Format metric attributes/metadata for display
   */
  static formatMetricAttributes(metadata: any): string {
    if (!metadata) {
      return `Error: Unable to retrieve metric metadata.`;
    }

    let formattedText = `# Metric: ${metadata.name}

**Type:** ${metadata.type} | **Unit:** ${metadata.unit || 'none'}
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
      
      sortedAttrs.forEach((attr: any) => {
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
        formattedText += `• ${metricName}{${firstAttr.key}="${firstAttr.value[0]}"}\n\n`;
      }
      
      if (firstAttr && secondAttr) {
        formattedText += `**Aggregate with grouping:**\n`;
        formattedText += `• sum(rate(${metricName}[5m])) by (${firstAttr.key}, ${secondAttr.key})\n\n`;
      }
      
      if (metadata.type === 'Histogram') {
        formattedText += `**Histogram functions:**\n`;
        formattedText += `• histogram_quantile(0.95, ${metricName})\n`;
        formattedText += `• histogram_quantile(0.50, ${metricName})\n\n`;
      }
      
      formattedText += `**Rate and sum queries:**\n`;
      formattedText += `• rate(${metricName}[1m])\n`;
      formattedText += `• increase(${metricName}[5m])\n`;
      if (firstAttr) {
        formattedText += `• sum(${metricName}) by (${firstAttr.key})\n`;
      }
    } else {
      formattedText += `## 🏷️ Labels (Attributes)\n\nNo attribute information available for this metric.\n\n`;
      formattedText += `## 🔍 Basic Queries\n\n`;
      formattedText += `• ${metadata.name}\n`;
      formattedText += `• rate(${metadata.name}[5m])\n`;
      if (metadata.type === 'Histogram') {
        formattedText += `• histogram_quantile(0.95, ${metadata.name})\n`;
      }
    }

    return formattedText;
  }

  /**
   * Group metrics into logical categories
   */
  private static groupMetricsByCategory(metrics: any[]): Record<string, any[]> {
    const categories: Record<string, any[]> = {};
    
    metrics.forEach(metric => {
      const name = metric.metric_name.toLowerCase();
      let category = 'Other';
      
      if (name.includes('http') || name.includes('request') || name.includes('response')) {
        category = 'HTTP Metrics';
      } else if (name.includes('k8s') || name.includes('kubernetes') || name.includes('pod') || name.includes('container')) {
        category = 'Kubernetes Metrics';
      } else if (name.includes('cpu') || name.includes('memory') || name.includes('disk') || name.includes('filesystem')) {
        category = 'System Metrics';
      } else if (name.includes('gc') || name.includes('jvm') || name.includes('process')) {
        category = 'Runtime Metrics';
      } else if (name.includes('apisix') || name.includes('nginx') || name.includes('proxy')) {
        category = 'Gateway/Proxy Metrics';
      } else if (name.includes('db') || name.includes('database') || name.includes('sql')) {
        category = 'Database Metrics';
      }
      
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(metric);
    });
    
    return categories;
  }

  /**
   * Format compact log entry (default mode) - minimal output
   */
  private static formatCompactLog(entry: any, options: FormattingOptions): string {
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
  private static formatVerboseLog(entry: any): string {
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
  private static buildServiceContext(data: any): string {
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
  private static extractOldestTimestamp(logs: any[]): string | null {
    if (logs.length === 0) return null;

    // Logs should be sorted newest to oldest, so last entry is oldest
    const oldestEntry = logs[logs.length - 1];
    if (!oldestEntry?.timestamp) return null;

    // Format timestamp consistently
    return TimeUtils.formatTimestamp(oldestEntry.timestamp);
  }
}