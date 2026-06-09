---
ticket: 4.3
title: Song dedication
phase: Music types
status: todo
priority: P3
depends_on: [2.1]
---

# 4.3 — Song dedication

`DEDICATION` = `TRACK` payload + `{ dedication: true, note? }`. Special card style (heart accent, "This made me think of you", optional note).

**Send flow:** pick track → "Dedicate" → optional note.

## Acceptance
- Dedication card renders distinctly from a plain track card and carries the optional note.
