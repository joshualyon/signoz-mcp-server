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
   * - "now-1h", "now-30m" (relative to now)
   * - "30m", "1h" (ago from now) 
   * - ISO timestamps
   * - Unix timestamps
   */
  static parseTimeParam(time?: string): number {
    if (!time) {
      return Date.now();
    }
    
    // Handle relative time like "now-1h"
    if (time.startsWith("now")) {
      const match = time.match(/now-(\d+)([smhd])/);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2];
        const multiplier = this.TIME_MULTIPLIERS[unit];
        if (multiplier) {
          return Date.now() - (value * multiplier);
        }
      }
      return Date.now();
    }

    // Handle simple relative time like "30m", "1h" (means "30m ago")
    const simpleMatch = time.match(/^(\d+)([smhd])$/);
    if (simpleMatch) {
      const value = parseInt(simpleMatch[1]);
      const unit = simpleMatch[2];
      const multiplier = this.TIME_MULTIPLIERS[unit];
      if (multiplier) {
        return Date.now() - (value * multiplier);
      }
    }
    
    // Handle ISO date or Unix timestamp
    const parsed = Date.parse(time);
    return isNaN(parsed) ? Date.now() : parsed;
  }

  /**
   * Format timestamp value to ISO string
   * Handles various timestamp formats from SigNoz
   */
  static formatTimestamp(timestampValue: any): string {
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
        throw new Error(`Invalid time range: start (${start}) must be before end (${end})`);
      }
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