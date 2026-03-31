import { ConfigStore } from "../config/store";
import { ConfigError, ProfileNotFoundError } from "../errors";
import { ResolvedProfile } from "../types";

interface ResolveOptions {
  client: string;
  profileOverride?: string;
}

export class Resolver {
  constructor(private readonly store: ConfigStore) {}

  async resolveProfile(options: ResolveOptions): Promise<ResolvedProfile> {
    const globalConfig = await this.store.readGlobalConfig();
    const projectConfig = await this.store.readProjectConfig();

    const profileField = this.pickFirst<string>([
      { value: options.profileOverride, source: "command line" },
      { value: projectConfig?.profile, source: "project config" },
      { value: process.env.MM_PROFILE, source: "environment" },
      { value: globalConfig.currentProfiles[options.client], source: "global config" }
    ]);

    if (!profileField.value) {
      throw new ConfigError(`No active profile for client ${options.client}. Use \`mm use <profile>\` first.`);
    }

    const expandedProfileName = globalConfig.aliases[profileField.value] ?? profileField.value;
    const profile = globalConfig.profiles[expandedProfileName];
    if (!profile) {
      throw new ProfileNotFoundError(`Unknown profile: ${expandedProfileName}`);
    }

    const profileSource =
      globalConfig.aliases[profileField.value] && expandedProfileName !== profileField.value
        ? `${profileField.source} via alias`
        : profileField.source;

    return {
      client: options.client,
      profileName: expandedProfileName,
      profile,
      resolvedFrom: {
        profileName: profileSource
      }
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
