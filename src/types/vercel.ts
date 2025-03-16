export interface VercelClientConfig {
  apiToken: string;
  baseUrl?: string;
}

export interface VercelProject {
  id: string;
  name: string;
  accountId: string;
  createdAt: string;
  updatedAt: string;
  framework: string | null;
  latestDeployments?: VercelDeployment[];
  status?: string;
  targets?: {
    [key: string]: {
      alias: string[];
      createdAt: string;
      aliasError?: string | null;
    };
  };
  link?: {
    type: string;
    repo: string;
    org?: string;
    repoId?: number;
    createdAt?: number;
    deployHooks?: any[];
    gitCredentialId?: string;
    updatedAt?: number;
    sourceless?: boolean;
    productionBranch?: string;
  };
}

export interface VercelDeployment {
  id: string;
  url: string;
  name: string;
  meta?: {
    [key: string]: string;
  };
  target?: string;
  plan?: string;
  projectId: string;
  ownerId?: string;
  created: string;
  createdAt?: number;
  state?: string;
  status?: string;
  ready?: boolean;
  readyState: string;
  buildingAt?: string;
  creator?: {
    uid: string;
    username: string;
    email: string;
  };
  createdBy?: string;
  inspectorUrl?: string;
  aliasError?: string | null;
  aliasAssigned?: boolean;
  alias?: string[];
  lambdas?: any[];
  regions?: string[];
  functionRegion?: string;
  redirectRoutes?: any[];
  deploymentHostname?: string;
  isRollbackCandidate?: boolean;
}

export interface VercelLog {
  id: string;
  type: string;
  created: string;
  payload: {
    text?: string;
    deploymentId?: string;
    projectId?: string;
    error?: {
      message?: string;
      stack?: string;
    };
    [key: string]: any;
  };
}