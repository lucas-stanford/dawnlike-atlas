# Project instructions for AI assistants

## Always finish in-progress tasks

When the user interrupts an in-progress task to ask for something unrelated (a quick fix, a tweak, a new question), treat the original task as **still open** — not abandoned.

1. Handle the new request as asked.
2. As soon as the interruption is done, **automatically resume the original task** without waiting for the user to remind you. Briefly state that you're returning to it (e.g., "Now back to the drag-to-equip work…") and continue from where you left off.
3. A task is only "done" when it is fully implemented, verified, committed, and pushed — or when the user explicitly tells you to drop it.
4. If there's genuine ambiguity about whether the user wants you to abandon the original work, ask before dropping it. Don't silently leave it half-finished.
5. Never leave uncommitted modifications from a prior task sitting in the working tree when you finish a session.
