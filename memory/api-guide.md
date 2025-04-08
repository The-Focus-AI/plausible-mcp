# Plausible Stats API Guide

The Plausible Stats API provides a powerful single endpoint for querying both historical and real-time analytics data. This guide covers common query patterns and examples.

## Authentication

1. Create an API key in your Plausible account:
   - Go to Account Settings → API Keys
   - Click "New API Key"
   - Save the key (only shown once)

2. Use the key in requests:
```bash
curl \
  -X POST \
  -H 'Authorization: Bearer YOUR-KEY' \
  -H 'Content-Type: application/json' \
  -d '{"site_id": "example.com", "metrics": ["visitors"], "date_range": "7d"}' \
  https://plausible.io/api/v2/query
```

## Query Structure

All queries are made to `/api/v2/query` with a JSON body containing:

### Required Fields

- `site_id`: Your domain as configured in Plausible
- `metrics`: Array of metrics to calculate
- `date_range`: Time period to analyze

### Optional Fields

- `dimensions`: Properties to group results by
- `filters`: Conditions to filter the data
- `order_by`: Custom sorting of results
- `include`: Additional options for the query
- `pagination`: Limit and offset controls

## Common Query Patterns

### 1. Basic Visitor Stats

Get visitor count for last 7 days:
```json
{
  "site_id": "example.com",
  "metrics": ["visitors"],
  "date_range": "7d"
}
```

### 2. Multiple Metrics with Custom Date Range

Get multiple metrics for a specific date range:
```json
{
  "site_id": "example.com",
  "metrics": ["visitors", "pageviews", "bounce_rate"],
  "date_range": ["2024-01-01", "2024-01-31"]
}
```

### 3. Traffic Sources Breakdown

Analyze traffic sources with visitor counts:
```json
{
  "site_id": "example.com",
  "metrics": ["visitors"],
  "dimensions": ["visit:source"],
  "date_range": "30d"
}
```

### 4. Geographic Analysis

Get visitor breakdown by country:
```json
{
  "site_id": "example.com",
  "metrics": ["visitors"],
  "dimensions": ["visit:country"],
  "date_range": "month",
  "filters": [["is_not", "visit:country", [""]]]
}
```

### 5. Page Performance

Most visited pages with bounce rates:
```json
{
  "site_id": "example.com",
  "metrics": ["pageviews", "bounce_rate"],
  "dimensions": ["event:page"],
  "date_range": "30d",
  "order_by": [["pageviews", "desc"]],
  "limit": 10
}
```

## Available Metrics

| Metric | Description |
|--------|-------------|
| visitors | Number of unique visitors |
| visits | Number of visits/sessions |
| pageviews | Number of pageview events |
| bounce_rate | Percentage of visits with only one page view |
| visit_duration | Average visit duration in seconds |
| events | Total number of events |
| views_per_visit | Average pages viewed per visit |

## Available Dimensions

### Event Dimensions
- `event:name` - Event name
- `event:page` - Full page URL
- `event:page.pathname` - Page path without query parameters

### Visit Dimensions
- `visit:source` - Traffic source
- `visit:referrer` - Full referrer URL
- `visit:utm_medium` - Marketing medium
- `visit:utm_source` - UTM source
- `visit:utm_campaign` - UTM campaign
- `visit:device` - Device type
- `visit:browser` - Browser name
- `visit:os` - Operating system
- `visit:country` - Country of visitor
- `visit:city` - City of visitor

### Time Dimensions
- `minute` - Group by minute (only for 'day' range)
- `hour` - Group by hour (only for 'day' range)
- `date` - Group by date
- `week` - Group by week
- `month` - Group by month

## Filter Operations

### Simple Filters

1. Exact match:
```json
["is", "visit:country", ["Germany", "Poland"]]
```

2. Exclusion:
```json
["is_not", "event:page", ["/pricing"]]
```

3. Contains:
```json
["contains", "event:page", ["/blog"]]
```

4. Regular expression:
```json
["matches", "event:page", ["^/user/\\d+$"]]
```

### Combining Filters

Using AND:
```json
{
  "filters": [
    ["and", [
      ["is", "visit:country", ["Germany"]],
      ["is", "visit:city", ["Berlin"]]
    ]]
  ]
}
```

Using OR:
```json
{
  "filters": [
    ["or", [
      ["is", "visit:country", ["Germany"]],
      ["is", "visit:city", ["Paris"]]
    ]]
  ]
}
```

## Response Structure

The API returns JSON with three main sections:

```json
{
  "results": [
    {
      "metrics": [99, 98, 94],
      "dimensions": ["Estonia", "Tallinn"]
    }
  ],
  "meta": {
    "imports_included": false,
    "total_rows": 342
  },
  "query": {
    // Echo of your query with any backend modifications
  }
}
```

## Best Practices

1. Use appropriate date ranges for your needs:
   - `7d`, `30d` for relative ranges
   - `month`, `year` for current period
   - Custom ISO dates for specific periods

2. Include only necessary metrics to improve response time

3. Use filters to narrow down data when possible

4. Consider pagination for large result sets:
```json
{
  "pagination": {
    "limit": 100,
    "offset": 0
  }
}
```

5. Use appropriate dimensions for your analysis needs

## Rate Limits

- Default: 600 requests per hour
- Contact Plausible support for increased limits if needed 