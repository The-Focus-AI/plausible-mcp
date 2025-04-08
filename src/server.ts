#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";
import { execSync } from "child_process";
import { TimeRange, Metric, processTimeRange, convertMetrics } from './types';

// Load environment variables
dotenv.config();

// Default API URL - Note we're using v2 now
const PLAUSIBLE_API_URL =
  process.env.PLAUSIBLE_API_URL || "https://plausible.io/api";

let apiKey: string | null = null;

// Get API key from 1Password if not in environment
async function getApiKey(): Promise<string> {
  if (apiKey) return apiKey;

  // Try from environment first
  if (process.env.PLAUSIBLE_API_KEY) {
    apiKey = process.env.PLAUSIBLE_API_KEY;
    return apiKey;
  }

  try {
    console.error(
      "PLAUSIBLE_API_KEY not found in environment, trying 1Password..."
    );
    const result = execSync(
      'op read "op://Development/plausible api/notesPlain"',
      { encoding: "utf8" }
    );
    apiKey = result.trim();
    return apiKey;
  } catch (error) {
    console.error("Error retrieving API key from 1Password:", error);
    throw new Error(
      "Could not get Plausible API key. Set PLAUSIBLE_API_KEY environment variable or configure 1Password CLI."
    );
  }
}

const server = new McpServer({
  transport: new StdioServerTransport(),
  name: "plausible-mcp",
  version: "1.0.0",
});

// Register MCP tools
server.tool(
  "list_sites",
  "List all sites in your Plausible account",
  async () => {
    try {
      const key = await getApiKey();
      console.error("key", key);
      const response = await fetch(`${PLAUSIBLE_API_URL}/v1/sites`, {
        headers: {
          Authorization: `Bearer ${key}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Plausible API error (${response.status}): ${errorText}`
        );
      }

      const sites = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(sites, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : "Unknown error",
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_breakdown",
  "Get detailed analytics breakdown for a site.\n\n" +
    "COMMON QUERIES:\n" +
    "1. Most visited pages in last 7 days:\n" +
    '   {"site_id": "example.com", "metrics": ["pageviews"], "dimensions": ["event:page"], "date_range": "7d", "limit": 10}\n\n' +
    "2. Traffic sources breakdown:\n" +
    '   {"site_id": "example.com", "metrics": ["visitors"], "dimensions": ["visit:source"], "date_range": "30d"}\n\n' +
    "3. Visitor count by country:\n" +
    '   {"site_id": "example.com", "metrics": ["visitors"], "dimensions": ["visit:country"], "date_range": "month"}\n\n' +
    "4. Daily visitor trend:\n" +
    '   {"site_id": "example.com", "metrics": ["visitors"], "dimensions": ["time:day"], "date_range": "30d"}\n\n' +
    "5. Pages with highest bounce rate:\n" +
    '   {"site_id": "example.com", "metrics": ["bounce_rate"], "dimensions": ["event:page"], "date_range": "month", "limit": 10}\n\n' +
    "AVAILABLE METRICS:\n" +
    "- visitors: Number of unique visitors\n" +
    "- visits: Number of visits/sessions\n" +
    "- pageviews: Number of pageview events\n" +
    "- views_per_visit: Average number of pages viewed per visit\n" +
    "- bounce_rate: Percentage of visits with only one page view\n" +
    "- visit_duration: Average visit duration in seconds\n" +
    "- events: Total number of events (pageviews + custom events)\n\n" +
    "AVAILABLE DIMENSIONS:\n" +
    "Event dimensions (page/content related):\n" +
    "- event:name - Event name (e.g., 'pageview', 'download', etc.)\n" +
    "- event:page - Full page URL including UTM parameters\n" +
    "- event:page.pathname - Page path without query parameters\n\n" +
    "Visit dimensions (visitor/session related):\n" +
    "- visit:source - Traffic source (e.g., 'Google', 'Twitter')\n" +
    "- visit:referrer - Full referrer URL\n" +
    "- visit:utm_medium - Marketing medium (e.g., 'cpc', 'social')\n" +
    "- visit:utm_source - UTM source parameter\n" +
    "- visit:utm_campaign - UTM campaign name\n" +
    "- visit:device - Device type (desktop, mobile, tablet)\n" +
    "- visit:browser - Browser name\n" +
    "- visit:browser_version - Browser version\n" +
    "- visit:os - Operating system\n" +
    "- visit:os_version - OS version\n" +
    "- visit:country - Country of visitor\n" +
    "- visit:region - Region/state of visitor\n" +
    "- visit:city - City of visitor\n\n" +
    "Time dimensions (for trends and patterns):\n" +
    "- minute - Group by minute (only for 'day' range)\n" +
    "- hour - Group by hour (only for 'day' range)\n" +
    "- date - Group by date\n" +
    "- week - Group by week\n" +
    "- month - Group by month\n\n" +
    "FILTERING EXAMPLES:\n" +
    "1. Only Chrome users:\n" +
    '   {"filters": [["is", "visit:browser", ["Chrome"]]]}\n\n' +
    "2. Blog pages only:\n" +
    '   {"filters": [["contains", "event:page", ["/blog"]]]}\n\n' +
    "3. Multiple countries:\n" +
    '   {"filters": [["is", "visit:country", ["US", "GB", "CA"]]]}\n\n' +
    "4. Exclude certain pages:\n" +
    '   {"filters": [["is_not", "event:page", ["/admin", "/login"]]]}\n\n' +
    "5. Complex filter (Chrome users from US):\n" +
    '   {"filters": [["and", [["is", "visit:browser", ["Chrome"]], ["is", "visit:country", ["US"]]]]]}\n',
  {
    site_id: z
      .string()
      .describe(
        "Your website domain as configured in Plausible (e.g., 'example.com')"
      ),
    metrics: z
      .array(z.string())
      .optional()
      .describe(
        "List of metrics to calculate. Default: ['visitors']. See AVAILABLE METRICS above for options."
      ),
    dimensions: z
      .array(z.string())
      .optional()
      .describe(
        "Properties to group results by. Default: ['date']. See AVAILABLE DIMENSIONS above for options."
      ),
    date_range: z
      .string()
      .optional()
      .describe(
        "Time period to analyze. Options:\n" +
          "- 'day': Last 24 hours\n" +
          "- '7d', '30d': Last N days\n" +
          "- 'month': Current month\n" +
          "- '6mo', '12mo': Last N months\n" +
          "- Custom ISO dates: ['2024-01-01', '2024-01-31']\n" +
          "Default: '7d'"
      ),
    filters: z
      .array(z.array(z.union([z.string(), z.array(z.string())])))
      .optional()
      .describe(
        "Filter conditions to apply. See FILTERING EXAMPLES above.\n" +
          "Operators: is, is_not, contains, contains_not, matches, matches_not"
      ),
    limit: z
      .number()
      .optional()
      .describe("Maximum number of results to return. Default: 10000"),
    page: z
      .number()
      .optional()
      .describe("Page number for pagination. Default: 1"),
  },
  async (params) => {
    try {
      const key = await getApiKey();

      // Prepare the request body with defaults
      const requestBody = {
        site_id: params.site_id,
        metrics: params.metrics || ["visitors"],
        dimensions: params.dimensions || ["date"],
        date_range: params.date_range || "7d",
        filters: params.filters || [],
        limit: params.limit,
        page: params.page,
      };

      const response = await fetch(`${PLAUSIBLE_API_URL}/v2/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Plausible API error (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : "Unknown error",
          },
        ],
        isError: true,
      };
    }
  }
);

// New tool for analyzing specific pages
server.tool(
  "analyze_page",
  "Get detailed analytics for a specific page",
  {
    site_id: z.string().describe("Your website domain"),
    page: z.string().describe("Page path (e.g. '/blog/post-1')"),
    timeRange: TimeRange,
    include: z.array(Metric).default(['visitors', 'pageviews', 'avg_time'])
  },
  async (params) => {
    try {
      const key = await getApiKey();
      const timeRange = processTimeRange(params.timeRange);
      const metrics = convertMetrics(params.include);

      // First query: Get basic metrics for the page
      const basicMetricsResponse = await fetch(`${PLAUSIBLE_API_URL}/v2/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          site_id: params.site_id,
          metrics,
          date_range: timeRange.plausibleFormat,
          filters: [["is", "event:page", [params.page]]]
        }),
      });

      if (!basicMetricsResponse.ok) {
        throw new Error(
          `Plausible API error (${basicMetricsResponse.status}): ${await basicMetricsResponse.text()}`
        );
      }

      const basicMetrics = await basicMetricsResponse.json();

      // If referrers are requested, get top referrers
      let referrers = null;
      if (params.include.includes('visitors')) {
        const referrersResponse = await fetch(`${PLAUSIBLE_API_URL}/v2/query`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            site_id: params.site_id,
            metrics: ["visitors"],
            dimensions: ["visit:source"],
            date_range: timeRange.plausibleFormat,
            filters: [["is", "event:page", [params.page]]],
            limit: 10
          }),
        });

        if (referrersResponse.ok) {
          referrers = await referrersResponse.json();
        }
      }

      // If countries are requested, get country breakdown
      let countries = null;
      if (params.include.includes('visitors')) {
        const countriesResponse = await fetch(`${PLAUSIBLE_API_URL}/v2/query`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            site_id: params.site_id,
            metrics: ["visitors"],
            dimensions: ["visit:country"],
            date_range: timeRange.plausibleFormat,
            filters: [["is", "event:page", [params.page]]],
            limit: 10
          }),
        });

        if (countriesResponse.ok) {
          countries = await countriesResponse.json();
        }
      }

      // Format the response
      const response = {
        page: params.page,
        period: {
          start: timeRange.start,
          end: timeRange.end
        },
        metrics: basicMetrics.results[0]?.metrics || [],
        referrers: referrers?.results || [],
        countries: countries?.results || []
      };

      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : "Unknown error",
          },
        ],
        isError: true,
      };
    }
  }
);

// Register traffic analytics tool with structured parameters
server.tool(
  "get_traffic",
  "Get traffic analytics for a site using structured parameters",
  {
    site_id: z.string().describe("The website domain to analyze (e.g., 'example.com')"),
    time_range: z.enum([
      'day',      // Last 24 hours
      '7d',       // Last 7 days
      '30d',      // Last 30 days
      'month',    // Current month
      '6mo',      // Last 6 months
      '12mo'      // Last 12 months
    ]).default('7d').describe("Time period to analyze"),
    metrics: z.array(z.enum([
      'visitors',         // Number of unique visitors
      'pageviews',       // Number of pageview events
      'bounce_rate',     // Percentage of visits with only one page view
      'visit_duration',  // Average visit duration in seconds
      'views_per_visit', // Average number of pages viewed per visit
      'events'          // Total number of events
    ])).default(['visitors', 'pageviews']).describe("Metrics to calculate"),
    dimensions: z.array(z.enum([
      'time:day',           // Group by day
      'time:month',         // Group by month
      'visit:source',       // Traffic source
      'visit:device',       // Device type
      'visit:browser',      // Browser name
      'visit:country',      // Country of visitor
      'visit:region',       // Region/state
      'event:page',         // Page URL
      'event:page.pathname' // Page path
    ])).default(['visit:source']).describe("Properties to group results by"),
    filters: z.array(z.array(z.union([z.string(), z.array(z.string())]))).optional()
      .describe("Filter conditions to apply (e.g., [['is', 'visit:country', ['US']]])"),
  },
  async (params) => {
    try {
      const key = await getApiKey();

      // Make API request with structured parameters
      const response = await fetch(`${PLAUSIBLE_API_URL}/v2/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          site_id: params.site_id,
          metrics: params.metrics,
          dimensions: params.dimensions,
          date_range: params.time_range,
          filters: params.filters || []
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Plausible API error (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();

      // Format response in a structured way
      const formattedResponse = {
        site: params.site_id,
        period: params.time_range,
        metrics: data.results[0]?.metrics || {},
        trends: data.results || []
      };

      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify(formattedResponse, null, 2)
        }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : "Unknown error",
          },
        ],
        isError: true,
      };
    }
  }
);

export async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Plausible MCP Server running on stdio");
  console.error(`Using Plausible API URL: ${PLAUSIBLE_API_URL}`);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
