/**
 * TypeScript branded types for timestamp units to prevent confusion
 */

// Branded types for different timestamp units
export type MillisecondTimestamp = number & { readonly __brand: 'milliseconds' };
export type SecondTimestamp = number & { readonly __brand: 'seconds' };
export type MicrosecondTimestamp = number & { readonly __brand: 'microseconds' };
export type NanosecondTimestamp = number & { readonly __brand: 'nanoseconds' };

// Type guards and conversion utilities
export class TimestampUtils {
  
  /**
   * Create a branded millisecond timestamp
   */
  static toMilliseconds(value: number): MillisecondTimestamp {
    return value as MillisecondTimestamp;
  }
  
  /**
   * Create a branded second timestamp
   */
  static toSeconds(value: number): SecondTimestamp {
    return value as SecondTimestamp;
  }
  
  /**
   * Validate that a timestamp is in a reasonable range for current times
   */
  static isReasonableTimestamp(timestamp: number): boolean {
    const now = Date.now();
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
    const oneDayFuture = now + 24 * 60 * 60 * 1000;
    
    return timestamp >= oneYearAgo && timestamp <= oneDayFuture;
  }
  
  /**
   * Detect timestamp unit based on number of digits
   */
  static detectTimestampUnit(timestamp: number): 'seconds' | 'milliseconds' | 'microseconds' | 'nanoseconds' | 'unknown' {
    const digits = Math.abs(timestamp).toString().length;
    
    if (digits === 10) return 'seconds';
    if (digits === 13) return 'milliseconds';
    if (digits === 16) return 'microseconds';
    if (digits === 19) return 'nanoseconds';
    return 'unknown';
  }
  
  /**
   * Convert various timestamp units to milliseconds
   */
  static toMillisecondsFromUnit(timestamp: number, unit: 'seconds' | 'milliseconds' | 'microseconds' | 'nanoseconds'): MillisecondTimestamp {
    switch (unit) {
      case 'seconds':
        return this.toMilliseconds(timestamp * 1000);
      case 'milliseconds':
        return this.toMilliseconds(timestamp);
      case 'microseconds':
        return this.toMilliseconds(timestamp / 1000);
      case 'nanoseconds':
        return this.toMilliseconds(timestamp / 1000000);
      default:
        throw new Error(`Unknown timestamp unit: ${unit}`);
    }
  }
  
  /**
   * Auto-detect and convert to milliseconds
   */
  static autoConvertToMilliseconds(timestamp: number): MillisecondTimestamp {
    const unit = this.detectTimestampUnit(timestamp);
    
    if (unit === 'unknown') {
      // If we can't detect, assume milliseconds for current-era timestamps
      if (this.isReasonableTimestamp(timestamp)) {
        return this.toMilliseconds(timestamp);
      }
      throw new Error(`Cannot detect timestamp unit for value: ${timestamp}`);
    }
    
    return this.toMillisecondsFromUnit(timestamp, unit);
  }
  
  /**
   * Validate and format timestamp safely
   */
  static formatSafely(timestamp: number): string {
    try {
      const ms = this.autoConvertToMilliseconds(timestamp);
      const date = new Date(ms);
      
      if (isNaN(date.getTime())) {
        return `<invalid timestamp: ${timestamp}>`;
      }
      
      return date.toISOString();
    } catch (error) {
      return `<invalid timestamp: ${timestamp}>`;
    }
  }
}

// Validation constraints
export const TIMESTAMP_CONSTRAINTS = {
  // Reasonable timestamp ranges
  MIN_REASONABLE_MS: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
  MAX_REASONABLE_MS: Date.now() + 24 * 60 * 60 * 1000,       // 1 day future
  
  // Expected digit counts for different units
  EXPECTED_DIGITS: {
    seconds: 10,
    milliseconds: 13,
    microseconds: 16,
    nanoseconds: 19
  }
} as const;

// Type for time input that can be parsed
export type TimeInput = string | number | MillisecondTimestamp;

// Enhanced interface for functions that work with timestamps
export interface TimestampAware {
  start?: TimeInput;
  end?: TimeInput;
  step?: string | number;
}

/**
 * Runtime validation function for TypeScript interfaces
 */
export function validateTimestampParams(params: TimestampAware): void {
  if (params.start && typeof params.start === 'number') {
    if (!TimestampUtils.isReasonableTimestamp(params.start)) {
      console.warn(`Warning: start timestamp ${params.start} is outside reasonable range`);
    }
  }
  
  if (params.end && typeof params.end === 'number') {
    if (!TimestampUtils.isReasonableTimestamp(params.end)) {
      console.warn(`Warning: end timestamp ${params.end} is outside reasonable range`);
    }
  }
  
  if (params.start && params.end && 
      typeof params.start === 'number' && typeof params.end === 'number') {
    if (params.start > params.end) {
      throw new Error(`Invalid time range: start (${params.start}) is after end (${params.end})`);
    }
  }
}