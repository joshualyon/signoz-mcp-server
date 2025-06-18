- If we edit the Signoz MCP server, the user must exit and restart Claude Code before we will see the changes take effect in Signoz MCP tool calling (eg. `/exit` `claude -c`)
- Make sure to run the full vitest test suite after making code changes when you think all your related changes are done and the code is ready for testing
- Use bun (and related bunx, etc) instead of node and npm

## Changelog Management
- Always update CHANGELOG.md [Unreleased] section when making significant changes
- Use Keep a Changelog format with Added/Changed/Deprecated/Removed/Fixed/Security sections
- Write user-facing descriptions that focus on impact, not technical implementation details
- Semantic-release will automatically move [Unreleased] content to versioned sections on release
- Example: "Add cross-platform binary builds" not "feat: implement bun build --compile targets"