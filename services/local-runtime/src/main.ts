import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { join } from "node:path";
import { homedir } from "node:os";
import { spawn } from "node:child_process";
import { z } from "zod";
import { Store, type Project } from "./db.js";
import { TaskManager } from "./tasks.js";
import { canonicalDirectory } from "./security.js";
import { listNotes, readNote, replaceNote } from "./knowledge.js";
import { gitInfo } from "./git.js";
import { McpManager } from "./mcp.js";

const dataDir =
  process.env.FORGE_DATA_DIR ||
  join(
    process.env.APPDATA || join(homedir(), ".local", "share"),
    "Forge Studio",
  );
const store = new Store(join(dataDir, "forge.db"));
const tasks = new TaskManager(store);
const mcp = new McpManager(store);
const token = process.env.FORGE_DEV_TOKEN || randomBytes(32).toString("hex");
const port = Number(process.env.FORGE_PORT || 4317);
const projectInput = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.string().trim().min(1).max(60).default("software"),
  root: z.string().min(1),
  docsRoot: z.string().nullable().optional(),
  preferredAgent: z.enum(["codex", "claude"]).default("codex"),
});
const taskInput = z.object({
  projectId: z.string().uuid(),
  request: z.string().trim().min(1).max(12000),
  provider: z.enum(["codex", "claude"]),
  mode: z.enum(["manual", "assisted"]),
});
const mcpInput = z.object({
  name: z.string().trim().min(1).max(100),
  command: z.string().trim().min(1).max(500),
  args: z.array(z.string().max(1000)).max(30).default([]),
});

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(data));
}
async function body(req: IncomingMessage): Promise<unknown> {
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 1024 * 1024) throw new Error("Request body too large.");
  }
  return text ? JSON.parse(text) : {};
}
function authorize(req: IncomingMessage): boolean {
  const supplied = req.headers.authorization?.replace(/^Bearer /, "") || "";
  const a = Buffer.from(supplied),
    b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
async function hasCommand(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(
      process.platform === "win32" ? "where.exe" : "which",
      [name],
      { windowsHide: true, stdio: "ignore" },
    );
    child.on("exit", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}
async function status(): Promise<unknown> {
  return {
    codex: {
      installed: await hasCommand("codex.exe"),
      auth: "Check with codex login status",
    },
    claude: {
      sdkInstalled: true,
      apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
      billing: "Anthropic API billing",
    },
    git: { installed: await hasCommand("git") },
    obsidian: { type: "local Markdown folder" },
    roblox: { status: "not configured" },
    blender: { status: "not configured" },
    vscode: { installed: await hasCommand("code") },
  };
}
function projectOrThrow(id: string): Project {
  const project = store.project(id);
  if (!project) throw new Error("Project not found.");
  return project;
}

const server = createServer(async (req, res) => {
  try {
    if (!req.url?.startsWith("/api/")) {
      json(res, 404, { error: "Not found" });
      return;
    }
    const origin = req.headers.origin;
    if (origin) {
      if (
        ![
          "tauri://localhost",
          "http://tauri.localhost",
          "http://127.0.0.1:5173",
          "http://localhost:5173",
        ].includes(origin)
      ) {
        json(res, 403, { error: "Origin not allowed" });
        return;
      }
      res.setHeader("access-control-allow-origin", origin);
      res.setHeader(
        "access-control-allow-headers",
        "authorization,content-type",
      );
      res.setHeader(
        "access-control-allow-methods",
        "GET,POST,PATCH,DELETE,OPTIONS",
      );
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
    }
    if (!authorize(req)) {
      json(res, 401, { error: "Unauthorized" });
      return;
    }
    const url = new URL(req.url, "http://127.0.0.1");
    const path = url.pathname;
    const method = req.method || "GET";
    if (path === "/api/health" && method === "GET")
      return json(res, 200, { ok: true });
    if (path === "/api/status" && method === "GET")
      return json(res, 200, await status());
    if (path === "/api/mcp/connections" && method === "GET")
      return json(res, 200, store.mcpConnections());
    if (path === "/api/mcp/connections" && method === "POST") {
      const input = mcpInput.parse(await body(req));
      const connection = {
        ...input,
        id: randomUUID(),
        transport: "stdio" as const,
        status: "disconnected" as const,
        tools: [],
        lastAttemptAt: null,
        error: null,
      };
      store.addMcpConnection(connection);
      return json(res, 201, connection);
    }
    const mcpMatch = path.match(
      /^\/api\/mcp\/connections\/([^/]+)(?:\/(connect|disconnect|permissions))?$/,
    );
    if (mcpMatch) {
      const id = mcpMatch[1]!;
      const saved = store.mcpConnection(id);
      if (!saved) throw new Error("MCP connection not found.");
      const action = mcpMatch[2];
      if (!action && method === "PATCH") {
        const input = mcpInput.partial().parse(await body(req));
        await mcp.disconnect(id);
        const updated = {
          ...saved,
          ...input,
          status: "disconnected" as const,
          tools: [],
          error: null,
        };
        store.updateMcpConnection(updated);
        return json(res, 200, updated);
      }
      if (!action && method === "DELETE") {
        await mcp.disconnect(id);
        store.removeMcpConnection(id);
        return json(res, 200, { removed: true });
      }
      if (action === "connect" && method === "POST")
        return json(res, 200, await mcp.connect(id));
      if (action === "disconnect" && method === "POST") {
        await mcp.disconnect(id);
        return json(res, 200, store.mcpConnection(id));
      }
      if (action === "permissions" && method === "GET") {
        const project = projectOrThrow(url.searchParams.get("projectId") || "");
        return json(res, 200, store.mcpToolPermissions(project.id, id));
      }
      if (action === "permissions" && method === "PATCH") {
        const input = z
          .object({
            projectId: z.string().uuid(),
            toolName: z.string(),
            enabled: z.boolean(),
          })
          .parse(await body(req));
        projectOrThrow(input.projectId);
        if (!saved.tools.some((tool) => tool.name === input.toolName))
          throw new Error("Tool not advertised by this connection.");
        store.setMcpToolPermission(
          input.projectId,
          id,
          input.toolName,
          input.enabled,
        );
        return json(res, 200, { ok: true });
      }
    }
    if (path === "/api/projects" && method === "GET")
      return json(res, 200, store.projects());
    if (path === "/api/projects" && method === "POST") {
      const input = projectInput.parse(await body(req));
      const root = await canonicalDirectory(input.root);
      const docsRoot = input.docsRoot
        ? await canonicalDirectory(input.docsRoot)
        : null;
      if (
        store
          .projects()
          .some((p) => p.root.toLowerCase() === root.toLowerCase())
      )
        throw new Error("This directory is already a project.");
      const now = new Date().toISOString();
      const project: Project = {
        id: randomUUID(),
        name: input.name,
        type: input.type,
        root,
        docsRoot,
        preferredAgent: input.preferredAgent,
        createdAt: now,
        updatedAt: now,
      };
      store.addProject(project);
      return json(res, 201, project);
    }
    const projectMatch = path.match(/^\/api\/projects\/([^/]+)(?:\/(.+))?$/);
    if (projectMatch) {
      const project = projectOrThrow(projectMatch[1]!);
      const action = projectMatch[2];
      if (!action && method === "GET") return json(res, 200, project);
      if (!action && method === "PATCH") {
        const input = projectInput
          .omit({ root: true })
          .partial()
          .parse(await body(req));
        const updated = {
          ...project,
          ...input,
          docsRoot:
            input.docsRoot === undefined
              ? project.docsRoot
              : input.docsRoot
                ? await canonicalDirectory(input.docsRoot)
                : null,
          updatedAt: new Date().toISOString(),
        };
        store.updateProject(updated);
        return json(res, 200, updated);
      }
      if (action === "git" && method === "GET")
        return json(res, 200, await gitInfo(project.root));
      if (action === "notes" && method === "GET")
        return json(
          res,
          200,
          project.docsRoot
            ? await listNotes(project.docsRoot, url.searchParams.get("q") || "")
            : [],
        );
      if (action === "note" && method === "GET") {
        if (!project.docsRoot) throw new Error("No Obsidian folder connected.");
        return json(res, 200, {
          path: url.searchParams.get("path"),
          content: await readNote(
            project.docsRoot,
            url.searchParams.get("path") || "",
          ),
        });
      }
      if (action === "proposals" && method === "GET")
        return json(res, 200, store.noteProposals(project.id));
      if (action === "proposals" && method === "POST") {
        if (!project.docsRoot) throw new Error("No Obsidian folder connected.");
        const input = z
          .object({
            path: z.string().min(1),
            expected: z.string(),
            proposed: z.string(),
          })
          .parse(await body(req));
        const current = await readNote(project.docsRoot, input.path);
        if (current !== input.expected)
          throw new Error(
            "The note changed. Reload it before proposing an edit.",
          );
        const proposal = {
          id: randomUUID(),
          projectId: project.id,
          path: input.path,
          expected: input.expected,
          proposed: input.proposed,
          createdAt: new Date().toISOString(),
        };
        store.proposeNote(proposal);
        return json(res, 201, {
          id: proposal.id,
          path: proposal.path,
          status: "pending",
        });
      }
    }
    const proposalMatch = path.match(/^\/api\/proposals\/([^/]+)\/apply$/);
    if (proposalMatch && method === "POST") {
      const proposal = store.noteProposal(proposalMatch[1]!);
      if (!proposal || proposal.status !== "pending")
        throw new Error("Proposal is not pending.");
      const project = projectOrThrow(String(proposal.project_id));
      if (!project.docsRoot)
        throw new Error("Documentation folder was disconnected.");
      await replaceNote(
        project.docsRoot,
        String(proposal.path),
        String(proposal.expected),
        String(proposal.proposed),
      );
      store.applyNote(String(proposal.id));
      return json(res, 200, { applied: true });
    }
    if (path === "/api/tasks" && method === "GET")
      return json(
        res,
        200,
        tasks.store.tasks(url.searchParams.get("projectId") || undefined),
      );
    if (path === "/api/tasks" && method === "POST") {
      const input = taskInput.parse(await body(req));
      const project = projectOrThrow(input.projectId);
      return json(
        res,
        201,
        tasks.create(project, input.request, input.provider, input.mode),
      );
    }
    const taskMatch = path.match(/^\/api\/tasks\/([^/]+)(?:\/(.+))?$/);
    if (taskMatch) {
      const task = store.task(taskMatch[1]!);
      if (!task) throw new Error("Task not found.");
      const action = taskMatch[2];
      if (!action && method === "GET")
        return json(res, 200, {
          ...task,
          events: store.events(task.id),
          approvals: store.approvals(task.id),
        });
      if (action === "events" && method === "GET")
        return tasks.subscribe(
          task.id,
          res,
          Number(url.searchParams.get("after") || 0),
        );
      if (action === "cancel" && method === "POST") {
        tasks.cancel(task.id);
        return json(res, 200, { ok: true });
      }
      if (action === "review" && method === "POST") {
        const input = z
          .object({ accepted: z.boolean() })
          .parse(await body(req));
        tasks.review(task.id, input.accepted);
        return json(res, 200, { ok: true });
      }
    }
    const approvalMatch = path.match(/^\/api\/approvals\/([^/]+)\/decision$/);
    if (approvalMatch && method === "POST") {
      const input = z.object({ approved: z.boolean() }).parse(await body(req));
      tasks.decide(approvalMatch[1]!, input.approved);
      return json(res, 200, { ok: true });
    }
    if (path === "/api/settings" && method === "GET")
      return json(res, 200, {
        defaultProject: store.setting("defaultProject"),
      });
    if (path === "/api/settings" && method === "PATCH") {
      const input = z
        .object({ defaultProject: z.string().nullable() })
        .parse(await body(req));
      if (input.defaultProject) projectOrThrow(input.defaultProject);
      store.setSetting("defaultProject", input.defaultProject || "");
      return json(res, 200, { defaultProject: input.defaultProject });
    }
    json(res, 404, { error: "Not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    json(
      res,
      error instanceof z.ZodError
        ? 400
        : message.includes("not found")
          ? 404
          : 400,
      { error: message },
    );
  }
});

server.listen(port, "127.0.0.1", () =>
  console.log(`Forge runtime listening on 127.0.0.1:${port}`),
);
process.on("SIGINT", () => {
  void mcp.close();
  server.close();
  store.close();
});
