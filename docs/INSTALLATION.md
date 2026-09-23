# OpenDiscipline installation

OpenDiscipline is distributed from GitHub. It is not published to npm.

## Install with Bun

The installer is exposed as a package binary, so Bun can execute it directly from GitHub:

```sh
bunx --package github:Yoganataa/open-discipline#maturity-hardening open-discipline-install
```

For a reproducible install, pin an immutable commit:

```sh
bunx --package github:Yoganataa/open-discipline#<40-char-commit-sha> open-discipline-install --ref=<40-char-commit-sha>
```

The installer clones that GitHub ref into a dedicated OpenDiscipline directory and creates the OpenCode plugin loader. OpenCode then discovers the loader through its documented global `~/.config/opencode/plugins/` or project `.opencode/plugins/` directory. citeturn2search0

## Default scope

Without `--local`, installation is global:

- source: `~/.config/opencode/open-discipline/`
- plugin loader: `~/.config/opencode/plugins/open-discipline.ts`
- workflow skill: `~/.config/opencode/skills/open-discipline-workflow/SKILL.md`
- global instructions: `~/.config/opencode/AGENTS.md`

OpenCode officially supports a global `~/.config/opencode/AGENTS.md`, and project `AGENTS.md` files remain separate. citeturn1search1

For a project-local installation:

```sh
bunx --package github:Yoganataa/open-discipline#maturity-hardening open-discipline-install --local
```

This uses the project's `.opencode/` directory and project-root `AGENTS.md`.

## AGENTS.md safety

The installer does not replace `AGENTS.md`.

It adds only:

```text
<!-- open-discipline:start -->
## OpenDiscipline
...
<!-- open-discipline:end -->
```

Existing instruction sections are preserved byte-for-byte outside that marker. This is deliberate because OpenCode combines global and project instruction files, and an existing `AGENTS.md` is part of the user's instruction surface. citeturn1search1

In particular, existing MCP sections such as `codebase-memory-mcp` and `context7` are not rewritten, reordered, or removed.

If the target plugin file already exists and does not contain the OpenDiscipline ownership marker, installation stops instead of overwriting it.

If an OpenDiscipline-owned file is replaced, the previous copy is placed under the install root's `backups/<timestamp>/` directory.

## Configuration ownership

The installer does not modify:

- `opencode.json` / `opencode.jsonc`;
- existing MCP configuration;
- existing agent definitions;
- unrelated skills;
- unrelated project files;
- unrelated `AGENTS.md` content.

It records an ownership manifest under the dedicated OpenDiscipline directory.

## Duplicate installation

Do not install OpenDiscipline both globally and locally unless you deliberately need the local copy.

OpenCode loads both global and project plugin directories. OpenDiscipline therefore includes a process-level duplicate-load guard so the same plugin implementation does not register its hooks twice when both loaders point to it. citeturn2search0

## Update and rollback

The current installer supports safe replacement of managed files and creates backups, but update/uninstall commands are intentionally not declared complete yet.

Until those commands are implemented:

1. keep the generated backup directory;
2. do not manually edit the generated loader;
3. if an installation must be reverted, stop OpenCode and restore the relevant backed-up managed files.

## Verification

After installation, restart OpenCode and run the local V1 smoke procedure from `docs/SMOKE-TEST.md`.

The installer itself does not claim that OpenCode runtime compatibility is proven. That remains a host-level validation step.
