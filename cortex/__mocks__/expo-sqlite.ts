// In-memory test shim for expo-sqlite. Implements just the SQL shapes Cortex
// issues: CREATE TABLE IF NOT EXISTS, INSERT (explicit columns), SELECT
// [cols|*] FROM t [WHERE col = ?] [ORDER BY col ASC|DESC], UPDATE t SET ...
// WHERE col = ?, DELETE FROM t [WHERE col = ?]. BLOB params (Uint8Array) are
// stored by reference and round-trip unchanged.

type Row = Record<string, unknown>;
interface Table {
  cols: string[];
  rows: Row[];
}

function normParams(args: unknown[]): unknown[] {
  if (args.length === 1 && Array.isArray(args[0])) return args[0] as unknown[];
  return args;
}

class FakeDb {
  private tables: Record<string, Table> = {};

  private ensureTable(name: string, cols: string[]) {
    if (!this.tables[name]) this.tables[name] = { cols, rows: [] };
  }

  execSync(sql: string): void {
    for (const stmt of sql.split(";")) {
      const s = stmt.trim();
      if (!s) continue;
      this.exec(s, []);
    }
  }

  runSync(sql: string, ...args: unknown[]) {
    return this.exec(sql.trim(), normParams(args));
  }

  getAllSync(sql: string, ...args: unknown[]): Row[] {
    return this.select(sql.trim(), normParams(args));
  }

  getFirstSync(sql: string, ...args: unknown[]): Row | null {
    const r = this.select(sql.trim(), normParams(args));
    return r.length ? r[0] : null;
  }

  private exec(sql: string, params: unknown[]) {
    const create = /^CREATE TABLE IF NOT EXISTS\s+(\w+)\s*\(([\s\S]+)\)$/i.exec(sql);
    if (create) {
      const name = create[1];
      const cols = create[2]
        .split(",")
        .map((c) => c.trim().split(/\s+/)[0])
        .filter((c) => c && !/^(PRIMARY|FOREIGN|UNIQUE|CHECK)$/i.test(c));
      this.ensureTable(name, cols);
      return { changes: 0, lastInsertRowId: 0 };
    }
    const insert = /^INSERT INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)$/i.exec(sql);
    if (insert) {
      const name = insert[1];
      const cols = insert[2].split(",").map((c) => c.trim());
      this.ensureTable(name, cols);
      const row: Row = {};
      cols.forEach((c, i) => (row[c] = params[i]));
      this.tables[name].rows.push(row);
      return { changes: 1, lastInsertRowId: this.tables[name].rows.length };
    }
    const update = /^UPDATE\s+(\w+)\s+SET\s+([\s\S]+?)\s+WHERE\s+(\w+)\s*=\s*\?$/i.exec(sql);
    if (update) {
      const name = update[1];
      const assigns = update[2].split(",").map((a) => a.trim().split(/\s*=\s*/)[0]);
      const whereCol = update[3];
      const whereVal = params[params.length - 1];
      const t = this.tables[name];
      if (t) {
        for (const row of t.rows) {
          if (row[whereCol] === whereVal) assigns.forEach((c, i) => (row[c] = params[i]));
        }
      }
      return { changes: 1, lastInsertRowId: 0 };
    }
    const del = /^DELETE FROM\s+(\w+)(?:\s+WHERE\s+(\w+)\s*=\s*\?)?$/i.exec(sql);
    if (del) {
      const t = this.tables[del[1]];
      if (t) {
        if (del[2]) t.rows = t.rows.filter((r) => r[del[2]] !== params[0]);
        else t.rows = [];
      }
      return { changes: 1, lastInsertRowId: 0 };
    }
    throw new Error("FakeDb: unsupported SQL: " + sql);
  }

  private select(sql: string, params: unknown[]): Row[] {
    const m =
      /^SELECT\s+([\s\S]+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(\w+)\s*=\s*\?)?(?:\s+ORDER BY\s+(\w+)\s+(ASC|DESC))?$/i.exec(
        sql
      );
    if (!m) throw new Error("FakeDb: unsupported SELECT: " + sql);
    const colsPart = m[1].trim();
    const t = this.tables[m[2]];
    if (!t) return [];
    let rows = t.rows.slice();
    if (m[3]) rows = rows.filter((r) => r[m[3]] === params[0]);
    if (m[4]) {
      const dir = (m[5] || "ASC").toUpperCase() === "DESC" ? -1 : 1;
      rows.sort((a, b) => (a[m[4]] === b[m[4]] ? 0 : (a[m[4]]! > b[m[4]]! ? 1 : -1) * dir));
    }
    if (colsPart === "*") return rows.map((r) => ({ ...r }));
    const want = colsPart.split(",").map((c) => c.trim());
    return rows.map((r) => {
      const o: Row = {};
      for (const c of want) o[c] = r[c];
      return o;
    });
  }
}

export type SQLiteDatabase = FakeDb;
export function openDatabaseSync(_name: string): FakeDb {
  return new FakeDb();
}
