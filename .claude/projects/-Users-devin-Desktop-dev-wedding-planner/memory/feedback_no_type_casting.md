---
name: No type casting workarounds
description: User wants proper type fixes, not `as any` casts or type assertion workarounds
type: feedback
---

Fix types properly instead of using `as any` casts or type assertion workarounds.

**Why:** User explicitly rejected an `as any` cast and asked to fix the types instead. They view type casting as aborting type safety rather than solving the problem.

**How to apply:** When encountering type errors, investigate the root cause (e.g., using a deprecated API vs the current one) and fix the underlying issue rather than silencing it with casts.
