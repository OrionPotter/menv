import { cwd } from "node:process";
import { homedir } from "node:os";
import { join } from "node:path";
import { readJsonFile, writeJsonFile, findUp } from "../utils/fs";
import { GlobalConfig, ProfileConfig, ProjectConfig } from "../types";

const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  defaultClient: "codex",
  currentProfiles: {},
  profiles: {},
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

  async setCurrentProfile(client: string, profileName: string, scope: "global" | "project"): Promise<void> {
    if (scope === "project") {
      const projectConfig = (await this.readProjectConfig()) ?? {};
      projectConfig.profile = profileName;
      await this.writeProjectConfig(projectConfig);
      return;
    }

    const globalConfig = await this.readGlobalConfig();
    globalConfig.currentProfiles[client] = profileName;
    await this.writeGlobalConfig(globalConfig);
  }

  async upsertProfile(name: string, profile: ProfileConfig): Promise<void> {
    const globalConfig = await this.readGlobalConfig();
    globalConfig.profiles[name] = {
      ...globalConfig.profiles[name],
      ...profile
    };
    await this.writeGlobalConfig(globalConfig);
  }

  async removeProfile(name: string): Promise<void> {
    const globalConfig = await this.readGlobalConfig();
    delete globalConfig.profiles[name];
    for (const client of Object.keys(globalConfig.currentProfiles)) {
      if (globalConfig.currentProfiles[client] === name) {
        delete globalConfig.currentProfiles[client];
      }
    }
    delete globalConfig.aliases[name];
    await this.writeGlobalConfig(globalConfig);
  }

  async setAlias(name: string, profileName: string): Promise<void> {
    const globalConfig = await this.readGlobalConfig();
    globalConfig.aliases[name] = profileName;
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
      defaultClient: config?.defaultClient ?? DEFAULT_GLOBAL_CONFIG.defaultClient,
      currentProfiles: {
        ...DEFAULT_GLOBAL_CONFIG.currentProfiles,
        ...(config?.currentProfiles ?? {})
      },
      profiles: {
        ...DEFAULT_GLOBAL_CONFIG.profiles,
        ...(config?.profiles ?? {})
      },
      aliases: {
        ...DEFAULT_GLOBAL_CONFIG.aliases,
        ...(config?.aliases ?? {})
      }
    };
  }
}
