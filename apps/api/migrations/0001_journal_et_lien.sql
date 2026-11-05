-- One deployment = one foyer: no foyer column anywhere.

-- Append-only. `seq` is only the sync cursor; replay order stays (at, id) in the domain (ADR 4).
-- AUTOINCREMENT so a seq is never handed out twice, even if rows are compacted away one day.
-- The envelope has its own columns so analyses read who/when/where without knowing payloads.
CREATE TABLE journal (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  at INTEGER NOT NULL,
  actor TEXT NOT NULL CHECK (actor IN ('proprietaire', 'invite')),
  device TEXT NOT NULL,
  magasin TEXT,
  type TEXT NOT NULL,
  payload TEXT NOT NULL CHECK (json_valid(payload))
);

-- One secret link per role, stored as the hex SHA-256 of the secret.
-- Regenerating a link replaces its row: the old secret stops working.
CREATE TABLE lien (
  role TEXT PRIMARY KEY CHECK (role IN ('proprietaire', 'invite')),
  secret_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
