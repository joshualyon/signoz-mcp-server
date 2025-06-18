# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Complete automated release system with semantic versioning
- Cross-platform binary builds for all major platforms (macOS, Linux, Windows)
- Unified build script with flexible platform targeting
- Comprehensive development documentation and contributing guidelines
- Validation for query_metrics to handle empty metrics arrays gracefully
- Enhanced error handling for discover_metric_attributes with better validation
- Offset parameter support for discover_metrics tool - enables pagination through large metric lists

### Changed
- Improved type safety with proper import type statements
- Enhanced build system with better error handling and validation
- Updated documentation to reflect new release processes
- **BREAKING**: Completely redesigned discover_metrics output format to use information-dense markdown tables
- Updated discover_metrics to show ALL metrics (up to limit) instead of filtering to top 15 by activity
- Replaced verbose categorization with compact table format optimized for LLM consumption
- Increased default discover_metrics limit from 50 to 200 metrics
- Updated all example queries in metrics discovery to use standardized filter syntax instead of PromQL

### Fixed
- TypeScript verbatimModuleSyntax compliance issues
- Build system reliability and cross-platform compatibility
- discover_metrics pagination clarity - now shows total count and proper range indicators
- discover_metric_attributes validation to handle missing/invalid metrics properly