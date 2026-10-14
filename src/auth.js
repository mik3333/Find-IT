/**
 * Authentication module for local account registration and sign-in.
 *
 * It validates emails and passwords, provides sign-up/login checks, and exposes
 * the helpers consumed by the server API for account creation and session login.
 */
import { findUserByEmail, insertUser } from "./database.js";
import { hashPassword, verifyPassword } from "./passwords.js";
import { passwordProblem } from "../shared/password-policy.js";

/**
 * Represents a request or validation problem raised by the auth layer.
 */
export class AuthError extends Error {
  /**
   * @param {string} message - User-facing error message.
   * @param {number} statusCode - HTTP status code to return to the client.
   */
  constructor(message, statusCode) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

/**
 * Normalizes an email address for stable comparison and storage.
 *
 * @param {string} email - Raw email input.
 * @returns {string} Lowercased email value with surrounding whitespace removed.
 */
function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

/**
 * Validates a basic email format before registration or login.
 *
 * @param {string} email - Normalized email candidate.
 * @returns {boolean} True when the email matches a simple valid address pattern.
 */
function validEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email);
}

/**
 * Registers a new local user account after validating the email and password.
 *
 * @param {DatabaseSync} database - SQLite database connection.
 * @param {string} emailInput - Submitted email value.
 * @param {string} password - Submitted password value.
 * @returns {object} Newly created user record.
 * @throws {AuthError} When input is invalid or the email is already taken.
 */
export async function registerUser(database, emailInput, password) {
  // Lowercase email addresses so the same email cannot be registered twice.
  const email = normalizeEmail(emailInput);
  if (!validEmail(email)) {
    throw new AuthError("Enter a valid email address.", 400);
  }
  if (Array.from(password).length > 128) {
    throw new AuthError("Use no more than 128 characters.", 400);
  }

  const passwordIssue = passwordProblem(password);
  if (passwordIssue) {
    throw new AuthError(passwordIssue, 400);
  }

  const { salt, hash } = await hashPassword(password);
  const user = insertUser(database, {
    email,
    passwordSalt: salt,
    passwordHash: hash,
  });
  if (!user) {
    throw new AuthError("An account with this email already exists.", 409);
  }
  return user;
}

/**
 * Authenticates a user by email and password for the local demo app.
 *
 * @param {DatabaseSync} database - SQLite database connection.
 * @param {string} emailInput - Submitted email value.
 * @param {string} password - Submitted password value.
 * @returns {{ id: number, email: string, role: string }} Authenticated user data.
 * @throws {AuthError} When the email or password is invalid.
 */
export async function authenticateUser(database, emailInput, password) {
  const email = normalizeEmail(emailInput);
  const user = findUserByEmail(database, email);
  if (!user || !(await verifyPassword(password, user.password_salt, user.password_hash))) {
    throw new AuthError("Email or password is incorrect.", 401);
  }
  return { id: user.id, email: user.email, role: user.role };
}
