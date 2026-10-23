---
type: integration
project: Forge Studio
status: planned
created: 2026-10-23
tags: [forge-studio, roblox]
---
# Roblox Studio Integration

Roblox Studio now has a built-in official MCP server. Enable it in Studio's Assistant settings, then connect an MCP-capable client through the local `mcp.bat` on Windows. Forge Studio's local stdio manager can save and inspect server commands, but a live Studio connection has not been verified and the app does not claim control of an open place.

Before implementation, Forge Studio must identify the active place, verify its project, create a checkpoint, serialize mutations, route high-impact operations through approval, and capture playtest evidence. [[01 Product/Roadmap|Roadmap]] tracks the phase. The older standalone Roblox MCP repository is archived and should not be selected for new work.
