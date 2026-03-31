export class MmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ConfigError extends MmError {}
export class ProfileNotFoundError extends MmError {}
export class ClientNotFoundError extends MmError {}
