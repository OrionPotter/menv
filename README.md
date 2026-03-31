# mm-cli

A TypeScript CLI MVP for managing model providers and switching the active provider/model target.

## Supported providers

- OpenAI
- Anthropic
- OpenRouter

## Commands

```bash
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
mm alias remove <name>
```

## Config locations

- Windows: `%APPDATA%/mm/config.json`
- macOS/Linux: `~/.config/mm/config.json`
- Project override: `.mm.json`

## Development

```bash
npm.cmd install
npm.cmd run check
npm.cmd run build
node dist/index.js current
```

## Notes

- `mm use <target>` writes the global default target.
- `mm use <target> --project` writes `.mm.json` in the current project.
- `mm which` shows the resolved value and its source.
- `mm doctor --ping` performs a lightweight provider call by using `models` as the connectivity check.
