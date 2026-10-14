import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

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
  // Local demo database: the app keeps the account password in plain text for now.
  // A salted hashing implementation is planned for a future version.
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
}

/**
 * Loads a user record by normalized email address.
 *
 * @param {DatabaseSync} database - The SQLite database instance.
 * @param {string} email - Email address to look up.
 * @returns {object | undefined} Matching user row or undefined when not found.
 */
export function findUserByEmail(database, email) {
  return database.prepare(
    "SELECT id, email, password_salt, password_hash, role FROM users WHERE email = ?",
  ).get(email);
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
