import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store, type Project } from "../src/db.ts";
import { canTransition, TaskManager } from "../src/tasks.ts";
import { confinedPath, redact } from "../src/security.ts";
import { listNotes, readNote, replaceNote } from "../src/knowledge.ts";

test("SQLite project and task history survive reopening", async () => {
  const root = await mkdtemp(join(tmpdir(), "forge-store-"));
  const file = join(root, "test.db");
  try {
    const store = new Store(file);
    const now = new Date().toISOString();
    const project: Project = {
      id: "p1",
      name: "Test",
      type: "software",
      root,
      docsRoot: null,
      preferredAgent: "codex",
      createdAt: now,
      updatedAt: now,
    };
    store.addProject(project);
    const tasks = new TaskManager(store);
    const task = tasks.create(
      project,
      "Inspect this project",
      "claude",
      "manual",
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(store.project("p1")?.name, "Test");
    assert.equal(store.task(task.id)?.projectId, "p1");
    store.close();
    const reopened = new Store(file);
    assert.equal(reopened.project("p1")?.name, "Test");
    assert.ok(reopened.events(task.id).length > 0);
    reopened.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("task transitions require review after provider execution", () => {
  assert.equal(canTransition("created", "analyzing"), true);
  assert.equal(canTransition("created", "completed"), false);
  assert.equal(canTransition("executing", "completed"), false);
  assert.equal(canTransition("executing", "awaiting_review"), true);
  assert.equal(canTransition("awaiting_review", "completed"), true);
});

test("canonical project paths block traversal and junction escapes", async () => {
  const base = await mkdtemp(join(tmpdir(), "forge-path-"));
  const inside = join(base, "inside");
  const outside = join(base, "outside");
  await mkdir(inside);
  await mkdir(outside);
  await writeFile(join(outside, "secret.md"), "secret");
  try {
    await assert.rejects(
      confinedPath(inside, "../outside/secret.md"),
      /escapes/,
    );
    try {
      await symlink(outside, join(inside, "link"), "junction");
      await assert.rejects(confinedPath(inside, "link/secret.md"), /escapes/);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EPERM") throw e;
    }
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("Markdown browsing and optimistic atomic edits preserve other notes", async () => {
  const root = await mkdtemp(join(tmpdir(), "forge-notes-"));
  try {
    await writeFile(join(root, "Ranch.md"), "# Ranch\nSee [[Systems]].");
    await writeFile(join(root, "Systems.md"), "# Systems\nUnchanged.");
    assert.equal((await listNotes(root, "ranch")).length, 1);
    const before = await readNote(root, "Ranch.md");
    await replaceNote(root, "Ranch.md", before, "# Ranch\nVerified update.");
    assert.equal(
      await readFile(join(root, "Systems.md"), "utf8"),
      "# Systems\nUnchanged.",
    );
    await assert.rejects(
      replaceNote(root, "Ranch.md", before, "stale"),
      /changed/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("provider secrets are redacted in logs", () => {
  assert.equal(redact("key sk-proj-abcdefghijklmnop"), "key [REDACTED]");
});
