import type { SQLiteDatabase } from "expo-sqlite";

// Second-brain store. Embeddings live as Float32 BLOBs; similarity is computed
// in JS (see vectors.ts). Booleans stored as 0/1.
export const DDL = [
  `CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY,
    title TEXT,
    started_at INTEGER,
    ended_at INTEGER,
    audio_uri TEXT,
    transcript TEXT,
    summary TEXT,
    status TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS action_items (
    id TEXT PRIMARY KEY,
    meeting_id TEXT,
    text TEXT,
    done INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    label TEXT,
    type TEXT,
    embedding BLOB,
    mention_count INTEGER,
    first_meeting_id TEXT,
    created_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS edges (
    id TEXT PRIMARY KEY,
    src_node_id TEXT,
    dst_node_id TEXT,
    relation TEXT,
    weight INTEGER,
    meeting_id TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    meeting_id TEXT,
    text TEXT,
    start_ms INTEGER,
    embedding BLOB
  )`,
];

export function migrate(db: SQLiteDatabase): void {
  for (const stmt of DDL) db.execSync(stmt);
}
