# Plausible MCP

A Model Context Protocol (MCP) server for interacting with Plausible Analytics API v2.

## Features

- MCP server for Plausible Analytics integration
- List all sites in your Plausible account
- Get breakdown statistics by various metrics and dimensions
- Type-safe API client with Zod validation
- 1Password integration for API key management

## Examples

> what page has the highest inbound traffic to thefocus over the last month

> what page has the highest inbound traffic to thefocus over the last month

> what countries

## Installation

```bash
pnpm install
```

## Configuration

Create a `.env` file in the root directory with your Plausible API configuration:

```env
PLAUSIBLE_API_KEY=your_api_key_here
PLAUSIBLE_API_URL=https://plausible.io/api/v2
```

Alternatively, store your API key in 1Password with the path "op://Development/plausible api/notesPlain".

## Available MCP Tools

### list_sites

Lists all sites in your Plausible account.

Example response:

```json
{
  "sites": [
    {
      "domain": "example.com",
      "timezone": "UTC"
    }
  ]
}
```

### get_breakdown

Get breakdown statistics for a site. Parameters:

- `site_id` (required): The domain of your site
- `metrics` (optional): Array of metrics to return. Default: ["visitors"]

  - visitors
  - visits
  - pageviews
  - views_per_visit
  - bounce_rate
  - visit_duration
  - events

- `dimensions` (optional): Array of dimensions to group by. Default: ["date"]

  - Event dimensions (event:name, event:page, etc.)
  - Visit dimensions (visit:source, visit:country, etc.)
  - Time dimensions (minute, hour, date, week, month)

- `date_range` (optional): Time period. Default: "7d"

  - day (last 24h)
  - 7d, 30d (last N days)
  - month (current month)
  - 6mo, 12mo (last N months)
  - custom (requires date parameter)

- `filters` (optional): Filter the results

  ```json
  ["is", "visit:browser", ["Chrome"]]
  ["contains", "event:page", ["/blog"]]
  ```

- `limit` (optional): Number of results. Default: 10000
- `page` (optional): Page number. Default: 1

## TODO

- [ ] Complete dimension parsing and validation
  - Add proper type checking for each dimension type
  - Validate dimension combinations
  - Add support for custom property dimensions
- [ ] Add support for imported data handling
- [ ] Add proper response type parsing
- [ ] Add support for time labels in responses
- [ ] Add support for pagination metadata
- [ ] Add examples for common queries

## Development

```bash
# Build the project
pnpm build

# Start the MCP server
pnpm start
```

## License

MIT
