# 4. Journal envelope, and one replay order: timestamp then event id

Date: 2026-11-04

## Status

Accepted

## Context

ADR 2 resolves conflicts by event semantics: checking is idempotent, a quantity is last-write-wins, a request arbitration is first-wins, removals are tombstones. Devices append offline and sync later, so events reach a device out of order and can be delivered twice. Keeping a version per field in the state (a timestamp per quantity, per filing, tombstone sets) would spread the conflict rules all over the reducer. The journal must also stay readable by future analyses without knowing every payload.

## Decision

**Envelope.** Every event is `{ id, at, actor, device, store, type, payload }`: a unique id, the device clock in epoch milliseconds, who acted (`owner` or `guest`), which device wrote it (an opaque id generated once per device), the store the actor was in, then the event-specific payload. The role is the authority for permissions; the device serves sync bookkeeping and analytics, and no rule is keyed on it. Store-scoped events (rayons, filing, finishing a trip) require a store; household events (catalogue, list, cart, requests) carry it as nullable context. The schema lives in `@ecureuil/wire`, so web and API validate the same contract.

**Replay order.** `fold(events)` drops duplicate ids, sorts by `(at, id)` and reduces in that order. The conflict rules fall out of it: last-write-wins is "last in order", first-wins is "a request that is no longer pending ignores later verdicts", tombstones are "events about an entity that no longer exists are ignored, and ids are never reused".

## Consequences

- The state stores no versions and the reducer is a plain switch; the rules are visible in one place.
- Every device computes the same order, so they converge on the same state whatever the arrival order.
- Clock skew between the two phones can reorder concurrent edits of the same field. Acceptable for a household list: the two people rarely touch the same thing within the skew.
- `fold` sorts the whole journal; fine for one household, and compaction can come later behind the ports (ADR 2).
- An event, once written, is immutable. Correcting a mistake is a new event.

## Alternatives rejected

- **Per-field timestamps or vector clocks**: more state and more code for the same outcome with two devices.
- **Server-assigned order**: unknown while offline, and a device's own events would reorder under it after sync.
- **Flat events without an envelope**: shorter to write, but the server and future analyses would need every payload type to read who, when and where.
