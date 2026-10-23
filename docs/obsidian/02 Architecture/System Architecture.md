---
type: architecture
project: Forge Studio
status: implemented-in-part
created: 2026-10-23
tags: [forge-studio, architecture]
---
# System Architecture

```mermaid
flowchart LR
  T[Tauri 2 shell] --> U[React / Vite UI]
  U -->|loopback + bearer token| N[Node TypeScript runtime]
  T -->|packaged Node process| N
  N --> S[(SQLite)]
  N --> C[Codex App Server]
  N --> A[Claude Agent SDK]
  N --> G[Git CLI]
  N --> M[Authorized Markdown folder]
```

The runtime owns project validation, task state, approvals, provider adapters, and direct filesystem operations. SQLite keeps task events and resumes UI history after a restart. Interrupted tasks become paused and are never replayed silently. The UI is a client of typed JSON and server-sent events.

See [[02 Architecture/Agent Orchestration|Agent Orchestration]], [[02 Architecture/Database Schema|Database Schema]], and [[02 Architecture/Security Model|Security Model]]. The NSIS package started its Node runtime locally, and a Codex turn streamed in the browser UI. Native UI and clean-machine tests remain.
