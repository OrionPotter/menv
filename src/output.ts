import { ClientApplyResult, ClientRollbackResult, ClientRuntimeState, GlobalConfig, ResolvedProfile, ValidationIssue } from "./types";

export function printConfig(config: GlobalConfig): void {
  console.log(JSON.stringify(config, null, 2));
}

export function printList(config: GlobalConfig): void {
  console.log("clients:");
  for (const [client, profile] of Object.entries(config.currentProfiles)) {
    console.log(`  ${client}: ${profile}`);
  }

  console.log("profiles:");
  for (const [name, profile] of Object.entries(config.profiles)) {
    const summary = [profile.provider, profile.model].filter(Boolean).join(" / ");
    console.log(`  ${name}${summary ? ` -> ${summary}` : ""}`);
  }

  console.log("aliases:");
  for (const [name, target] of Object.entries(config.aliases)) {
    console.log(`  ${name} -> ${target}`);
  }
}

export function printCurrent(resolved: ResolvedProfile, state: ClientRuntimeState): void {
  console.log(`client: ${resolved.client}`);
  console.log(`profile: ${resolved.profileName}`);
  console.log(`provider: ${resolved.profile.provider ?? "(unset)"}`);
  console.log(`model: ${resolved.profile.model ?? "(unset)"}`);
  console.log(`baseURL: ${resolved.profile.baseURL ?? "(unset)"}`);
  console.log(`configPath: ${state.configPath}`);
  console.log(`source: ${resolved.resolvedFrom.profileName}`);
}

export function printWhich(resolved: ResolvedProfile, state: ClientRuntimeState): void {
  console.log(`client: ${resolved.client}`);
  console.log(`profile: ${resolved.profileName}`);
  console.log(`configPath: ${state.configPath}`);
  console.log(`resolvedFrom.profile: ${resolved.resolvedFrom.profileName}`);
  console.log(`profile.provider: ${resolved.profile.provider ?? "(unset)"}`);
  console.log(`profile.model: ${resolved.profile.model ?? "(unset)"}`);
  console.log(`profile.baseURL: ${resolved.profile.baseURL ?? "(unset)"}`);
  console.log(`profile.apiKey: ${resolved.profile.apiKey ? "(set)" : "(unset)"}`);
  console.log(`profile.apiKeyEnv: ${resolved.profile.apiKeyEnv ?? "(unset)"}`);
  console.log(`codex.provider: ${state.values.provider ?? "(unset)"}`);
  console.log(`codex.model: ${state.values.model ?? "(unset)"}`);
  console.log(`codex.base_url: ${state.values.base_url ?? "(unset)"}`);
  console.log(`codex.api_key: ${state.values.api_key ? "(set)" : "(unset)"}`);
  console.log(`codex.api_key_env: ${state.values.api_key_env ?? "(unset)"}`);
}

export function printApplyResult(result: ClientApplyResult): void {
  console.log(`client: ${result.client}`);
  console.log(`configPath: ${result.configPath}`);
  console.log(`updatedKeys: ${result.updatedKeys.join(", ") || "(none)"}`);
  if (result.backupPath) {
    console.log(`backup: ${result.backupPath}`);
  }
}

export function printRollbackResult(result: ClientRollbackResult): void {
  console.log(`client: ${result.client}`);
  console.log(`configPath: ${result.configPath}`);
  console.log(`restoredFrom: ${result.backupPath}`);
}

export function printIssues(issues: ValidationIssue[]): void {
  if (issues.length === 0) {
    console.log("ok: no issues found");
    return;
  }

  for (const issue of issues) {
    console.log(`${issue.level}: ${issue.message}`);
  }
}
