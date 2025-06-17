// Response formatting logic for SigNoz API responses

import { LogEntry, FormattingOptions } from './types.js';
import { TimeUtils } from './time-utils.js';

export class ResponseFormatter {

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
}