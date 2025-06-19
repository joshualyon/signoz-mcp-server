# Signoz MCP Server Configuration

## Environment Variables

### Required
- `SIGNOZ_API_KEY`: Your Signoz API key
- `SIGNOZ_API_URL`: Base URL of your Signoz instance (default: `http://localhost:8080`)

### Optional
- `SIGNOZ_TIMEOUT`: API request timeout in milliseconds (default: 30000)
- `SIGNOZ_MAX_RETRIES`: Maximum number of retry attempts (default: 3)
- `CACHE_TTL`: Cache time-to-live in seconds (default: 300)

## Claude Desktop Configuration

Add the following to your Claude Desktop configuration file:

### macOS/Linux
Location: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows
Location: `%APPDATA%\Claude\claude_desktop_config.json`

### Configuration
```json
{
  "mcpServers": {
    "signoz": {
      "command": "bun",
      "args": ["run", "/path/to/signoz-mcp-server/src/server.ts"],
      "env": {
        "SIGNOZ_API_KEY": "your-api-key-here",
        "SIGNOZ_API_URL": "https://your-signoz-instance.com"
      }
    }
  }
}
```

## Development Setup

### 1. Clone and Install
```bash
git clone <repository-url>
cd signoz-mcp-server
bun install
```

### 2. Environment Setup
Create a `.env` file in the project root:
```env
SIGNOZ_API_KEY=your-api-key-here
SIGNOZ_API_URL=https://your-signoz-instance.com
```

### 3. Run in Development
```bash
bun run dev
```

### 4. Build for Production
```bash
bun run build
```

## Testing the Server

### Manual Testing with MCP Inspector
```bash
npx @modelcontextprotocol/inspector bun run src/server.ts
```

### Example Queries

1. **Query Recent Errors**
```json
{
  "tool": "query_logs",
  "arguments": {
    "query": "level=error",
    "start": "now-1h",
    "end": "now",
    "limit": 50
  }
}
```

2. **Get HTTP Request Rate**
```json
{
  "tool": "query_metrics",
  "arguments": {
    "query": "rate(http_requests_total[5m])",
    "start": "now-1h",
    "end": "now",
    "step": "1m"
  }
}
```

3. **Find Slow Traces**
```json
{
  "tool": "query_traces",
  "arguments": {
    "query": "duration>1000",
    "start": "now-30m",
    "end": "now",
    "limit": 20
  }
}
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify API key is correct
   - Check if API key has necessary permissions
   - Ensure API key is properly set in environment

2. **Connection Errors**
   - Verify SIGNOZ_API_URL is correct
   - Check network connectivity
   - Ensure Signoz instance is accessible

3. **Query Errors**
   - Validate query syntax
   - Check time range format
   - Ensure requested data exists

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG=signoz-mcp-server:* bun run src/server.ts
```

## Security Considerations

1. **API Key Storage**
   - Never commit API keys to version control
   - Use environment variables or secure key management
   - Rotate API keys regularly

2. **Network Security**
   - Use HTTPS for production Signoz instances
   - Consider VPN or private network access
   - Implement IP allowlisting if available

3. **Data Access**
   - Ensure API keys have minimum required permissions
   - Consider read-only access for MCP server
   - Audit access logs regularly