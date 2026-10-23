import { readdir, readFile, writeFile, rename } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { randomUUID } from "node:crypto";
import { canonicalDirectory, confinedPath } from "./security.js";

export async function listNotes(
  root: string,
  query = "",
): Promise<{ path: string; title: string; excerpt: string }[]> {
  const base = await canonicalDirectory(root);
  const matches: { path: string; title: string; excerpt: string }[] = [];
  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > 12 || matches.length >= 200) return;
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full, depth + 1);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        const body = await readFile(full, "utf8");
        if (
          !query ||
          entry.name.toLowerCase().includes(query.toLowerCase()) ||
          body.toLowerCase().includes(query.toLowerCase())
        )
          matches.push({
            path: relative(base, full),
            title: basename(entry.name, ".md"),
            excerpt: body
              .replace(/^---[\s\S]*?---/, "")
              .trim()
              .slice(0, 220),
          });
      }
    }
  }
  await walk(base, 0);
  return matches;
}
export async function readNote(root: string, path: string): Promise<string> {
  const full = await confinedPath(root, path);
  if (!full.toLowerCase().endsWith(".md"))
    throw new Error("Only Markdown notes can be read.");
  return readFile(full, "utf8");
}
export async function replaceNote(
  root: string,
  path: string,
  expected: string,
  next: string,
): Promise<void> {
  const full = await confinedPath(root, path);
  if (!full.toLowerCase().endsWith(".md"))
    throw new Error("Only Markdown notes can be changed.");
  const current = await readFile(full, "utf8");
  if (current !== expected)
    throw new Error("The note changed since the proposal was created.");
  const temporary = `${full}.${randomUUID()}.tmp`;
  await writeFile(temporary, next, { encoding: "utf8", flag: "wx" });
  await rename(temporary, full);
}
