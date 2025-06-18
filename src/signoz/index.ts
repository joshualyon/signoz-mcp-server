// Main SignozApi facade

import { SignozClient } from './client.js';
import { QueryBuilder } from './query-builder.js';
import { ResponseFormatter } from './formatters.js';
import type { 
  SignozConfig, 
  LogQueryParams, 
  MetricsQueryParams, 
  TracesQueryParams, 
  DiscoveryParams,
  MetricDiscoveryParams,
  MetricAttributesParams,
  ConnectionResult 
} from './types.js';

export class SignozApi {
  private client: SignozClient;

  constructor(config: SignozConfig) {
    this.client = new SignozClient(config);
  }

  /**
   * Query logs from SigNoz
   */
  async queryLogs(params: LogQueryParams): Promise<string> {
    try {
      // Build query request
      const request = QueryBuilder.buildLogsQuery(params);
      
      console.error(`Querying logs with filter: ${params.query || '(none)'}`);
      console.error(`Time range: ${new Date(request.start).toISOString()} to ${new Date(request.end).toISOString()}`);
      console.error(`Formatting options:`, {
        verbose: params.verbose,
        include_attributes: params.include_attributes,
        exclude_attributes: params.exclude_attributes
      });
      
      // Execute query
      const response = await this.client.queryRange(request);
      
      // Format response
      const logs = response.data?.result?.[0]?.list || [];
      return ResponseFormatter.formatLogEntries(logs, {
        verbose: params.verbose,
        include_attributes: params.include_attributes,
        exclude_attributes: params.exclude_attributes,
        limit: params.limit
      });
    } catch (error: any) {
      return `Error querying logs: ${error.message}`;
    }
  }

  /**
   * Query metrics from SigNoz
   */
  async queryMetrics(params: MetricsQueryParams): Promise<string> {
    try {
      // Validate required parameters
      if (!params.metric || params.metric.length === 0) {
        return `Error: No metrics specified for query.

Please provide at least one metric to query:
• metric: ["metric_name"]
• metric: ["metric1", "metric2"]

Use discover_metrics to see available metrics.`;
      }

      // Validate each metric name
      const invalidMetrics = params.metric.filter(m => !m || m.trim() === '');
      if (invalidMetrics.length > 0) {
        return `Error: Empty or invalid metric names found.

All metric names must be non-empty strings.
Invalid entries: ${invalidMetrics.length}

Use discover_metrics to see available metrics.`;
      }

      // Build query request
      const request = QueryBuilder.buildMetricsQuery(params);
      
      console.error(`Querying metrics: ${JSON.stringify(request)}`);
      
      // Execute query
      const response = await this.client.queryRange(request);
      
      // Format response
      return ResponseFormatter.formatMetricsResponse(
        response, 
        params.metric.join(', '), 
        request.start, 
        request.end, 
        params.step || "1m"
      );
    } catch (error: any) {
      return `Error querying metrics: ${error.message}`;
    }
  }

  /**
   * Query traces from SigNoz
   */
  async queryTraces(params: TracesQueryParams): Promise<string> {
    try {
      // Build query request
      const request = QueryBuilder.buildTracesQuery(params);
      
      // Execute query (placeholder implementation)
      // const response = await this.client.queryRange(request);
      
      // Format response
      return ResponseFormatter.formatTracesResponse(params.query);
    } catch (error: any) {
      return `Error querying traces: ${error.message}`;
    }
  }

  /**
   * Discover available log attributes
   */
  async discoverLogAttributes(params: DiscoveryParams): Promise<string> {
    try {
      const sampleSize = Math.min(params.sample_size || 10, 100);
      const timeRange = params.time_range || "now-1h";
      
      // Query recent logs without filters to get a sample
      const logParams: LogQueryParams = {
        query: "",
        start: timeRange,
        end: "now",
        limit: sampleSize,
        verbose: true
      };
      
      const request = QueryBuilder.buildLogsQuery(logParams);
      
      console.error(`Discovering log attributes from ${sampleSize} recent logs...`);
      
      const response = await this.client.queryRange(request);
      const logs = response.data?.result?.[0]?.list || [];
      
      return this.formatDiscoveryResults(logs, request.start, request.end);
    } catch (error: any) {
      let errorMessage = `Error discovering attributes: ${error.message}`;
      
      // Add helpful suggestions for common errors
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        errorMessage += `\n\nTip: Try reducing the sample size or time range:
- sample_size: 5
- time_range: "now-15m"`;
      } else if (error.message.includes('400')) {
        errorMessage += `\n\nThis might indicate no logs are available in the specified time range.`;
      }
      
      return errorMessage;
    }
  }

  /**
   * Test connection to SigNoz
   */
  async testConnection(): Promise<string> {
    const result = await this.client.testConnection();
    
    if (result.success) {
      return `✅ Connection successful!\n\n` +
             `Server: ${result.serverInfo?.baseUrl}\n` +
             `Response time: ${result.responseTime}ms\n` +
             `Status: ${result.serverInfo?.status}\n` +
             `Alert rules found: ${result.serverInfo?.ruleCount}\n\n` +
             `The Signoz server is reachable and the API key is valid.`;
    } else {
      return `❌ Connection failed!\n\n` +
             `Server: ${this.client.getConfig().baseUrl}\n` +
             `Error: ${result.error}\n\n` +
             `Please check your SIGNOZ_BASE_URL and SIGNOZ_API_KEY environment variables.`;
    }
  }

  /**
   * Discover available metrics (UNOFFICIAL endpoint)
   */
  async discoverMetrics(params: MetricDiscoveryParams): Promise<string> {
    try {
      const timeRange = params.time_range || "1h";
      const limit = params.limit || 200;
      const offset = params.offset || 0;
      
      console.error(`Discovering metrics with time range: ${timeRange}, limit: ${limit}, offset: ${offset}`);
      console.error(`⚠️  Using unofficial/internal SigNoz endpoint`);
      
      const response = await this.client.discoverMetrics(timeRange, limit, offset);
      const metrics = response.data?.metrics || [];
      const total = response.data?.total;
      
      return ResponseFormatter.formatMetricsList(metrics, limit, total, offset);
    } catch (error: any) {
      let errorMessage = `Error discovering metrics: ${error.message}`;
      
      // Add helpful context for common errors
      if (error.message.includes('404') || error.message.includes('Not Found')) {
        errorMessage += `\n\nThe metrics discovery endpoint may not be available in this SigNoz version.`;
      } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        errorMessage += `\n\nTip: Try reducing the time range or limit:
- time_range: "30m"
- limit: 20`;
      } else if (error.message.includes('403') || error.message.includes('401')) {
        errorMessage += `\n\nAuthentication issue. Please check your SIGNOZ_API_KEY.`;
      }
      
      return errorMessage;
    }
  }

  /**
   * Discover attributes for a specific metric (UNOFFICIAL endpoint)
   */
  async discoverMetricAttributes(params: MetricAttributesParams): Promise<string> {
    try {
      console.error(`Discovering attributes for metric: ${params.metric_name}`);
      console.error(`⚠️  Using unofficial/internal SigNoz endpoint`);
      
      const response = await this.client.getMetricMetadata(params.metric_name);
      const metadata = response.data;
      
      return ResponseFormatter.formatMetricAttributes(metadata);
    } catch (error: any) {
      let errorMessage = `Error discovering metric attributes: ${error.message}`;
      
      // Add helpful context for common errors
      if (error.message.includes('404')) {
        errorMessage += `\n\nThe metric "${params.metric_name}" may not exist or the internal endpoint may not be available.
Try running discover_metrics first to see available metrics.`;
      } else if (error.message.includes('400')) {
        errorMessage += `\n\nInvalid metric name format. Make sure to use the exact metric name from discover_metrics.`;
      } else if (error.message.includes('403') || error.message.includes('401')) {
        errorMessage += `\n\nAuthentication issue. Please check your SIGNOZ_API_KEY.`;
      }
      
      
      return errorMessage;
    }
  }

  /**
   * Check if SigNoz is accessible
   */
  async checkConnectivity(): Promise<boolean> {
    return this.client.checkConnectivity();
  }

  /**
   * Get current configuration
   */
  getConfig(): SignozConfig {
    return this.client.getConfig();
  }

  /**
   * Format discovery results (extracted from original server.ts)
   */
  private formatDiscoveryResults(logs: any[], startTime: number, endTime: number): string {
    // Collect all unique attributes
    const attributeMap = new Map<string, Set<string>>();
    const resourceMap = new Map<string, Set<string>>();
    
    logs.forEach((entry: any) => {
      // Collect attributes
      const attributes = entry.data?.attributes_string || {};
      Object.entries(attributes).forEach(([key, value]) => {
        if (!attributeMap.has(key)) {
          attributeMap.set(key, new Set());
        }
        if (typeof value === 'string' && value.length < 100) {
          attributeMap.get(key)!.add(value as string);
        }
      });
      
      // Collect resources
      const resources = entry.data?.resources_string || {};
      Object.entries(resources).forEach(([key, value]) => {
        if (!resourceMap.has(key)) {
          resourceMap.set(key, new Set());
        }
        if (typeof value === 'string' && value.length < 100) {
          resourceMap.get(key)!.add(value as string);
        }
      });
    });
    
    // Format the output
    let output = `# Log Attribute Discovery Results

Analyzed ${logs.length} recent logs from ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}

## 📦 Resource Attributes (Infrastructure/K8s)
*These identify where logs come from*\n\n`;
    
    const sortedResources = Array.from(resourceMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    // Highlight commonly used resource attributes
    const commonResourceKeys = ['k8s.deployment.name', 'k8s.namespace.name', 'k8s.pod.name', 'service.name'];
    const commonResources = sortedResources.filter(([key]) => commonResourceKeys.includes(key));
    const otherResources = sortedResources.filter(([key]) => !commonResourceKeys.includes(key));
    
    if (commonResources.length > 0) {
      output += `**Commonly Used:**\n`;
      commonResources.forEach(([key, values]) => {
        const sampleValues = Array.from(values).slice(0, 5).join(', ');
        const uniqueCount = values.size > 5 ? ` (${values.size} unique values)` : '';
        output += `• ${key}: ${sampleValues}${uniqueCount}\n`;
      });
      output += `\n`;
    }
    
    if (otherResources.length > 0) {
      output += `**Other Resources:**\n`;
      otherResources.forEach(([key, values]) => {
        const sampleValues = Array.from(values).slice(0, 3).join(', ');
        output += `• ${key}: ${sampleValues}${values.size > 3 ? '...' : ''}\n`;
      });
    }
    
    output += `\n## 🏷️ Log Attributes (Application-specific)\n*These contain log-specific data*\n\n`;
    
    const sortedAttributes = Array.from(attributeMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    // Group by attribute prefix
    const httpAttributes = sortedAttributes.filter(([key]) => key.startsWith('http.'));
    const labelAttributes = sortedAttributes.filter(([key]) => key.startsWith('labels.'));
    const otherAttributes = sortedAttributes.filter(([key]) => !key.startsWith('http.') && !key.startsWith('labels.'));
    
    if (httpAttributes.length > 0) {
      output += `**HTTP Attributes:**\n`;
      httpAttributes.forEach(([key, values]) => {
        const sampleValues = Array.from(values).slice(0, 3).join(', ');
        output += `• ${key}: ${sampleValues}${values.size > 3 ? '...' : ''}\n`;
      });
      output += `\n`;
    }
    
    if (labelAttributes.length > 0) {
      output += `**Labels:**\n`;
      labelAttributes.forEach(([key, values]) => {
        const sampleValues = Array.from(values).slice(0, 5).join(', ');
        output += `• ${key}: ${sampleValues}${values.size > 5 ? '...' : ''}\n`;
      });
      output += `\n`;
    }
    
    if (otherAttributes.length > 0) {
      output += `**Other Attributes:**\n`;
      otherAttributes.forEach(([key, values]) => {
        const sampleValues = Array.from(values).slice(0, 3).join(', ');
        output += `• ${key}: ${sampleValues}${values.size > 3 ? '...' : ''}\n`;
      });
    }
    
    output += `\n## 📝 Special Fields\n`;
    output += `• **body** - The main log message content (use ~ operator to search)\n`;
    output += `• **timestamp** - Log timestamp (automatically included)\n`;
    output += `• **level/severityText** - Log level: ${attributeMap.has('severityText') ? Array.from(attributeMap.get('severityText')!).join(', ') : 'error, info, warn, debug'}\n`;
    
    output += `\n## 🔍 Example Queries\n*Based on your actual data:*\n\n`;
    
    // Generate smart examples based on discovered attributes
    if (resourceMap.has('k8s.deployment.name')) {
      const deployments = Array.from(resourceMap.get('k8s.deployment.name')!);
      output += `**Filter by deployment:**\n`;
      output += `k8s.deployment.name=${deployments[0]}\n\n`;
    }
    
    if (resourceMap.has('k8s.namespace.name') && attributeMap.has('severityText')) {
      const namespace = Array.from(resourceMap.get('k8s.namespace.name')!)[0];
      output += `**Errors in a namespace:**\n`;
      output += `k8s.namespace.name=${namespace} AND level=error\n\n`;
    }
    
    if (labelAttributes.length > 0) {
      const [labelKey, labelValues] = labelAttributes[0];
      output += `**Filter by label:**\n`;
      output += `${labelKey}=${Array.from(labelValues)[0]}\n\n`;
    }
    
    output += `**Search log content:**\n`;
    output += `body~"error message"\n`;
    output += `body~timeout AND level=error\n\n`;
    
    output += `**Combine multiple filters:**\n`;
    if (resourceMap.has('k8s.deployment.name') && httpAttributes.length > 0) {
      const deployment = Array.from(resourceMap.get('k8s.deployment.name')!)[0];
      output += `k8s.deployment.name=${deployment} AND http.request.method=POST\n`;
    }
    
    return output;
  }
}

// Re-export everything for convenience
export * from './types.js';
export * from './client.js';
export * from './query-builder.js';
export * from './formatters.js';
export * from './time-utils.js';