---
type: database-schema
project: Forge Studio
status: implemented
created: 2026-10-23
tags: [forge-studio, sqlite]
---
# Database Schema

SQLite file: `%APPDATA%\Forge Studio\forge.db` unless `FORGE_DATA_DIR` is set. Migration version 1 initializes the schema.

| Table | Purpose | Key fields |
|---|---|---|
| `projects` | Local project configuration | id, root, docs_root, preferred_agent |
| `tasks` | Request and lifecycle | id, project_id, status, stage, provider_session |
| `task_events` | Stream history | task_id, kind, payload, created_at |
| `approvals` | Human decisions | task_id, method, description, status |
| `documentation_changes` | Markdown proposals | project_id, path, expected, proposed, status |
| `settings` | Local preferences | key, value |

Indexes cover tasks by project/time and events by task/id. Auth secrets are not stored. Startup converts active tasks to paused for recovery. [[02 Architecture/Security Model|Security Model]] describes local access.
