import { runCodex } from "../dist/agents.js";
const root = process.env.FORGE_SMOKE_PROJECT || process.cwd();
const project = {
  id: "smoke",
  name: "Forge Studio smoke test",
  type: "software",
  root,
  docsRoot: null,
  preferredAgent: "codex",
};
const task = {
  id: "smoke",
  projectId: "smoke",
  request: "Reply with exactly FORGE_READY. Do not inspect or edit files.",
  provider: "codex",
  mode: "manual",
};
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 120000);
try {
  const result = await runCodex(project, task, {
    signal: controller.signal,
    readOnly: true,
    onEvent: (kind, payload) => {
      if (kind === "warning") console.error(payload);
    },
    ask: async () => false,
  });
  console.log(
    JSON.stringify({
      summary: result.summary,
      sessionCreated: !!result.session,
    }),
  );
  if (!result.summary.includes("FORGE_READY")) process.exitCode = 1;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
}
