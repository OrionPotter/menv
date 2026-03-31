import { ModelInfo, ProviderAdapter, ResolvedTarget, RunTextInput, RunTextResult, ValidationResult } from "../types";
import { BaseProviderAdapter } from "./base";

interface AnthropicModelList {
  data: Array<{ id: string; display_name?: string }>;
}

interface AnthropicMessageResponse {
  id: string;
  content?: Array<{ type: string; text?: string }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

export class AnthropicAdapter extends BaseProviderAdapter implements ProviderAdapter {
  readonly name = "anthropic";

  validate(target: ResolvedTarget): ValidationResult {
    const issues = [];

    if (!target.apiKeyPresent) {
      issues.push({ level: "error" as const, message: "ANTHROPIC_API_KEY is missing." });
    }

    if (!target.model) {
      issues.push({ level: "error" as const, message: "No default model resolved for Anthropic." });
    }

    return { ok: issues.every((issue) => issue.level !== "error"), issues };
  }

  async listModels(target: ResolvedTarget): Promise<ModelInfo[]> {
    const apiKey = this.requireApiKey(target);
    const baseURL = this.requireBaseURL(target);
    const { data } = await this.requestJson<AnthropicModelList>(`${baseURL}/models`, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      }
    });

    return data.data.map((model) => ({ id: model.id, name: model.display_name }));
  }

  async runText(input: RunTextInput): Promise<RunTextResult> {
    const { target, prompt } = input;
    const apiKey = this.requireApiKey(target);
    const baseURL = this.requireBaseURL(target);
    const { data, response } = await this.requestJson<AnthropicMessageResponse>(`${baseURL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: target.model,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    const text = data.content?.filter((item) => item.type === "text").map((item) => item.text ?? "").join("") ?? "";
    return {
      provider: this.name,
      model: target.model ?? "",
      text,
      requestId: response.headers.get("request-id") ?? data.id,
      usage: {
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens
      }
    };
  }
}
