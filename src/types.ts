export interface PlausibleBreakdownParams {
  site_id: string;
  period?: string;
  date?: string;
  property: string;
  limit?: number;
  page?: number;
  filters?: string;
  compare?: string;
}

export interface PlausibleBreakdownResult {
  results: Array<{
    [key: string]: string | number;
  }>;
  pagination?: {
    page: number;
    total_pages: number;
  };
}

export interface PlausibleClientConfig {
  apiKey: string;
  baseUrl?: string;
}