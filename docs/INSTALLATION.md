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

The installer clones that GitHub ref into a dedicated OpenDiscipline directory and creates the OpenCode plugin loader. OpenCode then discovers the loader through its documented global `~/.config/opencode/plugins/` or project `.opencode/plugins/` directory.

## Default scope

Without `--local`, installation is global:

- source: `~/.config/opencode/open-discipline/`
- plugin loader: `~/.config/opencode/plugins/open-discipline.ts`
- workflow skill: `~/.config/opencode/skills/open-discipline-workflow/SKILL.md`
- global instructions: `~/.config/opencode/AGENTS.md`

OpenCode officially supports a global `~/.config/opencode/AGENTS.md`, and project `AGENTS.md` files remain separate.

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

Existing instruction sections are preserved byte-for-byte outside that marker. This is deliberate because OpenCode combines global and project instruction files, and an existing `AGENTS.md` is part of the user's instruction surface.

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

OpenCode loads both global and project plugin directories. OpenDiscipline therefore includes a process-level duplicate-load guard so the same plugin implementation does not register its hooks twice when both loaders point to it.

## Update, status, and uninstall

The same command handles the lifecycle. The user does not need to delete individual plugin files manually.

Install globally:

```sh
bunx --package github:Yoganataa/open-discipline#maturity-hardening open-discipline-install
```

Install into the current project:

```sh
bunx --package github:Yoganataa/open-discipline#maturity-hardening open-discipline-install --local
```

Check ownership and health:

```sh
bunx --package github:Yoganataa/open-discipline#maturity-hardening open-discipline-install status
```

For project-local:

```sh
bunx --package github:Yoganataa/open-discipline#maturity-hardening open-discipline-install status --local
```

Uninstall:

```sh
bunx --package github:Yoganataa/open-discipline#maturity-hardening open-discipline-install uninstall
```

Project-local uninstall:

```sh
bunx --package github:Yoganataa/open-discipline#maturity-hardening open-discipline-install uninstall --local
```

Uninstall first verifies the install manifest and hashes. If a managed plugin, skill, or OpenDiscipline section in `AGENTS.md` was modified outside the installer, it stops rather than deleting user changes.

If OpenDiscipline created an otherwise-empty `AGENTS.md`, uninstall may remove that file. If `AGENTS.md` contains other content, only the marked OpenDiscipline section is removed.

There is no separate OS-specific uninstall program. The same Bun command is used on Linux, Windows, and macOS.

The installer itself does not require Git on the target machine; Bun supplies the GitHub package source. The current source package contains the runtime files needed by the plugin, so installation does not run `npm install` or execute dependency lifecycle scripts.

Rollback backups are retained outside the managed source directory under the OpenCode configuration root. They are not automatically deleted.

## Verification

After installation, restart OpenCode and run the local V1 smoke procedure from `docs/SMOKE-TEST.md`.

The installer itself does not claim that OpenCode runtime compatibility is proven. That remains a host-level validation step.


## Platform support

The installer uses Bun's GitHub package resolution and Node/Bun filesystem APIs rather than OS-specific shell scripts. The supported installation model is therefore the same on:

- Linux
- Windows
- macOS

The repository CI runs the installer smoke suite on all three GitHub-hosted runner families. The smoke suite verifies:

- project-local installation;
- global installation through `OPENCODE_CONFIG_DIR`;
- status verification;
- uninstall;
- preservation of existing `AGENTS.md` content;
- refusal to overwrite an unmanaged plugin;
- refusal to remove an edited OpenDiscipline section.

This CI coverage is installer validation, not proof that every OpenCode version behaves identically on every host. OpenCode V1 runtime behavior is still validated separately through the project's local smoke procedure.

For normal users, no OS-specific command is necessary.
