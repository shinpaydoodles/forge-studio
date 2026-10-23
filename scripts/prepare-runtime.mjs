import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { commandFor } from "./cli.mjs";
const root = process.cwd();
const tauri = join(root, "apps", "desktop", "src-tauri");
const runtime = join(tauri, "resources", "runtime");
if (!resolve(runtime).startsWith(resolve(tauri) + sep))
  throw new Error("Unsafe runtime destination.");
if (existsSync(runtime)) rmSync(runtime, { recursive: true, force: true });
mkdirSync(join(tauri, "resources"), { recursive: true });
mkdirSync(join(tauri, "binaries"), { recursive: true });
const buildCmd = commandFor("pnpm", ["--filter", "@forge/runtime", "build"]);
const build = spawnSync(buildCmd.command, buildCmd.args, {
  stdio: "inherit",
  shell: buildCmd.shell,
});
if (build.status !== 0) process.exit(build.status || 1);
mkdirSync(runtime, { recursive: true });
copyFileSync(
  join(root, "services", "local-runtime", "package.json"),
  join(runtime, "package.json"),
);
cpSync(join(root, "services", "local-runtime", "dist"), join(runtime, "dist"), {
  recursive: true,
});
const npmCmd = commandFor("npm", ["install", "--omit=dev", "--ignore-scripts"]);
const install = spawnSync(npmCmd.command, npmCmd.args, {
  cwd: runtime,
  stdio: "inherit",
  shell: npmCmd.shell,
});
if (install.status !== 0) process.exit(install.status || 1);
const nodeExe = process.execPath;
copyFileSync(nodeExe, join(tauri, "binaries", "forge-node.exe"));
console.log("Packaged local runtime and Node executable for Tauri.");
