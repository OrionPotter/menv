import { ClientAdapter } from "../types";
import { ClientNotFoundError } from "../errors";
import { CodexClientAdapter } from "./codex";

const REGISTRY: Record<string, ClientAdapter> = {
  codex: new CodexClientAdapter()
};

export function getClientAdapter(name: string): ClientAdapter {
  const adapter = REGISTRY[name];
  if (!adapter) {
    throw new ClientNotFoundError(`Client adapter not found for ${name}.`);
  }
  return adapter;
}

export function listClientNames(): string[] {
  return Object.keys(REGISTRY);
}
