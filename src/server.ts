import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { 
  SignozApi
} from './signoz/index.js';
import type { 
  SignozConfig, 
  LogQueryParams, 
  MetricsQueryParams, 
  TracesQueryParams, 
  DiscoveryParams,
  MetricDiscoveryParams,
  MetricAttributesParams
} from './signoz/index.js';

class SignozMCPServer {
  private server: Server;
  private signozApi: SignozApi;
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

    // Initialize SignozApi with configuration
    const config: SignozConfig = {
      apiKey: process.env.SIGNOZ_API_KEY || "",
      baseUrl: process.env.SIGNOZ_BASE_URL || "http://localhost:8080",
    };
    this.signozApi = new SignozApi(config);

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "query_logs",
          description: "Query logs from Signoz using simplified filter syntax. Automatically provides pagination hints when results exceed limit.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Simple filter syntax: key=value (equals), key~value (contains), key!=value (not equals). Join with AND. Examples: 'k8s.deployment.name=stio-api', 'level=error AND service=api-gateway', 'body~timeout', 'k8s.namespace=production AND body~error'",
              },
              start: {
                type: "string",
                description: "Start time (ISO 8601, Unix timestamp, or relative like '30m', '1h', 'now-2h')",
              },
              end: {
                type: "string",
                description: "End time (ISO 8601, Unix timestamp, or relative like '30m', '1h'). Use timestamp from pagination hint to get next page of older results.",
              },
              limit: {
                type: "number",
                description: "Maximum number of results",
                default: 100,
              },
              verbose: {
                type: "boolean",
                description: "Show all attributes (default: false for compact output)",
                default: false,
              },
              include_attributes: {
                type: "array",
                items: { type: "string" },
                description: "Specific attributes to include in output",
              },
              exclude_attributes: {
                type: "array",
                items: { type: "string" },
                description: "Specific attributes to exclude from output",
              },
              level: {
                type: "string",
                enum: ["error", "warn", "info", "debug", "trace"],
                description: "Filter by log level",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "query_metrics",
          description: "Query metrics from Signoz using builder queries with optional filtering and grouping",
          inputSchema: {
            type: "object",
            properties: {
              metric: {
                type: "array",
                items: { type: "string" },
                minItems: 1,
                description: "Metric names to query (e.g., ['k8s_pod_cpu_utilization', 'k8s_pod_memory_usage'])",
              },
              query: {
                type: "string",
                description: "Simple filter syntax: key=value (equals), key~value (contains), key!=value (not equals). Join with AND. Examples: 'k8s_deployment_name=stio-api', 'k8s_namespace_name=default AND k8s_pod_name~stio-api'",
              },
              aggregation: {
                type: "string",
                enum: ["avg", "min", "max", "sum", "count"],
                default: "avg",
                description: "Aggregation method for the metrics",
              },
              group_by: {
                type: "array",
                items: { type: "string" },
                description: "Attributes to group results by (e.g., ['k8s_pod_name', 'k8s_namespace_name'])",
              },
              start: {
                type: "string",
                description: "Start time (ISO 8601, Unix timestamp, or relative like '30m', '1h', 'now-2h'). Defaults to '1h' (1 hour ago) if not specified. Note: '1h' means '1 hour ago', not '1 hour from now'.",
                default: "1h",
              },
              end: {
                type: "string", 
                description: "End time (ISO 8601, Unix timestamp, or relative like '30m', '1h'). Defaults to 'now' if not specified. Must be after start time.",
                default: "now",
              },
              step: {
                type: "string",
                description: "Query resolution step (e.g., '1m', '5m')",
                default: "1m",
              },
            },
            required: ["metric"],
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
                description: "Start time (ISO 8601, Unix timestamp, or relative like '30m', '1h', 'now-2h')",
              },
              end: {
                type: "string",
                description: "End time (ISO 8601, Unix timestamp, or relative like '30m', '1h')",
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
        {
          name: "discover_metrics",
          description: "Discover available metrics with activity statistics and categorization. Lists metrics sorted by sample count with type, description, and usage information.",
          inputSchema: {
            type: "object",
            properties: {
              time_range: {
                type: "string",
                description: "Time range to analyze metric activity (default: '1h'). Examples: '30m', '2h', '1d'",
                default: "1h",
              },
              limit: {
                type: "number",
                description: "Maximum number of metrics to return (default: 200)",
                default: 200,
              },
              offset: {
                type: "number",
                description: "Pagination offset - number of metrics to skip (default: 0)",
                default: 0,
              },
            },
          },
        },
        {
          name: "discover_metric_attributes",
          description: "Discover labels/attributes for a specific metric. Shows all available labels with sample values, cardinality, and example queries.",
          inputSchema: {
            type: "object",
            properties: {
              metric_name: {
                type: "string",
                description: "Name of the metric to analyze (use discover_metrics to find available metrics)",
              },
            },
            required: ["metric_name"],
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
        case "discover_metrics":
          return await this.discoverMetrics(args);
        case "discover_metric_attributes":
          return await this.discoverMetricAttributes(args);
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
   → Automatic pagination when results exceed limit

## 📊 For Metrics
- **discover_metrics** - List available metrics with activity stats
- **discover_metric_attributes** - Show labels for specific metrics  
- **query_metrics** - Query metrics using builder queries with filtering and grouping

## 🔍 For Traces (Coming Soon)  
- query_traces - Search distributed traces

## 💡 Tips
- Always run discover_log_attributes first in a new environment
- Use the exact attribute names shown in discovery
- Time ranges default to last hour if not specified
- Use relative times for convenience: '30m', '1h', '2d', 'now-15m'
- When pagination appears, use the provided 'end' parameter for next page`;
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
- Relative: '30m', '1h', '2d' (X ago from now)
- Legacy: 'now-1h', 'now-15m' (still supported)
- ISO timestamps: '2024-01-20T10:00:00Z'
- Unix timestamps: 1640995200`;
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

  private parseBoolean(value: any): boolean | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  }

  private async queryLogs(args: any) {
    const params: LogQueryParams = {
      query: args.query,
      start: args.start,
      end: args.end,
      limit: args.limit,
      verbose: this.parseBoolean(args.verbose),
      include_attributes: args.include_attributes,
      exclude_attributes: args.exclude_attributes,
      level: args.level,
    };

    const result = await this.signozApi.queryLogs(params);
    
    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  }

  private async queryMetrics(args: any) {
    const params: MetricsQueryParams = {
      metric: args.metric,
      query: args.query,
      aggregation: args.aggregation || 'avg',
      group_by: args.group_by,
      start: args.start,
      end: args.end,
      step: args.step,
    };

    const result = await this.signozApi.queryMetrics(params);

    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  }

  private async queryTraces(args: any) {
    const params: TracesQueryParams = {
      query: args.query,
      start: args.start,
      end: args.end,
      limit: args.limit,
    };

    const result = await this.signozApi.queryTraces(params);

    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  }

  private async testConnection() {
    const result = await this.signozApi.testConnection();

    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  }

  private async discoverLogAttributes(args: any) {
    const params: DiscoveryParams = {
      sample_size: args.sample_size,
      time_range: args.time_range,
    };

    const result = await this.signozApi.discoverLogAttributes(params);

    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  }

  private async discoverMetrics(args: any) {
    const params: MetricDiscoveryParams = {
      time_range: args.time_range,
      limit: args.limit,
    };

    const result = await this.signozApi.discoverMetrics(params);
    
    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  }

  private async discoverMetricAttributes(args: any) {
    const params: MetricAttributesParams = {
      metric_name: args.metric_name,
    };

    const result = await this.signozApi.discoverMetricAttributes(params);
    
    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
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
    const config = this.signozApi.getConfig();
    console.error(`Base URL: ${config.baseUrl}`);
    console.error(`API Key: ${config.apiKey ? `Configured (${config.apiKey.substring(0, 10)}...)` : 'Not configured'}`);
    console.error("");
    
    // Check connectivity
    console.error("=== Testing Signoz Connectivity ===");
    const isConnected = await this.signozApi.checkConnectivity();
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