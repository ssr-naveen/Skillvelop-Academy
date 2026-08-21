import postgres, { type Sql } from "postgres";

type QueryRow = Record<string, unknown>;
type FileMetadata = { httpMetadata?: { contentType?: string } };

const numericFields = new Set([
  "total", "count", "attempts", "best", "classes_taken", "upcoming",
  "lessons_total", "lessons_done", "quizzes_total", "quizzes_done",
  "activities_total", "activities_done", "average_score", "rating_count",
]);

function normaliseRow<T>(row: T): T {
  const record = row as QueryRow;
  for (const [key, value] of Object.entries(record)) {
    if (numericFields.has(key) && typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) {
      record[key] = Number(value);
    }
  }
  return row;
}

function translateSql(input: string): string {
  const trimmed = input.trim();
  if (/^PRAGMA\s+/i.test(trimmed)) return "SELECT 1";
  if (/^CREATE\s+(TABLE|INDEX)/i.test(trimmed)) return "SELECT 1";

  let query = trimmed
    .replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, "INSERT INTO")
    .replace(/GROUP_CONCAT\(([^,]+),\s*'([^']*)'\)/gi, "STRING_AGG($1, '$2')")
    .replace(/\bMAX\(level\s*,/gi, "GREATEST(level,");

  if (/^INSERT\s+/i.test(query) && /INSERT\s+OR\s+IGNORE\s+INTO/i.test(trimmed) && !/\bON\s+CONFLICT\b/i.test(query)) {
    query += " ON CONFLICT DO NOTHING";
  }

  let index = 0;
  return query.replace(/\?/g, () => `$${++index}`);
}

let client: Sql | null = null;

function sqlClient(): Sql {
  if (client) return client;
  const password = process.env.DB_PASSWORD;
  if (!password) throw new Error("Skillvelop database credentials are not configured.");
  client = postgres({
    host: process.env.DB_HOST || "aws-0-ap-south-1.pooler.supabase.com",
    port: Number(process.env.DB_PORT || 6543),
    database: process.env.DB_DATABASE || "postgres",
    username: process.env.DB_USERNAME || "postgres.dsrqzegrphnvhdjwxtlk",
    password,
    ssl: process.env.DB_SSLMODE === "disable" ? false : "require",
    max: 5,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return client;
}

class PreparedStatement implements D1PreparedStatement {
  private bindings: unknown[] = [];
  constructor(readonly source: string) {}
  bind(...values: unknown[]) { this.bindings = values; return this; }
  async execute(executor: Sql = sqlClient()) {
    return executor.unsafe(translateSql(this.source), this.bindings as never[]);
  }
  async first<T>(): Promise<T | null> {
    const rows = await this.execute();
    return rows[0] ? normaliseRow(rows[0] as T) : null;
  }
  async all<T>(): Promise<D1Result<T>> {
    const rows = await this.execute();
    return { results: rows.map((row) => normaliseRow(row as T)), success: true, meta: { changes: Number(rows.count ?? rows.length ?? 0) } };
  }
  async run<T>(): Promise<D1Result<T>> {
    const rows = await this.execute();
    return { results: rows as unknown as T[], success: true, meta: { changes: Number(rows.count ?? rows.length ?? 0) } };
  }
}

class PostgresDatabase {
  prepare(source: string) { return new PreparedStatement(source); }
  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    return sqlClient().begin(async (tx) => {
      const results = [];
      for (const statement of statements) {
        const rows = await (statement as PreparedStatement).execute(tx as Sql);
        results.push({ success: true, results: rows as unknown as T[], meta: { changes: Number(rows.count ?? rows.length ?? 0) } });
      }
      return results;
    });
  }
}

class DatabaseFileStore {
  async put(key: string, value: ArrayBuffer, metadata: FileMetadata = {}) {
    await sqlClient()`INSERT INTO file_objects (key,data,content_type,created_at)
      VALUES (${key},${Buffer.from(value)},${metadata.httpMetadata?.contentType || "application/octet-stream"},${new Date().toISOString()})
      ON CONFLICT(key) DO UPDATE SET data=excluded.data,content_type=excluded.content_type,created_at=excluded.created_at`;
  }
  async get(key: string) {
    const rows = await sqlClient()`SELECT data,content_type FROM file_objects WHERE key=${key} LIMIT 1`;
    if (!rows[0]) return null;
    const data = rows[0].data as Uint8Array;
    return { body: new Uint8Array(data), httpMetadata: { contentType: String(rows[0].content_type) } };
  }
  async delete(key: string) { await sqlClient()`DELETE FROM file_objects WHERE key=${key}`; }
  async list(options: { prefix?: string } = {}) {
    const prefix = `${options.prefix || ""}%`;
    const rows = await sqlClient()`SELECT key FROM file_objects WHERE key LIKE ${prefix}`;
    return { objects: rows.map((row) => ({ key: String(row.key) })) };
  }
}

export const env = {
  DB: new PostgresDatabase(),
  FILES: new DatabaseFileStore(),
  get OPENAI_API_KEY() { return process.env.OPENAI_API_KEY; },
  get ANTHROPIC_API_KEY() { return process.env.ANTHROPIC_API_KEY; },
  get AI_CREDENTIAL_MASTER_KEY() { return process.env.AI_CREDENTIAL_MASTER_KEY || process.env.APP_KEY; },
};

export type D1DatabaseCompat = PostgresDatabase;
