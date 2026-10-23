import {
  readdir,
  mkdir,
  copyFile,
  readFile,
  appendFile,
} from "node:fs/promises";
import { join, relative } from "node:path";
import { constants } from "node:fs";

const source = join(process.cwd(), "docs", "obsidian");
const projects =
  process.env.FORGE_OBSIDIAN_PROJECTS_DIR ||
  join(process.env.USERPROFILE || "", "Desktop", "VAULT", "2026 PROJECTS");
const destination = join(projects, "Forge Studio");
let copied = 0,
  skipped = 0;
async function walk(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const from = join(folder, entry.name);
    const to = join(destination, relative(source, from));
    if (entry.isDirectory()) {
      await mkdir(to, { recursive: true });
      await walk(from);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      await mkdir(join(to, ".."), { recursive: true });
      try {
        await copyFile(from, to, constants.COPYFILE_EXCL);
        copied++;
      } catch (error) {
        if (error.code === "EEXIST") skipped++;
        else throw error;
      }
    }
  }
}
await mkdir(destination, { recursive: true });
await walk(source);
const index = join(projects, "README.md");
const link =
  "- [[2026 PROJECTS/Forge Studio/00 Dashboard|Forge Studio]] — local-first AI development workspace";
if (!(await readFile(index, "utf8")).includes(link))
  await appendFile(index, `\n${link}\n`);
console.log(
  `Obsidian docs: ${copied} created, ${skipped} already present in ${destination}`,
);
