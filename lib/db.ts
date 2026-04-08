import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "family.db");

function getDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#0891b2',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      start TEXT NOT NULL,
      end TEXT,
      all_day INTEGER NOT NULL DEFAULT 0,
      location TEXT,
      late_level INTEGER NOT NULL DEFAULT 0,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS event_tags (
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (event_id, tag_id)
    );
  `);

  // 既存DBへのカラム追加（エラーは無視）
  for (const sql of [
    "ALTER TABLE events ADD COLUMN location TEXT",
    "ALTER TABLE events ADD COLUMN late_level INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE events ADD COLUMN notes TEXT",
    "ALTER TABLE events ADD COLUMN participants TEXT",
    "ALTER TABLE events ADD COLUMN tentative INTEGER NOT NULL DEFAULT 0",
  ]) {
    try { db.exec(sql); } catch { /* already exists */ }
  }

  // タグのリネームと追加
  db.prepare("UPDATE tags SET name='病院' WHERE name='医療'").run();
  db.prepare("UPDATE tags SET name='保育園' WHERE name='学校'").run();
  const insertTag = db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)");
  for (const tag of ["仕事", "スポーツ", "飲み会", "ヨガ", "病院", "保育園", "付き合い", "おでかけ"]) {
    insertTag.run(tag);
  }

  return db;
}

export default getDb;
