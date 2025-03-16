import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Utility to log API requests and responses when API_DEBUG is enabled
 */
export class ApiLogger {
  private service: string;
  private baseDir: string;
  private enabled: boolean;

  constructor(service: string) {
    this.service = service;
    this.baseDir = path.join(process.cwd(), 'api_log', service);
    this.enabled = process.env.API_DEBUG === '1' || process.env.API_DEBUG === 'true';
    
    // Create directory if it doesn't exist and logging is enabled
    if (this.enabled) {
      fs.mkdirSync(this.baseDir, { recursive: true });
      console.log(`🔍 API Debug logging enabled for ${service}`);
    }
  }

  /**
   * Log an API request and response
   */
  logApiCall(endpoint: string, params: any, response: any, error?: any): void {
    if (!this.enabled) return;

    try {
      // Create a unique hash for the request to avoid filename conflicts
      const hash = crypto.createHash('md5')
        .update(`${endpoint}-${JSON.stringify(params)}-${Date.now()}`)
        .digest('hex')
        .substring(0, 8);

      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `${timestamp}_${this.service}_${endpoint.replace(/\//g, '_')}_${hash}.json`;
      const filePath = path.join(this.baseDir, filename);

      const logData = {
        timestamp: new Date().toISOString(),
        service: this.service,
        endpoint,
        params,
        response: error ? null : response,
        error: error ? {
          message: error.message,
          stack: error.stack
        } : null,
        success: !error
      };

      fs.writeFileSync(filePath, JSON.stringify(logData, null, 2));
      console.log(`📝 API debug log written to: ${filePath}`);
    } catch (err) {
      console.error('Error writing API debug log:', err);
    }
  }
}