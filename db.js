const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'safesend.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id          TEXT PRIMARY KEY,
    filename    TEXT NOT NULL,
    size        INTEGER NOT NULL,
    type        TEXT DEFAULT 'file',
    created_at  TEXT NOT NULL,
    expires_at  TEXT NOT NULL,
    downloaded  INTEGER DEFAULT 0
  )
`);

// Add type column if missing (existing databases)
try { db.exec(`ALTER TABLE files ADD COLUMN type TEXT DEFAULT 'file'`); } catch (e) {}

const saveFile = db.prepare(`
  INSERT INTO files (id, filename, size, type, created_at, expires_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const getFile = db.prepare(`
  SELECT * FROM files WHERE id = ?
`);

const markDownloaded = db.prepare(`
  UPDATE files SET downloaded = 1 WHERE id = ?
`);

const deleteFile = db.prepare(`
  DELETE FROM files WHERE id = ?
`);

const getExpired = db.prepare(`
  SELECT * FROM files WHERE expires_at < ? OR downloaded = 1
`);

module.exports = { db, saveFile, getFile, markDownloaded, deleteFile, getExpired };
