# Plausible Stats Downloader

A TypeScript client for downloading and analyzing statistics from Plausible Analytics API.

## Features

- Fetch site analytics data from Plausible.io
- Support for breakdown statistics by various metrics
- Pagination handling for large datasets
- Type-safe API client

## Installation

```bash
pnpm install
```

## Configuration

Create a `.env` file in the root directory with your Plausible API key:

```env
PLAUSIBLE_API_KEY=your_api_key_here
```

## Usage

```typescript
import { PlausibleClient } from "./src/plausibleClient";

const client = new PlausibleClient({
  apiKey: process.env.PLAUSIBLE_API_KEY!,
});

// Get list of sites
const sites = await client.getSites();

// Get page breakdown for last 30 days
const pageBreakdown = await client.getBreakdown({
  site_id: "your-site.com",
  period: "30d",
  property: "event:page",
});
```

## Available Scripts

- `pnpm build` - Build the TypeScript project
- `pnpm start` - Run the built project
- `pnpm dev` - Run the project in development mode
- `pnpm cms` - Run the CMS CLI tool

## License

MIT
