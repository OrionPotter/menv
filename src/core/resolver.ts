import { ConfigStore } from "../config/store";
import { ConfigError, ProviderNotFoundError } from "../errors";
import { ProviderConfig, ResolvedTarget } from "../types";

const BUILTIN_PROVIDER_DEFAULTS: Record<string, ProviderConfig> = {
  openai: {
    apiKeyEnv: "OPENAI_API_KEY",
    baseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4.1-mini"
  },
  anthropic: {
    apiKeyEnv: "ANTHROPIC_API_KEY",
    baseURL: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4-20250514"
  },
  openrouter: {
    apiKeyEnv: "OPENROUTER_API_KEY",
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "deepseek/deepseek-chat"
  }
};

interface ResolveOptions {
  targetOverride?: string;
}

export class Resolver {
  constructor(private readonly store: ConfigStore) {}

  async resolveCurrentTarget(options: ResolveOptions = {}): Promise<ResolvedTarget> {
    const globalConfig = await this.store.readGlobalConfig();
    const projectConfig = await this.store.readProjectConfig();

    const cliTarget = options.targetOverride;
    const projectTarget = projectConfig?.target;
    const envTarget = process.env.MM_TARGET;
    const globalTarget = globalConfig.defaultTarget;

    const targetField = this.pickFirst<string>([
      { value: cliTarget, source: "command line" },
      { value: projectTarget, source: "project config" },
      { value: envTarget, source: "environment" },
      { value: globalTarget, source: "global config" }
    ]);

    if (!targetField.value) {
      throw new ConfigError("No active target. Use `mm use <provider/model>` first.");
    }

    const expandedTarget = globalConfig.aliases[targetField.value] ?? targetField.value;
    const parsed = this.parseTarget(expandedTarget);
    const targetSource =
      globalConfig.aliases[targetField.value] && expandedTarget !== targetField.value
        ? `${targetField.source} via alias`
        : targetField.source;

    const providerConfig = globalConfig.providers[parsed.provider];
    const builtin = BUILTIN_PROVIDER_DEFAULTS[parsed.provider];

    if (!providerConfig && !builtin) {
      throw new ProviderNotFoundError(`Unknown provider: ${parsed.provider}`);
    }

    const modelField = this.pickFirst<string>([
      { value: parsed.model, source: targetSource },
      { value: process.env.MM_MODEL, source: "environment" },
      { value: providerConfig?.defaultModel, source: providerConfig?.defaultModel ? "global config" : "unset" },
      { value: builtin?.defaultModel, source: builtin?.defaultModel ? "provider builtin" : "unset" }
    ]);

    const mergedProvider = {
      ...builtin,
      ...providerConfig
    };

    const apiKeyEnvField = this.pickFirst<string>([
      { value: process.env.MM_API_KEY_ENV, source: "environment" },
      {
        value: mergedProvider.apiKeyEnv,
        source: providerConfig?.apiKeyEnv ? "global config" : builtin?.apiKeyEnv ? "provider builtin" : "unset"
      }
    ]);

    const apiKeyField = this.pickFirst<string>([
      { value: process.env.MM_API_KEY, source: "environment" },
      {
        value: mergedProvider.apiKey,
        source: providerConfig?.apiKey ? "global config" : "unset"
      }
    ]);

    const apiKey = apiKeyField.value ?? (apiKeyEnvField.value ? process.env[apiKeyEnvField.value] : undefined);
    const apiKeySource =
      apiKeyField.value
        ? apiKeyField.source
        : apiKeyEnvField.value && process.env[apiKeyEnvField.value]
          ? `environment variable ${apiKeyEnvField.value}`
          : apiKeyField.source;

    const baseURLField = this.pickFirst<string>([
      { value: process.env.MM_BASE_URL, source: "environment" },
      {
        value: mergedProvider.baseURL,
        source: providerConfig?.baseURL ? "global config" : builtin?.baseURL ? "provider builtin" : "unset"
      }
    ]);

    const organizationField = this.pickFirst<string>([
      { value: process.env.MM_ORGANIZATION, source: "environment" },
      { value: mergedProvider.organization, source: mergedProvider.organization ? "global config" : "unset" }
    ]);

    const regionField = this.pickFirst<string>([
      { value: process.env.MM_REGION, source: "environment" },
      { value: mergedProvider.region, source: mergedProvider.region ? "global config" : "unset" }
    ]);

    const deploymentField = this.pickFirst<string>([
      { value: process.env.MM_DEPLOYMENT, source: "environment" },
      { value: mergedProvider.deployment, source: mergedProvider.deployment ? "global config" : "unset" }
    ]);

    return {
      provider: parsed.provider,
      model: modelField.value,
      apiKeyEnv: apiKeyEnvField.value,
      apiKey,
      apiKeyPresent: Boolean(apiKey),
      baseURL: baseURLField.value,
      organization: organizationField.value,
      region: regionField.value,
      deployment: deploymentField.value,
      resolvedFrom: {
        target: targetSource,
        model: modelField.source,
        apiKeyEnv: apiKeyEnvField.source,
        apiKey: apiKeySource,
        baseURL: baseURLField.source,
        organization: organizationField.source,
        region: regionField.source,
        deployment: deploymentField.source
      }
    };
  }

  parseTarget(raw: string, aliases: Record<string, string> = {}): { provider: string; model?: string } {
    const expanded = aliases[raw] ?? raw;
    const [provider, ...rest] = expanded.split("/");

    if (!provider) {
      throw new ConfigError(`Invalid target: ${raw}`);
    }

    return {
      provider,
      model: rest.length > 0 ? rest.join("/") : undefined
    };
  }

  private pickFirst<T>(values: Array<{ value?: T; source: string }>): { value?: T; source: string } {
    for (const item of values) {
      if (item.value !== undefined && item.value !== "") {
        return item;
      }
    }

    return { value: undefined, source: "unset" };
  }
}
