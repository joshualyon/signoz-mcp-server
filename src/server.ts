import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

interface SignozConfig {
  apiKey: string;
  baseUrl: string;
}

interface QueryRangeRequest {
  start: number;
  end: number;
  step?: number;
  query: string;
}

class SignozMCPServer {
  private server: Server;
  private config: SignozConfig;
  private serverInfo = {
    name: "signoz-mcp-server",
    version: "0.1.0",
  };

  constructor() {
    this.server = new Server(
      this.serverInfo,
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.config = {
      apiKey: process.env.SIGNOZ_API_KEY || "",
      baseUrl: process.env.SIGNOZ_BASE_URL || "http://localhost:8080",
    };

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "query_logs",
          description: "Query logs from Signoz using simplified filter syntax",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Simple filter syntax: key=value (equals), key~value (contains), key!=value (not equals). Join with AND. Examples: 'k8s.deployment.name=stio-api', 'level=error AND service=api-gateway', 'body~timeout', 'k8s.namespace=production AND body~error'",
              },
              start: {
                type: "string",
                description: "Start time (ISO 8601 or Unix timestamp)",
              },
              end: {
                type: "string",
                description: "End time (ISO 8601 or Unix timestamp)",
              },
              limit: {
                type: "number",
                description: "Maximum number of results",
                default: 100,
              },
            },
            required: ["query"],
          },
        },
        {
          name: "query_metrics",
          description: "Query metrics from Signoz",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "PromQL query string",
              },
              start: {
                type: "string",
                description: "Start time (ISO 8601 or Unix timestamp)",
              },
              end: {
                type: "string",
                description: "End time (ISO 8601 or Unix timestamp)",
              },
              step: {
                type: "string",
                description: "Query resolution step (e.g., '1m', '5m')",
                default: "1m",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "query_traces",
          description: "Query traces from Signoz",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Trace query string",
              },
              start: {
                type: "string",
                description: "Start time (ISO 8601 or Unix timestamp)",
              },
              end: {
                type: "string",
                description: "End time (ISO 8601 or Unix timestamp)",
              },
              limit: {
                type: "number",
                description: "Maximum number of results",
                default: 100,
              },
            },
            required: ["query"],
          },
        },
        {
          name: "help",
          description: "Get guidance on using Signoz MCP tools effectively. Shows recommended workflow and examples.",
          inputSchema: {
            type: "object",
            properties: {
              topic: {
                type: "string",
                description: "Specific topic to get help on: 'workflow', 'queries', 'examples', or leave empty for general help",
                enum: ["workflow", "queries", "examples"],
              },
            },
          },
        },
        {
          name: "test_connection",
          description: "Test connectivity to Signoz server using the /api/v1/rules endpoint",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "discover_log_attributes",
          description: "RECOMMENDED FIRST STEP: Discover available log attributes by sampling recent logs. This helps understand what fields can be queried before using query_logs. Returns grouped attributes with sample values and example queries.",
          inputSchema: {
            type: "object",
            properties: {
              sample_size: {
                type: "number",
                description: "Number of recent logs to sample (default: 10, max: 100)",
                default: 10,
              },
              time_range: {
                type: "string",
                description: "Time range to sample from (default: 'now-1h'). Use shorter ranges if experiencing timeouts.",
                default: "now-1h",
              },
            },
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "help":
          return await this.getHelp(args);
        case "query_logs":
          return await this.queryLogs(args);
        case "query_metrics":
          return await this.queryMetrics(args);
        case "query_traces":
          return await this.queryTraces(args);
        case "test_connection":
          return await this.testConnection();
        case "discover_log_attributes":
          return await this.discoverLogAttributes(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async getHelp(args: any) {
    const topic = args.topic;
    
    let helpText = "";
    
    if (!topic || topic === "workflow") {
      helpText = `# Signoz MCP Tools - Recommended Workflow

## 🚀 Getting Started

1. **test_connection** - Verify connectivity to your Signoz instance
   → Use this first to ensure your API key and URL are correct

2. **discover_log_attributes** - Explore available log fields
   → Essential for understanding what you can query
   → Shows real attribute names and sample values
   → Provides example queries based on your actual data

3. **query_logs** - Query logs with discovered attributes
   → Use the attribute names from step 2
   → Start with simple queries, then combine filters

## 📊 For Metrics (Coming Soon)
- query_metrics - Use PromQL queries for metrics

## 🔍 For Traces (Coming Soon)  
- query_traces - Search distributed traces

## 💡 Tips
- Always run discover_log_attributes first in a new environment
- Use the exact attribute names shown in discovery
- Time ranges default to last hour if not specified`;
    }
    
    else if (topic === "queries") {
      helpText = `# Query Syntax Guide

## Log Query Operators

**Basic Operators:**
- \`=\` - Exact match (e.g., level=error)
- \`~\` - Contains (e.g., body~timeout)
- \`!=\` - Not equals (e.g., level!=debug)
- \`>\`, \`<\`, \`>=\`, \`<=\` - Comparisons

**Combining Filters:**
- Use AND to combine (e.g., level=error AND service=api)

## Common Attribute Patterns

**Kubernetes Resources:**
- k8s.deployment.name
- k8s.namespace.name
- k8s.pod.name
- k8s.container.name

**Service Attributes:**
- service.name
- level (or severity_text)
- body (log message content)

## Time Ranges
- now-1h (last hour)
- now-15m (last 15 minutes)
- ISO timestamps (2024-01-20T10:00:00Z)`;
    }
    
    else if (topic === "examples") {
      helpText = `# Example Queries

## Simple Queries

**Find logs from a specific deployment:**
\`\`\`
query: "k8s.deployment.name=my-api"
\`\`\`

**Find error logs:**
\`\`\`
query: "level=error"
\`\`\`

**Search log content:**
\`\`\`
query: "body~database connection failed"
\`\`\`

## Combined Queries

**Errors from specific service:**
\`\`\`
query: "k8s.deployment.name=my-api AND level=error"
\`\`\`

**Timeouts in production:**
\`\`\`
query: "k8s.namespace.name=production AND body~timeout"
\`\`\`

## With Time Ranges

**Last 15 minutes of errors:**
\`\`\`
query: "level=error",
start: "now-15m"
\`\`\`

**Specific time window:**
\`\`\`
query: "service=api-gateway",
start: "2024-01-20T10:00:00Z",
end: "2024-01-20T11:00:00Z"
\`\`\``;
    }
    
    return {
      content: [
        {
          type: "text",
          text: helpText || "Use topic parameter: 'workflow', 'queries', or 'examples'",
        },
      ],
    };
  }

  private parseTimeParam(time?: string): number {
    if (!time) {
      return Date.now();
    }
    
    // Handle relative time like "now-1h"
    if (time.startsWith("now")) {
      const match = time.match(/now-(\d+)([mhd])/);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2];
        const multipliers: Record<string, number> = {
          'm': 60 * 1000,
          'h': 60 * 60 * 1000,
          'd': 24 * 60 * 60 * 1000,
        };
        return Date.now() - (value * multipliers[unit]);
      }
      return Date.now();
    }
    
    // Handle ISO date or Unix timestamp
    const parsed = Date.parse(time);
    return isNaN(parsed) ? Date.now() : parsed;
  }

  private async makeSignozRequest(endpoint: string, data: any) {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    try {
      console.error(`Making request to: ${url}`);
      console.error(`Headers: SIGNOZ-API-KEY: ${this.config.apiKey.substring(0, 10)}...`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'SIGNOZ-API-KEY': this.config.apiKey,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Response headers:`, response.headers);
        throw new Error(`Signoz API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Signoz API request failed:', error);
      throw error;
    }
  }

  private buildLogsCompositeQuery(filter: string, limit: number = 100) {
    // Parse simple filter syntax like "k8s.deployment.name=stio-api AND level=error"
    const filters: any[] = [];
    
    if (filter) {
      // Simple parser for key=value, key!=value, or key~value (contains) patterns
      const filterParts = filter.split(/\s+AND\s+/i);
      filterParts.forEach((part) => {
        const match = part.match(/^(.+?)(=|!=|~|>|<|>=|<=)(.+)$/);
        if (match) {
          const [, key, op, value] = match;
          let filterOp = op === '=' ? 'in' : op === '!=' ? 'nin' : op === '~' ? 'contains' : op;
          const cleanValue = value.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
          
          // Determine attribute type based on key
          let attrType = "tag";
          if (key.startsWith('k8s.') || key.includes('.name') || key === 'service') {
            attrType = "resource";
          } else if (key === 'body' || key === 'timestamp') {
            attrType = "tag";
          }
          
          filters.push({
            id: Math.random().toString(36).substring(7),
            key: {
              key: key.trim(),
              dataType: "string",
              type: attrType,
              isColumn: key === 'body' || key === 'timestamp',
              isJSON: false
            },
            op: filterOp,
            value: cleanValue
          });
        }
      });
    }

    return {
      compositeQuery: {
        queryType: "builder",
        panelType: "list",
        builderQueries: {
          "A": {
            queryName: "A",
            dataSource: "logs",
            aggregateOperator: "noop",
            aggregateAttribute: {
              key: "",
              dataType: "",
              type: "",
              isColumn: false,
              isJSON: false
            },
            expression: "A",
            disabled: false,
            stepInterval: 60,
            filters: {
              op: "AND",
              items: filters
            },
            limit: limit,
            orderBy: [{
              columnName: "timestamp",
              order: "desc"
            }]
          }
        }
      }
    };
  }

  private async queryLogs(args: any) {
    try {
      const startTime = this.parseTimeParam(args.start || "now-1h");
      const endTime = this.parseTimeParam(args.end || "now");
      
      // Build composite query
      const queryData = this.buildLogsCompositeQuery(args.query || "", args.limit || 100);
      
      // API expects milliseconds, not nanoseconds
      const request = {
        start: startTime,
        end: endTime,
        step: 60, // 60 second step
        ...queryData
      };

      console.error(`Querying logs with filter: ${args.query || '(none)'}`);
      console.error(`Time range: ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);
      console.error(`Composite query filters:`, JSON.stringify(queryData.compositeQuery.builderQueries.A.filters, null, 2));
      
      const response = await this.makeSignozRequest('/api/v4/query_range', request);
      
      // Format the response for better readability
      const logs = response.data?.result?.[0]?.list || [];
      let formattedText = `Found ${logs.length} log entries\n\n`;
      
      if (logs.length > 0) {
        logs.forEach((entry: any) => {
          // Timestamp might be in nanoseconds or string format
          const timestampValue = entry.timestamp || entry.ts || entry.time;
          let timestamp: string;
          if (typeof timestampValue === 'string') {
            timestamp = timestampValue;
          } else if (timestampValue > 1e15) {
            // Nanoseconds
            timestamp = new Date(parseInt(timestampValue) / 1000000).toISOString();
          } else {
            // Milliseconds
            timestamp = new Date(parseInt(timestampValue)).toISOString();
          }
          const body = entry.data?.body || '';
          const level = entry.data?.attributes_string?.level || entry.data?.severity_text || 'INFO';
          const service = entry.data?.resources_string?.['service.name'] || 
                         entry.data?.resources_string?.['k8s.deployment.name'] || 
                         'unknown';
          
          formattedText += `[${timestamp}] [${level}] [${service}]\n`;
          formattedText += `${body}\n`;
          
          // Add key attributes if present
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
          formattedText += '\n';
        });
      }

      return {
        content: [
          {
            type: "text",
            text: formattedText,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error querying logs: ${error.message}`,
          },
        ],
      };
    }
  }

  private async queryMetrics(args: any) {
    try {
      const startTime = this.parseTimeParam(args.start || "now-1h");
      const endTime = this.parseTimeParam(args.end || "now");
      const step = args.step || "1m";
      
      // Parse step to seconds
      const stepMatch = step.match(/(\d+)([smhd])/);
      let stepSeconds = 60; // default 1 minute
      if (stepMatch) {
        const value = parseInt(stepMatch[1]);
        const unit = stepMatch[2];
        const multipliers: Record<string, number> = {
          's': 1,
          'm': 60,
          'h': 3600,
          'd': 86400,
        };
        stepSeconds = value * multipliers[unit];
      }
      
      // Convert to nanoseconds for Signoz API
      const request = {
        start: startTime * 1000000,
        end: endTime * 1000000,
        step: stepSeconds,
        query: args.query || "",
      };

      console.error(`Querying metrics: ${JSON.stringify(request)}`);
      
      const response = await this.makeSignozRequest('/api/v4/query_range', request);
      
      // Format the response for better readability
      let formattedText = `Metrics query result\n\n`;
      formattedText += `Query: ${args.query}\n`;
      formattedText += `Time range: ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}\n`;
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

      return {
        content: [
          {
            type: "text",
            text: formattedText,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error querying metrics: ${error.message}`,
          },
        ],
      };
    }
  }

  private async queryTraces(args: any) {
    // TODO: Implement Signoz traces query
    return {
      content: [
        {
          type: "text",
          text: `Traces query functionality to be implemented. Query: ${args.query}`,
        },
      ],
    };
  }

  private async checkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/rules`, {
        method: 'GET',
        headers: {
          'SIGNOZ-API-KEY': this.config.apiKey,
        },
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async testConnection() {
    try {
      const startTime = Date.now();
      const response = await fetch(`${this.config.baseUrl}/api/v1/rules`, {
        method: 'GET',
        headers: {
          'SIGNOZ-API-KEY': this.config.apiKey,
        },
      });
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (response.ok) {
        const data = await response.json();
        const ruleCount = data?.data?.rules?.length || 0;
        
        return {
          content: [
            {
              type: "text",
              text: `✅ Connection successful!\n\n` +
                    `Server: ${this.config.baseUrl}\n` +
                    `Response time: ${responseTime}ms\n` +
                    `Status: ${response.status} ${response.statusText}\n` +
                    `Alert rules found: ${ruleCount}\n\n` +
                    `The Signoz server is reachable and the API key is valid.`,
            },
          ],
        };
      } else {
        const errorText = await response.text();
        return {
          content: [
            {
              type: "text",
              text: `❌ Connection failed!\n\n` +
                    `Server: ${this.config.baseUrl}\n` +
                    `Status: ${response.status} ${response.statusText}\n` +
                    `Error: ${errorText}\n\n` +
                    `Please check your SIGNOZ_BASE_URL and SIGNOZ_API_KEY environment variables.`,
            },
          ],
        };
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Connection error!\n\n` +
                  `Server: ${this.config.baseUrl}\n` +
                  `Error: ${error.message}\n\n` +
                  `Unable to reach the Signoz server. Please check:\n` +
                  `1. The SIGNOZ_BASE_URL is correct\n` +
                  `2. The server is running and accessible\n` +
                  `3. Any firewall or network issues`,
          },
        ],
      };
    }
  }

  private async discoverLogAttributes(args: any) {
    try {
      const sampleSize = Math.min(args.sample_size || 10, 100); // Cap at 100
      const timeRange = args.time_range || "now-1h";
      
      // Query recent logs without filters to get a sample
      const queryData = this.buildLogsCompositeQuery("", sampleSize);
      const endTime = this.parseTimeParam("now");
      const startTime = this.parseTimeParam(timeRange);
      
      const request = {
        start: startTime,
        end: endTime,
        step: 60,
        ...queryData
      };

      console.error(`Discovering log attributes from ${sampleSize} recent logs...`);
      
      const response = await this.makeSignozRequest('/api/v4/query_range', request);
      const logs = response.data?.result?.[0]?.list || [];
      
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
      
      return {
        content: [
          {
            type: "text",
            text: output,
          },
        ],
      };
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
      
      return {
        content: [
          {
            type: "text",
            text: errorMessage,
          },
        ],
      };
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Log startup information
    console.error("=== Signoz MCP Server Starting ===");
    console.error(`Server Name: ${this.serverInfo.name}`);
    console.error(`Server Version: ${this.serverInfo.version}`);
    console.error("");
    console.error("=== Signoz Connection Configuration ===");
    console.error(`Base URL: ${this.config.baseUrl}`);
    console.error(`API Key: ${this.config.apiKey ? `Configured (${this.config.apiKey.substring(0, 10)}...)` : 'Not configured'}`);
    console.error("");
    
    // Check connectivity
    console.error("=== Testing Signoz Connectivity ===");
    const isConnected = await this.checkConnectivity();
    if (isConnected) {
      console.error("✅ Successfully connected to Signoz server");
    } else {
      console.error("❌ Failed to connect to Signoz server");
      console.error("Please check your SIGNOZ_BASE_URL and SIGNOZ_API_KEY environment variables");
    }
    console.error("");
    console.error("=== Server Ready ===");
  }
}

const server = new SignozMCPServer();
server.start().catch(console.error);