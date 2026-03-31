# mm-cli

`mm` is a profile manager for AI CLI tools.

The abstraction is:
- `profile`: one provider configuration bundle
- `client`: one downstream CLI that consumes config files
- `use`: apply one profile to one client

Current MVP:
- profile storage in `mm` config
- client abstraction
- Codex client support by writing `~/.codex/config.toml`
- alias support
- drift detection with `doctor`
- safe restore with `rollback`
- npm package with `mm` executable

## Install

```bash
npm install
npm link
mm.cmd --help
```

After publishing:

```bash
npm install -g mm-cli
mm --help
```

On Windows PowerShell with restrictive execution policy, use `mm.cmd`.

## Example

Add two profiles:

```bash
mm add openai-main --provider openai --model gpt-5.4 --base-url https://api.openai.com/v1 --api-key-env OPENAI_API_KEY
mm add router-fast --provider openrouter --model openai/gpt-4o-mini --base-url https://openrouter.ai/api/v1 --api-key-env OPENROUTER_API_KEY
```

Switch Codex to one profile:

```bash
mm use openai-main --client codex
```

Inspect desired vs actual state:

```bash
mm current --client codex
mm which --client codex
mm doctor --client codex
```

Force a re-sync if Codex config drifted:

```bash
mm sync --client codex
```

Restore the last backup created by `use` or `sync`:

```bash
mm rollback --client codex
```

Use an alias:

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

## Config files

`mm` config:
- Windows: `%APPDATA%/mm/config.json`
- macOS/Linux: `~/.config/mm/config.json`

Current supported client config:
- Codex: `~/.codex/config.toml`

## Publish to npm

```bash
npm login
npm publish
```

## GitHub Actions publish

A sample workflow is included at `.github/workflows/publish.yml`.
