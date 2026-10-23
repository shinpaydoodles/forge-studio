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
  payload: Record<string, unknown>;
  createdAt: string;
};
export type Approval = {
  id: string;
  taskId: string;
  method: string;
  description: string;
  status: string;
  createdAt: string;
  decidedAt: string | null;
};
export type TaskDetail = Task & { events: TaskEvent[]; approvals: Approval[] };
export type Note = { path: string; title: string; excerpt: string };
export type GitInfo = {
  isRepo: boolean;
  branch: string | null;
  status: string;
  diff: string;
};

async function credential(): Promise<string> {
  if ("__TAURI_INTERNALS__" in window) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("runtime_token");
  }
  return import.meta.env.VITE_FORGE_DEV_TOKEN || "";
}
const endpoint =
  "__TAURI_INTERNALS__" in window ? "http://127.0.0.1:4317/api" : "/api";
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${endpoint}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${await credential()}`,
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || `Request failed (${response.status})`);
  return result as T;
}
export function watchTask(id: string, onUpdate: () => void): () => void {
  const controller = new AbortController();
  void (async () => {
    let after = 0;
    while (!controller.signal.aborted) {
      try {
        const response = await fetch(
          `${endpoint}/tasks/${id}/events?after=${after}`,
          {
            headers: { authorization: `Bearer ${await credential()}` },
            signal: controller.signal,
          },
        );
        if (!response.ok || !response.body)
          throw new Error(`Event stream failed (${response.status})`);
        onUpdate();
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let split = buffer.indexOf("\n\n");
          while (split >= 0) {
            const block = buffer.slice(0, split);
            buffer = buffer.slice(split + 2);
            if (block.startsWith("data: ")) {
              try {
                const event = JSON.parse(block.slice(6)) as { id: number };
                after = Math.max(after, event.id);
                onUpdate();
              } catch {
                /* Ignore malformed frames. */
              }
            }
            split = buffer.indexOf("\n\n");
          }
        }
      } catch (error) {
        if (controller.signal.aborted) break;
        console.error(error);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  })();
  return () => controller.abort();
}
