---
type: integration
project: Forge Studio
status: implemented-in-part
created: 2026-10-23
tags: [forge-studio, obsidian]
---
# Obsidian Integration

Projects store an explicitly selected Markdown folder, not an entire vault by default. Forge Studio lists Markdown notes, searches file names and contents, reads a selected note, and offers a before/after proposal that the user applies. Updates check the expected original text and write through a temporary file. Existing wikilinks remain plain Markdown.

No Obsidian cloud account is required. Search is deterministic and capped at 200 matches. Retrieval into agent prompts and automatic documentation proposals are planned. The current editor works on whole note text, so review the displayed change carefully. [[02 Architecture/Security Model|Security Model]] explains path checks.
