import { GlobalConfig, ModelInfo, ResolvedTarget, RunTextResult, ValidationIssue } from "./types";

export function printLines(lines: Array<string | undefined>): void {
  for (const line of lines) {
    if (line !== undefined) {
      console.log(line);
    }
  }
}

export function printCurrent(target: ResolvedTarget): void {
  printLines([
    `provider: ${target.provider ?? "(unset)"}`,
    `model: ${target.model ?? "(unset)"}`,
    `source: ${target.resolvedFrom.target}`
  ]);
}

export function printWhich(target: ResolvedTarget): void {
  printLines([
    `provider: ${target.provider ?? "(unset)"}`,
    `model: ${target.model ?? "(unset)"}`,
    `apiKeyEnv: ${target.apiKeyEnv ?? "(unset)"}`,
    `apiKeyPresent: ${target.apiKeyPresent ? "yes" : "no"}`,
    `baseURL: ${target.baseURL ?? "(unset)"}`,
    `organization: ${target.organization ?? "(unset)"}`,
    `region: ${target.region ?? "(unset)"}`,
    `deployment: ${target.deployment ?? "(unset)"}`,
    `resolvedFrom.target: ${target.resolvedFrom.target}`,
    `resolvedFrom.model: ${target.resolvedFrom.model}`,
    `resolvedFrom.apiKey: ${target.resolvedFrom.apiKey}`,
    `resolvedFrom.baseURL: ${target.resolvedFrom.baseURL}`
  ]);
}

export function printModels(models: ModelInfo[]): void {
  for (const model of models) {
    const suffix = model.name ? ` (${model.name})` : "";
    console.log(`${model.id}${suffix}`);
  }
}

export function printRunResult(result: RunTextResult): void {
  printLines([
    result.text,
    "",
    `provider: ${result.provider}`,
    `model: ${result.model}`,
    result.requestId ? `requestId: ${result.requestId}` : undefined,
    result.usage ? `usage: input=${result.usage.inputTokens ?? 0} output=${result.usage.outputTokens ?? 0}` : undefined
  ]);
}

export function printDoctor(issues: ValidationIssue[]): void {
  if (issues.length === 0) {
    console.log("ok: no issues found");
    return;
  }

  for (const issue of issues) {
    console.log(`${issue.level}: ${issue.message}`);
  }
}

export function printConfig(config: GlobalConfig): void {
  console.log(JSON.stringify(config, null, 2));
}
