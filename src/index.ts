#!/usr/bin/env node

import { Command } from "commander";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { setupPlausibleCommand } from "./commands/plausible";
import { setupVercelCommand } from "./commands/vercel";

// Load environment variables
dotenv.config();

// No global cache needed

// Create the program
const program = new Command();
program.version("1.0.0");

// Check for API debugging
const isApiDebugEnabled = process.env.API_DEBUG === '1' || process.env.API_DEBUG === 'true';
if (isApiDebugEnabled) {
  console.log('🔍 API Debug mode is enabled. API responses will be logged to api_log/ directory');
  // Ensure the api_log directory exists
  const logDir = path.join(process.cwd(), 'api_log');
  fs.mkdirSync(logDir, { recursive: true });
}

// Set up commands
setupPlausibleCommand(program);
setupVercelCommand(program);

// Debug command
program
  .command('debug')
  .description('Enable or disable API debug logging')
  .option('-e, --enable', 'Enable API debug logging')
  .option('-d, --disable', 'Disable API debug logging')
  .option('-c, --clear', 'Clear all API debug logs')
  .action((options) => {
    if (options.enable) {
      // Create a .env file if it doesn't exist
      const envPath = path.join(process.cwd(), '.env');
      let envContent = '';
      
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
        // Replace existing API_DEBUG setting
        if (envContent.match(/API_DEBUG\s*=.*/)) {
          envContent = envContent.replace(/API_DEBUG\s*=.*/, 'API_DEBUG=true');
        } else {
          // Append to file
          envContent += '\nAPI_DEBUG=true\n';
        }
      } else {
        // Create new file
        envContent = 'API_DEBUG=true\n';
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log('✅ API debug logging enabled. Restart the application for changes to take effect.');
      console.log('   API responses will be logged to the api_log/ directory.');
    }
    
    if (options.disable) {
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        // Replace existing API_DEBUG setting
        if (envContent.match(/API_DEBUG\s*=.*/)) {
          envContent = envContent.replace(/API_DEBUG\s*=.*/, 'API_DEBUG=false');
          fs.writeFileSync(envPath, envContent);
        }
      }
      console.log('❌ API debug logging disabled. Restart the application for changes to take effect.');
    }
    
    if (options.clear) {
      const logDir = path.join(process.cwd(), 'api_log');
      if (fs.existsSync(logDir)) {
        // Clear all log files recursively
        const clearDirectory = (dir: string) => {
          const files = fs.readdirSync(dir);
          files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
              clearDirectory(filePath);
              fs.rmdirSync(filePath);
            } else {
              fs.unlinkSync(filePath);
            }
          });
        };
        
        clearDirectory(logDir);
        console.log('🗑️  All API debug logs cleared.');
      } else {
        console.log('❓ No API debug logs found.');
      }
    }
    
    // If no options provided, show current status
    if (!options.enable && !options.disable && !options.clear) {
      if (isApiDebugEnabled) {
        console.log('🔍 API Debug mode is currently ENABLED.');
        
        // Count log files
        const countLogFiles = (dir: string): number => {
          let count = 0;
          if (!fs.existsSync(dir)) return 0;
          
          const files = fs.readdirSync(dir);
          files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
              count += countLogFiles(filePath);
            } else {
              count++;
            }
          });
          return count;
        };
        
        const logCount = countLogFiles(path.join(process.cwd(), 'api_log'));
        console.log(`   ${logCount} API log files stored in api_log/ directory.`);
        console.log('   Use --disable to turn off API debug logging');
        console.log('   Use --clear to delete all log files');
      } else {
        console.log('❌ API Debug mode is currently DISABLED.');
        console.log('   Use --enable to turn on API debug logging');
      }
    }
  });

// Parse args
program.parse(process.argv);

// Display help if no args
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
