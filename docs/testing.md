# Testing the Signoz MCP Server

## Quick Start Test

Run the basic test to verify the server starts:
```bash
bun run test-server.ts
```

## Using MCP Inspector

The MCP Inspector provides an interactive UI to test your server:

```bash
npx @modelcontextprotocol/inspector bun run src/server.ts
```

This will open a web interface where you can:
1. See available tools
2. Execute tool calls
3. View responses

## Example Queries to Test

### 1. Simple Logs Query
Test with a basic query to find all logs:
```json
{
  "tool": "query_logs",
  "arguments": {
    "query": "",
    "start": "now-15m",
    "end": "now",
    "limit": 10
  }
}
```

### 2. Error Logs Query
Find error-level logs:
```json
{
  "tool": "query_logs", 
  "arguments": {
    "query": "level=error",
    "start": "now-1h",
    "end": "now",
    "limit": 20
  }
}
```

### 3. Basic Metrics Query
Get CPU usage metrics:
```json
{
  "tool": "query_metrics",
  "arguments": {
    "query": "system_cpu_usage",
    "start": "now-30m",
    "end": "now",
    "step": "1m"
  }
}
```

### 4. HTTP Request Rate
Calculate request rate:
```json
{
  "tool": "query_metrics",
  "arguments": {
    "query": "rate(http_server_requests_total[5m])",
    "start": "now-1h", 
    "end": "now",
    "step": "5m"
  }
}
```

## Debugging Tips

1. **Check Server Logs**: The server logs to stderr, so you'll see debug information in the console
2. **Verify API Key**: Make sure your `.env` file has the correct API key
3. **Check Base URL**: Ensure the Signoz instance is accessible at the configured URL
4. **Test API Directly**: You can test the Signoz API directly with curl:

```bash
curl -X POST http://localhost:8081/api/v4/query_range \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "start": 1234567890000000,
    "end": 1234567900000000,
    "query": "test"
  }'
```

## Common Issues

### Authentication Error
- Verify the API key is correct
- Check if the API key has the necessary permissions
- Ensure the Authorization header format is correct

### Connection Error
- Verify Signoz is running and accessible
- Check if port forwarding is set up correctly
- Try accessing Signoz UI in browser first

### Query Syntax Error
- Start with simple queries first
- Check Signoz documentation for query syntax
- Use the Signoz UI to test queries first