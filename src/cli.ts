import { ConfigStore } from "./config/store";
import { Resolver } from "./core/resolver";
import { ConfigError, MmError } from "./errors";
import { getClientAdapter, listClientNames } from "./clients";
import { printApplyResult, printConfig, printCurrent, printIssues, printList, printRollbackResult, printWhich } from "./output";

interface ParsedArgs {
  positionals: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }

    flags[key] = next;
    index += 1;
  }

  return { positionals, flags };
}

function asString(flag: string | boolean | undefined): string | undefined {
  return typeof flag === "string" ? flag : undefined;
}

function requirePositional(value: string | undefined, message: string): string {
  if (!value) {
    throw new ConfigError(message);
  }
  return value;
}

function printHelp(): void {
  console.log(`mm - client config manager

Commands:
  mm list
  mm clients
  mm current [--client codex]
  mm which [--client codex]
  mm use <profile> [--client codex] [--project]
  mm sync [--client codex]
  mm doctor [--client codex]
  mm rollback [--client codex]
  mm add <profile> --provider NAME --model MODEL --base-url URL [--api-key KEY] [--api-key-env ENV]
  mm remove <profile>
  mm config set <key> <value>
  mm config get <key>
  mm config list
  mm alias list
  mm alias set <name> <profile>
  mm alias remove <name>`);
}

function getClientName(flagValue: string | undefined, storeDefault: string): string {
  return flagValue ?? storeDefault;
}

export async function runCli(argv: string[]): Promise<void> {
  const store = new ConfigStore();
  const resolver = new Resolver(store);
  const [command, ...rest] = argv;
  const parsed = parseArgs(rest);
  const config = await store.readGlobalConfig();
  const clientName = getClientName(asString(parsed.flags.client), config.defaultClient);

  switch (command) {
    case undefined:
    case "help":
    case "--help":
      printHelp();
      return;
    case "clients": {
      for (const client of listClientNames()) {
        console.log(client);
      }
      return;
    }
    case "list": {
      printList(config);
      return;
    }
    case "current": {
      const resolved = await resolver.resolveProfile({ client: clientName });
      const state = await getClientAdapter(clientName).readState();
      printCurrent(resolved, state);
      return;
    }
    case "which": {
      const resolved = await resolver.resolveProfile({ client: clientName });
      const state = await getClientAdapter(clientName).readState();
      printWhich(resolved, state);
      return;
    }
    case "use": {
      const profileName = requirePositional(parsed.positionals[0], "Usage: mm use <profile>");
      const scope = parsed.flags.project ? "project" : "global";
      await store.setCurrentProfile(clientName, profileName, scope);
      const client = getClientAdapter(clientName);
      const resolved = await resolver.resolveProfile({ client: clientName });
      const validationIssues = client.validateProfile(resolved.profile).filter((issue) => issue.level === "error");
      if (validationIssues.length > 0) {
        printIssues(validationIssues);
        throw new ConfigError("Profile validation failed.");
      }
      const result = await client.applyProfile(resolved.profileName, resolved.profile);
      console.log(`updated ${scope} profile for ${clientName} to ${profileName}`);
      printApplyResult(result);
      return;
    }
    case "sync": {
      const client = getClientAdapter(clientName);
      const resolved = await resolver.resolveProfile({ client: clientName });
      const validationIssues = client.validateProfile(resolved.profile).filter((issue) => issue.level === "error");
      if (validationIssues.length > 0) {
        printIssues(validationIssues);
        throw new ConfigError("Profile validation failed.");
      }
      const result = await client.applyProfile(resolved.profileName, resolved.profile);
      printApplyResult(result);
      return;
    }
    case "doctor": {
      const client = getClientAdapter(clientName);
      const resolved = await resolver.resolveProfile({ client: clientName });
      const state = await client.readState();
      const issues = [
        ...client.validateProfile(resolved.profile),
        ...client.compareProfile(state, resolved.profile)
      ];
      printIssues(issues);
      return;
    }
    case "rollback": {
      const result = await getClientAdapter(clientName).rollback();
      printRollbackResult(result);
      return;
    }
    case "add": {
      const profileName = requirePositional(parsed.positionals[0], "Usage: mm add <profile> --provider NAME --model MODEL --base-url URL");
      await store.upsertProfile(profileName, {
        provider: asString(parsed.flags.provider),
        model: asString(parsed.flags.model),
        baseURL: asString(parsed.flags["base-url"]),
        apiKey: asString(parsed.flags["api-key"]),
        apiKeyEnv: asString(parsed.flags["api-key-env"]),
        reasoningEffort: asString(parsed.flags["reasoning-effort"]),
        organization: asString(parsed.flags.organization),
        region: asString(parsed.flags.region),
        deployment: asString(parsed.flags.deployment)
      });
      console.log(`profile ${profileName} updated`);
      return;
    }
    case "remove": {
      const profileName = requirePositional(parsed.positionals[0], "Usage: mm remove <profile>");
      await store.removeProfile(profileName);
      console.log(`profile ${profileName} removed`);
      return;
    }
    case "config": {
      const subcommand = parsed.positionals[0];
      if (subcommand === "set") {
        const key = requirePositional(parsed.positionals[1], "Usage: mm config set <key> <value>");
        const value = requirePositional(parsed.positionals[2], "Usage: mm config set <key> <value>");
        await store.setConfigValue(key, value);
        console.log(`config updated: ${key}`);
        return;
      }
      if (subcommand === "get") {
        const key = requirePositional(parsed.positionals[1], "Usage: mm config get <key>");
        const value = await store.getConfigValue(key);
        console.log(value === undefined ? "(unset)" : JSON.stringify(value, null, 2));
        return;
      }
      if (subcommand === "list") {
        printConfig(config);
        return;
      }
      throw new ConfigError("Usage: mm config <set|get|list> ...");
    }
    case "alias": {
      const subcommand = parsed.positionals[0];
      if (subcommand === "list") {
        for (const [name, target] of Object.entries(config.aliases)) {
          console.log(`${name}: ${target}`);
        }
        return;
      }
      if (subcommand === "set") {
        const name = requirePositional(parsed.positionals[1], "Usage: mm alias set <name> <profile>");
        const profileName = requirePositional(parsed.positionals[2], "Usage: mm alias set <name> <profile>");
        await store.setAlias(name, profileName);
        console.log(`alias ${name} -> ${profileName}`);
        return;
      }
      if (subcommand === "remove") {
        const name = requirePositional(parsed.positionals[1], "Usage: mm alias remove <name>");
        await store.removeAlias(name);
        console.log(`alias ${name} removed`);
        return;
      }
      throw new ConfigError("Usage: mm alias <list|set|remove> ...");
    }
    default:
      throw new ConfigError(`Unknown command: ${command}`);
  }
}

export function handleCliError(error: unknown): never {
  if (error instanceof MmError) {
    console.error(`error: ${error.message}`);
    process.exit(1);
  }

  if (error instanceof Error) {
    console.error(`error: ${error.message}`);
    process.exit(1);
  }

  console.error("error: unexpected failure");
  process.exit(1);
}
