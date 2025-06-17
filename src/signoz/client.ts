// HTTP client for SigNoz API communication

import { SignozConfig, QueryRangeRequest, ConnectionResult } from './types.js';

export class SignozClient {
  private config: SignozConfig;

  constructor(config: SignozConfig) {
    this.config = config;
  }

  /**
   * Execute query_range request against SigNoz API
   */
  async queryRange(request: QueryRangeRequest): Promise<any> {
    return this.makeRequest('/api/v4/query_range', request);
  }

  /**
   * Test connection to SigNoz server with detailed results
   */
  async testConnection(): Promise<ConnectionResult> {
    try {
      const startTime = Date.now();
      const response = await fetch(`${this.config.baseUrl}/api/v1/rules`, {
        method: 'GET',
        headers: {
          'SIGNOZ-API-KEY': this.config.apiKey,
        },
      });
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (response.ok) {
        const data = await response.json();
        const ruleCount = data?.data?.rules?.length || 0;
        
        return {
          success: true,
          responseTime,
          serverInfo: {
            status: `${response.status} ${response.statusText}`,
            ruleCount,
            baseUrl: this.config.baseUrl
          }
        };
      } else {
        const errorText = await response.text();
        return {
          success: false,
          responseTime,
          error: `${response.status} ${response.statusText}: ${errorText}`
        };
      }
    } catch (error: any) {
      return {
        success: false,
        responseTime: 0,
        error: error.message
      };
    }
  }

  /**
   * Simple connectivity check (returns boolean)
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/rules`, {
        method: 'GET',
        headers: {
          'SIGNOZ-API-KEY': this.config.apiKey,
        },
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Make HTTP request to SigNoz API
   */
  private async makeRequest(endpoint: string, data: any): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    try {
      console.error(`Making request to: ${url}`);
      console.error(`Headers: SIGNOZ-API-KEY: ${this.config.apiKey.substring(0, 10)}...`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'SIGNOZ-API-KEY': this.config.apiKey,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Response headers:`, response.headers);
        throw new Error(`Signoz API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Signoz API request failed:', error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): SignozConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SignozConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}