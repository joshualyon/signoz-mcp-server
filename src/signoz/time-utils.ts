// Time parsing and manipulation utilities

export class TimeUtils {
  private static readonly TIME_MULTIPLIERS: Record<string, number> = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000,
  };

  /**
   * Parse time parameter into milliseconds timestamp
   * Supports formats:
   * - "now-1h", "now-30m" (legacy format, still supported)
   * - "30m", "1h" (preferred format, means "ago from now") 
   * - ISO timestamps
   * - Unix timestamps
   */
  static parseTimeParam(time?: string | number): number {
    if (!time) {
      return Date.now();
    }
    
    // Handle numeric input (assumed to be milliseconds timestamp)
    if (typeof time === 'number') {
      return time;
    }
    
    // Strip "now-" prefix for backward compatibility, then handle as simple relative time
    let timeInput = time;
    if (time.startsWith("now-")) {
      timeInput = time.substring(4); // Remove "now-" prefix
    }

    // Handle relative time like "30m", "1h" (means "X ago from now")
    const relativeMatch = timeInput.match(/^(\d+)([smhd])$/);
    if (relativeMatch) {
      const value = parseInt(relativeMatch[1]);
      const unit = relativeMatch[2];
      const multiplier = this.TIME_MULTIPLIERS[unit];
      if (multiplier) {
        return Date.now() - (value * multiplier);
      }
    }
    
    // Handle pure numeric strings as millisecond timestamps
    if (/^\d+$/.test(time)) {
      return parseInt(time);
    }
    
    // Handle ISO date or other date formats
    const parsed = Date.parse(time);
    return isNaN(parsed) ? Date.now() : parsed;
  }

  /**
   * Format timestamp value to ISO string
   * Handles various timestamp formats from SigNoz
   */
  static formatTimestamp(timestampValue: any): string {
    if (!timestampValue) {
      return new Date().toISOString(); // Fallback to current time
    }
    
    if (typeof timestampValue === 'string') {
      return timestampValue;
    } else if (timestampValue > 1e15) {
      // Nanoseconds
      return new Date(parseInt(timestampValue) / 1000000).toISOString();
    } else {
      // Milliseconds
      return new Date(parseInt(timestampValue)).toISOString();
    }
  }

  /**
   * Validate time range logic
   */
  static validateTimeRange(start?: string, end?: string): void {
    if (start && end) {
      const startMs = this.parseTimeParam(start);
      const endMs = this.parseTimeParam(end);
      
      if (startMs >= endMs) {
        if (start === end) {
          throw new Error(`Invalid time range: start and end are the same (${start})`);
        } else {
          throw new Error(`Invalid time range: start (${start}) must be before end (${end})`);
        }
      }
      
      // Check for potential unit confusion (seconds vs milliseconds)
      this.warnAboutTimestampUnits(startMs, endMs, start, end);
    }
  }
  
  /**
   * Warn about potential timestamp unit confusion
   */
  private static warnAboutTimestampUnits(startMs: number, endMs: number, startStr: string, endStr: string): void {
    const now = Date.now();
    const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
    const oneYearFromNow = now + (365 * 24 * 60 * 60 * 1000);
    
    // Check if timestamps are suspiciously old (might be Unix seconds instead of milliseconds)
    if (startMs < oneYearAgo || endMs < oneYearAgo) {
      // Could be Unix seconds timestamp
      const startAsSeconds = startMs * 1000;
      const endAsSeconds = endMs * 1000;
      
      if (startAsSeconds > oneYearAgo && startAsSeconds < oneYearFromNow) {
        console.warn(`⚠️  Warning: Timestamp ${startStr} (${new Date(startMs).toISOString()}) appears to be very old.
If you meant to use a Unix timestamp in seconds, multiply by 1000 or use a different format.`);
      }
    }
    
    // Check if timestamps are suspiciously far in the future
    if (startMs > oneYearFromNow || endMs > oneYearFromNow) {
      console.warn(`⚠️  Warning: Timestamp appears to be far in the future: ${new Date(Math.max(startMs, endMs)).toISOString()}`);
    }
  }

  /**
   * Parse step parameter for metrics queries
   */
  static parseStepParam(step: string): number {
    const stepMatch = step.match(/(\d+)([smhd])/);
    let stepSeconds = 60; // default 1 minute
    
    if (stepMatch) {
      const value = parseInt(stepMatch[1]);
      const unit = stepMatch[2];
      const multipliers: Record<string, number> = {
        's': 1,
        'm': 60,
        'h': 3600,
        'd': 86400,
      };
      stepSeconds = value * multipliers[unit];
    }
    
    return stepSeconds;
  }
}