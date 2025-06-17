# SigNoz MCP Server Usage Examples

This document provides comprehensive examples of using the SigNoz MCP server with the new minimal formatting approach.

## Quick Start

The SigNoz MCP server now provides clean, readable output by default while maintaining full flexibility for detailed analysis when needed.

## Output Format Overview

### Default Compact Mode (Recommended)

**What you get:**
- Clean `[timestamp] [level] [service-context]` format
- Only the log message - no attribute noise
- Smart service context that shows the most relevant service identifier

**Example:**
```
[2025-06-17T22:26:42.545Z] [INFO] [default/stio-api]
Set variable $GridPower value as 1.3377999999999999.

[2025-06-17T22:26:41.823Z] [ERROR] [api-gateway]
Database connection timeout after 30s

[2025-06-17T22:26:40.156Z] [WARN] [production/user-service]
Rate limit approaching: 450/500 requests
```

### Smart Service Context

The server intelligently chooses the best service identifier:

- **Has `service.name`**: Shows `[my-service]`
- **Kubernetes without service.name**: Shows `[namespace/deployment]`
- **No context available**: Shows `[unknown]`

### Verbose Mode (Full Details)

When you need debugging details, use `verbose: true`:

```
[2025-06-17T22:26:42.545Z] [INFO] [default/stio-api]
Set variable $GridPower value as 1.3377999999999999.
Attributes: http.request.id=abc-123 labels.module=rule trace.id=xyz-789 k8s.pod.name=stio-api-12345

[2025-06-17T22:26:41.823Z] [ERROR] [api-gateway]
Database connection timeout after 30s
Attributes: error.type=timeout database.name=users http.status=500 trace.id=def-456
```

### Custom Attribute Selection

Include only specific attributes you care about:

```
# Request: include_attributes: ["http.request.id", "trace.id"]

[2025-06-17T22:26:42.545Z] [INFO] [default/stio-api]
Set variable $GridPower value as 1.3377999999999999.
Attributes: http.request.id=abc-123 trace.id=xyz-789

[2025-06-17T22:26:41.823Z] [ERROR] [api-gateway]
Database connection timeout after 30s
Attributes: trace.id=def-456
```

## Common Usage Patterns

### 1. Quick Service Health Check

**Goal:** See what's happening with a specific service

```bash
# Compact view for overview
query: "k8s.deployment.name=api-gateway"
start: "now-15m"
```

**Output:**
```
[2025-06-17T22:26:42Z] [INFO] [production/api-gateway]
HTTP 200 GET /health

[2025-06-17T22:26:40Z] [INFO] [production/api-gateway]
Processing user login request

[2025-06-17T22:26:38Z] [WARN] [production/api-gateway]
Response time above threshold: 1.2s
```

### 2. Error Investigation

**Goal:** Find and analyze error details

```bash
# Start with compact view to identify patterns
query: "level=error AND service=user-api"
start: "now-1h"
```

**Follow up with trace IDs for debugging:**
```bash
# Include trace IDs for correlation
query: "level=error AND service=user-api"
start: "now-1h"
include_attributes: ["trace.id", "error.type", "http.status"]
```

**Output:**
```
[2025-06-17T22:15:33Z] [ERROR] [user-api]
Failed to validate JWT token
Attributes: trace.id=trace-123 error.type=auth_failure http.status=401

[2025-06-17T22:12:15Z] [ERROR] [user-api]
Database query timeout
Attributes: trace.id=trace-456 error.type=timeout http.status=500
```

### 3. Performance Analysis

**Goal:** Monitor response times and resource usage

```bash
# Look for performance warnings
query: "body~timeout OR body~slow OR body~latency"
start: "now-30m"
include_attributes: ["http.response_time", "database.query_time"]
```

### 4. Full Debug Session

**Goal:** Deep dive into service behavior

```bash
# Verbose mode for complete context
query: "k8s.deployment.name=payment-service AND level=debug"
start: "now-10m"
verbose: true
```

## Before vs After Comparison

### BEFORE (Old Verbose Output)
The old default output was overwhelming and hard to scan:

```
=== Log Entry 1 ===
Timestamp: 2025-06-17T22:26:42.545806091Z
Body: Set variable $GridPower value as 1.3377999999999999.
Attributes:
  level: INFO
  service.name: stio-api
  k8s.deployment.name: stio-api
  k8s.namespace.name: default
  k8s.pod.name: stio-api-7b8c9d5f6g-h4j2k
  k8s.container.name: app
  k8s.node.name: worker-node-01
  k8s.node.uid: 12345678-abcd-efgh-ijkl-123456789012
  log.file.path: /var/log/app.log
  log.iostream: stdout
  signoz.component: log-parser
  host.name: worker-node-01.cluster.local
  http.request.id: abc-123
  labels.module: rule
  trace.id: xyz-789
  span.id: span-456
  ... (20+ more attributes)

=== Log Entry 2 ===
[Similar verbose output continues...]
```

**Problems:**
- 44K+ tokens for 100 entries (exceeded limits)
- Hard to find actual log messages
- Too much irrelevant metadata
- Poor scanning experience

### AFTER (New Minimal Output)
The new default output is clean and focused:

```
[2025-06-17T22:26:42.545Z] [INFO] [default/stio-api]
Set variable $GridPower value as 1.3377999999999999.

[2025-06-17T22:26:41.823Z] [ERROR] [api-gateway]
Database connection timeout after 30s

[2025-06-17T22:26:40.156Z] [DEBUG] [production/user-service]
Processing payment validation for user 12345
```

**Improvements:**
- Dramatically reduced token usage
- Easy to scan and understand
- Essential information highlighted
- Full details available when needed

## Advanced Usage

### Filtering Strategies

**Level-based filtering:**
```bash
# Quick error scan
level: "error"
start: "now-1h"

# Combine with service filtering
query: "service=payment-api"
level: "warn"
```

**Content-based filtering:**
```bash
# Search in log messages
query: "body~database AND body~error"

# Combine multiple conditions
query: "k8s.namespace=production AND body~timeout"
level: "error"
```

### Attribute Selection Strategies

**For correlation analysis:**
```bash
include_attributes: ["trace.id", "span.id", "http.request.id"]
```

**For performance monitoring:**
```bash
include_attributes: ["http.response_time", "database.query_time", "memory.usage"]
```

**For security analysis:**
```bash
include_attributes: ["user.id", "http.method", "http.status", "source.ip"]
```

### Time Range Examples

**Recent activity:**
```bash
start: "now-15m"  # Last 15 minutes
start: "now-1h"   # Last hour
start: "now-24h"  # Last day
```

**Specific time windows:**
```bash
start: "2025-06-17T20:00:00Z"
end: "2025-06-17T21:00:00Z"
```

## Best Practices

### 1. Start with Compact, Drill Down

```bash
# 1. Overview with compact mode
query: "service=my-api"
start: "now-1h"

# 2. If issues found, add trace context
query: "service=my-api AND level=error"
include_attributes: ["trace.id", "error.type"]

# 3. For deep debugging, use verbose
query: "service=my-api AND trace.id=specific-trace"
verbose: true
```

### 2. Use Level Filtering Effectively

```bash
# Production monitoring
level: "error"  # Only critical issues

# Development debugging
level: "debug"  # Detailed execution flow

# General monitoring
level: "warn"   # Potential issues
```

### 3. Combine Filters for Precision

```bash
# Specific service errors in production
query: "k8s.namespace=production AND service=user-api"
level: "error"
include_attributes: ["http.status", "error.type"]
```

### 4. Performance Considerations

- **Default compact mode**: Use for large time ranges and general monitoring
- **Attribute selection**: Include only needed attributes to reduce token usage
- **Verbose mode**: Use sparingly for detailed debugging sessions
- **Time ranges**: Start narrow and expand if needed

## Common Queries

### Service Health
```bash
# Service overview
query: "service=api-gateway"
start: "now-30m"

# Error rate check
query: "service=api-gateway"
level: "error"
start: "now-1h"
```

### Kubernetes Troubleshooting
```bash
# Deployment issues
query: "k8s.deployment.name=my-app"
level: "error"

# Namespace problems
query: "k8s.namespace=production"
level: "warn"

# Pod-specific debugging
query: "k8s.pod.name~my-app-12345"
verbose: true
```

### Application Debugging
```bash
# Database issues
query: "body~database AND (body~error OR body~timeout)"
include_attributes: ["database.name", "query.duration"]

# Authentication problems
query: "body~auth OR body~token OR body~login"
level: "error"
include_attributes: ["user.id", "http.status"]

# Performance issues
query: "body~slow OR body~timeout OR body~latency"
include_attributes: ["response.time", "memory.usage"]
```

This new formatting approach transforms the SigNoz MCP server from a verbose debugging tool into a powerful, readable monitoring solution that adapts to your needs.