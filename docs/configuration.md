# Signoz MCP Server Configuration

## Environment Variables

### Required
- `SIGNOZ_API_KEY`: Your Signoz API key
- `SIGNOZ_API_URL`: Base URL of your Signoz instance (default: `http://localhost:8080`)

### Optional
- `SIGNOZ_TIMEOUT`: API request timeout in milliseconds (default: 30000)
- `SIGNOZ_MAX_RETRIES`: Maximum number of retry attempts (default: 3)
- `CACHE_TTL`: Cache time-to-live in seconds (default: 300)

## Claude Integration

### Claude Code (CLI)

Claude Code offers flexible MCP server configuration with different scopes and methods:

#### Method 1: Project Configuration File (`.mcp.json`)

Create a `.mcp.json` file in your project root:

```json
{
  "mcpServers": {
    "signoz": {
      "type": "stdio",
      "command": "/path/to/signoz-mcp-server-binary",
      "env": {
        "SIGNOZ_API_KEY": "your-api-key-here",
        "SIGNOZ_API_URL": "https://your-signoz-instance.com"
      }
    }
  }
}
```

Or if running from source:
```json
{
  "mcpServers": {
    "signoz": {
      "type": "stdio",
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

**Important**: After creating/modifying `.mcp.json`:
1. Exit Claude Code: `/exit`
2. Restart in the same directory: `claude -c`
3. Verify the server is loaded: `/mcp`

> [!TIP]
> Using `claude -c` will continue your previous Claude Code session, so you won't lose any progress and can continue your existing conversation where you left off.

#### Method 2: Claude CLI Commands

```bash
# Add server with binary (project scope - shared via .mcp.json)
claude mcp add signoz -s project \
  -e SIGNOZ_API_KEY=your-key \
  -e SIGNOZ_API_URL=https://your-instance.com \
  -- /path/to/signoz-mcp-server-binary

# Add server from source (project scope)
claude mcp add signoz -s project \
  -e SIGNOZ_API_KEY=your-key \
  -e SIGNOZ_API_URL=https://your-instance.com \
  -- bun run /path/to/signoz-mcp-server/src/server.ts

# Add server with user scope (available across all projects)
claude mcp add signoz --scope user \
  -e SIGNOZ_API_KEY=your-key \
  -e SIGNOZ_API_URL=https://your-instance.com \
  -- /path/to/signoz-mcp-server-binary

# List all configured servers
claude mcp list

# View specific server configuration
claude mcp get signoz

# Remove server
claude mcp remove signoz
```

**Scope Options:**
- `--scope local` (default): Available only in current project
  - Stored in `~/.claude.json` under `projects["/path/to/project"]["mcpServers"]`
- `--scope project`: Shared with team via `.mcp.json` file in project root
- `--scope user`: Available across all your projects
  - Stored in `~/.claude.json` under `mcpServers`

> [!NOTE]
> Local scope configurations are stored in `~/.claude.json` under:
> ```json
> {
>   "projects": {
>     "/path/to/project": {
>       "mcpServers": {
>         // your server config here
>       }
>     }
>   }
> }
> ```

### Claude Desktop App

Add the following to your Claude Desktop configuration file:

#### macOS/Linux
Location: `~/Library/Application Support/Claude/claude_desktop_config.json`

#### Windows
Location: `%APPDATA%\Claude\claude_desktop_config.json`

> [!IMPORTANT]
> **macOS Users**: If using downloaded binaries, you'll need to remove the Gatekeeper quarantine flag:
> ```bash
> xattr -d com.apple.quarantine /path/to/signoz-mcp-darwin-*
> ```
> Alternatively, run from source using Bun or build the binary locally.

#### Configuration
```json
{
  "mcpServers": {
    "signoz": {
      "type": "stdio",
      "command": "/path/to/signoz-mcp-server-binary",
      "env": {
        "SIGNOZ_API_KEY": "your-api-key-here",
        "SIGNOZ_API_URL": "https://your-signoz-instance.com"
      }
    }
  }
}
```

Or if running from source:
```json
{
  "mcpServers": {
    "signoz": {
      "type": "stdio",
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