---
type: integration
project: Forge Studio
status: pending
created: 2026-10-23
tags: [forge-studio, github]
---
# GitHub Integration

The local checkout has a Git repository. Forge Studio's UI currently shows read-only Git branch, status, and unstaged diff. GitHub authentication and repository creation are separate from the app implementation and have not been verified here.

The target repository is `forge-studio` with **private** visibility. Before push, inspect `.gitignore`, staged paths, secrets, generated binaries, SQLite, and vault material. Do not report a remote or visibility until GitHub confirms both. [[04 Development/Implementation Plan|Implementation Plan]] includes the publication gate.
