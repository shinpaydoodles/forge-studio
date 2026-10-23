import { existsSync } from "node:fs";
import { join } from "node:path";

export function commandFor(name, args) {
  if (process.platform !== "win32")
    return { command: name, args, shell: false };
  const base = join(process.env.APPDATA || "", "npm", "node_modules");
  const script =
    name === "pnpm"
      ? join(base, "pnpm", "bin", "pnpm.cjs")
      : join(base, "npm", "bin", "npm-cli.js");
  if (existsSync(script))
    return { command: process.execPath, args: [script, ...args], shell: false };
  return { command: `${name}.cmd`, args, shell: true };
}
