---
type: user-flows
project: Forge Studio
status: draft
created: 2026-10-23
tags: [forge-studio, ux]
---
# User Flows

## Import and inspect

1. Open Projects and enter name, existing absolute root path, and optional Obsidian folder.
2. Forge Studio canonicalizes paths, stores configuration, and leaves imported files untouched.
3. Dashboard shows project context; Git & Changes shows branch, status, and diff.

## Assisted task

1. Select a project, enter task request, provider, and Assisted mode.
2. The provider produces a read-only plan. The task pauses at an approval card.
3. Approve or reject. If approved, the provider runs from the project directory.
4. Streamed output and tool events appear in Tasks. Stop cancels the active run.
5. Inspect actual changes in Git & Changes and update notes through a separate reviewed proposal.

The end-to-end provider flow still needs live verification. See [[04 Development/Testing and QA|Testing and QA]].
