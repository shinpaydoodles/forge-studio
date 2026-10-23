---
type: integration
project: Forge Studio
status: implemented-unverified
created: 2026-10-23
tags: [forge-studio, claude]
---
# Claude Integration

The runtime imports the official `@anthropic-ai/claude-agent-sdk`, uses the project's directory as `cwd`, streams text and tool events, resumes by saved session ID, and connects tool permission prompts to human approvals. Assisted planning uses SDK plan mode; Stop aborts the query.

This third-party app requires `ANTHROPIC_API_KEY` from an Anthropic Console account with separate API billing. Current Anthropic documentation does not allow third-party SDK products to offer claude.ai login and subscription rate limits without prior approval. No key was available for a live turn in this implementation session. [[04 Development/Known Issues|Known Issues]] records that limit.
