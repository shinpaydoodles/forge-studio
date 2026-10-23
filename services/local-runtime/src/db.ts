import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type Project = {
  id: string;
  name: string;
  type: string;
  root: string;
  docsRoot: string | null;
  preferredAgent: "codex" | "claude";
  createdAt: string;
  updatedAt: string;
};
export type Task = {
  id: string;
  projectId: string;
  request: string;
  provider: "codex" | "claude";
  mode: "manual" | "assisted";
  status: string;
  stage: string;
  providerSession: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
};
export type TaskEvent = {
  id: number;
  taskId: string;
  kind: string;
  payload: unknown;
  createdAt: string;
};
export type Approval = {
  id: string;
  taskId: string;
  method: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  decidedAt: string | null;
};
export type McpConnection = {
  id: string;
  name: string;
  transport: "stdio";
  command: string;
  args: string[];
  status: "disconnected" | "connected" | "error";
  tools: { name: string; description?: string; inputSchema?: unknown }[];
  lastAttemptAt: string | null;
  error: string | null;
};

export class Store {
  db: DatabaseSync;
  constructor(file: string) {
    if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
    this.db
      .exec(`CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, root TEXT NOT NULL UNIQUE, docs_root TEXT, preferred_agent TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), request TEXT NOT NULL, provider TEXT NOT NULL, mode TEXT NOT NULL, status TEXT NOT NULL, stage TEXT NOT NULL, provider_session TEXT, summary TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS tasks_project_created ON tasks(project_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS task_events(id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT NOT NULL REFERENCES tasks(id), kind TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS events_task_id ON task_events(task_id, id);
      CREATE TABLE IF NOT EXISTS approvals(id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES tasks(id), method TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, decided_at TEXT);
      CREATE TABLE IF NOT EXISTS documentation_changes(id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), path TEXT NOT NULL, expected TEXT NOT NULL, proposed TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, applied_at TEXT);
      CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS mcp_connections(id TEXT PRIMARY KEY, name TEXT NOT NULL, transport TEXT NOT NULL, command TEXT NOT NULL, args TEXT NOT NULL, status TEXT NOT NULL, tools TEXT NOT NULL, last_attempt_at TEXT, error TEXT);
      CREATE TABLE IF NOT EXISTS project_mcp_tools(project_id TEXT NOT NULL REFERENCES projects(id), connection_id TEXT NOT NULL REFERENCES mcp_connections(id) ON DELETE CASCADE, tool_name TEXT NOT NULL, enabled INTEGER NOT NULL, PRIMARY KEY(project_id,connection_id,tool_name));
      INSERT OR IGNORE INTO schema_migrations(version) VALUES(1);`);
    this.db
      .prepare(
        "UPDATE tasks SET status='paused', stage='Recovery required', updated_at=? WHERE status IN ('analyzing','planning','executing','reviewing','testing','documenting')",
      )
      .run(new Date().toISOString());
    this.db.exec(
      "UPDATE mcp_connections SET status='disconnected' WHERE status='connected'",
    );
  }
  projects(): Project[] {
    return (
      this.db
        .prepare("SELECT * FROM projects ORDER BY updated_at DESC")
        .all() as Record<string, unknown>[]
    ).map(projectRow);
  }
  project(id: string): Project | null {
    const row = this.db.prepare("SELECT * FROM projects WHERE id=?").get(id);
    return row ? projectRow(row as Record<string, unknown>) : null;
  }
  addProject(p: Project): void {
    this.db
      .prepare("INSERT INTO projects VALUES(?,?,?,?,?,?,?,?)")
      .run(
        p.id,
        p.name,
        p.type,
        p.root,
        p.docsRoot,
        p.preferredAgent,
        p.createdAt,
        p.updatedAt,
      );
  }
  updateProject(p: Project): void {
    this.db
      .prepare(
        "UPDATE projects SET name=?,type=?,docs_root=?,preferred_agent=?,updated_at=? WHERE id=?",
      )
      .run(p.name, p.type, p.docsRoot, p.preferredAgent, p.updatedAt, p.id);
  }
  tasks(projectId?: string): Task[] {
    const rows = projectId
      ? this.db
          .prepare(
            "SELECT * FROM tasks WHERE project_id=? ORDER BY created_at DESC",
          )
          .all(projectId)
      : this.db.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all();
    return (rows as Record<string, unknown>[]).map(taskRow);
  }
  task(id: string): Task | null {
    const row = this.db.prepare("SELECT * FROM tasks WHERE id=?").get(id);
    return row ? taskRow(row as Record<string, unknown>) : null;
  }
  addTask(t: Task): void {
    this.db
      .prepare("INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?,?,?,?)")
      .run(
        t.id,
        t.projectId,
        t.request,
        t.provider,
        t.mode,
        t.status,
        t.stage,
        t.providerSession,
        t.summary,
        t.createdAt,
        t.updatedAt,
      );
  }
  updateTask(
    id: string,
    status: string,
    stage: string,
    summary?: string | null,
    providerSession?: string | null,
  ): void {
    this.db
      .prepare(
        "UPDATE tasks SET status=?,stage=?,summary=COALESCE(?,summary),provider_session=COALESCE(?,provider_session),updated_at=? WHERE id=?",
      )
      .run(
        status,
        stage,
        summary ?? null,
        providerSession ?? null,
        new Date().toISOString(),
        id,
      );
  }
  event(taskId: string, kind: string, payload: unknown): TaskEvent {
    const createdAt = new Date().toISOString();
    const result = this.db
      .prepare(
        "INSERT INTO task_events(task_id,kind,payload,created_at) VALUES(?,?,?,?)",
      )
      .run(taskId, kind, JSON.stringify(payload), createdAt);
    return {
      id: Number(result.lastInsertRowid),
      taskId,
      kind,
      payload,
      createdAt,
    };
  }
  events(taskId: string, after = 0): TaskEvent[] {
    return (
      this.db
        .prepare(
          "SELECT * FROM task_events WHERE task_id=? AND id>? ORDER BY id",
        )
        .all(taskId, after) as Record<string, unknown>[]
    ).map((row) => ({
      id: Number(row.id),
      taskId: String(row.task_id),
      kind: String(row.kind),
      payload: JSON.parse(String(row.payload)),
      createdAt: String(row.created_at),
    }));
  }
  approval(a: Approval): void {
    this.db
      .prepare("INSERT INTO approvals VALUES(?,?,?,?,?,?,?)")
      .run(
        a.id,
        a.taskId,
        a.method,
        a.description,
        a.status,
        a.createdAt,
        a.decidedAt,
      );
  }
  approvals(taskId: string): Approval[] {
    return (
      this.db
        .prepare("SELECT * FROM approvals WHERE task_id=? ORDER BY created_at")
        .all(taskId) as Record<string, unknown>[]
    ).map(approvalRow);
  }
  getApproval(id: string): Approval | null {
    const row = this.db.prepare("SELECT * FROM approvals WHERE id=?").get(id);
    return row ? approvalRow(row as Record<string, unknown>) : null;
  }
  decide(id: string, status: "approved" | "rejected"): boolean {
    return (
      this.db
        .prepare(
          "UPDATE approvals SET status=?,decided_at=? WHERE id=? AND status='pending'",
        )
        .run(status, new Date().toISOString(), id).changes === 1
    );
  }
  proposeNote(change: {
    id: string;
    projectId: string;
    path: string;
    expected: string;
    proposed: string;
    createdAt: string;
  }): void {
    this.db
      .prepare(
        "INSERT INTO documentation_changes VALUES(?,?,?,?,?,'pending',?,NULL)",
      )
      .run(
        change.id,
        change.projectId,
        change.path,
        change.expected,
        change.proposed,
        change.createdAt,
      );
  }
  noteProposal(id: string): Record<string, unknown> | null {
    return (
      (this.db
        .prepare("SELECT * FROM documentation_changes WHERE id=?")
        .get(id) as Record<string, unknown> | undefined) || null
    );
  }
  noteProposals(projectId: string): Record<string, unknown>[] {
    return this.db
      .prepare(
        "SELECT id,project_id,path,status,created_at,applied_at FROM documentation_changes WHERE project_id=? ORDER BY created_at DESC",
      )
      .all(projectId) as Record<string, unknown>[];
  }
  applyNote(id: string): boolean {
    return (
      this.db
        .prepare(
          "UPDATE documentation_changes SET status='applied',applied_at=? WHERE id=? AND status='pending'",
        )
        .run(new Date().toISOString(), id).changes === 1
    );
  }
  setting(key: string): string | null {
    const row = this.db
      .prepare("SELECT value FROM settings WHERE key=?")
      .get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }
  setSetting(key: string, value: string): void {
    this.db
      .prepare(
        "INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      )
      .run(key, value);
  }
  mcpConnections(): McpConnection[] {
    return (
      this.db
        .prepare("SELECT * FROM mcp_connections ORDER BY name")
        .all() as Record<string, unknown>[]
    ).map(mcpRow);
  }
  mcpConnection(id: string): McpConnection | null {
    const row = this.db
      .prepare("SELECT * FROM mcp_connections WHERE id=?")
      .get(id);
    return row ? mcpRow(row as Record<string, unknown>) : null;
  }
  addMcpConnection(c: McpConnection): void {
    this.db
      .prepare("INSERT INTO mcp_connections VALUES(?,?,?,?,?,?,?,?,?)")
      .run(
        c.id,
        c.name,
        c.transport,
        c.command,
        JSON.stringify(c.args),
        c.status,
        JSON.stringify(c.tools),
        c.lastAttemptAt,
        c.error,
      );
  }
  updateMcpConnection(c: McpConnection): void {
    this.db
      .prepare(
        "UPDATE mcp_connections SET name=?,command=?,args=?,status=?,tools=?,last_attempt_at=?,error=? WHERE id=?",
      )
      .run(
        c.name,
        c.command,
        JSON.stringify(c.args),
        c.status,
        JSON.stringify(c.tools),
        c.lastAttemptAt,
        c.error,
        c.id,
      );
  }
  removeMcpConnection(id: string): void {
    this.db.prepare("DELETE FROM mcp_connections WHERE id=?").run(id);
  }
  mcpToolPermissions(
    projectId: string,
    connectionId: string,
  ): Record<string, boolean> {
    const rows = this.db
      .prepare(
        "SELECT tool_name,enabled FROM project_mcp_tools WHERE project_id=? AND connection_id=?",
      )
      .all(projectId, connectionId) as { tool_name: string; enabled: number }[];
    return Object.fromEntries(rows.map((r) => [r.tool_name, r.enabled === 1]));
  }
  setMcpToolPermission(
    projectId: string,
    connectionId: string,
    toolName: string,
    enabled: boolean,
  ): void {
    this.db
      .prepare(
        "INSERT INTO project_mcp_tools VALUES(?,?,?,?) ON CONFLICT(project_id,connection_id,tool_name) DO UPDATE SET enabled=excluded.enabled",
      )
      .run(projectId, connectionId, toolName, enabled ? 1 : 0);
  }
  close(): void {
    this.db.close();
  }
}
function mcpRow(r: Record<string, unknown>): McpConnection {
  return {
    id: String(r.id),
    name: String(r.name),
    transport: "stdio",
    command: String(r.command),
    args: JSON.parse(String(r.args)),
    status: r.status as McpConnection["status"],
    tools: JSON.parse(String(r.tools)),
    lastAttemptAt: r.last_attempt_at as string | null,
    error: r.error as string | null,
  };
}
function projectRow(r: Record<string, unknown>): Project {
  return {
    id: String(r.id),
    name: String(r.name),
    type: String(r.type),
    root: String(r.root),
    docsRoot: r.docs_root as string | null,
    preferredAgent: r.preferred_agent as Project["preferredAgent"],
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}
function taskRow(r: Record<string, unknown>): Task {
  return {
    id: String(r.id),
    projectId: String(r.project_id),
    request: String(r.request),
    provider: r.provider as Task["provider"],
    mode: r.mode as Task["mode"],
    status: String(r.status),
    stage: String(r.stage),
    providerSession: r.provider_session as string | null,
    summary: r.summary as string | null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}
function approvalRow(r: Record<string, unknown>): Approval {
  return {
    id: String(r.id),
    taskId: String(r.task_id),
    method: String(r.method),
    description: String(r.description),
    status: r.status as Approval["status"],
    createdAt: String(r.created_at),
    decidedAt: r.decided_at as string | null,
  };
}
