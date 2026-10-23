# Forge Studio agent instructions

- Keep code changes for Forge Studio within this repository. Access imported projects only through user-authorized workflows.
- Treat imported project roots and documentation folders as explicit authorization boundaries. Resolve real paths before direct filesystem operations.
- Do not claim an agent, MCP server, Roblox Studio, Blender, or GitHub connection is working without a live check.
- Never auto-approve an agent's destructive or sensitive tool operation. Persist approval decisions and task events.
- Avoid committing SQLite files, logs, credentials, authentication state, Obsidian vault contents, or generated runtime bundles.
- Run `pnpm check` and `pnpm build` after significant changes. Build the Tauri shell when tooling is available.
- Record verified progress and limitations in `docs/development/status.md` and the Forge Studio Obsidian project.
