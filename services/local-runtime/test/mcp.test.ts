import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { Store, type McpConnection } from "../src/db.ts";
import { McpManager } from "../src/mcp.ts";

test("MCP server discovery and project tool permission persist", async () => {
  const store = new Store(":memory:");
  const manager = new McpManager(store);
  const now = new Date().toISOString();
  const projectId = "00000000-0000-4000-8000-000000000001";
  store.addProject({
    id: projectId,
    name: "Test",
    type: "software",
    root: process.cwd(),
    docsRoot: null,
    preferredAgent: "codex",
    createdAt: now,
    updatedAt: now,
  });
  const connection: McpConnection = {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Echo fixture",
    transport: "stdio",
    command: process.execPath,
    args: [join(import.meta.dirname, "fixtures", "mcp-echo.mjs")],
    status: "disconnected",
    tools: [],
    lastAttemptAt: null,
    error: null,
  };
  store.addMcpConnection(connection);
  try {
    const connected = await manager.connect(connection.id);
    assert.equal(connected.status, "connected", connected.error || "");
    assert.equal(connected.tools[0]?.name, "echo");
    assert.deepEqual(store.mcpToolPermissions(projectId, connection.id), {});
    store.setMcpToolPermission(projectId, connection.id, "echo", true);
    assert.equal(store.mcpToolPermissions(projectId, connection.id).echo, true);
    await manager.disconnect(connection.id);
    assert.equal(store.mcpConnection(connection.id)?.status, "disconnected");
    assert.equal(store.mcpConnection(connection.id)?.tools[0]?.name, "echo");
  } finally {
    await manager.close();
    store.close();
  }
});
