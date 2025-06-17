# Signoz API Integration Guide

This guide provides a simplified overview of integrating with the Signoz API v4. For complete and authoritative API documentation, refer to:
- **[signoz-api-v4-reference.md](./signoz-api-v4-reference.md)** - Detailed API structure extracted from OpenAPI spec
- **[signoz_openapi.yaml](./signoz_openapi.yaml)** - Complete OpenAPI specification

## Key Concepts

### Authentication
All API requests require the `SIGNOZ-API-KEY` header:
```
Headers:
  SIGNOZ-API-KEY: <YOUR_API_KEY>
```

### Composite Query Structure
The v4 API uses a "composite query" structure that supports three query types:
1. **`builder`** - Recommended query builder for logs, traces, and metrics
2. **`promql`** - PromQL queries for metrics (uses Prometheus remote read)
3. **`clickhouse_sql`** - Raw SQL queries (use only when builder doesn't support your needs)

### Time Parameters
- Times are in **epoch milliseconds** (not nanoseconds!)
- The `step` parameter (in seconds) is required for all queries

## Simplified Query Format for MCP Tools

To make the API easier to use from AI tools, this MCP server provides simplified interfaces:

### Logs Query Tool
```
query: "k8s.deployment.name=stio-api AND level=error"
```

Supported operators:
- `=` (exact match)
- `~` (contains)
- `!=` (not equals)
- `>`, `<`, `>=`, `<=` (comparisons)

### Common Pitfalls

1. **Time Format**: The API expects milliseconds, not nanoseconds
2. **Required Fields**: `compositeQuery`, `queryType`, and `panelType` are all required
3. **Query Structure**: Use `builderQueries` (plural), not `builder`
4. **Filter Operators**: `=` maps to `in` operator in the API

## Examples

See [signoz-api-v4-reference.md](./signoz-api-v4-reference.md) for complete examples.

## Implementation Notes

The MCP server translates simple filter syntax into the complex composite query structure:
- Automatically determines attribute types (resource vs tag)
- Handles time conversions
- Formats responses for readability

For implementation details, see `src/server.ts`.