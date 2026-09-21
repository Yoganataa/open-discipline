# open-disipline

An opencode V1 plugin that enforces engineering discipline the deterministic way — it inspects every write/edit and blocks or warns instead of merely asking politely. Built from real agentic-AI failure patterns (silent errors, debug leftovers, committed secrets, brand-prefix slop).

## What it does

Scans each proposed file write for a small set of near-zero-false-positive patterns and injects a naming policy into the session context:

| Rule | Fires on | Severity |
|------|----------|----------|
| `slop:empty-catch` | Empty `catch {}` / `except: pass` (silent failures) | block |
| `slop:secret` | Credential-shaped strings (`sk-…`, `AKIA…`, `ghp_…`, `xoxb-…`, `AIza…`) | block in code, warn in config/env/rules/docs |
| `slop:debug-residue` | `console.log`, `print(`, `debugger`, `breakpoint()` | warn |
| `slop:type-ignore` | `# type: ignore`, `@ts-ignore`, `cast<Any>` | warn |
| `slop:todo` | TODO/FIXME shipped with the change | warn |
| `naming` | Brand-prefixed identifiers without domain meaning (e.g. `AcmeDashboardViewModel`) | block/warn |
| `protected-files` | Writes touching `protectedPaths` | block/warn |

Supports `.ts/.tsx/.js/.jsx/.mjs/.cjs/.go/.py/.kt`. Blocked writes throw in `tool.execute.before`; the agent must fix the code instead of bypassing the guard.

## Install

```jsonc
// ~/.config/opencode/opencode.json
{
  "plugin": [
    "file:///abs/path/to/open-disipline/.opencode/plugins/open-disipline.ts"
  ]
}
```

Zero configuration: project brands are auto-detected from `package.json` name (or the directory name). Restart opencode.

## Optional config

Write once in `~/.config/opencode/discipline.config.json` (base) or per-project `discipline.config.json` (overrides key-by-key):

```jsonc
{
  "mode": "strict",          // strict = block; advisory = downgrade blocks to warnings
  "brands": ["YourBrand"],   // extra brands; auto-detection stays on unless disabled
  "autoBrands": true,        // false to disable project-name auto-detection
  "protectedPaths": ["src/important/**"],
  "commandGuards": ["rm\\s+-rf", "git\\s+push\\s+--force"]
}
```

`commandGuards` blocks shell commands matching a regex (strict mode) — useful for destructive or exfil-tending commands.

## Development

```sh
npm install        # dev deps only (typecheck/tests); runtime is type-only
npm test           # node:test, no framework
npm run typecheck
```

## Design notes

- Type-only import of `@opencode-ai/plugin` → no runtime SDK dependency, survives opencode V1 updates.
- *Not* a replacement for `.gitignore`, `.env` hygiene, or a pre-commit secret scanner (e.g. gitleaks) — it guards writes, not pre-existing files.
- Lint-level concerns (duplicate functions, gratuitous abstractions, unused imports) are out of scope for a diff hook; leave those to linters and review.