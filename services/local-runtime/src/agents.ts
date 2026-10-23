import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { Project, Task } from "./db.js";
import { redact } from "./security.js";

export type AgentEvent = (kind: string, payload: unknown) => void;
export type AskApproval = (
  method: string,
  description: string,
  signal: AbortSignal,
) => Promise<boolean>;
export type AgentRun = {
  signal: AbortSignal;
  onEvent: AgentEvent;
  ask: AskApproval;
  session?: string | null;
  readOnly?: boolean;
};
export type AgentResult = { summary: string; session: string | null };

type RpcMessage = {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { message?: string };
};

class CodexConnection {
  child: ChildProcessWithoutNullStreams;
  pending = new Map<
    number,
    {
      resolve: (value: Record<string, unknown>) => void;
      reject: (error: Error) => void;
    }
  >();
  next = 1;
  onMessage: (m: RpcMessage) => void = () => {};
  constructor(signal: AbortSignal) {
    const binary = process.env.FORGE_CODEX_BINARY || "codex.exe";
    this.child = spawn(binary, ["app-server", "--stdio"], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    const lines = createInterface({ input: this.child.stdout });
    lines.on("line", (line) => {
      try {
        this.message(JSON.parse(line) as RpcMessage);
      } catch {
        /* Ignore non-protocol output. */
      }
    });
    this.child.stderr.on("data", () => {});
    this.child.on("error", (error) => {
      for (const item of this.pending.values()) item.reject(error);
      this.pending.clear();
    });
    this.child.on("exit", () => {
      for (const item of this.pending.values())
        item.reject(new Error("Codex App Server exited."));
      this.pending.clear();
    });
    signal.addEventListener("abort", () => this.child.kill(), { once: true });
  }
  private message(m: RpcMessage): void {
    if (m.id !== undefined && !m.method) {
      const p = this.pending.get(m.id);
      if (p) {
        this.pending.delete(m.id);
        if (m.error)
          p.reject(new Error(m.error.message || "Codex request failed"));
        else p.resolve(m.result || {});
      }
      return;
    }
    this.onMessage(m);
  }
  send(message: RpcMessage): void {
    this.child.stdin.write(JSON.stringify(message) + "\n");
  }
  request(
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>> {
    const id = this.next++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.send({ id, method, params });
    });
  }
  close(): void {
    this.child.kill();
  }
}

export async function runCodex(
  project: Project,
  task: Task,
  options: AgentRun,
): Promise<AgentResult> {
  const connection = new CodexConnection(options.signal);
  let threadId = options.session || null;
  let turnId: string | null = null;
  let summary = "";
  let finish: (result: Record<string, unknown>) => void = () => {};
  const completed = new Promise<Record<string, unknown>>((resolve, reject) => {
    finish = resolve;
    options.signal.addEventListener(
      "abort",
      () => reject(new Error("Codex task cancelled.")),
      { once: true },
    );
    connection.child.on("exit", () =>
      reject(new Error("Codex App Server exited before turn completion.")),
    );
  });
  void completed.catch(() => {});
  connection.onMessage = (m) => {
    if (m.id !== undefined && m.method) {
      const method = m.method;
      const params = m.params || {};
      if (
        method === "item/commandExecution/requestApproval" ||
        method === "item/fileChange/requestApproval"
      ) {
        const description = redact(
          String(params.command || params.reason || method),
        );
        void options
          .ask(method, description, options.signal)
          .then((ok) =>
            connection.send({
              id: m.id,
              result: { decision: ok ? "accept" : "decline" },
            }),
          )
          .catch(() =>
            connection.send({ id: m.id, result: { decision: "decline" } }),
          );
      } else connection.send({ id: m.id, result: { decision: "decline" } });
      return;
    }
    if (!m.method) return;
    const p = m.params || {};
    if (m.method === "item/agentMessage/delta") {
      const delta = String(p.delta || "");
      summary += delta;
      options.onEvent("text", { delta });
    } else if (m.method === "item/completed") {
      const item = p.item as Record<string, unknown> | undefined;
      if (item?.type === "agentMessage" && typeof item.text === "string") {
        summary = item.text;
        options.onEvent("message", { text: summary });
      }
      if (
        item?.type === "commandExecution" ||
        item?.type === "fileChange" ||
        item?.type === "mcpToolCall"
      )
        options.onEvent("tool", {
          type: item.type,
          status: item.status,
          command: redact(String(item.command || "")),
          changes: item.changes,
        });
    } else if (m.method === "turn/started")
      turnId = String((p.turn as Record<string, unknown>)?.id || "");
    else if (m.method === "turn/completed") finish(p);
    else if (m.method === "error")
      options.onEvent("warning", {
        message: redact(
          String(
            (p.error as Record<string, unknown>)?.message || "Codex error",
          ),
        ),
      });
  };
  try {
    await connection.request("initialize", {
      clientInfo: {
        name: "forge_studio",
        title: "Forge Studio",
        version: "0.1.0",
      },
    });
    connection.send({ method: "initialized", params: {} });
    if (threadId)
      await connection.request("thread/resume", {
        threadId,
        excludeTurns: true,
      });
    else {
      const started = await connection.request("thread/start", {
        cwd: project.root,
        approvalPolicy: "on-request",
        sandbox: options.readOnly ? "read-only" : "workspace-write",
      });
      threadId = String((started.thread as Record<string, unknown>)?.id || "");
    }
    if (!threadId) throw new Error("Codex did not return a thread ID.");
    options.onEvent("session", { provider: "codex", id: threadId });
    const prompt = options.readOnly
      ? `Read-only planning task. Do not edit files or run destructive commands. Produce a concise implementation plan for: ${task.request}`
      : task.request;
    const started = await connection.request("turn/start", {
      threadId,
      input: [{ type: "text", text: prompt }],
    });
    turnId = String(
      (started.turn as Record<string, unknown>)?.id || turnId || "",
    );
    options.signal.addEventListener(
      "abort",
      () => {
        if (threadId && turnId)
          void connection
            .request("turn/interrupt", { threadId, turnId })
            .catch(() => {});
      },
      { once: true },
    );
    const completion = await completed;
    const turn = completion.turn as Record<string, unknown> | undefined;
    if (turn?.status !== "completed")
      throw new Error(
        `Codex turn ended with ${String(turn?.status || "unknown")} status.`,
      );
    return { summary: summary.trim(), session: threadId };
  } finally {
    connection.close();
  }
}

export async function runClaude(
  project: Project,
  task: Task,
  options: AgentRun,
): Promise<AgentResult> {
  if (!process.env.ANTHROPIC_API_KEY)
    throw new Error(
      "Claude requires ANTHROPIC_API_KEY from a separately billed Anthropic Console account.",
    );
  const controller = new AbortController();
  options.signal.addEventListener("abort", () => controller.abort(), {
    once: true,
  });
  let summary = "";
  let session: string | null = options.session || null;
  let success = false;
  const stream = query({
    prompt: options.readOnly
      ? `Plan this task without changing files: ${task.request}`
      : task.request,
    options: {
      cwd: project.root,
      resume: options.session || undefined,
      abortController: controller,
      permissionMode: options.readOnly ? "plan" : "default",
      includePartialMessages: true,
      settingSources: [],
      canUseTool: async (tool, input) => {
        if (options.readOnly)
          return { behavior: "deny", message: "Planning is read-only." };
        const ok = await options.ask(
          `Claude ${tool}`,
          redact(JSON.stringify(input).slice(0, 2000)),
          options.signal,
        );
        return ok
          ? { behavior: "allow" }
          : { behavior: "deny", message: "User rejected the operation." };
      },
    },
  });
  for await (const message of stream) {
    session = message.session_id || session;
    if (
      message.type === "stream_event" &&
      message.event.type === "content_block_delta" &&
      message.event.delta.type === "text_delta"
    ) {
      const delta = message.event.delta.text;
      summary += delta;
      options.onEvent("text", { delta });
    } else if (message.type === "assistant")
      for (const block of message.message.content) {
        if (block.type === "tool_use")
          options.onEvent("tool", {
            type: "claudeTool",
            name: block.name,
            input: redact(JSON.stringify(block.input).slice(0, 1200)),
          });
      }
    else if (message.type === "result") {
      success = message.subtype === "success" && !message.is_error;
      if (message.subtype === "success" && message.result)
        summary = message.result;
      else options.onEvent("warning", { message: message.subtype });
    }
  }
  if (!success) throw new Error("Claude did not complete successfully.");
  return { summary: summary.trim(), session };
}
