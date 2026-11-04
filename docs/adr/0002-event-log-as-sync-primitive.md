# 2. Append-only event log as the sync primitive

Date: 2026-11-04

## Status

Accepted. Extended by [ADR 4](0004-journal-envelope-and-replay-order.md), which fixes the event envelope and the replay order behind the conflict rules.

## Context

The list must be snappy and fully usable offline on the owner's phone in the store, while a second person adds items from another device and the owner also configures things from a Mac. We want multi-device sync without bending a general-purpose framework to our needs, and we want a record of what happened (who added what, which store, when) to drive future analyses such as recurrence suggestions.

## Decision

The source of truth is a **generic, append-only, timestamped journal of events** (the "Journal" in the glossary). Each event records who did it and the store context. Application state is never stored as such: it is the **replay of the journal through a pure reducer** (`packages/domain`).

Sync is hand-rolled and small: each device keeps its local journal (IndexedDB), pushes new events to the server and pulls others' events by cursor. Conflicts are resolved by the semantics of each event: checking an item is idempotent, a quantity is last-write-wins, a request arbitration is first-wins.

The domain only sees three ports, modelled as Effect services: `EventStore` (local journal), `SyncTransport` (push/pull by cursor) and `Clock`. Any sync framework can replace the hand-rolled one behind those ports.

No analysis is built on the journal in v1; it is only kept so that later features have the data.

## Consequences

- Offline is the default, not a mode: every action is a local append; sync is a background concern.
- Conflict handling is explicit and tiny because the event vocabulary is tiny.
- The journal grows forever. Acceptable for one household's groceries; compaction or snapshots can come later behind the same ports.
- State shape can change freely: it is derived, so a new reducer re-reads the same journal.
- The reducer and events are pure and framework-free, so the whole domain is unit-testable without a browser or a server.

## Alternatives rejected

- **Convex**: attractive realtime model, but no local persistence, and its offline engine was archived in September 2026. Offline in the store is non-negotiable.
- **CRDT libraries (Automerge, Yjs)**: general-purpose merge semantics we do not need, a large dependency in the critical path, and less control over the per-event conflict rules we actually want.
- **Server-authoritative REST with optimistic UI**: simpler on paper, but offline writes would need a queue and reconciliation anyway, which is this design with less structure.
