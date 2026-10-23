import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { commandFor } from "./cli.mjs";

const token = randomBytes(32).toString("hex");
const env = {
  ...process.env,
  FORGE_DEV_TOKEN: token,
  VITE_FORGE_DEV_TOKEN: token,
};
const runtime = commandFor("pnpm", ["--filter", "@forge/runtime", "dev"]);
const desktop = commandFor("pnpm", ["--filter", "@forge/desktop", "dev"]);
const children = [
  spawn(runtime.command, runtime.args, {
    stdio: "inherit",
    env,
    shell: runtime.shell,
  }),
  spawn(desktop.command, desktop.args, {
    stdio: "inherit",
    env,
    shell: desktop.shell,
  }),
];
function stop() {
  for (const child of children) child.kill();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const child of children) child.on("exit", () => stop());
