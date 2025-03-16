import {
  PlausibleBreakdownParams,
  PlausibleBreakdownResult,
  PlausibleClientConfig,
} from "./types";

export class PlausibleClient {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor(config: PlausibleClientConfig) {
    this.baseUrl = config.baseUrl || "https://plausible.io/api/v1";
    this.headers = {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    };
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
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorData}`
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error making request:", error.message);
      } else {
        console.error("Error making request:", error);
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
