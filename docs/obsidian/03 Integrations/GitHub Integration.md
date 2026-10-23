---
type: integration
project: Forge Studio
status: repository-pushed
created: 2026-10-23
tags: [forge-studio, github]
---
# GitHub Integration

The local checkout has a Git repository. Forge Studio's UI currently shows read-only Git branch, status, and unstaged diff. The repository [shinpaydoodles/forge-studio](https://github.com/shinpaydoodles/forge-studio) exists with `main` pushed. Repository visibility is managed by its owner. Repository creation and push are performed outside the app while its GitHub UI remains unimplemented.

The remote URL is `https://github.com/shinpaydoodles/forge-studio.git`. Source review checked `.gitignore`, staged paths, secrets, generated binaries, SQLite, and vault material. The initial `main` commit was pushed and Git reports it tracks `origin/main`. [[04 Development/Implementation Plan|Implementation Plan]] tracks later in-app Git functionality.
