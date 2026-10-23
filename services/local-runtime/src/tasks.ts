import { randomUUID } from "node:crypto";
import type { ServerResponse } from "node:http";
import { Store, type Approval, type Project, type Task } from "./db.js";
import { runClaude, runCodex } from "./agents.js";
import { redact, sanitize } from "./security.js";
import { gitInfo } from "./git.js";

const FINAL = new Set(["completed", "cancelled", "failed"]);
export function canTransition(from: string, to: string): boolean {
  const allowed: Record<string, string[]> = {
    created: ["analyzing", "cancelled"],
    analyzing: ["planning", "executing", "failed", "cancelled"],
    planning: ["awaiting_approval", "failed", "cancelled"],
    awaiting_approval: ["executing", "cancelled"],
    executing: ["awaiting_review", "failed", "cancelled"],
    awaiting_review: ["completed", "failed", "cancelled"],
    paused: ["analyzing", "cancelled"],
  };
  return allowed[from]?.includes(to) ?? false;
}

export class TaskManager {
  active = new Map<string, AbortController>();
  waiters = new Map<string, (approved: boolean) => void>();
  streams = new Map<string, Set<ServerResponse>>();
  constructor(public store: Store) {}
  emit(taskId: string, kind: string, payload: unknown): void {
    const event = this.store.event(taskId, kind, sanitize(payload));
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const response of this.streams.get(taskId) || []) response.write(data);
  }
  subscribe(taskId: string, response: ServerResponse, after: number): void {
    response.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-store",
      connection: "keep-alive",
    });
    for (const event of this.store.events(taskId, after))
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    const set = this.streams.get(taskId) || new Set<ServerResponse>();
    set.add(response);
    this.streams.set(taskId, set);
    response.on("close", () => {
      set.delete(response);
      if (!set.size) this.streams.delete(taskId);
    });
  }
  create(
    project: Project,
    request: string,
    provider: Task["provider"],
    mode: Task["mode"],
  ): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: randomUUID(),
      projectId: project.id,
      request,
      provider,
      mode,
      status: "created",
      stage: "Queued",
      providerSession: null,
      summary: null,
      createdAt: now,
      updatedAt: now,
    };
    this.store.addTask(task);
    this.emit(task.id, "created", { request, provider, mode });
    void this.run(task, project);
    return task;
  }
  private set(
    taskId: string,
    status: string,
    stage: string,
    summary?: string | null,
    session?: string | null,
  ): void {
    const task = this.store.task(taskId);
    if (!task || !canTransition(task.status, status))
      throw new Error(`Invalid transition ${task?.status} → ${status}`);
    this.store.updateTask(taskId, status, stage, summary, session);
    this.emit(taskId, "state", { status, stage });
  }
  private async approve(
    taskId: string,
    method: string,
    description: string,
    signal: AbortSignal,
  ): Promise<boolean> {
    const id = randomUUID();
    const approval: Approval = {
      id,
      taskId,
      method,
      description: description.slice(0, 2500),
      status: "pending",
      createdAt: new Date().toISOString(),
      decidedAt: null,
    };
    this.store.approval(approval);
    this.emit(taskId, "approval", approval);
    return new Promise<boolean>((resolve) => {
      const done = (ok: boolean) => {
        this.waiters.delete(id);
        signal.removeEventListener("abort", onAbort);
        resolve(ok);
      };
      const onAbort = () => done(false);
      this.waiters.set(id, done);
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }
  decide(id: string, approved: boolean): void {
    const approval = this.store.getApproval(id);
    if (!approval || !this.waiters.has(id))
      throw new Error("Approval is no longer active.");
    if (!this.store.decide(id, approved ? "approved" : "rejected"))
      throw new Error("Approval already decided.");
    this.emit(approval.taskId, "approval_decision", { id, approved });
    this.waiters.get(id)?.(approved);
  }
  cancel(id: string): void {
    const task = this.store.task(id);
    if (!task || FINAL.has(task.status)) return;
    this.active.get(id)?.abort();
    if (!this.active.has(id)) this.set(id, "cancelled", "Cancelled by user");
  }
  review(id: string, accepted: boolean): void {
    const task = this.store.task(id);
    if (!task || task.status !== "awaiting_review")
      throw new Error("Task is not awaiting review.");
    this.set(
      id,
      accepted ? "completed" : "failed",
      accepted ? "Accepted by user" : "Marked unsuccessful by user",
    );
    this.emit(id, "review", { accepted });
  }
  private async run(task: Task, project: Project): Promise<void> {
    if (this.active.has(task.id)) return;
    const controller = new AbortController();
    this.active.set(task.id, controller);
    const run = task.provider === "codex" ? runCodex : runClaude;
    const onEvent = (kind: string, payload: unknown) =>
      this.emit(task.id, kind, payload);
    const ask = (method: string, description: string, signal: AbortSignal) =>
      this.approve(task.id, method, description, signal);
    try {
      this.set(task.id, "analyzing", "Preparing agent");
      if (task.mode === "assisted") {
        this.set(task.id, "planning", "Generating a read-only plan");
        const plan = await run(project, task, {
          signal: controller.signal,
          onEvent,
          ask,
          readOnly: true,
        });
        this.store.updateTask(
          task.id,
          "planning",
          "Plan ready",
          plan.summary,
          plan.session,
        );
        this.emit(task.id, "plan", { text: plan.summary });
        this.set(task.id, "awaiting_approval", "Review the plan");
        const approved = await ask(
          "execute plan",
          plan.summary || task.request,
          controller.signal,
        );
        if (!approved) {
          this.set(task.id, "cancelled", "Plan rejected");
          return;
        }
      }
      this.set(task.id, "executing", "Agent running");
      const result = await run(project, task, {
        signal: controller.signal,
        onEvent,
        ask,
        session:
          task.mode === "assisted"
            ? this.store.task(task.id)?.providerSession
            : null,
      });
      this.store.updateTask(
        task.id,
        "executing",
        "Agent turn finished",
        result.summary,
        result.session,
      );
      const git = await gitInfo(project.root);
      this.emit(task.id, "git_snapshot", {
        isRepo: git.isRepo,
        branch: git.branch,
        status: git.status,
        diff: git.diff.slice(0, 50000),
      });
      this.set(task.id, "awaiting_review", "Review agent result");
      this.emit(task.id, "provider_completed", { summary: result.summary });
    } catch (error) {
      const message = redact(
        error instanceof Error ? error.message : String(error),
      );
      if (controller.signal.aborted) {
        if (this.store.task(task.id)?.status !== "cancelled")
          this.set(task.id, "cancelled", "Cancelled by user");
      } else {
        const current = this.store.task(task.id);
        if (current && !FINAL.has(current.status))
          this.set(task.id, "failed", "Agent failed", message);
        this.emit(task.id, "error", { message });
      }
    } finally {
      this.active.delete(task.id);
    }
  }
}
