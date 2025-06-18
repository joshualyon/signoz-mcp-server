# Signoz MCP Server

An MCP (Model Context Protocol) server that exposes Signoz observability data to Claude, enabling natural language queries against your logs, metrics, and traces.

## Features

- **Query Logs**: Search and analyze application logs with simple filter syntax
- **Query Metrics**: Builder-based metrics querying with aggregation and grouping  
- **Discover Data**: Explore available metrics and log attributes
- **Unified Interface**: Consistent syntax across logs and metrics
- **Type Safety**: Robust timestamp handling and parameter validation
- **Production Ready**: Comprehensive test coverage and error handling

### ✅ **Fully Implemented**
- ✅ **Logs**: Complete querying with pagination and attribute filtering
- ✅ **Metrics**: Builder queries with multiple metrics, aggregation, and grouping
- ✅ **Discovery**: Metric and log attribute discovery tools
- ✅ **Testing**: 45+ tests covering all functionality

### 🚧 **In Development** 
- 🚧 **Traces**: Basic implementation (placeholder)

## Prerequisites

- Signoz 0.85 or later (for API v4 support)
- Signoz API key
- Bun runtime

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd signoz-mcp-server

# Install dependencies
bun install
```

## Configuration

1. Set up environment variables:
```bash
export SIGNOZ_API_KEY="your-api-key"
export SIGNOZ_BASE_URL="https://your-signoz-instance.com"
```

2. Configure Claude Desktop (see [docs/configuration.md](docs/configuration.md) for details)

## Usage

### Development
```bash
bun run dev
```

### Testing with MCP Inspector
```bash
bun run inspector
```
This will start the MCP Inspector on http://localhost:6274 where you can interactively test the server's tools.

### Build
```bash
bun run build
```

### Quick Test
```bash
bun run test
```

## Available Tools

### query_logs
Query application logs from Signoz using simplified filter syntax with clean, readable output.

**Key Features:**
- **Minimal Output by Default**: Clean `[timestamp] [level] [service-context] message` format
- **Smart Service Context**: Shows `[service-name]` or `[namespace/deployment]` automatically
- **Verbose Mode**: Full attribute details when needed (`verbose: true`)
- **Attribute Filtering**: Include only specific attributes (`include_attributes: [...]`)
- **Automatic Pagination**: Handles large result sets with clear instructions for next page

The tool accepts simple filter syntax with these operators:
- `key=value` - Exact match
- `key~value` - Contains (useful for searching in log body)
- `key!=value` - Not equals

Join multiple filters with AND:
- `k8s.deployment.name=stio-api` - Filter by Kubernetes deployment
- `level=error AND service=api-gateway` - Multiple filters
- `body~timeout` - Logs containing "timeout" in the message
- `k8s.namespace=production AND body~error` - Combine resource and content filters

**Output Examples:**

*Default Compact Mode:*
```
[2025-06-17T22:26:42Z] [INFO] [default/stio-api]
Set variable $GridPower value as 1.3377999999999999.

[2025-06-17T22:26:41Z] [ERROR] [api-gateway]
Database connection timeout after 30s

[2025-06-17T22:26:40Z] [WARN] [production/user-service]
Rate limit approaching: 450/500 requests
```

*Verbose Mode (verbose: true):*
```
[2025-06-17T22:26:42Z] [INFO] [default/stio-api]
Set variable $GridPower value as 1.3377999999999999.
Attributes: http.request.id=abc-123 labels.module=rule trace.id=xyz-789

[2025-06-17T22:26:41Z] [ERROR] [api-gateway]
Database connection timeout after 30s
Attributes: error.type=timeout database.name=users http.status=500
```

*Custom Attributes (include_attributes: ["http.request.id", "trace.id"]):*
```
[2025-06-17T22:26:42Z] [INFO] [default/stio-api]
Set variable $GridPower value as 1.3377999999999999.
Attributes: http.request.id=abc-123 trace.id=xyz-789
```

**Query Examples:**
```
"Show logs from the stio-api deployment"
→ query: "k8s.deployment.name=stio-api"

"Find error logs from the api-gateway service in the last hour"
→ query: "level=error AND service=api-gateway", start: "now-1h"

"Get logs containing 'timeout' from production namespace"
→ query: "k8s.namespace=production AND body~timeout"

"Find logs with database errors, showing trace IDs"
→ query: "body~database AND body~error", include_attributes: ["trace.id"]

"Debug logs with full details"
→ query: "level=debug AND service=user-api", verbose: true
```

**Pagination Example:**
When results exceed the limit, the tool provides clear instructions:
```
--- More Results Available ---
Oldest timestamp: 2025-06-17T23:09:19.025991988Z
To get next 100 older results, use: end="2025-06-17T23:09:19.025991988Z"
```

### query_metrics
Query metrics using a builder-based interface with aggregation and grouping.

**Key Features:**
- **Multiple Metrics**: Query multiple metrics in one request
- **Aggregation Options**: avg, min, max, sum, count
- **Grouping**: Group results by attributes
- **Filter Syntax**: Same as logs (key=value, key~contains, key!=value)

**Examples:**
```
"Show CPU utilization for the stio-api deployment"
→ metric: ["k8s_pod_cpu_utilization"], query: "k8s_deployment_name=stio-api"

"Compare CPU and memory usage grouped by pod"
→ metric: ["k8s_pod_cpu_utilization", "k8s_pod_memory_usage"], 
  group_by: ["k8s_pod_name"], aggregation: "avg"

"Get maximum request rates by status code"
→ metric: ["http_requests_total"], group_by: ["status_code"], 
  aggregation: "max", query: "service=api-gateway"
```

### query_traces
Query distributed traces.

Example:
```
"Find traces where the total duration exceeded 1 second"
```

## Documentation

- [Usage Examples](docs/usage-examples.md) - Comprehensive examples of log queries and output formats
- [Development Guide](docs/development.md) - Build, test, and release processes
- [Configuration Guide](docs/configuration.md) - Setup and troubleshooting  
- [API Integration Guide](docs/api-integration.md) - Signoz API details and examples
- [Planning Document](docs/planning.md) - Feature roadmap and design decisions

## Development

### Building

```bash
# Build for current platform
bun run build

# Build for all platforms
bun run build:binary:all

# Run tests
bun test
```

### Releases

This project uses automated semantic versioning. See [Development Guide](docs/development.md) for details on:
- Commit message conventions
- Automated release process
- Manual release procedures

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit changes using conventional commits (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request to `main`

## License

MIT
