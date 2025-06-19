- If we edit the Signoz MCP server, the user must exit and restart Claude Code before we will see the changes take effect in Signoz MCP tool calling (eg. `/exit` `claude -c`)
- Make sure to run the full vitest test suite after making code changes when you think all your related changes are done and the code is ready for testing
- Use bun (and related bunx, etc) instead of node and npm
- This is an MCP server which is consumed by AI + LLMs to so you MUST prioritize Information density (pack more data in fewer tokens), Machine readability (structured format like markdown or CSV), Complete data (show ALL requested data, not a subset)

## Changelog Management
- Always update CHANGELOG.md [Unreleased] section when making significant changes
- Use Keep a Changelog format with Added/Changed/Deprecated/Removed/Fixed/Security sections
- Write user-facing descriptions that focus on impact, not technical implementation details
- Semantic-release will automatically move [Unreleased] content to versioned sections on release
- Example: "Add cross-platform binary builds" not "feat: implement bun build --compile targets"

## Type System and API Compatibility
- LogEntry timestamps can be either string or number (nanoseconds) - the API returns both formats
- Use optional chaining (?.) in tests to match OpenAPI spec where fields are genuinely optional
- Builder queries in CompositeQuery are optional - different query types use different structures
- Always check the OpenAPI spec (/docs/signoz_openapi.yaml) when in doubt about types
- TimeUtils.formatTimestamp handles multiple timestamp formats automatically
- Column fields like 'body' and 'timestamp' must have empty type string ("") not "tag" or "resource" to prevent incorrect SQL generation

## Testing Best Practices
- Use optional chaining in tests to ensure we test against API contract, not implementation
- Test data should include all required properties (e.g., lastReceived for metrics)
- MetricInfo type expects "Sum" | "Gauge" | "Histogram" | "Summary", not "Counter"
- When tests fail with "possibly undefined", add optional chaining rather than non-null assertions