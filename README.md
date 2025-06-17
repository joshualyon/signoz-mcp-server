# Signoz MCP Server

An MCP (Model Context Protocol) server that exposes Signoz observability data to Claude, enabling natural language queries against your logs, metrics, and traces.

## Features

- **Query Logs**: Search and analyze application logs with natural language
- **Query Metrics**: Retrieve metrics using PromQL queries
- **Query Traces**: Analyze distributed traces to understand request flows
- **Unified API**: Uses Signoz v4 API's unified query endpoint

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
Query application logs from Signoz using simplified filter syntax.

The tool accepts simple filter syntax with these operators:
- `key=value` - Exact match
- `key~value` - Contains (useful for searching in log body)
- `key!=value` - Not equals

Join multiple filters with AND:
- `k8s.deployment.name=stio-api` - Filter by Kubernetes deployment
- `level=error AND service=api-gateway` - Multiple filters
- `body~timeout` - Logs containing "timeout" in the message
- `k8s.namespace=production AND body~error` - Combine resource and content filters

Examples:
```
"Show logs from the stio-api deployment"
→ query: "k8s.deployment.name=stio-api"

"Find error logs from the api-gateway service in the last hour"
→ query: "level=error AND service=api-gateway", start: "now-1h"

"Get logs containing 'timeout' from production namespace"
→ query: "k8s.namespace=production AND body~timeout"

"Find logs with database errors"
→ query: "body~database AND body~error"
```

### query_metrics
Query metrics using PromQL syntax.

Example:
```
"Show me the HTTP request rate for all services over the last 6 hours"
```

### query_traces
Query distributed traces.

Example:
```
"Find traces where the total duration exceeded 1 second"
```

## Documentation

- [Planning Document](docs/planning.md) - Feature roadmap and design decisions
- [API Integration Guide](docs/api-integration.md) - Signoz API details and examples
- [Configuration Guide](docs/configuration.md) - Setup and troubleshooting

## License

MIT
