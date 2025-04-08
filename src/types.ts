import { z } from "zod";

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

// Time Range Specification
export const TimeRange = z.union([
  // Relative ranges
  z.enum([
    'today',
    'yesterday',
    'last_7_days',
    'last_30_days',
    'this_month',
    'last_month',
    'this_year'
  ]),
  
  // Custom date range
  z.object({
    from: z.string().describe("ISO date (YYYY-MM-DD)"),
    to: z.string().describe("ISO date (YYYY-MM-DD)")
  }),
  
  // Rolling window
  z.object({
    last: z.number(),
    unit: z.enum(['days', 'weeks', 'months'])
  })
]);

export type TimeRangeType = z.infer<typeof TimeRange>;

// Type guards for TimeRange
export function isRollingWindow(range: TimeRangeType): range is { last: number; unit: 'days' | 'weeks' | 'months' } {
  return typeof range === 'object' && 'last' in range && 'unit' in range;
}

export function isCustomRange(range: TimeRangeType): range is { from: string; to: string } {
  return typeof range === 'object' && 'from' in range && 'to' in range;
}

// Common metrics that can be requested
export const Metric = z.enum([
  'visitors',
  'pageviews',
  'bounce_rate',
  'avg_time',
  'total_views',
  'exit_rate'
]);

export type MetricType = z.infer<typeof Metric>;

// Page matching patterns
export const PagePattern = z.object({
  type: z.enum(['exact', 'starts_with', 'contains', 'regex']),
  value: z.string()
}).describe("How to match pages");

export type PagePatternType = z.infer<typeof PagePattern>;

// Helper function to process time ranges into Plausible format
export function processTimeRange(range: TimeRangeType): {
  start: string,
  end: string,
  plausibleFormat: string | [string, string]
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (typeof range === 'string') {
    // Handle predefined ranges
    switch (range) {
      case 'today': {
        const dateStr = today.toISOString().split('T')[0];
        return {
          start: dateStr,
          end: dateStr,
          plausibleFormat: 'day'
        };
      }
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];
        return {
          start: dateStr,
          end: dateStr,
          plausibleFormat: 'day'
        };
      }
      case 'last_7_days':
        return {
          start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
          plausibleFormat: '7d'
        };
      case 'last_30_days':
        return {
          start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
          plausibleFormat: '30d'
        };
      case 'this_month': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          start: start.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
          plausibleFormat: 'month'
        };
      }
      case 'last_month': {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
          plausibleFormat: 'month'
        };
      }
      case 'this_year': {
        const start = new Date(today.getFullYear(), 0, 1);
        return {
          start: start.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
          plausibleFormat: 'year'
        };
      }
      default:
        throw new Error(`Unsupported time range: ${range}`);
    }
  } else if (isCustomRange(range)) {
    // Handle custom date range
    return {
      start: range.from,
      end: range.to,
      plausibleFormat: [range.from, range.to]
    };
  } else if (isRollingWindow(range)) {
    // Handle rolling window
    const end = today;
    const start = new Date(today);
    
    switch (range.unit) {
      case 'days':
        start.setDate(start.getDate() - range.last);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
          plausibleFormat: `${range.last}d`
        };
      case 'weeks':
        start.setDate(start.getDate() - (range.last * 7));
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
          plausibleFormat: `${range.last * 7}d`
        };
      case 'months':
        start.setMonth(start.getMonth() - range.last);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
          plausibleFormat: `${range.last}mo`
        };
    }
  }
  throw new Error('Invalid time range format');
}

// Helper to convert a page pattern to a Plausible filter
export function pagePatternToFilter(pattern: PagePatternType): [string, string, string[]] {
  switch (pattern.type) {
    case 'exact':
      return ['is', 'event:page', [pattern.value]];
    case 'starts_with':
      return ['contains', 'event:page', [pattern.value]];
    case 'contains':
      return ['contains', 'event:page', [pattern.value]];
    case 'regex':
      return ['matches', 'event:page', [pattern.value]];
    default:
      throw new Error(`Unsupported pattern type: ${pattern.type}`);
  }
}

// Helper to convert our metrics to Plausible metrics
export function convertMetrics(metrics: MetricType[]): string[] {
  const metricMap: Record<MetricType, string[]> = {
    'visitors': ['visitors'],
    'pageviews': ['pageviews'],
    'bounce_rate': ['bounce_rate'],
    'avg_time': ['visit_duration'],
    'total_views': ['pageviews'],
    'exit_rate': ['exit_rate']
  };

  return Array.from(new Set(metrics.flatMap(m => metricMap[m])));
}