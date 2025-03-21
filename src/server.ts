#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";
import { execSync } from "child_process";

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
  "Get detailed analytics breakdown for a site. Available metrics:\n" +
    "visitors - Number of unique visitors\n" +
    "visits - Number of visits/sessions\n" +
    "pageviews - Number of pageview events\n" +
    "views_per_visit - Pageviews divided by visits\n" +
    "bounce_rate - Bounce rate percentage\n" +
    "visit_duration - Visit duration in seconds\n" +
    "events - Number of events (pageviews + custom events)\n" +
    "\nAvailable dimensions:\n" +
    "Event dimensions:\n" +
    "- event:name - Event name\n" +
    "- event:page - Page URL (includes UTM tags)\n" +
    "- event:page.pathname - Page path without query parameters\n" +
    "\nVisit dimensions:\n" +
    "- visit:source - Traffic source\n" +
    "- visit:referrer - Full referrer URL\n" +
    "- visit:utm_medium - UTM medium\n" +
    "- visit:utm_source - UTM source\n" +
    "- visit:utm_campaign - UTM campaign\n" +
    "- visit:device - Device type (desktop, mobile, tablet)\n" +
    "- visit:browser - Browser name\n" +
    "- visit:browser_version - Browser version\n" +
    "- visit:os - Operating system\n" +
    "- visit:os_version - OS version\n" +
    "- visit:country - Country of visitor\n" +
    "- visit:region - Region/state of visitor\n" +
    "- visit:city - City of visitor\n" +
    "\nTime dimensions:\n" +
    "- minute - Group by minute (only available for 'day' date range)\n" +
    "- hour - Group by hour (only available for 'day' date range)\n" +
    "- date - Group by date\n" +
    "- week - Group by week\n" +
    "- month - Group by month\n",
  {
    site_id: z
      .string()
      .describe("The domain of your site (e.g. 'example.com')"),
    metrics: z
      .array(z.string())
      .optional()
      .describe(
        "Metrics to return. Options: visitors, visits, pageviews, views_per_visit, bounce_rate, visit_duration, events. Default: ['visitors']"
      ),
    dimensions: z
      .array(z.string())
      .optional()
      .describe(
        "Dimensions to group by. See description above for available dimensions. Default: ['time']"
      ),
    date_range: z
      .string()
      .optional()
      .describe(
        "Time period for the stats. Options:\n" +
          "- day (last 24h)\n" +
          "- 7d, 30d (last N days)\n" +
          "- month (current month)\n" +
          "- 6mo, 12mo (last N months)\n" +
          "- custom (requires date parameter)\n" +
          "Default: '7d'"
      ),
    filters: z
      .array(z.array(z.union([z.string(), z.array(z.string())])))
      .optional()
      .describe(
        "Filter the results. Examples:\n" +
          '["is", "visit:browser", ["Chrome"]]\n' +
          '["contains", "event:page", ["/blog"]]\n' +
          '["is", "visit:country", ["FR", "GB", "DE"]]\n' +
          "Operators: is, is_not, contains, contains_not, matches, matches_not"
      ),
    limit: z
      .number()
      .optional()
      .describe("Number of results to return (default: 10000)"),
    page: z
      .number()
      .optional()
      .describe("Page number for pagination (default: 1)"),
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
