import { AuthError, NetworkError, ProviderResponseError, RateLimitError } from "../errors";
import { ResolvedTarget } from "../types";

export abstract class BaseProviderAdapter {
  abstract readonly name: string;

  protected requireApiKey(target: ResolvedTarget): string {
    if (!target.apiKey) {
      throw new AuthError(`Missing API key for provider ${target.provider}.`);
    }
    return target.apiKey;
  }

  protected requireBaseURL(target: ResolvedTarget): string {
    if (!target.baseURL) {
      throw new ProviderResponseError(`Missing base URL for provider ${target.provider}.`);
    }
    return target.baseURL.replace(/\/+$/, "");
  }

  protected async requestJson<T>(input: RequestInfo | URL, init: RequestInit): Promise<{ data: T; response: Response }> {
    let response: Response;

    try {
      response = await fetch(input, init);
    } catch (error) {
      throw new NetworkError(error instanceof Error ? error.message : "Network request failed.");
    }

    if (response.status === 401 || response.status === 403) {
      throw new AuthError(await this.readErrorMessage(response));
    }

    if (response.status === 429) {
      throw new RateLimitError(await this.readErrorMessage(response));
    }

    if (!response.ok) {
      throw new ProviderResponseError(await this.readErrorMessage(response));
    }

    const data = (await response.json()) as T;
    return { data, response };
  }

  private async readErrorMessage(response: Response): Promise<string> {
    try {
      const payload = await response.json() as Record<string, unknown>;
      const error = payload.error;
      if (typeof error === "string") {
        return error;
      }
      if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
        return error.message;
      }
      return `Provider request failed with status ${response.status}.`;
    } catch {
      return `Provider request failed with status ${response.status}.`;
    }
  }
}
