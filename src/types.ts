export type ProviderName = "openai" | "anthropic" | "openrouter" | string;

export interface ProviderConfig {
  apiKeyEnv?: string;
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
  organization?: string;
  region?: string;
  deployment?: string;
  headers?: Record<string, string>;
}

export interface GlobalConfig {
  defaultTarget?: string;
  providers: Record<string, ProviderConfig>;
  aliases: Record<string, string>;
}

export interface ProjectConfig {
  target?: string;
}

export interface ResolvedTarget {
  provider?: string;
  model?: string;
  apiKeyEnv?: string;
  apiKey?: string;
  apiKeyPresent: boolean;
  baseURL?: string;
  organization?: string;
  region?: string;
  deployment?: string;
  resolvedFrom: {
    target: string;
    model: string;
    apiKeyEnv: string;
    apiKey: string;
    baseURL: string;
    organization: string;
    region: string;
    deployment: string;
  };
}

export interface ModelInfo {
  id: string;
  name?: string;
  description?: string;
}

export interface RunTextInput {
  prompt: string;
  target: ResolvedTarget;
}

export interface RunTextResult {
  provider: string;
  model: string;
  text: string;
  requestId?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

export interface ValidationIssue {
  level: "info" | "warn" | "error";
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

export interface ProviderAdapter {
  readonly name: string;
  validate(target: ResolvedTarget): ValidationResult;
  listModels(target: ResolvedTarget): Promise<ModelInfo[]>;
  runText(input: RunTextInput): Promise<RunTextResult>;
}
