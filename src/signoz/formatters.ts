// Response formatting logic for SigNoz API responses

import { LogEntry, FormattingOptions } from './types.js';
import { TimeUtils } from './time-utils.js';

export class ResponseFormatter {
  // Default attributes to exclude when not in verbose mode
  private static readonly DEFAULT_EXCLUDED_ATTRIBUTES = [
    'log.file.path',
    'log.iostream', 
    'logtag',
    'k8s.node.uid',
    'k8s.pod.uid',
    'k8s.container.restart_count',
    'k8s.pod.start_time',
    'k8s.cluster.name',
    'k8s.node.name',
    'signoz.component',
    'host.name',
    'os.type',
    'deployment.environment',
    'time' // Duplicate of timestamp
  ];

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

    return formattedText;
  }

  /**
   * Format metrics response for display
   */
  static formatMetricsResponse(response: any, query: string, startTime: number, endTime: number, step: string): string {
    let formattedText = `Metrics query result\n\n`;
    formattedText += `Query: ${query}\n`;
    formattedText += `Time range: ${new Date(startTime / 1000000).toISOString()} to ${new Date(endTime / 1000000).toISOString()}\n`;
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
              formattedText += `  ${new Date(v[0] / 1000000).toISOString()}: ${v[1]}\n`;
            });
            formattedText += `...\n`;
            formattedText += `Last 3 values:\n`;
            series.values.slice(-3).forEach((v: any) => {
              formattedText += `  ${new Date(v[0] / 1000000).toISOString()}: ${v[1]}\n`;
            });
          } else {
            series.values.forEach((v: any) => {
              formattedText += `  ${new Date(v[0] / 1000000).toISOString()}: ${v[1]}\n`;
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
   * Format compact log entry (default mode)
   */
  private static formatCompactLog(entry: any, options: FormattingOptions): string {
    const timestamp = TimeUtils.formatTimestamp(entry.timestamp || entry.ts || entry.time);
    const body = entry.data?.body || '';
    const level = entry.data?.attributes_string?.level || entry.data?.severity_text || 'INFO';
    const service = entry.data?.resources_string?.['service.name'] || 
                   entry.data?.resources_string?.['k8s.deployment.name'] || 
                   'unknown';
    
    let formattedText = `[${timestamp}] [${level}] [${service}]\n`;
    formattedText += `${body}\n`;
    
    // Add filtered attributes if present
    const attributes = entry.data?.attributes_string || {};
    const resources = entry.data?.resources_string || {};
    const allAttributes = { ...attributes, ...resources };
    
    const filteredKeys = Object.keys(allAttributes)
      .filter(k => this.shouldIncludeAttribute(k, options));
    
    if (filteredKeys.length > 0) {
      formattedText += `Attributes: `;
      filteredKeys.forEach(key => {
        const value = allAttributes[key];
        formattedText += `${key}=${value} `;
      });
      formattedText += '\n';
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
    const service = entry.data?.resources_string?.['service.name'] || 
                   entry.data?.resources_string?.['k8s.deployment.name'] || 
                   'unknown';
    
    let formattedText = `[${timestamp}] [${level}] [${service}]\n`;
    formattedText += `${body}\n`;
    
    // Add all attributes
    const attributes = entry.data?.attributes_string || {};
    const resources = entry.data?.resources_string || {};
    const relevantKeys = Object.keys({...attributes, ...resources})
      .filter(k => !['body', 'level', 'severity_text', 'service.name'].includes(k));
    
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
   * Determine if an attribute should be included in output
   */
  private static shouldIncludeAttribute(key: string, options: FormattingOptions): boolean {
    // Skip basic fields that are already shown
    if (['body', 'level', 'severity_text', 'service.name', 'k8s.deployment.name'].includes(key)) {
      return false;
    }

    // If explicit include list provided, only include those
    if (options.include_attributes && options.include_attributes.length > 0) {
      return options.include_attributes.includes(key);
    }

    // If explicit exclude list provided, exclude those
    if (options.exclude_attributes && options.exclude_attributes.length > 0) {
      return !options.exclude_attributes.includes(key);
    }

    // Default: exclude noisy attributes
    return !this.DEFAULT_EXCLUDED_ATTRIBUTES.includes(key);
  }
}