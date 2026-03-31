import { ProviderAdapter } from "../types";
import { ProviderNotFoundError } from "../errors";
import { AnthropicAdapter } from "./anthropic";
import { OpenAIAdapter } from "./openai";
import { OpenRouterAdapter } from "./openrouter";

const REGISTRY: Record<string, ProviderAdapter> = {
  openai: new OpenAIAdapter(),
  anthropic: new AnthropicAdapter(),
  openrouter: new OpenRouterAdapter()
};

export function getProviderAdapter(name: string): ProviderAdapter {
  const adapter = REGISTRY[name];
  if (!adapter) {
    throw new ProviderNotFoundError(`Provider adapter not found for ${name}.`);
  }
  return adapter;
}

export function listProviderNames(): string[] {
  return Object.keys(REGISTRY);
}
