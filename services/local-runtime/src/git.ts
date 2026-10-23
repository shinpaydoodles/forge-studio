import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { canonicalDirectory } from "./security.js";
const exec = promisify(execFile);
async function git(root: string, args: string[]): Promise<string> {
  const cwd = await canonicalDirectory(root);
  const { stdout } = await exec("git", ["-C", cwd, ...args], {
    timeout: 10000,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  return stdout.trimEnd();
}
export async function gitInfo(
  root: string,
): Promise<{
  isRepo: boolean;
  branch: string | null;
  status: string;
  diff: string;
}> {
  try {
    return {
      isRepo: true,
      branch: await git(root, ["branch", "--show-current"]),
      status: await git(root, ["status", "--short"]),
      diff: await git(root, ["diff", "--no-ext-diff", "--"]),
    };
  } catch {
    return { isRepo: false, branch: null, status: "", diff: "" };
  }
}
