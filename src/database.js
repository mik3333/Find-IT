/**
 * Data-access module for the local SQLite database.
 *
 * This file opens the project database, creates the user table, and exposes the
 * read/write helpers used by the authentication layer.
 */
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { encryptEmail } from "./passwords.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const databasePath = resolve(projectRoot, "data", "findit.sqlite");

/**
 * Opens the local SQLite database and ensures the account table exists.
 *
 * @param {string} [path=databasePath] - File path to the SQLite database.
 * @returns {DatabaseSync} The initialized database connection.
 */
export function openDatabase(path = databasePath) {
  mkdirSync(dirname(path), { recursive: true });
  const database = new DatabaseSync(path);
  initializeDatabase(database);
  return database;
}

/**
 * Creates the users table used for local account storage.
 *
 * @param {DatabaseSync} database - The SQLite database instance.
 */
function initializeDatabase(database) {
  // The local demo stores encrypted values for user email and password data.
  // This keeps the database contents harder to read while still allowing simple
  // local validation and account lookups.
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  database.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
      title TEXT NOT NULL,
      location TEXT NOT NULL,
      date TEXT NOT NULL,
      image_data BLOB,
      image_mime TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (
        (image_data IS NULL AND image_mime IS NULL) OR
        (image_data IS NOT NULL AND image_mime IN ('image/jpeg', 'image/png', 'image/webp'))
      )
    )
  `);
  database.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

/**
 * Lists saved reports without including their image data.
 *
 * @param {DatabaseSync} database - The project database.
 * @returns {object[]} Reports ordered newest first.
 */
export function listReports(database) {
  return database.prepare(`
    SELECT id, type, title, location, date, image_data IS NOT NULL AS hasImage
    FROM reports
    ORDER BY date DESC, rowid DESC
  `).all();
}

/**
 * Finds a saved report without including its image data.
 *
 * @param {DatabaseSync} database - The project database.
 * @param {string} id - Report identifier.
 * @returns {object | undefined} Matching report or undefined.
 */
export function findReportById(database, id) {
  return database.prepare(`
    SELECT id, type, title, location, date, image_data IS NOT NULL AS hasImage
    FROM reports
    WHERE id = ?
  `).get(id);
}

/**
 * Loads an image attached to a report.
 *
 * @param {DatabaseSync} database - The project database.
 * @param {string} id - Report identifier.
 * @returns {{ data: Buffer, mimeType: string } | undefined} Image or undefined.
 */
export function findReportImage(database, id) {
  const image = database.prepare(
    "SELECT image_data, image_mime FROM reports WHERE id = ? AND image_data IS NOT NULL",
  ).get(id);
  if (!image) return undefined;
  return { data: Buffer.from(image.image_data), mimeType: image.image_mime };
}

/**
 * Inserts a report.
 *
 * @param {DatabaseSync} database - The project database.
 * @param {object} report - Report fields.
 * @param {Buffer | null} [imageData=null] - Optional image data.
 * @param {string | null} [imageMime=null] - Optional image MIME type.
 */
export function insertReport(database, report, imageData = null, imageMime = null) {
  database.prepare(`
    INSERT INTO reports (id, type, title, location, date, image_data, image_mime)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    report.id,
    report.type,
    report.title,
    report.location,
    report.date,
    imageData,
    imageMime,
  );
}

/**
 * Updates a report and optionally replaces its image.
 *
 * @param {DatabaseSync} database - The project database.
 * @param {string} id - Report identifier.
 * @param {object} report - Updated report fields.
 * @param {Buffer | null} [imageData=null] - Replacement image data.
 * @param {string | null} [imageMime=null] - Replacement image MIME type.
 * @returns {number} Number of updated reports.
 */
export function updateReport(database, id, report, imageData = null, imageMime = null) {
  const result = imageData
    ? database.prepare(`
        UPDATE reports
        SET type = ?, title = ?, location = ?, image_data = ?, image_mime = ?
        WHERE id = ?
      `).run(report.type, report.title, report.location, imageData, imageMime, id)
    : database.prepare(`
        UPDATE reports
        SET type = ?, title = ?, location = ?
        WHERE id = ?
      `).run(report.type, report.title, report.location, id);
  return result.changes;
}

/**
 * Deletes a report.
 *
 * @param {DatabaseSync} database - The project database.
 * @param {string} id - Report identifier.
 * @returns {number} Number of deleted reports.
 */
export function deleteReport(database, id) {
  return database.prepare("DELETE FROM reports WHERE id = ?").run(id).changes;
}

/**
 * Adds the built-in sample reports once, without restoring them after deletion.
 *
 * @param {DatabaseSync} database - The project database.
 */
export function seedSampleReports(database) {
  if (database.prepare("SELECT 1 FROM app_settings WHERE key = ?").get("sample_reports_seeded")) return;

  const sampleReports = [
    { id: "sample-1", type: "lost", title: "Blue water bottle", location: "Central shopping center", date: "2026-10-12" },
    { id: "sample-2", type: "found", title: "Keys with a green tag", location: "Town square", date: "2026-10-11" },
    { id: "sample-3", type: "lost", title: "Black umbrella", location: "Transit station", date: "2026-10-10" },
  ];
  const reportCount = database.prepare("SELECT COUNT(*) AS count FROM reports").get().count;

  database.exec("BEGIN");
  try {
    if (reportCount === 0) {
      for (const report of sampleReports) insertReport(database, report);
    }
    database.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?)").run("sample_reports_seeded", "true");
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

/**
 * Loads a user record by normalized email address.
 *
 * @param {DatabaseSync} database - The SQLite database instance.
 * @param {string} email - Email address to look up.
 * @returns {object | undefined} Matching user row or undefined when not found.
 */
export function findUserByEmail(database, email) {
  const normalizedEmail = typeof email === "string" ? email : "";
  const encryptedEmail = /^[0-9a-f]+$/iu.test(normalizedEmail) ? normalizedEmail : encryptEmail(normalizedEmail);
  return database.prepare(
    "SELECT id, email, password_salt, password_hash, role FROM users WHERE email = ? OR email = ?",
  ).get(normalizedEmail, encryptedEmail);
}

/**
 * Inserts a new user into the local accounts table.
 *
 * @param {DatabaseSync} database - The SQLite database instance.
 * @param {object} user - User data to insert.
 * @param {string} user.email - User email address.
 * @param {string} user.passwordSalt - Demo password salt field.
 * @param {string} user.passwordHash - Demo password value for the user.
 * @param {string} [user.role='user'] - Role for the account.
 * @returns {object | undefined} The inserted user record, or undefined if a duplicate email was rejected.
 */
export function insertUser(database, { email, passwordSalt, passwordHash, role = "user" }) {
  return database.prepare(`
    INSERT INTO users (email, password_salt, password_hash, role)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(email) DO NOTHING
    RETURNING id, email, role
  `).get(email, passwordSalt, passwordHash, role);
}
