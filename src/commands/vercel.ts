import { execSync } from 'child_process';
import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import * as fs from 'fs';
import * as path from 'path';
import { VercelClient } from '../vercelClient';
import { VercelProject, VercelDeployment, VercelLog } from '../types/vercel';

// No global variables

let apiToken: string | null = null;

// Get API token from 1Password if not in environment
async function getApiToken(): Promise<string> {
  if (apiToken) return apiToken;
  
  // Try from environment first
  if (process.env.VERCEL_API_TOKEN) {
    apiToken = process.env.VERCEL_API_TOKEN;
    return apiToken;
  }
  
  try {
    console.log('VERCEL_API_TOKEN not found in environment, trying 1Password...');
    const result = execSync('op read "op://Development/vercel api/notesPlain"', { encoding: 'utf8' });
    apiToken = result.trim();
    return apiToken;
  } catch (error) {
    console.error('Error retrieving API token from 1Password:', error);
    throw new Error('Could not get Vercel API token. Set VERCEL_API_TOKEN environment variable or configure 1Password CLI.');
  }
}

// Create authenticated client
async function createClient(): Promise<VercelClient> {
  const token = await getApiToken();
  return new VercelClient({ apiToken: token });
}

// Format date to human readable
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

// Get colored status text based on the deployment state
function getStatusColor(state: string): string {
  if (!state) return chalk.gray('Unknown');
  
  const status = state.toLowerCase();
  
  switch (status) {
    case 'ready':
    case 'complete':
    case 'completed':
    case 'success':
      return chalk.green(state);
      
    case 'error':
    case 'failed':
    case 'failure':
    case 'canceled':
      return chalk.red(state);
      
    case 'building':
    case 'build':
    case 'deploying':
    case 'pending':
      return chalk.yellow(state);
      
    case 'initializing':
    case 'analyzing':
    case 'staged':
      return chalk.blue(state);
      
    case 'queued':
    case 'waiting':
    case 'planned':
      return chalk.cyan(state);
      
    default:
      return state;
  }
}

// Export data to JSON
function exportToJson(data: any, filename: string) {
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(chalk.green(`\nExported to ${filename}`));
}

export function setupVercelCommand(program: Command): void {
  const vercel = program
    .command('vercel')
    .description('Vercel project management commands');

  vercel
    .command('projects')
    .description('List all Vercel projects with deployment status')
    .option('-j, --json <filename>', 'Export to JSON file')
    .option('-v, --verbose', 'Show more details including URLs')
    .option('-d, --debug', 'Show debugging information about project structure')
    .action(async (options) => {
      try {
        console.log(chalk.blue('Fetching Vercel projects (this may take a moment)...'));
        
        const client = await createClient();
        const projects = await client.getProjects();
        
        // If debug mode is requested, print the first project's structure
        if (options.debug && projects.length > 0) {
          console.log('\nProject structure (first project):');
          console.log(JSON.stringify(projects[0], null, 2));
          if (projects[0].latestDeployments && projects[0].latestDeployments.length > 0) {
            console.log('\nLatest deployment structure:');
            console.log(JSON.stringify(projects[0].latestDeployments[0], null, 2));
          }
        }
        
        // Export to JSON if requested
        if (options.json) {
          exportToJson(projects, options.json);
        }
        
        console.log(chalk.bold('\nVercel Projects:'));
        
        const tableHeaders = [
          chalk.cyan('#'), 
          chalk.cyan('Project Name'),
          chalk.cyan('Latest Deploy Status'),
          chalk.cyan('Last Successful'),
          chalk.cyan('Framework'),
          chalk.cyan('Project ID')
        ];
        
        if (options.verbose) {
          tableHeaders.push(chalk.cyan('URL'), chalk.cyan('Deploy ID'));
        }
        
        const table = new Table({
          head: tableHeaders,
          colWidths: options.verbose 
            ? [3, 25, 15, 25, 15, 25, 30, 25] 
            : [3, 25, 15, 25, 15, 25]
        });
        
        // No caching
        
        projects.forEach((project, index) => {
          // Check for deployments
          const hasDeployments = project.latestDeployments && project.latestDeployments.length > 0;
          
          // Get the latest deployment (could be any status)
          const latestDeployment = hasDeployments ? project.latestDeployments[0] : null;
          
          // Find the last successful deployment (ready state equals "READY")
          let lastSuccessfulDeployment = null;
          if (hasDeployments) {
            // Try to find a successful deployment in the latest deployments
            lastSuccessfulDeployment = project.latestDeployments.find(d => 
              (d.readyState && d.readyState.toLowerCase() === 'ready') ||
              (d.status && d.status.toLowerCase() === 'ready')
            );
          }
          
          // Fallback in case we need to check both readyState and status fields
          const getDeploymentStatus = (deployment: any) => {
            if (!deployment) return chalk.gray('No Deployments');
            return deployment.readyState 
              ? getStatusColor(deployment.readyState)
              : (deployment.status ? getStatusColor(deployment.status) : chalk.gray('Unknown'));
          };
          
          // Format last successful deployment date
          let lastSuccessfulDate = chalk.gray('Never');
          if (lastSuccessfulDeployment) {
            // Try different date fields (created, createdAt)
            if (lastSuccessfulDeployment.created) {
              lastSuccessfulDate = formatDate(lastSuccessfulDeployment.created);
            } else if (lastSuccessfulDeployment.createdAt) {
              // createdAt might be a timestamp in milliseconds
              const date = new Date(
                typeof lastSuccessfulDeployment.createdAt === 'number'
                  ? lastSuccessfulDeployment.createdAt 
                  : Number(lastSuccessfulDeployment.createdAt)
              );
              lastSuccessfulDate = formatDate(date.toISOString());
            }
          }
          
          // Build the row with deployment info if available
          const row = [
            index + 1,
            project.name,
            getDeploymentStatus(latestDeployment),
            lastSuccessfulDate,
            project.framework || chalk.gray('Unknown'),
            project.id
          ];
          
          if (options.verbose) {
            // Add URL and deployment ID if verbose mode is enabled
            row.push(
              latestDeployment && latestDeployment.url ? latestDeployment.url : chalk.gray('N/A'),
              latestDeployment && latestDeployment.id ? latestDeployment.id : chalk.gray('N/A')
            );
          }
          
          table.push(row);
        });
        
        console.log(table.toString());
        console.log(`\nTotal projects: ${projects.length}`);
        console.log(chalk.yellow('\nTip: Use `vercel deployments -p <project-id>` to see all deployments for a project'));
        console.log(chalk.yellow('Tip: Use `vercel logs -p <project-id>` to see logs for the active deployment of a project'));
        console.log(chalk.yellow('Tip: Use `vercel logs -d <deployment-id>` to see logs for a specific deployment'));
        console.log(chalk.yellow('Tip: Use --debug flag to see raw project and deployment data structure'));
      } catch (error) {
        console.error('Error listing projects:', error);
      }
    });

  vercel
    .command('deployments')
    .description('List deployments for a project')
    .requiredOption('-p, --project <projectId>', 'Project ID or name')
    .option('-l, --limit <limit>', 'Number of deployments to show', '10')
    .option('-j, --json <filename>', 'Export to JSON file')
    .option('-s, --success-only', 'Show only successful deployments')
    .action(async (options) => {
      try {
        const client = await createClient();
        
        // Try to get project by ID or name
        let project: VercelProject;
        let projectId: string;
        
        try {
          // Try to get project details directly by ID
          projectId = options.project;
          project = await client.getProject(projectId);
        } catch (error) {
          // If that fails, try to find by name
          try {
            // Get all projects
            const projects = await client.getProjects();
            // Find the one with matching name
            const projectByName = projects.find(p => p.name === options.project);
            
            if (!projectByName) {
              console.error(chalk.red(`Project not found with identifier: ${options.project}`));
              console.log(chalk.yellow('Run `vercel projects` to see the list of available projects'));
              return;
            }
            
            project = projectByName;
            projectId = project.id;
          } catch (err) {
            console.error(chalk.red(`Error finding project: ${options.project}`));
            console.log(chalk.yellow('Run `vercel projects` to see the list of available projects'));
            return;
          }
        }
        
        const limit = parseInt(options.limit);
        const deployments = await client.getDeployments(projectId, limit);
        
        // Filter for successful deployments if requested
        let filteredDeployments = deployments;
        if (options.successOnly) {
          filteredDeployments = deployments.filter(d => {
            // Check both readyState and status fields for success state
            const state = d.readyState || d.status || '';
            return state.toLowerCase() === 'ready' || 
                   state.toLowerCase() === 'complete' || 
                   state.toLowerCase() === 'success';
          });
        }
        
        // Export to JSON if requested
        if (options.json) {
          exportToJson(filteredDeployments, options.json);
        }
        
        const successFilter = options.successOnly ? ' (successful only)' : '';
        console.log(chalk.bold(`\nDeployments for ${chalk.green(project.name)}${successFilter}:`));
        const table = new Table({
          head: [
            chalk.cyan('#'), 
            chalk.cyan('Deployment ID'),
            chalk.cyan('Status'), 
            chalk.cyan('Created'),
            chalk.cyan('URL'),
            chalk.cyan('Target')
          ],
          colWidths: [3, 25, 15, 25, 35, 10]
        });
        
        filteredDeployments.forEach((deployment, index) => {
          // Get status from either readyState or status field
          const status = deployment.readyState || deployment.status || 'Unknown';
          
          // Get the created date from either created (string) or createdAt (number)
          let createdDate;
          if (deployment.created) {
            createdDate = formatDate(deployment.created);
          } else if (deployment.createdAt) {
            const date = new Date(
              typeof deployment.createdAt === 'number'
                ? deployment.createdAt
                : Number(deployment.createdAt)
            );
            createdDate = formatDate(date.toISOString());
          } else {
            createdDate = chalk.gray('Unknown');
          }
          
          table.push([
            index + 1,
            deployment.id,
            getStatusColor(status),
            createdDate,
            deployment.url || chalk.gray('N/A'),
            deployment.target || chalk.gray('N/A')
          ]);
        });
        
        console.log(table.toString());
        
        if (filteredDeployments.length === 0) {
          console.log(chalk.yellow('No deployments found matching the criteria'));
        } else {
          console.log(chalk.gray(`\nShowing ${filteredDeployments.length} of ${deployments.length} deployments`));
          console.log(chalk.yellow('\nTip: Use `vercel logs -d <deployment-id>` to see logs for a specific deployment'));
          console.log(chalk.yellow('Tip: Use `vercel logs -p <project-id>` to see logs for the active deployment'));
        }
      } catch (error) {
        console.error('Error listing deployments:', error);
      }
    });

  vercel
    .command('logs')
    .description('Show logs for a deployment or active deployment of a project')
    .option('-d, --deployment <deploymentId>', 'Deployment ID')
    .option('-p, --project <projectId>', 'Project ID or name')
    .option('-j, --json <filename>', 'Export to JSON file')
    .option('-f, --filter <type>', 'Filter logs by type (error, stdout, deployment-state, etc.)')
    .option('-l, --limit <number>', 'Limit the number of logs shown', '100')
    .action(async (options) => {
      if (!options.deployment && !options.project) {
        console.error(chalk.red('Error: Either --deployment or --project option is required'));
        console.log(chalk.yellow('Use --deployment to specify a deployment ID'));
        console.log(chalk.yellow('Use --project to get logs from the active deployment of a project'));
        return;
      }
      
      try {
        const client = await createClient();
        let deploymentId = options.deployment;
        let projectName = '';
        
        // If project is specified but not deployment, find the active deployment
        if (options.project && !deploymentId) {
          let project: VercelProject;
          const projectId = options.project;
          
          try {
            // First try to get project details directly by ID
            project = await client.getProject(projectId);
          } catch (error) {
            // If that fails, try to find by name
            try {
              // Get all projects
              const projects = await client.getProjects();
              // Find the one with matching name
              const projectByName = projects.find(p => p.name === projectId);
              
              if (!projectByName) {
                console.error(chalk.red(`Project not found with identifier: ${projectId}`));
                console.log(chalk.yellow('Run `vercel projects` to see the list of available projects'));
                return;
              }
              
              project = projectByName;
            } catch (err) {
              console.error(chalk.red(`Error finding project: ${projectId}`));
              console.log(chalk.yellow('Run `vercel projects` to see the list of available projects'));
              return;
            }
          }
          
          projectName = project.name;
          
          // Get deployments for the project
          const deployments = await client.getDeployments(project.id, 10);
          
          if (deployments.length === 0) {
            console.error(chalk.red(`No deployments found for project: ${project.name}`));
            return;
          }
          
          // Find the active deployment (production or latest ready)
          let activeDeployment = deployments.find(d => {
            const state = d.readyState || d.status || '';
            const isReady = ['ready', 'complete', 'success'].includes(state.toLowerCase());
            const isProduction = d.target === 'production';
            return isReady && isProduction;
          });
          
          // If no production deployment is ready, just use the latest ready one
          if (!activeDeployment) {
            activeDeployment = deployments.find(d => {
              const state = d.readyState || d.status || '';
              return ['ready', 'complete', 'success'].includes(state.toLowerCase());
            });
          }
          
          // If still no ready deployment, use the latest one
          if (!activeDeployment) {
            activeDeployment = deployments[0];
          }
          
          deploymentId = activeDeployment.id;
          console.log(chalk.blue(`Using active deployment (${deploymentId}) from project: ${project.name}`));
        }
        
        const logs = await client.getDeploymentLogs(deploymentId);
        
        // Export to JSON if requested
        if (options.json) {
          exportToJson(logs, options.json);
        }
        
        const headerTitle = projectName 
          ? `Logs for project ${chalk.green(projectName)} (deployment: ${chalk.yellow(deploymentId)}):`
          : `Logs for deployment ${chalk.yellow(deploymentId)}:`;
        
        console.log(chalk.bold(`\n${headerTitle}`));
        console.log('--------------------------------------------------');
        
        // Apply filters and limits
        let filteredLogs = logs;
        if (options.filter) {
          filteredLogs = logs.filter(log => log.type === options.filter);
        }
        
        // Sort by creation time (newest first)
        filteredLogs.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
        
        // Apply limit
        const limit = parseInt(options.limit);
        if (!isNaN(limit) && limit > 0) {
          filteredLogs = filteredLogs.slice(0, limit);
        }
        
        // Reverse to show in chronological order
        filteredLogs.reverse();
        
        // Group logs by type for better readability
        const logGroups = new Map<string, VercelLog[]>();
        filteredLogs.forEach(log => {
          if (!logGroups.has(log.type)) {
            logGroups.set(log.type, []);
          }
          logGroups.get(log.type)!.push(log);
        });
        
        // If errors exist, show them first
        if (logGroups.has('error')) {
          console.log(chalk.red.bold('\n🚨 ERRORS:'));
          logGroups.get('error')!.forEach(log => {
            const timestamp = formatDate(log.created);
            const errorMsg = log.payload.error?.message || 'Unknown error';
            const stack = log.payload.error?.stack ? `\n${log.payload.error.stack}` : '';
            console.log(`${chalk.gray(timestamp)} ${chalk.red(errorMsg)}${stack}`);
          });
        }
        
        // Show deployment state changes
        if (logGroups.has('deployment-state')) {
          console.log(chalk.blue.bold('\n🔄 DEPLOYMENT STATES:'));
          logGroups.get('deployment-state')!.forEach(log => {
            const timestamp = formatDate(log.created);
            const state = log.payload.state || 'unknown';
            console.log(`${chalk.gray(timestamp)} ${chalk.yellow(`State: ${state}`)}`);
          });
        }
        
        // Show stdout
        if (logGroups.has('stdout')) {
          console.log(chalk.green.bold('\n📃 STANDARD OUTPUT:'));
          logGroups.get('stdout')!.forEach(log => {
            const timestamp = formatDate(log.created);
            const text = log.payload.text || '';
            console.log(`${chalk.gray(timestamp)} ${text}`);
          });
        }
        
        // Show all other log types
        const handledTypes = ['error', 'deployment-state', 'stdout'];
        logGroups.forEach((logs, type) => {
          if (!handledTypes.includes(type)) {
            console.log(chalk.blue.bold(`\n📋 ${type.toUpperCase()}:`));
            logs.forEach(log => {
              const timestamp = formatDate(log.created);
              console.log(`${chalk.gray(timestamp)} ${JSON.stringify(log.payload, null, 2)}`);
            });
          }
        });
        
        if (filteredLogs.length === 0) {
          console.log(chalk.yellow('No logs found matching the specified criteria'));
        } else {
          console.log(chalk.gray(`\nShowing ${filteredLogs.length} logs of ${logs.length} total`));
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    });
}

// Direct invocation for testing
if (require.main === module) {
  const program = new Command();
  setupVercelCommand(program);
  program.parse(process.argv);
}