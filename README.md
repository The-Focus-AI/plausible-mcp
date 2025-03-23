# Plausible MCP

Hey there! Let's talk about bringing analytics data right into your conversations — because that's what this project is all about. It's a Model Context Protocol (MCP) server that lets you chat with your Plausible Analytics data as naturally as asking a colleague "how's the website doing?"

The hardest thing about analytics dashboards is that they're stuck in the old paradigm of clicking through filters and dimensions. We're living in the future now — let's make our analytics data as accessible as asking a question.

## What's This All About?

This MCP server bridges the gap between Plausible's powerful analytics API and the way we naturally think about our website stats. Want to know your most visited pages? Or where your traffic is coming from? Just ask!

### Key Features

- 🤝 Natural interaction with your Plausible Analytics data
- 📊 Get insights about traffic, visitors, and engagement
- 🌍 Break down stats by country, device, or any dimension you care about
- 🔒 Secure API key handling with 1Password integration
- 🎯 Type-safe implementation with TypeScript and Zod

## Real-World Examples

Here's what you can do — and yes, these are actual queries that work:

```bash
# Basic Questions
> What were my most visited pages last week?
{
  "site_id": "example.com",
  "metrics": ["pageviews"],
  "dimensions": ["event:page"],
  "date_range": "7d",
  "limit": 10
}

> Where's my traffic coming from?
{
  "site_id": "example.com",
  "metrics": ["visitors"],
  "dimensions": ["visit:source"],
  "date_range": "30d"
}

> Show me visitor trends by country
{
  "site_id": "example.com",
  "metrics": ["visitors"],
  "dimensions": ["visit:country"],
  "date_range": "month"
}

# Content Performance
> Which blog posts have the highest bounce rate?
{
  "site_id": "example.com",
  "metrics": ["bounce_rate"],
  "dimensions": ["event:page"],
  "filters": [["contains", "event:page", ["/blog"]]],
  "date_range": "30d"
}

> What's the average time spent on documentation pages?
{
  "site_id": "example.com",
  "metrics": ["visit_duration"],
  "dimensions": ["event:page"],
  "filters": [["contains", "event:page", ["/docs"]]],
  "date_range": "7d"
}

# Traffic Analysis
> Show me mobile vs desktop traffic trends
{
  "site_id": "example.com",
  "metrics": ["visitors", "pageviews"],
  "dimensions": ["visit:device"],
  "date_range": "30d"
}

> Which browsers do my visitors use?
{
  "site_id": "example.com",
  "metrics": ["visitors"],
  "dimensions": ["visit:browser"],
  "date_range": "30d"
}

# Marketing Insights
> How's our social media traffic performing?
{
  "site_id": "example.com",
  "metrics": ["visitors", "bounce_rate"],
  "dimensions": ["visit:source"],
  "filters": [["is", "visit:source", ["Twitter", "LinkedIn", "Facebook"]]],
  "date_range": "30d"
}

> Which UTM campaigns are driving the most engagement?
{
  "site_id": "example.com",
  "metrics": ["visitors", "visit_duration"],
  "dimensions": ["visit:utm_campaign"],
  "date_range": "month"
}

# Geographic Analysis
> Show me traffic from European cities
{
  "site_id": "example.com",
  "metrics": ["visitors"],
  "dimensions": ["visit:city"],
  "filters": [["is", "visit:country", ["GB", "DE", "FR", "ES", "IT"]]],
  "date_range": "30d"
}

# Time-Based Analysis
> How does traffic vary throughout the day?
{
  "site_id": "example.com",
  "metrics": ["visitors"],
  "dimensions": ["hour"],
  "date_range": "day"
}

# Complex Queries
> Show me popular blog posts from mobile users in the US
{
  "site_id": "example.com",
  "metrics": ["pageviews", "visit_duration"],
  "dimensions": ["event:page"],
  "filters": [["and", [
    ["contains", "event:page", ["/blog"]],
    ["is", "visit:device", ["mobile"]],
    ["is", "visit:country", ["US"]]
  ]]],
  "date_range": "30d"
}

> Which pages have high engagement from social media?
{
  "site_id": "example.com",
  "metrics": ["visit_duration", "views_per_visit"],
  "dimensions": ["event:page"],
  "filters": [["is", "visit:source", ["Twitter", "LinkedIn", "Facebook"]]],
  "date_range": "30d"
}
```

These examples just scratch the surface — you can combine metrics, dimensions, and filters in countless ways to get exactly the insights you need. The beauty is in how natural it feels to ask these questions and get immediate answers.

## Getting Started

First things first, let's get you set up:

```bash
pnpm install
```

### Configuration

You've got two ways to handle your Plausible API key — choose what works for you:

1. Create a `.env` file:

```env
PLAUSIBLE_API_KEY=your_api_key_here
PLAUSIBLE_API_URL=https://plausible.io/api/v2
```

2. Or use 1Password (my preferred way):
   Store your key at "op://Development/plausible api/notesPlain"

## The Tools at Your Disposal

### list_sites

Gets you a list of all your Plausible sites. Simple but useful when you're just getting started.

### get_breakdown

This is where the magic happens. Think of it as your analytics Swiss Army knife:

#### Metrics You Can Track

- `visitors` - Unique visitors (the real people)
- `pageviews` - Total page loads
- `bounce_rate` - One-and-done visits
- `visit_duration` - How long people stick around
- `views_per_visit` - Pages per session
- And more!

#### Ways to Slice the Data

Break it down by:

- Pages (`event:page`)
- Traffic sources (`visit:source`)
- Countries (`visit:country`)
- Devices (`visit:device`)
- Time periods (minute, hour, day, week, month)

#### Time Ranges

Look at:

- Last 24 hours (`day`)
- Last N days (`7d`, `30d`)
- This month (`month`)
- Last N months (`6mo`, `12mo`)
- Custom date ranges

#### Smart Filtering

Filter your data like a pro:

```javascript
// Just Chrome users
{"filters": [["is", "visit:browser", ["Chrome"]]]}

// Blog traffic only
{"filters": [["contains", "event:page", ["/blog"]]]}

// Traffic from specific countries
{"filters": [["is", "visit:country", ["US", "GB", "CA"]]]}

// Complex stuff - Chrome users from the US
{"filters": [["and", [
  ["is", "visit:browser", ["Chrome"]],
  ["is", "visit:country", ["US"]]
]]]}
```

## What's Next?

We're pushing this to the next level. On the roadmap:

- [ ] Even smarter query handling
- [ ] Better response formatting
- [ ] More examples of common analytics questions
- [ ] Comprehensive error handling
- [ ] Performance optimizations

## Development

Jump in and help us figure it out:

```bash
# Build it
pnpm build

# Run it
pnpm start
```

## Rate Limits & Performance

- 600 requests per hour (that's the Plausible limit)
- Real-time data, no caching
- Snappy response times

## License

MIT - because sharing is caring!

---

The analytics world is transforming from dashboards and SQL queries to natural conversations about your data. We're figuring it out as we go, but that's what makes it exciting. Let's make analytics as accessible as asking a question — because that's where this is all heading.
