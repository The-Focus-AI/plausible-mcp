import {
  PlausibleBreakdownParams,
  PlausibleBreakdownResult,
  PlausibleClientConfig,
} from "./types/plausible";
import { ApiLogger } from "./utils/apiLogger";

export class PlausibleClient {
  private baseUrl: string;
  private headers: HeadersInit;
  private logger: ApiLogger;

  constructor(config: PlausibleClientConfig) {
    this.baseUrl = config.baseUrl || "https://plausible.io/api/v1";
    this.headers = {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    };
    this.logger = new ApiLogger('plausible');
  }

  private async request<T>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    try {
      const response = await fetch(url.toString(), {
        headers: this.headers,
      });

      if (!response.ok) {
        const errorData = await response.text();
        const error = new Error(
          `HTTP error! status: ${response.status}, message: ${errorData}`
        );
        
        // Log failed API call
        this.logger.logApiCall(endpoint, params, null, error);
        
        throw error;
      }

      const data = await response.json() as T;
      
      // Log successful API call
      this.logger.logApiCall(endpoint, params, data);
      
      return data;
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error making request:", error.message);
      } else {
        console.error("Error making request:", error);
        // Log unknown error format
        this.logger.logApiCall(endpoint, params, null, { message: "Unknown error" });
      }
      throw error;
    }
  }

  async getBreakdown(
    params: PlausibleBreakdownParams
  ): Promise<PlausibleBreakdownResult> {
    try {
      return await this.request<PlausibleBreakdownResult>(
        "/stats/breakdown",
        params
      );
    } catch (error) {
      console.error("Error fetching breakdown data:", error);
      throw error;
    }
  }

  async getAllBreakdownPages(
    params: PlausibleBreakdownParams
  ): Promise<Array<any>> {
    let allResults: Array<any> = [];
    let currentPage = 1;
    let totalPages = 1;

    try {
      do {
        const pageParams = { ...params, page: currentPage };
        const response = await this.getBreakdown(pageParams);

        allResults = [...allResults, ...response.results];

        if (response.pagination) {
          totalPages = response.pagination.total_pages;
          currentPage++;
        } else {
          break; // No pagination information, exit loop
        }
      } while (currentPage <= totalPages);

      return allResults;
    } catch (error) {
      console.error("Error fetching all breakdown pages:", error);
      throw error;
    }
  }

  async getSites(): Promise<Array<any>> {
    try {
      return await this.request<Array<any>>("/sites");
    } catch (error) {
      console.error("Error fetching sites:", error);
      throw error;
    }
  }
}
