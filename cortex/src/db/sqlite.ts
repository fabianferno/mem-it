import * as SQLite from "expo-sqlite";
import { migrate } from "./schema";

let _db: SQLite.SQLiteDatabase | null = null;

export function openDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync("cortex.db");
    migrate(_db);
  }
  return _db;
}

/** Test-only: drop the cached handle so the next openDb() starts fresh. */
export function __resetDbForTests(): void {
  _db = null;
}

/** Stable-ish unique id without Date.now collisions within a tick. */
export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(16).slice(2, 10);
}
