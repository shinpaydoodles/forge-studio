import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { Store, type McpConnection } from "./db.js";

// Server metadata is untrusted display data. No MCP tool is invoked by this manager.
export class McpManager {
  private live = new Map<string, Client>();
  constructor(private store: Store) {}

  async connect(id: string): Promise<McpConnection> {
    const saved = this.store.mcpConnection(id);
    if (!saved) throw new Error("MCP connection not found.");
    if (this.live.has(id)) return saved;
    if (this.live.size >= 5)
      throw new Error("Disconnect another MCP server first (maximum five).");
    const attempted = {
      ...saved,
      lastAttemptAt: new Date().toISOString(),
      error: null,
    };
    this.store.updateMcpConnection(attempted);
    const client = new Client({ name: "forge-studio", version: "0.1.0" });
    client.onclose = () => {
      if (this.live.get(id) !== client) return;
      this.live.delete(id);
      const current = this.store.mcpConnection(id);
      if (current)
        this.store.updateMcpConnection({ ...current, status: "disconnected" });
    };
    const transport = new StdioClientTransport({
      command: saved.command,
      args: saved.args,
      stderr: "ignore",
    });
    let expired = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        (async () => {
          await client.connect(transport);
          const listed = await client.listTools();
          if (expired) return;
          const tools = listed.tools.slice(0, 200).map((tool) => ({
            name: tool.name.slice(0, 200),
            description: tool.description?.slice(0, 2000),
            inputSchema: tool.inputSchema,
          }));
          const connected: McpConnection = {
            ...attempted,
            status: "connected",
            tools,
          };
          this.live.set(id, client);
          this.store.updateMcpConnection(connected);
        })(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("timeout")), 10000);
        }),
      ]);
      return this.store.mcpConnection(id)!;
    } catch {
      expired = true;
      await client.close().catch(() => {});
      const failed: McpConnection = {
        ...attempted,
        status: "error",
        error:
          "Connection failed or timed out. Check the executable and server configuration.",
      };
      this.store.updateMcpConnection(failed);
      return failed;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async disconnect(id: string): Promise<void> {
    const client = this.live.get(id);
    this.live.delete(id);
    if (client) await client.close().catch(() => {});
    const saved = this.store.mcpConnection(id);
    if (saved)
      this.store.updateMcpConnection({ ...saved, status: "disconnected" });
  }

  async close(): Promise<void> {
    await Promise.all([...this.live.keys()].map((id) => this.disconnect(id)));
  }
}
