/**
 * Parameters for requesting a breakdown of analytics data from Plausible
 */
export interface PlausibleBreakdownParams {
  /** The domain of the site to fetch statistics for (e.g. "example.com") */
  site_id: string;
  /** Time period for the stats (e.g. "day", "7d", "30d", "month", "6mo", "12mo") */
  period?: string;
  /** Specific date for the stats in YYYY-MM-DD format */
  date?: string;
  /** Metric to break down by (e.g. "event:page", "visit:source", "visit:country") */
  property: string;
  /** Maximum number of results to return */
  limit?: number;
  /** Page number for paginated results */
  page?: number;
  /** Filter the results (e.g. "visit:source==Google") */
  filters?: string;
  /** Compare results with a previous time period */
  compare?: string;
}

/**
 * Response structure for a breakdown request from Plausible
 */
export interface PlausibleBreakdownResult {
  /** Array of results, where each result contains metric-specific key-value pairs */
  results: Array<{
    [key: string]: string | number;
  }>;
  /** Pagination information if the results span multiple pages */
  pagination?: {
    /** Current page number */
    page: number;
    /** Total number of available pages */
    total_pages: number;
  };
}

/**
 * Configuration options for initializing a Plausible API client
 */
export interface PlausibleClientConfig {
  /** Plausible API key for authentication */
  apiKey: string;
  /** Optional custom API base URL (defaults to https://plausible.io/api/v1) */
  baseUrl?: string;
}
