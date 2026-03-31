import { homedir } from "node:os";
import { join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { ClientAdapter, ClientApplyResult, ClientRollbackResult, ClientRuntimeState, ProfileConfig, ValidationIssue } from "../types";
import { backupFile, ensureDirForFile, restoreBackupFile } from "../utils/fs";
import { ConfigError } from "../errors";

function parseTopLevelToml(content: string): Record<string, string> {
  const values: Record<string, string> = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("[")) {
      continue;
    }

    const match = /^([A-Za-z0-9_\-]+)\s*=\s*"(.*)"\s*$/.exec(trimmed);
    if (match) {
      values[match[1]] = match[2];
    }
  }

  return values;
}

function upsertTopLevelToml(content: string, values: Record<string, string | undefined>): { content: string; updatedKeys: string[] } {
  const lines = content === "" ? [] : content.split(/\r?\n/);
  const updatedKeys: string[] = [];
  const pending = new Map(Object.entries(values).filter((entry): entry is [string, string] => entry[1] !== undefined));

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = /^([A-Za-z0-9_\-]+)\s*=/.exec(line.trim());
    if (!match) {
      continue;
    }

    const key = match[1];
    if (!pending.has(key)) {
      continue;
    }

    lines[index] = `${key} = ${JSON.stringify(pending.get(key))}`;
    updatedKeys.push(key);
    pending.delete(key);
  }

  const insertionIndex = lines.findIndex((line) => line.trim().startsWith("["));
  const appended = Array.from(pending.entries()).map(([key, value]) => `${key} = ${JSON.stringify(value)}`);
  updatedKeys.push(...Array.from(pending.keys()));

  if (appended.length > 0) {
    if (insertionIndex === -1) {
      if (lines.length > 0 && lines[lines.length - 1] !== "") {
        lines.push("");
      }
      lines.push(...appended);
    } else {
      const head = lines.slice(0, insertionIndex);
      const tail = lines.slice(insertionIndex);
      const merged = [...head];
      if (merged.length > 0 && merged[merged.length - 1] !== "") {
        merged.push("");
      }
      merged.push(...appended, "", ...tail);
      return { content: `${merged.join("\n")}\n`, updatedKeys };
    }
  }

  return { content: `${lines.join("\n")}\n`, updatedKeys };
}

export class CodexClientAdapter implements ClientAdapter {
  readonly name = "codex";

  getConfigPath(): string {
    return join(homedir(), ".codex", "config.toml");
  }

  async readState(): Promise<ClientRuntimeState> {
    const configPath = this.getConfigPath();
    const content = existsSync(configPath) ? await readFile(configPath, "utf8") : "";
    return {
      client: this.name,
      configPath,
      values: parseTopLevelToml(content)
    };
  }

  validateProfile(profile: ProfileConfig): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!profile.model) {
      issues.push({ level: "error", message: "profile.model is required for Codex." });
    }

    if (!profile.baseURL) {
      issues.push({ level: "warn", message: "profile.baseURL is unset; Codex may continue using the previous endpoint." });
    }

    if (!profile.apiKey && !profile.apiKeyEnv) {
      issues.push({ level: "warn", message: "Neither apiKey nor apiKeyEnv is set; authentication may fail." });
    }

    return issues;
  }

  compareProfile(state: ClientRuntimeState, profile: ProfileConfig): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const expected: Record<string, string | undefined> = {
      provider: profile.provider,
      model: profile.model,
      base_url: profile.baseURL,
      api_key: profile.apiKey,
      api_key_env: profile.apiKeyEnv,
      model_reasoning_effort: profile.reasoningEffort
    };

    for (const [key, value] of Object.entries(expected)) {
      if (value === undefined) {
        continue;
      }

      const actual = state.values[key];
      if (actual !== value) {
        issues.push({
          level: "warn",
          message: `${key} drifted: codex has ${actual ?? "(unset)"}, profile wants ${value}.`
        });
      }
    }

    if (issues.length === 0) {
      issues.push({ level: "info", message: "Codex config matches the selected profile." });
    }

    return issues;
  }

  async applyProfile(profileName: string, profile: ProfileConfig): Promise<ClientApplyResult> {
    const configPath = this.getConfigPath();
    await ensureDirForFile(configPath);
    const backupPath = await backupFile(configPath);
    const currentContent = existsSync(configPath) ? await readFile(configPath, "utf8") : "";

    const { content, updatedKeys } = upsertTopLevelToml(currentContent, {
      provider: profile.provider,
      model: profile.model,
      base_url: profile.baseURL,
      api_key: profile.apiKey,
      api_key_env: profile.apiKeyEnv,
      model_reasoning_effort: profile.reasoningEffort
    });

    await writeFile(configPath, content, "utf8");

    return {
      client: this.name,
      configPath,
      updatedKeys,
      backupPath
    };
  }

  async rollback(): Promise<ClientRollbackResult> {
    const configPath = this.getConfigPath();
    const backupPath = await restoreBackupFile(configPath);
    if (!backupPath) {
      throw new ConfigError(`No backup found for ${configPath}.`);
    }

    return {
      client: this.name,
      configPath,
      backupPath
    };
  }
}
