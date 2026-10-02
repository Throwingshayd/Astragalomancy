---
name: studio-flow
description: Astragalomancy dev process. Use when starting or ending a session, routing work to an agent, filing or fixing a bug, or when mail arrives for diceofdionysus@gmail.com.
---

# Studio flow

One chat. One lead. One slice. Ship it.

Canary, first line of a new chat and again when ending: hi lorcan

## Path

1. Start with `.cursor/sessions/START_SESSION.md`.
2. Name the slice in one sentence.
3. Call one specialist, then integrate. Do not run two implementers on the same files.
4. Prove it with `npm test`. Boon or scoring changes also run `npm run playtest:boons`.
5. End with `.cursor/sessions/END_SESSION.md`. That check walks every markdown file under `.cursor/skills` and updates only what this chat made stale.

## Agents

| Call | Does |
|---|---|
| Lead | Talks to Lorcan, edits, decides |
| Explorer | Finds where something lives |
| Implementer | One specified slice |
| Researcher | Hesiod, Homer, Bibliotheca only |
| Tester | `npm test`, and playtest when scoring changed |
| Reviewer | Bugbot or security review, only when Lorcan asks |

## Bug queue

Inbox: diceofdionysus@gmail.com

The queue file is `.cursor/queue/BUGS.md`.

When a bug arrives by email:

- Add one open line: date, subject, sender, one sentence of what fails.
- Do not start the fix in the same breath as filing it unless Lorcan asked to fix that line.
- A fix is one concern. Put a failing test first when the bug is in engine or UI behaviour, then the smallest change, then `npm test`.
- Move the line to Done with the date.

## Do not

- Raise a god-object size ceiling to make room.
- Use `Math.random()` for gameplay.
- Mix portable or Godot work into this tree.
- Invent a second reviewer, a second queue, or a second session ritual.
