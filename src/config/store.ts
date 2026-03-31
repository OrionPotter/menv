import { cwd } from "node:process";
import { homedir } from "node:os";
import { join } from "node:path";
import { readJsonFile, writeJsonFile, findUp } from "../utils/fs";
import { GlobalConfig, ProjectConfig, ProviderConfig } from "../types";

const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  defaultTarget: undefined,
  providers: {
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
  },
  aliases: {}
};

export class ConfigStore {
  getGlobalConfigPath(): string {
    if (process.platform === "win32" && process.env.APPDATA) {
      return join(process.env.APPDATA, "mm", "config.json");
    }

    return join(homedir(), ".config", "mm", "config.json");
  }

  getProjectConfigPath(startDir = cwd()): string {
    const found = findUp(".mm.json", startDir);
    return found ?? join(startDir, ".mm.json");
  }

  async readGlobalConfig(): Promise<GlobalConfig> {
    const config = await readJsonFile<GlobalConfig>(this.getGlobalConfigPath());
    return this.mergeGlobalConfig(config);
  }

  async writeGlobalConfig(config: GlobalConfig): Promise<void> {
    await writeJsonFile(this.getGlobalConfigPath(), config);
  }

  async readProjectConfig(startDir = cwd()): Promise<ProjectConfig | undefined> {
    return readJsonFile<ProjectConfig>(this.getProjectConfigPath(startDir));
  }

  async writeProjectConfig(config: ProjectConfig, startDir = cwd()): Promise<void> {
    await writeJsonFile(this.getProjectConfigPath(startDir), config);
  }

  async setDefaultTarget(target: string, scope: "global" | "project"): Promise<void> {
    if (scope === "project") {
      const projectConfig = (await this.readProjectConfig()) ?? {};
      projectConfig.target = target;
      await this.writeProjectConfig(projectConfig);
      return;
    }

    const globalConfig = await this.readGlobalConfig();
    globalConfig.defaultTarget = target;
    await this.writeGlobalConfig(globalConfig);
  }

  async upsertProvider(provider: string, config: ProviderConfig): Promise<void> {
    const globalConfig = await this.readGlobalConfig();
    globalConfig.providers[provider] = {
      ...globalConfig.providers[provider],
      ...config
    };
    await this.writeGlobalConfig(globalConfig);
  }

  async removeProvider(provider: string): Promise<void> {
    const globalConfig = await this.readGlobalConfig();
    delete globalConfig.providers[provider];
    await this.writeGlobalConfig(globalConfig);
  }

  async setAlias(name: string, target: string): Promise<void> {
    const globalConfig = await this.readGlobalConfig();
    globalConfig.aliases[name] = target;
    await this.writeGlobalConfig(globalConfig);
  }

  async removeAlias(name: string): Promise<void> {
    const globalConfig = await this.readGlobalConfig();
    delete globalConfig.aliases[name];
    await this.writeGlobalConfig(globalConfig);
  }

  async setConfigValue(key: string, value: string): Promise<void> {
    const globalConfig = await this.readGlobalConfig();
    const path = key.split(".");

    let cursor: Record<string, unknown> = globalConfig as unknown as Record<string, unknown>;
    for (const segment of path.slice(0, -1)) {
      const next = cursor[segment];
      if (!next || typeof next !== "object" || Array.isArray(next)) {
        cursor[segment] = {};
      }
      cursor = cursor[segment] as Record<string, unknown>;
    }

    cursor[path[path.length - 1]] = value;
    await this.writeGlobalConfig(globalConfig);
  }

  async getConfigValue(key: string): Promise<unknown> {
    const globalConfig = await this.readGlobalConfig();
    return key.split(".").reduce<unknown>((acc, segment) => {
      if (!acc || typeof acc !== "object") {
        return undefined;
      }
      return (acc as Record<string, unknown>)[segment];
    }, globalConfig);
  }

  private mergeGlobalConfig(config?: GlobalConfig): GlobalConfig {
    return {
      defaultTarget: config?.defaultTarget ?? DEFAULT_GLOBAL_CONFIG.defaultTarget,
      providers: {
        ...DEFAULT_GLOBAL_CONFIG.providers,
        ...(config?.providers ?? {})
      },
      aliases: {
        ...DEFAULT_GLOBAL_CONFIG.aliases,
        ...(config?.aliases ?? {})
      }
    };
  }
}

