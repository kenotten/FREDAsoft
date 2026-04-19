# Agent Instructions (FREDAsoft)

Before making any architectural changes or implementing new features, you **MUST** read the `docs/ARCHITECTURE_DESIGN.md` file. This document serves as the single source of truth for all design decisions and is version-controlled alongside the codebase.

## Process Rules:
1.  **Read-Before-Act**: Every session starts by reviewing the architecture doc.
2.  **Update Decisions**: When a design decision is finalized during conversation, immediately update the architecture doc with a "✅ DECIDED" marker.
3.  **Log Questions**: When new design questions arise, add them to the "Open Questions" section with a unique ID.
4.  **Preserve Intent**: Do not revisit or change "✅ DECIDED" decisions unless explicitly requested by the user.
