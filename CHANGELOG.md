# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

# 1.0.0 (2025-06-19)


### Bug Fixes

* change release workflow trigger from pull_request to push ([c022da8](https://github.com/joshualyon/signoz-mcp-server/commit/c022da88755f72cc8ded15ab2d21baf95efed93e))
* correct aggregation examples in discover_metric_attributes ([9f270f3](https://github.com/joshualyon/signoz-mcp-server/commit/9f270f399ad291298fcfae2847023155ade6441a))
* correct query builder to handle body~ syntax properly ([fe16712](https://github.com/joshualyon/signoz-mcp-server/commit/fe16712a16b093c6c13be4a2c55b8b61319ee132))
* correct repository URL in package.json ([dc922fa](https://github.com/joshualyon/signoz-mcp-server/commit/dc922fa79cd4d87d420df7f90de543ba8f378613))
* resolve TypeScript compilation errors and improve type safety ([ee8721c](https://github.com/joshualyon/signoz-mcp-server/commit/ee8721ce0086918721e67eed0a48fe19033e4d79))


### Code Refactoring

* rename SIGNOZ_BASE_URL to SIGNOZ_API_URL for consistency ([7a38f65](https://github.com/joshualyon/signoz-mcp-server/commit/7a38f65911ea01b6dedb9cc18158a48233d68986))


### Features

* implement automated release system with cross-platform binary builds ([6675b2c](https://github.com/joshualyon/signoz-mcp-server/commit/6675b2c0e388c66bf84d65a9609b9f7cc85a45ce))
* implement comprehensive Zod-based type system with enhanced output format ([39c7298](https://github.com/joshualyon/signoz-mcp-server/commit/39c72983a02ded0d863c951dcaf5825c345c469a))
* redesign discover_metrics with pagination and enhanced validation ([5a983ce](https://github.com/joshualyon/signoz-mcp-server/commit/5a983cef707127e9948b94c21a3d5d9c80eac3c8))
* redesign metrics output format for machine readability and information density ([386e524](https://github.com/joshualyon/signoz-mcp-server/commit/386e524fcae0bdb5e8dc7213a0d8e421a5d8767c))


### BREAKING CHANGES

* Environment variable SIGNOZ_BASE_URL has been renamed
to SIGNOZ_API_URL to match the naming pattern of SIGNOZ_API_KEY.

Updated all references across:
- Source code and configuration
- Test files and documentation
- Example files and setup guides

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>

## [Unreleased]

### Added
- Complete automated release system with semantic versioning
- Cross-platform binary builds for all major platforms (macOS, Linux, Windows)
- Unified build script with flexible platform targeting
- Comprehensive development documentation and contributing guidelines
- Enhanced error handling for discover_metric_attributes with better validation
- Offset parameter support for discover_metrics tool - enables pagination through large metric lists

### Changed
- Improved type safety with proper import type statements
- Enhanced build system with better error handling and validation
- Updated documentation to reflect new release processes
- Redesigned discover_metrics output format to use information-dense markdown tables
- Updated discover_metrics to show ALL metrics (up to limit) instead of filtering to top 15 by activity
- Replaced verbose categorization with compact table format optimized for LLM consumption
- Increased default discover_metrics limit from 50 to 200 metrics
- Updated all example queries in metrics discovery to use standardized filter syntax instead of PromQL
- **BREAKING**: Renamed environment variable from `SIGNOZ_BASE_URL` to `SIGNOZ_API_URL` for consistency with `SIGNOZ_API_KEY`

### Fixed
- Build system reliability and cross-platform compatibility
- Query builder to properly handle `body~value` contains syntax - fixed incorrect attribute mapping for column fields
- discover_metrics pagination clarity - now shows total count and proper range indicators
- discover_metric_attributes validation to handle missing/invalid metrics properly
- Time range validation in query_metrics and query_logs - now catches backwards time ranges with helpful error messages
- Empty data series handling in metrics responses - provides clear diagnostics when queries return no data
- Timestamp unit validation warnings for potential seconds vs milliseconds confusion
- TypeScript compilation errors in production and test files - fixed type mismatches and added proper optional chaining
- LogEntry schema to accept both string and numeric timestamps matching actual API behavior
- Test data to include all required properties (lastReceived, proper type literals)

- Validation for query_metrics to handle empty metrics arrays gracefully
