import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { commandFor } from "./cli.mjs";
const token = randomBytes(32).toString("hex");
const env = {
  ...process.env,
  FORGE_DEV_TOKEN: token,
  VITE_FORGE_DEV_TOKEN: token,
};
const runtimeCmd = commandFor("pnpm", ["--filter", "@forge/runtime", "dev"]);
const desktopCmd = commandFor("pnpm", [
  "--filter",
  "@forge/desktop",
  "tauri",
  "dev",
]);
const runtime = spawn(runtimeCmd.command, runtimeCmd.args, {
  env,
  stdio: "inherit",
  shell: runtimeCmd.shell,
});
const desktop = spawn(desktopCmd.command, desktopCmd.args, {
  env,
  stdio: "inherit",
  shell: desktopCmd.shell,
});
function stop() {
  runtime.kill();
  desktop.kill();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
desktop.on("exit", stop);
runtime.on("exit", stop);
