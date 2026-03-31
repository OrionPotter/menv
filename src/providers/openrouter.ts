import { ModelInfo, ProviderAdapter, ResolvedTarget, RunTextInput, RunTextResult, ValidationResult } from "../types";
import { BaseProviderAdapter } from "./base";

interface OpenRouterModelList {
  data: Array<{ id: string; name?: string; description?: string }>;
}

interface OpenRouterChatResponse {
  id: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  choices: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export class OpenRouterAdapter extends BaseProviderAdapter implements ProviderAdapter {
  readonly name = "openrouter";

  validate(target: ResolvedTarget): ValidationResult {
    const issues = [];

    if (!target.apiKeyPresent) {
      issues.push({ level: "error" as const, message: "OPENROUTER_API_KEY is missing." });
    }

    if (!target.model) {
      issues.push({ level: "error" as const, message: "No default model resolved for OpenRouter." });
    }

    if (!target.baseURL) {
      issues.push({ level: "error" as const, message: "OpenRouter base URL is missing." });
    }

    return { ok: issues.every((issue) => issue.level !== "error"), issues };
  }

  async listModels(target: ResolvedTarget): Promise<ModelInfo[]> {
    const apiKey = this.requireApiKey(target);
    const baseURL = this.requireBaseURL(target);
    const { data } = await this.requestJson<OpenRouterModelList>(`${baseURL}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

    return data.data.map((model) => ({
      id: model.id,
      name: model.name,
      description: model.description
    }));
  }

  async runText(input: RunTextInput): Promise<RunTextResult> {
    const { target, prompt } = input;
    const apiKey = this.requireApiKey(target);
    const baseURL = this.requireBaseURL(target);
    const { data, response } = await this.requestJson<OpenRouterChatResponse>(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: target.model,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    return {
      provider: this.name,
      model: target.model ?? "",
      text: data.choices[0]?.message?.content ?? "",
      requestId: response.headers.get("x-request-id") ?? data.id,
      usage: {
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens
      }
    };
  }
}
