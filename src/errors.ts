export class MmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ConfigError extends MmError {}
export class ProviderNotFoundError extends MmError {}
export class ModelNotFoundError extends MmError {}
export class AuthError extends MmError {}
export class RateLimitError extends MmError {}
export class NetworkError extends MmError {}
export class ProviderResponseError extends MmError {}
