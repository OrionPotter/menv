export interface ProfileConfig {
  provider?: string;
  baseURL?: string;
  apiKey?: string;
  apiKeyEnv?: string;
  model?: string;
  reasoningEffort?: string;
  organization?: string;
  region?: string;
  deployment?: string;
  headers?: Record<string, string>;
  extra?: Record<string, string>;
}

export interface GlobalConfig {
  defaultClient: string;
  currentProfiles: Record<string, string>;
  profiles: Record<string, ProfileConfig>;
  aliases: Record<string, string>;
}

export interface ProjectConfig {
  profile?: string;
}

export interface ResolvedProfile {
  client: string;
  profileName: string;
  profile: ProfileConfig;
  resolvedFrom: {
    profileName: string;
  };
}

export interface ClientRuntimeState {
  client: string;
  configPath: string;
  values: Record<string, string>;
}

export interface ClientApplyResult {
  client: string;
  configPath: string;
  updatedKeys: string[];
  backupPath?: string;
}

export interface ClientRollbackResult {
  client: string;
  configPath: string;
  backupPath: string;
}

export interface ValidationIssue {
  level: "info" | "warn" | "error";
  message: string;
}

export interface ClientAdapter {
  readonly name: string;
  getConfigPath(): string;
  readState(): Promise<ClientRuntimeState>;
  applyProfile(profileName: string, profile: ProfileConfig): Promise<ClientApplyResult>;
  rollback(): Promise<ClientRollbackResult>;
  compareProfile(state: ClientRuntimeState, profile: ProfileConfig): ValidationIssue[];
  validateProfile(profile: ProfileConfig): ValidationIssue[];
}
