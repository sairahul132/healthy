# Healthy — Master specification

The full 171-section master build prompt (product vision, security architecture, database
schema, API surface, sharing/consent model, threat model, UI requirements, phased rollout
plan) was supplied by the project owner as `Healthy Master Build Prompt.pdf`. It is the
source of truth for scope and constraints; the other docs in this folder (`ARCHITECTURE.md`,
`DATABASE.md`, `SECURITY.md`, `ROADMAP.md`) are working extracts scoped to what's actually
being built in the current phase, cross-referenced back to spec section numbers (e.g. "§68").

Keep the PDF alongside the repo (not committed, since it's not code) and treat any of these
working docs as *subordinate* to it — if a working doc and the master spec disagree, the
master spec wins and the working doc should be corrected.
