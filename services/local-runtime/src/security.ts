import { realpath, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

export async function canonicalDirectory(input: string): Promise<string> {
  if (!isAbsolute(input)) throw new Error("Choose an absolute directory.");
  const path = await realpath(input);
  if (!(await stat(path)).isDirectory())
    throw new Error("The selected path is not a directory.");
  return path;
}
export async function confinedPath(
  root: string,
  requested: string,
  mayCreate = false,
): Promise<string> {
  const base = await canonicalDirectory(root);
  const candidate = resolve(base, requested);
  const parent = mayCreate
    ? await realpath(dirname(candidate))
    : await realpath(candidate);
  const actual = mayCreate
    ? resolve(parent, candidate.slice(dirname(candidate).length + 1))
    : parent;
  const rel = relative(base, actual);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))
    throw new Error("Path escapes the authorized directory.");
  return actual;
}
export function redact(value: string): string {
  let result = value.replace(
    /(sk-(?:proj-|ant-)?[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]{20,})/g,
    "[REDACTED]",
  );
  for (const secret of [
    process.env.ANTHROPIC_API_KEY,
    process.env.OPENAI_API_KEY,
  ])
    if (secret && secret.length > 8)
      result = result.replaceAll(secret, "[REDACTED]");
  return result;
}
export function sanitize(value: unknown): unknown {
  if (typeof value === "string") return redact(value);
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitize(item)]),
    );
  return value;
}
