# menv-cli

`mm` is a profile manager for AI CLI tools.

It manages provider profiles such as `openai`, `openrouter`, or custom gateways, then applies the selected profile to a downstream CLI client. The current MVP supports `codex` by updating `~/.codex/config.toml`.

## What problem it solves

If you regularly switch between different model endpoints, API keys, or models, you usually end up editing one of these by hand:

- shell environment variables
- `.env` files
- client config files such as `~/.codex/config.toml`
- ad hoc scripts for each provider

`mm` gives you a single place to define named profiles and switch clients between them safely.

## Core concepts

- `profile`: one saved configuration bundle, for example `openai-main` or `router-fast`
- `client`: one downstream CLI whose config file can be managed by `mm`
- `use`: apply one profile to one client
- `doctor`: compare the selected profile with the actual client config and report drift
- `sync`: re-apply the selected profile to the client config
- `rollback`: restore the most recent backup created during `use` or `sync`

## Current MVP scope

Implemented now:

- profile storage in `mm` config
- alias support
- client abstraction for future expansion
- Codex client support
- config drift detection
- one-step sync back to Codex config
- backup and rollback
- npm package with `mm` executable

Not implemented yet:

- multiple backup history
- encrypted secret storage
- direct model invocation through `mm`
- non-Codex client adapters

## Install

Local development:

```bash
npm install
npm link
mm.cmd --help
```

After publishing to npm:

```bash
npm install -g menv-cli
mm --help
```

Notes:

- On Windows PowerShell with restrictive execution policy, use `mm.cmd`.
- The npm package name is `menv-cli` while the executable command remains `mm`.

## Quick start

### 1. Add profiles

```bash
mm add openai-main --provider openai --model gpt-5.4 --base-url https://api.openai.com/v1 --api-key-env OPENAI_API_KEY
mm add router-fast --provider openrouter --model openai/gpt-4o-mini --base-url https://openrouter.ai/api/v1 --api-key-env OPENROUTER_API_KEY
```

### 2. Point Codex at one profile

```bash
mm use openai-main --client codex
```

This updates `~/.codex/config.toml` so Codex will use the selected profile values.

### 3. Inspect current state

```bash
mm current --client codex
mm which --client codex
mm doctor --client codex
```

### 4. Re-sync after drift

If you manually edited `~/.codex/config.toml` or another tool changed it:

```bash
mm sync --client codex
```

### 5. Roll back to the last backup

```bash
mm rollback --client codex
```

## Concrete Codex example

Suppose your current `~/.codex/config.toml` points to one endpoint, but you want to temporarily switch Codex to OpenRouter.

Create a profile:

```bash
mm add router-fast \
  --provider openrouter \
  --model openai/gpt-4o-mini \
  --base-url https://openrouter.ai/api/v1 \
  --api-key-env OPENROUTER_API_KEY
```

Apply it to Codex:

```bash
mm use router-fast --client codex
```

Now inspect the result:

```bash
mm which --client codex
```

You should see the selected profile values and the actual values found in `~/.codex/config.toml`.

If they drift apart later:

```bash
mm doctor --client codex
mm sync --client codex
```

If you want to go back to the previous Codex config snapshot:

```bash
mm rollback --client codex
```

## Alias example

Aliases let you switch by intent instead of provider details.

```bash
mm alias set fast router-fast
mm use fast --client codex
```

## Commands

```bash
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
mm alias remove <name>
```

## How `mm use` works

`mm use <profile> --client codex` does two things:

1. It records the selected profile in `mm`'s own config.
2. It applies that profile to Codex by updating `~/.codex/config.toml`.

For Codex, the current implementation writes these top-level keys when present:

- `provider`
- `model`
- `base_url`
- `api_key`
- `api_key_env`
- `model_reasoning_effort`

Existing unrelated TOML sections are preserved.

## Backup and rollback semantics

Before `mm use` or `mm sync` writes the client config, `mm` creates one backup file:

- Codex backup path: `~/.codex/config.toml.bak`

`mm rollback --client codex` restores that backup.

Important limitation in the current MVP:

- backup history is single-slot
- the latest write replaces the previous backup
- if you sync after a bad manual edit, rollback restores the state immediately before that sync, not an older historical version

## Validation behavior

For Codex, `mm doctor` currently checks:

- whether the selected profile has a `model`
- whether `baseURL` is missing
- whether both `apiKey` and `apiKeyEnv` are missing
- whether the current Codex config has drifted from the selected profile

## Config files

`mm` config:

- Windows: `%APPDATA%/mm/config.json`
- macOS/Linux: `~/.config/mm/config.json`

Current supported client config:

- Codex: `~/.codex/config.toml`

Project override file:

- `.mm.json`

## Development

```bash
npm install
npm run check
npm run build
npm link
```

## Publish to npm

Manual publish:

```bash
npm login
npm publish --provenance
```

GitHub Actions publish:

- workflow file: `.github/workflows/publish.yml`
- trigger: push tag matching `v*` or manual dispatch
- required secret: `NPM_TOKEN`

## Roadmap

Planned next steps:

- multiple backup history and named rollback targets
- more client adapters beyond Codex
- safer secret handling
- richer profile schema per client

