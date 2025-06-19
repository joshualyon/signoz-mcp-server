# SignozApi Module Refactoring Plan

## Overview
Extract SigNoz API functionality from the monolithic `server.ts` into a modular structure to enable better testing, maintainability, and future enhancements.

## Current Structure (Pre-Refactor)
```
src/
└── server.ts (1,000+ lines)
    ├── SignozMCPServer class
    ├── MCP tool handlers
    ├── SigNoz API client logic
    ├── Query building
    ├── Response formatting
    └── Time parsing utilities
```

## Target Structure (Post-Refactor)
```
src/
├── server.ts                 # MCP server logic only (~400 lines)
├── signoz/
│   ├── index.ts             # Main exports for SignozApi
│   ├── client.ts            # HTTP client & configuration
│   ├── query-builder.ts     # Query construction logic
│   ├── formatters.ts        # Response formatting
│   ├── time-utils.ts        # Time parsing utilities
│   └── types.ts             # TypeScript type definitions
└── test/
    ├── signoz-api-test.ts   # Direct API testing
    └── integration-test.ts  # End-to-end tests
```

## Detailed Module Breakdown

### 1. `src/signoz/types.ts`
**Purpose:** TypeScript interfaces and types for SigNoz API
```typescript
export interface SignozConfig {
  apiKey: string;
  baseUrl: string;
}

export interface LogQueryParams {
  query?: string;
  start?: string;
  end?: string;
  limit?: number;
  verbose?: boolean;
  include_attributes?: string[];
  exclude_attributes?: string[];
  level?: LogLevel;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LogEntry {
  timestamp: string;
  level: string;
  service: string;
  body: string;
  attributes?: Record<string, string>;
  resources?: Record<string, string>;
}

export interface QueryRangeRequest {
  start: number;
  end: number;
  step?: number;
  compositeQuery: any;
}
```

### 2. `src/signoz/time-utils.ts`
**Purpose:** Time parsing and manipulation utilities
**Extracted from:** `parseTimeParam()` method

```typescript
export class TimeUtils {
  static parseTimeParam(time?: string): number
  static formatTimestamp(timestamp: any): string
  static validateTimeRange(start?: string, end?: string): void
}
```

**Key Functions:**
- Parse relative time formats: `"now-1h"`, `"30m"`, `"2d"`
- Handle ISO timestamps and Unix timestamps  
- Convert between different time formats
- Validate time range logic

### 3. `src/signoz/query-builder.ts`
**Purpose:** Build SigNoz API queries from simplified syntax
**Extracted from:** `buildLogsCompositeQuery()` method

```typescript
export class QueryBuilder {
  static buildLogsQuery(params: LogQueryParams): QueryRangeRequest
  static buildMetricsQuery(params: MetricsQueryParams): QueryRangeRequest
  static buildTracesQuery(params: TracesQueryParams): QueryRangeRequest
  
  private static parseFilters(filterString: string): Filter[]
  private static determineAttributeType(key: string): 'tag' | 'resource'
}
```

**Key Functions:**
- Parse filter syntax: `key=value`, `key~value`, `key!=value`
- Build composite query structures for SigNoz API
- Handle different data sources (logs, metrics, traces)
- Validate query parameters

### 4. `src/signoz/formatters.ts`
**Purpose:** Format API responses for display
**Extracted from:** Response formatting logic in `queryLogs()`

```typescript
export class ResponseFormatter {
  static formatLogEntries(logs: any[], options: FormattingOptions): string
  static formatMetricsResponse(metrics: any[]): string
  static formatTracesResponse(traces: any[]): string
  
  private static shouldIncludeAttribute(key: string, options: FormattingOptions): boolean
  private static formatCompactLog(entry: LogEntry): string
  private static formatVerboseLog(entry: LogEntry): string
}

interface FormattingOptions {
  verbose?: boolean;
  include_attributes?: string[];
  exclude_attributes?: string[];
}
```

**Key Functions:**
- Format log entries with configurable verbosity
- Filter attributes based on include/exclude lists
- Create compact vs detailed output formats
- Handle different response types consistently

### 5. `src/signoz/client.ts`
**Purpose:** HTTP client for SigNoz API communication
**Extracted from:** `makeSignozRequest()`, `checkConnectivity()`, `testConnection()`

```typescript
export class SignozClient {
  constructor(config: SignozConfig)
  
  async queryRange(request: QueryRangeRequest): Promise<any>
  async testConnection(): Promise<ConnectionResult>
  async checkConnectivity(): Promise<boolean>
  
  private async makeRequest(endpoint: string, data: any): Promise<any>
}

export interface ConnectionResult {
  success: boolean;
  responseTime: number;
  serverInfo?: any;
  error?: string;
}
```

**Key Functions:**
- Handle HTTP requests to SigNoz API
- Manage authentication with API keys
- Provide connection testing utilities
- Handle error cases and retries

### 6. `src/signoz/index.ts`
**Purpose:** Main API facade and convenience exports
```typescript
export class SignozApi {
  constructor(config: SignozConfig)
  
  async queryLogs(params: LogQueryParams): Promise<string>
  async queryMetrics(params: MetricsQueryParams): Promise<string> 
  async queryTraces(params: TracesQueryParams): Promise<string>
  async discoverLogAttributes(params: DiscoveryParams): Promise<string>
  async testConnection(): Promise<ConnectionResult>
}

// Re-export everything for convenience
export * from './types.js';
export * from './client.js';
export * from './query-builder.js';
export * from './formatters.js';
export * from './time-utils.js';
```

### 7. `src/server.ts` (Refactored)
**Purpose:** MCP server logic only, using SignozApi
```typescript
import { SignozApi, SignozConfig, LogQueryParams } from './signoz/index.js';

class SignozMCPServer {
  private server: Server;
  private signozApi: SignozApi;
  
  constructor() {
    const config: SignozConfig = {
      apiKey: process.env.SIGNOZ_API_KEY || "",
      baseUrl: process.env.SIGNOZ_API_URL || "http://localhost:8080",
    };
    this.signozApi = new SignozApi(config);
  }
  
  private async queryLogs(args: any) {
    const params: LogQueryParams = {
      query: args.query,
      start: args.start,
      end: args.end,
      limit: args.limit || 100,
      verbose: args.verbose || false,
      level: args.level,
      include_attributes: args.include_attributes,
      exclude_attributes: args.exclude_attributes,
    };
    
    const result = await this.signozApi.queryLogs(params);
    return { content: [{ type: "text", text: result }] };
  }
}
```

## Migration Steps

### Phase 1: Extract Core Types
1. Create `src/signoz/types.ts` with all interfaces
2. Update imports in `server.ts` to use new types
3. Test that everything still compiles

### Phase 2: Extract Utilities
1. Create `src/signoz/time-utils.ts` 
2. Move `parseTimeParam()` logic
3. Update `server.ts` to use `TimeUtils.parseTimeParam()`
4. Test time parsing functionality

### Phase 3: Extract Query Builder
1. Create `src/signoz/query-builder.ts`
2. Move `buildLogsCompositeQuery()` logic
3. Update `server.ts` to use `QueryBuilder.buildLogsQuery()`
4. Test query building with existing queries

### Phase 4: Extract Response Formatter
1. Create `src/signoz/formatters.ts`
2. Move log formatting logic from `queryLogs()`
3. Update `server.ts` to use `ResponseFormatter.formatLogEntries()`
4. Test response formatting

### Phase 5: Extract HTTP Client
1. Create `src/signoz/client.ts`
2. Move `makeSignozRequest()`, `checkConnectivity()`, `testConnection()`
3. Update `server.ts` to use `SignozClient`
4. Test API communication

### Phase 6: Create Main API Facade
1. Create `src/signoz/index.ts` with `SignozApi` class
2. Combine all modules into cohesive API
3. Update `server.ts` to use `SignozApi` instead of individual modules
4. Test complete integration

### Phase 7: Create Test Infrastructure  
1. Create `src/test/signoz-api-test.ts` for unit tests
2. Create `src/test/integration-test.ts` for end-to-end tests
3. Add test scripts to `package.json`

## Benefits of This Structure

### 1. **Separation of Concerns**
- MCP server logic separate from SigNoz API logic
- Each module has a single responsibility
- Easier to understand and maintain

### 2. **Testability**
- Can unit test SigNoz API functionality independently
- Mock HTTP client for testing query builders
- Test formatters with known data structures

### 3. **Reusability**
- SignozApi module can be used outside of MCP context
- Other projects can import just the pieces they need
- Clear API boundaries

### 4. **Future Enhancement**
- Easy to add new endpoints (traces, alerts, etc.)
- Can implement caching at the client level
- Simple to add pagination, retry logic, etc.

### 5. **Maintainability**
- Smaller, focused files are easier to work with
- Clear interfaces between modules
- Type safety throughout the stack

## Risks and Mitigation

### 1. **Breaking Changes**
**Risk:** Refactoring might break existing functionality
**Mitigation:** 
- Git rollback point established
- Incremental migration with testing at each step
- Keep same public API until refactor complete

### 2. **Import Path Complexity**
**Risk:** Complex import paths between modules
**Mitigation:**
- Use `index.ts` barrel exports
- Clear module boundaries
- TypeScript path mapping if needed

### 3. **Circular Dependencies**
**Risk:** Modules might depend on each other
**Mitigation:**
- Careful dependency design (types → utils → client → api)
- Use dependency injection where needed
- Clear module hierarchy

## Success Criteria

- ✅ **All existing functionality works unchanged**
- ✅ **Tests pass for current MCP integration** 
- ✅ **New SignozApi module is independently testable**
- ✅ **Code is more maintainable and readable**
- ✅ **Future enhancements are easier to implement**

This refactoring sets up the foundation for implementing all the planned enhancements (verbose mode, level filtering, improved time syntax, pagination) in a clean, modular way.