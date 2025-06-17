import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { 
  SignozApi, 
  SignozConfig, 
  LogQueryParams, 
  MetricsQueryParams, 
  TracesQueryParams, 
  DiscoveryParams 
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
      query: args.query,
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