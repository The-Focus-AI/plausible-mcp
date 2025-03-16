import { execSync } from 'child_process';
import axios from 'axios';
import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import * as fs from 'fs';
import * as path from 'path';
// Using require for chartscii to avoid TypeScript issues
const Chartscii = require('chartscii');

const API_URL = 'https://plausible.io/api/v1';

interface PlausibleSite {
  domain: string;
  timezone: string;
}

interface PlausibleStats {
  property: string;
  value: string | number;
}

interface BreakdownResult {
  results: Array<{
    [key: string]: string | number;
  }>;
  pagination?: {
    page: number;
    total_pages: number;
  };
}

// Available breakdown metrics
const BREAKDOWN_METRICS = {
  'event:page': { label: 'Pages', property: 'page' },
  'visit:referrer': { label: 'Referrers', property: 'referrer' },
  'visit:country': { label: 'Countries', property: 'country' },
  'visit:browser': { label: 'Browsers', property: 'browser' },
  'visit:os': { label: 'Operating Systems', property: 'os' },
  'visit:device': { label: 'Devices', property: 'device' },
  'visit:source': { label: 'Sources', property: 'source' },
  'visit:utm_medium': { label: 'UTM Medium', property: 'utm_medium' },
  'visit:utm_source': { label: 'UTM Source', property: 'utm_source' },
  'visit:utm_campaign': { label: 'UTM Campaign', property: 'utm_campaign' },
};

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
    console.log('PLAUSIBLE_API_KEY not found in environment, trying 1Password...');
    const result = execSync('op read "op://Development/plausible api/notesPlain"', { encoding: 'utf8' });
    apiKey = result.trim();
    return apiKey;
  } catch (error) {
    console.error('Error retrieving API key from 1Password:', error);
    throw new Error('Could not get Plausible API key. Set PLAUSIBLE_API_KEY environment variable or configure 1Password CLI.');
  }
}

// Create authenticated API client
async function createApiClient() {
  const key = await getApiKey();
  return axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    }
  });
}

// Get list of sites
async function getSites() {
  const client = await createApiClient();
  try {
    const response = await client.get('/sites');
    return response.data.sites as PlausibleSite[];
  } catch (error) {
    console.error('Error fetching sites:', error);
    throw error;
  }
}

// Get breakdown data
async function getBreakdown(siteId: string, period: string, property: string, limit: number = 10): Promise<any[]> {
  const client = await createApiClient();
  try {
    const response = await client.get('/stats/breakdown', {
      params: {
        site_id: siteId,
        period,
        property,
        limit
      }
    });
    
    if (response.data.results) {
      return response.data.results;
    }
    return [];
  } catch (error) {
    console.error(`Error fetching ${property} breakdown:`, error);
    throw error;
  }
}

// Get time series data
async function getTimeSeries(siteId: string, period: string): Promise<any> {
  const client = await createApiClient();
  try {
    const response = await client.get('/stats/timeseries', {
      params: {
        site_id: siteId,
        period
      }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error fetching time series data:', error.response?.data || error.message);
    } else {
      console.error('Error fetching time series data:', error);
    }
    throw error;
  }
}

// Convert period to human-readable string
function formatPeriod(period: string): string {
  switch (period) {
    case 'day':
      return 'Today';
    case 'yesterday':
      return 'Yesterday';
    case '7d':
      return 'Last 7 days';
    case '30d':
      return 'Last 30 days';
    case 'month':
      return 'This month';
    case 'custom':
      return 'Custom period';
    default:
      return period;
  }
}

// Display data in nicely formatted tables
function displayTable(title: string, data: any[], mainProperty: string) {
  console.log(chalk.bold(`\n${title}:`));
  
  const table = new Table({
    head: [chalk.cyan('#'), chalk.cyan(mainProperty), chalk.cyan('Visitors')],
    colWidths: [5, 50, 15]
  });
  
  data.forEach((item, index) => {
    table.push([
      index + 1,
      item[mainProperty] || 'Unknown',
      item.visitors || 0
    ]);
  });
  
  console.log(table.toString());
}

// Export data to CSV
function exportToCsv(data: any[], mainProperty: string, filename: string) {
  const headers = [mainProperty, 'visitors'];
  const csvRows = [headers.join(',')];
  
  data.forEach(item => {
    const row = [
      // Escape commas and quotes in values
      `"${(item[mainProperty] || 'Unknown').toString().replace(/"/g, '""')}"`,
      item.visitors || 0
    ];
    csvRows.push(row.join(','));
  });
  
  const csvContent = csvRows.join('\n');
  fs.writeFileSync(filename, csvContent);
  console.log(chalk.green(`\nExported to ${filename}`));
}

// Plot a chart from time series data
function plotTimeSeriesChart(data: any[]) {
  if (!data || data.length === 0) {
    console.log('No time series data available to plot');
    return;
  }
  
  console.log(chalk.bold('\nVisitors Over Time:'));
  
  try {
    // Extract visitors data and dates
    const visitors = data.map(point => parseInt(point.visitors) || 0);
    const dates = data.map(point => new Date(point.date));
    
    // Find max for scaling
    const maxVisitors = Math.max(...visitors);
    const chartHeight = 15; // Height of our ASCII chart
    const chartWidth = 78; // Width minus axis characters (total 80)
    
    // Generate simple ASCII chart
    if (maxVisitors > 0) {
      // Calculate how to scale points horizontally if we have more data points than width
      const dataPoints = visitors.length;
      const scale = dataPoints > chartWidth ? dataPoints / chartWidth : 1;
      const scaledWidth = Math.min(dataPoints, chartWidth);
      
      // Create the chart
      for (let y = chartHeight; y >= 0; y--) {
        let line = y === 0 ? '└' : '│';
        
        for (let x = 0; x < scaledWidth; x++) {
          // Map scaled x position back to actual data point
          const dataIndex = Math.floor(x * scale);
          let value = 0;
          
          // If we're scaling, average the values in this segment
          if (scale > 1) {
            const startIdx = Math.floor(x * scale);
            const endIdx = Math.min(Math.floor((x + 1) * scale), visitors.length);
            let sum = 0;
            for (let i = startIdx; i < endIdx; i++) {
              sum += visitors[i];
            }
            value = sum / (endIdx - startIdx);
          } else {
            value = visitors[dataIndex];
          }
          
          const normalizedValue = (value / maxVisitors) * chartHeight;
          
          if (y === 0) {
            // X-axis
            line += '─';
          } else if (normalizedValue >= y) {
            // Data point at this height
            line += chalk.cyan('█');
          } else {
            // Empty space
            line += ' ';
          }
        }
        
        // Y-axis labels (at regular intervals)
        if (y === chartHeight || y === 0 || y % 3 === 0) {
          const yValue = Math.round((y / chartHeight) * maxVisitors);
          line += y === 0 ? '' : ` ${yValue}`;
        }
        
        console.log(line);
      }
      
      // X-axis labels (evenly distributed)
      const labelSpacing = Math.max(Math.floor(scaledWidth / 10), 1); // Show at most 10 labels
      let xLabels = '';
      let labelPos = 0;
      
      for (let i = 0; i < scaledWidth; i += labelSpacing) {
        const dataIndex = Math.floor(i * scale);
        if (dataIndex < dates.length) {
          const dateLabel = dates[dataIndex].toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
          const paddedLabel = dateLabel.padStart(labelPos === 0 ? dateLabel.length : labelSpacing, ' ');
          xLabels += paddedLabel;
          labelPos += paddedLabel.length;
        }
      }
      console.log(xLabels);
      
      console.log(`\nMax visitors: ${maxVisitors}`);
    }
    
    // Always show the text representation for detail, but make it compact
    console.log('\nVisitor count by day:');
    let textLine = '';
    let count = 0;
    
    data.forEach((point, index) => {
      const date = new Date(point.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
      const entry = `${date}: ${point.visitors}`;
      textLine += entry.padEnd(12, ' ');
      count++;
      
      // Break into multiple lines, about 6 items per line (80 chars ÷ 12 chars per item)
      if (count % 6 === 0 || index === data.length - 1) {
        console.log(textLine);
        textLine = '';
      }
    });
  } catch (err) {
    console.error('Error creating chart:', err);
    
    // Fallback to simple text representation
    console.log('Visitor count by day:');
    data.forEach(point => {
      const date = new Date(point.date).toLocaleDateString();
      console.log(`${date}: ${point.visitors} visitors`);
    });
  }
}

export function setupPlausibleCommand(program: Command): void {
  const plausible = program
    .command('plausible')
    .description('Plausible analytics commands');

  plausible
    .command('sites')
    .description('List all sites')
    .option('-c, --csv <filename>', 'Export to CSV file')
    .action(async (options) => {
      try {
        const sites = await getSites();
        
        // CSV export
        if (options.csv) {
          const headers = ['domain', 'timezone'];
          const csvRows = [headers.join(',')];
          
          sites.forEach(site => {
            const row = [`"${site.domain}"`, `"${site.timezone}"`];
            csvRows.push(row.join(','));
          });
          
          const csvContent = csvRows.join('\n');
          fs.writeFileSync(options.csv, csvContent);
          console.log(chalk.green(`\nExported to ${options.csv}`));
        }
        
        console.log(chalk.bold('\nPlausible Sites:'));
        const table = new Table({
          head: [chalk.cyan('#'), chalk.cyan('Domain'), chalk.cyan('Timezone')],
          colWidths: [5, 30, 25]
        });
        
        sites.forEach((site, index) => {
          table.push([
            index + 1,
            site.domain,
            site.timezone
          ]);
        });
        
        console.log(table.toString());
      } catch (error) {
        console.error('Error listing sites:', error);
      }
    });

  plausible
    .command('metrics')
    .description('List all available metrics')
    .action(() => {
      console.log(chalk.bold('\nAvailable Breakdown Metrics:'));
      const table = new Table({
        head: [chalk.cyan('#'), chalk.cyan('Metric Key'), chalk.cyan('Description')],
        colWidths: [5, 25, 40]
      });
      
      Object.entries(BREAKDOWN_METRICS).forEach(([key, { label }], index) => {
        table.push([
          index + 1,
          key,
          label
        ]);
      });
      
      console.log(table.toString());
      console.log('\nUse these metric keys with the stats command:');
      console.log(chalk.yellow('  pnpm cms plausible stats -s yoursite.com -m visit:browser'));
    });

  plausible
    .command('stats')
    .description('Show statistics for a site')
    .option('-s, --site <site>', 'Site domain')
    .option('-p, --period <period>', 'Time period (day, yesterday, 7d, 30d, month)', '30d')
    .option('-l, --limit <limit>', 'Number of results to show', '10')
    .option('-m, --metrics <metrics>', 'Metrics to show (comma-separated)', 'event:page,visit:referrer,visit:country')
    .option('-c, --csv <directory>', 'Export to CSV files in the specified directory')
    .option('-v, --visualize', 'Show visualizations', false)
    .action(async (options) => {
      try {
        // Get sites if no site specified
        let siteId = options.site;
        if (!siteId) {
          const sites = await getSites();
          if (sites.length === 0) {
            console.error('No sites found');
            return;
          }
          siteId = sites[0].domain;
        }

        const limit = parseInt(options.limit);
        const period = options.period;
        const metrics = options.metrics.split(',');
        
        // Create CSV directory if needed
        if (options.csv) {
          if (!fs.existsSync(options.csv)) {
            fs.mkdirSync(options.csv, { recursive: true });
          }
        }
        
        // Print header
        console.log(chalk.bold(`\nPlausible Analytics for ${chalk.green(siteId)} - ${formatPeriod(period)}`));
        
        // Fetch time series data for visualization
        if (options.visualize) {
          try {
            const timeSeriesData = await getTimeSeries(siteId, period);
            if (timeSeriesData && timeSeriesData.results) {
              plotTimeSeriesChart(timeSeriesData.results);
            } else {
              console.error('No time series data available in response');
            }
          } catch (err) {
            console.error('Could not fetch time series data for visualization');
          }
        }
        
        // Fetch all requested metrics in parallel
        const results = await Promise.all(
          metrics.map(async (metric: string) => {
            if (!BREAKDOWN_METRICS[metric as keyof typeof BREAKDOWN_METRICS]) {
              console.error(`Unknown metric: ${metric}. Run 'pnpm cms plausible metrics' to see available metrics.`);
              return { metric, data: [] };
            }
            
            try {
              const data = await getBreakdown(siteId, period, metric, limit);
              return { metric, data };
            } catch (err) {
              console.error(`Error fetching ${metric} data`);
              return { metric, data: [] };
            }
          })
        );
        
        // Display results
        for (const { metric, data } of results) {
          if (data.length === 0) continue;
          
          // Type assertion to access the BREAKDOWN_METRICS
          const metricKey = metric as keyof typeof BREAKDOWN_METRICS;
          const { label, property } = BREAKDOWN_METRICS[metricKey];
          displayTable(`Top ${label}`, data, property);
          
          // Export to CSV if requested
          if (options.csv) {
            const filename = path.join(options.csv, `${siteId}_${metric.replace(':', '_')}_${period}.csv`);
            exportToCsv(data, property, filename);
          }
        }
        
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    });
}

// Direct invocation for testing
if (require.main === module) {
  const program = new Command();
  setupPlausibleCommand(program);
  program.parse(process.argv);
}