import {
  VercelClientConfig,
  VercelProject,
  VercelDeployment,
  VercelLog,
} from "./types/vercel";
import { ApiLogger } from "./utils/apiLogger";

export class VercelClient {
  private baseUrl: string;
  private headers: HeadersInit;
  private logger: ApiLogger;

  constructor(config: VercelClientConfig) {
    this.baseUrl = config.baseUrl || "https://api.vercel.com";
    this.headers = {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    };
    this.logger = new ApiLogger('vercel');
  }

  private async request<T>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    try {
      const response = await fetch(url.toString(), {
        headers: this.headers,
      });

      if (!response.ok) {
        const errorData = await response.text();
        const error = new Error(
          `HTTP error! status: ${response.status}, message: ${errorData}`
        );
        
        // Log failed API call
        this.logger.logApiCall(endpoint, params, null, error);
        
        throw error;
      }

      const data = await response.json() as T;
      
      // Log successful API call
      this.logger.logApiCall(endpoint, params, data);
      
      return data;
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error making request:", error.message);
      } else {
        console.error("Error making request:", error);
        // Log unknown error format
        this.logger.logApiCall(endpoint, params, null, { message: "Unknown error" });
      }
      throw error;
    }
  }

  // Get list of projects with more detailed information
  async getProjects(): Promise<VercelProject[]> {
    try {
      // Request projects with basic information first
      const response = await this.request<{ projects: VercelProject[] }>("/v9/projects", {
        limit: 100
      });
      
      // For each project, get detailed information including deployments
      const projects = response.projects;
      const projectsWithDeployments = await Promise.all(
        projects.map(async (project) => {
          try {
            // Get project details including latest deployments
            const detailedProject = await this.request<VercelProject>(`/v9/projects/${project.id}`);
            
            // If the project doesn't have latest deployments, fetch them separately
            if (!detailedProject.latestDeployments || detailedProject.latestDeployments.length === 0) {
              try {
                // Fetch the most recent deployments
                const deployments = await this.getDeployments(project.id, 5);
                if (deployments.length > 0) {
                  return {
                    ...detailedProject,
                    latestDeployments: deployments
                  };
                }
              } catch (err) {
                // Silently fail, we'll just return the project without deployments
                console.error(`Could not fetch latest deployments for ${project.name}:`, err);
              }
            }
            
            return detailedProject;
          } catch (err) {
            // If we can't get details, just return the basic project
            console.error(`Could not fetch details for ${project.name}:`, err);
            return project;
          }
        })
      );
      
      return projectsWithDeployments;
    } catch (error) {
      console.error("Error fetching projects:", error);
      throw error;
    }
  }

  // Get a specific project
  async getProject(projectId: string): Promise<VercelProject> {
    try {
      return await this.request<VercelProject>(`/v9/projects/${projectId}`);
    } catch (error) {
      console.error(`Error fetching project ${projectId}:`, error);
      throw error;
    }
  }

  // Get deployments for a project
  async getDeployments(projectId: string, limit: number = 10): Promise<VercelDeployment[]> {
    try {
      const response = await this.request<{ deployments: VercelDeployment[] }>(`/v6/deployments`, {
        projectId,
        limit,
      });
      return response.deployments;
    } catch (error) {
      console.error(`Error fetching deployments for project ${projectId}:`, error);
      throw error;
    }
  }

  // Get logs for a deployment
  async getDeploymentLogs(deploymentId: string): Promise<VercelLog[]> {
    try {
      const response = await this.request<{ logs: VercelLog[] }>(`/v2/deployments/${deploymentId}/events`);
      return response.logs;
    } catch (error) {
      console.error(`Error fetching logs for deployment ${deploymentId}:`, error);
      throw error;
    }
  }
}