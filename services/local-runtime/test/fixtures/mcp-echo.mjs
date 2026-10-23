import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";

serveStdio(() => {
  const server = new McpServer({ name: "forge-test-echo", version: "1.0.0" });
  server.registerTool(
    "echo",
    {
      description: "Returns text supplied by the caller",
      inputSchema: z.object({ text: z.string() }),
    },
    async ({ text }) => ({ content: [{ type: "text", text }] }),
  );
  return server;
});
