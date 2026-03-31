import { ConfigStore } from "./config/store";
import { Resolver } from "./core/resolver";
import { ConfigError, MmError } from "./errors";
import { printConfig, printCurrent, printDoctor, printModels, printRunResult, printWhich } from "./output";
import { getProviderAdapter, listProviderNames } from "./providers";

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
  console.log(`mm - model provider manager

Commands:
  mm list
  mm current
  mm which
  mm use <target> [--project]
  mm models [provider]
  mm run <prompt> [--target provider/model]
  mm doctor [--ping]
  mm add <provider> [--api-key-env NAME] [--base-url URL] [--default-model MODEL]
  mm remove <provider>
  mm config set <key> <value>
  mm config get <key>
  mm config list
  mm alias list
  mm alias set <name> <provider/model>
  mm alias remove <name>`);
}

export async function runCli(argv: string[]): Promise<void> {
  const store = new ConfigStore();
  const resolver = new Resolver(store);
  const [command, ...rest] = argv;
  const parsed = parseArgs(rest);

  switch (command) {
    case undefined:
    case "help":
    case "--help":
      printHelp();
      return;
    case "list": {
      const config = await store.readGlobalConfig();
      console.log("providers:");
      for (const name of listProviderNames()) {
        const provider = config.providers[name];
        console.log(`  ${name}${provider?.defaultModel ? ` -> ${provider.defaultModel}` : ""}`);
      }
      console.log("aliases:");
      for (const [name, target] of Object.entries(config.aliases)) {
        console.log(`  ${name} -> ${target}`);
      }
      return;
    }
    case "current": {
      const target = await resolver.resolveCurrentTarget();
      printCurrent(target);
      return;
    }
    case "which": {
      const target = await resolver.resolveCurrentTarget();
      printWhich(target);
      return;
    }
    case "use": {
      const target = requirePositional(parsed.positionals[0], "Usage: mm use <provider/model>");
      const scope = parsed.flags.project ? "project" : "global";
      await store.setDefaultTarget(target, scope);
      const resolved = await resolver.resolveCurrentTarget();
      console.log(`updated ${scope} target to ${target}`);
      printCurrent(resolved);
      return;
    }
    case "models": {
      const providerName = parsed.positionals[0] ?? (await resolver.resolveCurrentTarget()).provider;
      if (!providerName) {
        throw new ConfigError("No provider resolved for `mm models`.");
      }
      const target = await resolver.resolveCurrentTarget({ targetOverride: providerName });
      const adapter = getProviderAdapter(providerName);
      const models = await adapter.listModels(target);
      printModels(models);
      return;
    }
    case "run": {
      const prompt = requirePositional(parsed.positionals[0], "Usage: mm run <prompt>");
      const target = await resolver.resolveCurrentTarget({ targetOverride: asString(parsed.flags.target) });
      const adapter = getProviderAdapter(target.provider ?? "");
      const result = await adapter.runText({ prompt, target });
      printRunResult(result);
      return;
    }
    case "doctor": {
      const target = await resolver.resolveCurrentTarget();
      const adapter = getProviderAdapter(target.provider ?? "");
      const validation = adapter.validate(target);
      const issues = [...validation.issues];
      if (parsed.flags.ping && validation.ok) {
        try {
          await adapter.listModels(target);
          issues.push({ level: "info", message: "Provider ping succeeded." });
        } catch (error) {
          issues.push({
            level: "error",
            message: error instanceof Error ? error.message : "Provider ping failed."
          });
        }
      }
      printDoctor(issues);
      return;
    }
    case "add": {
      const provider = requirePositional(parsed.positionals[0], "Usage: mm add <provider>");
      await store.upsertProvider(provider, {
        apiKeyEnv: asString(parsed.flags["api-key-env"]),
        baseURL: asString(parsed.flags["base-url"]),
        defaultModel: asString(parsed.flags["default-model"]),
        organization: asString(parsed.flags.organization),
        region: asString(parsed.flags.region),
        deployment: asString(parsed.flags.deployment)
      });
      console.log(`provider ${provider} updated`);
      return;
    }
    case "remove": {
      const provider = requirePositional(parsed.positionals[0], "Usage: mm remove <provider>");
      await store.removeProvider(provider);
      console.log(`provider ${provider} removed`);
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
        const config = await store.readGlobalConfig();
        printConfig(config);
        return;
      }
      throw new ConfigError("Usage: mm config <set|get|list> ...");
    }
    case "alias": {
      const subcommand = parsed.positionals[0];
      if (subcommand === "list") {
        const config = await store.readGlobalConfig();
        for (const [name, target] of Object.entries(config.aliases)) {
          console.log(`${name}: ${target}`);
        }
        return;
      }
      if (subcommand === "set") {
        const name = requirePositional(parsed.positionals[1], "Usage: mm alias set <name> <provider/model>");
        const target = requirePositional(parsed.positionals[2], "Usage: mm alias set <name> <provider/model>");
        await store.setAlias(name, target);
        console.log(`alias ${name} -> ${target}`);
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
