import dotenv from 'dotenv';
import { PlausibleClient } from './plausibleClient';
import { PlausibleBreakdownParams } from './types';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Load environment variables
dotenv.config();

let apiKey = process.env.PLAUSIBLE_API_KEY;
let siteId = process.env.PLAUSIBLE_SITE_ID;

// If API key isn't in environment, try to get it from 1Password
if (!apiKey) {
  try {
    console.log('PLAUSIBLE_API_KEY not found in environment, trying 1Password...');
    
    // Check if op is available and user is signed in
    try {
      const opVersion = execSync('op --version', { encoding: 'utf8' });
      console.log(`1Password CLI version: ${opVersion.trim()}`);
    } catch (error) {
      console.error('1Password CLI is not installed or not in PATH');
      throw error;
    }
    
    // Try to read from 1Password - make sure user is signed in
    const result = execSync('op read "op://Development/plausible api/notesPlain"', { encoding: 'utf8' });
    console.log('Successfully read 1Password note');
    
    // In this case, the entire content is the API key
    console.log('Found API key in 1Password');
    apiKey = result.trim();
    
    // Default site ID to thefocus.ai if not specified in environment
    if (!siteId) {
      console.log('Using default site ID: thefocus.ai');
      siteId = 'thefocus.ai';
    }
  } catch (error) {
    console.error('Failed to retrieve credentials from 1Password. Make sure you are signed in to 1Password CLI.');
    console.error('Run "op signin" first if needed.');
    console.error(error);
  }
}

if (!apiKey) {
  console.error('Error: PLAUSIBLE_API_KEY is not set in environment variables or 1Password');
  process.exit(1);
}

if (!siteId) {
  console.error('Error: PLAUSIBLE_SITE_ID is not set in environment variables or 1Password');
  process.exit(1);
}

const saveResultsToFile = (data: any, filename: string): void => {
  const outputDir = path.join(__dirname, '../output');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Results saved to ${filePath}`);
};

async function main() {
  try {
    const client = new PlausibleClient({
      apiKey: apiKey as string,
    });

    // Get list of sites the API key has access to
    console.log('Fetching list of sites...');
    try {
      const sites = await client.getSites();
      saveResultsToFile(sites, 'sites.json');
      console.log('Sites data saved to output/sites.json');
      
      // If sites data is available, we'll use the first site's ID
      if (Array.isArray(sites) && sites.length > 0) {
        siteId = sites[0].domain;
        console.log(`Using site ID from API: ${siteId}`);
      }
    } catch (error) {
      console.error('Error fetching sites. This endpoint might not be available in the API:', error);
      console.log(`Using provided site ID: ${siteId}`);
    }

    // Example: Get page breakdown for the last 30 days
    const pageParams: PlausibleBreakdownParams = {
      site_id: siteId as string,
      period: '30d',
      property: 'event:page',
      limit: 100,
    };

    console.log('Fetching page breakdown data...');
    const pageResults = await client.getAllBreakdownPages(pageParams);
    saveResultsToFile(pageResults, 'page_breakdown.json');

    // Example: Get country breakdown for the last 30 days
    const countryParams: PlausibleBreakdownParams = {
      site_id: siteId as string,
      period: '30d',
      property: 'visit:country',
      limit: 100,
    };

    console.log('Fetching country breakdown data...');
    const countryResults = await client.getAllBreakdownPages(countryParams);
    saveResultsToFile(countryResults, 'country_breakdown.json');

    // Example: Get referrer breakdown for the last 30 days
    const referrerParams: PlausibleBreakdownParams = {
      site_id: siteId as string,
      period: '30d',
      property: 'visit:referrer',
      limit: 100,
    };

    console.log('Fetching referrer breakdown data...');
    const referrerResults = await client.getAllBreakdownPages(referrerParams);
    saveResultsToFile(referrerResults, 'referrer_breakdown.json');

    console.log('All data fetched successfully!');
  } catch (error) {
    console.error('Error in main execution:', error);
  }
}

main();