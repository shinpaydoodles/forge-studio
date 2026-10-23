---
type: architecture
project: Forge Studio
status: implemented-in-part
created: 2026-10-23
tags: [forge-studio, agents]
---
# Agent Orchestration

Manual mode sends the request to one selected provider. Assisted mode sends a read-only planning request, persists its text, waits for approval, and then starts execution. Codex JSON-RPC and Claude SDK messages are translated into common text, tool, session, approval, error, and completion events.

```mermaid
stateDiagram-v2
  [*] --> created
  created --> analyzing
  analyzing --> planning: assisted
  analyzing --> executing: manual
  planning --> awaiting_approval
  awaiting_approval --> executing: approved
  awaiting_approval --> cancelled: rejected
  executing --> awaiting_review
  awaiting_review --> completed: accepted
  awaiting_review --> failed: unsuccessful
  executing --> failed
  executing --> cancelled
```

There is no concurrent coordinated mode yet. Provider completion stores the response and a Git snapshot, then waits for a human to accept the outcome or mark it unsuccessful. Automated test and documentation stages remain planned. See [[04 Development/Known Issues|Known Issues]].
