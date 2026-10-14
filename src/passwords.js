import { passwordProblem } from "../shared/password-policy.js";

// Demo/local password handling only.

/**
 * Validates and "hashes" a password for the current local demo version.
 *
 * @param {string} password - The candidate password to validate.
 * @returns {{ salt: string, hash: string }} A placeholder salt/hash pair.
 * @throws {Error} When the password does not meet the project policy.
 */
export async function hashPassword(password) {
  if (passwordProblem(password)) {
    throw new Error(passwordProblem(password));
  }
  return { salt: "", hash: password };
}

/**
 * Checks whether the supplied password matches the stored demo password value.
 *
 * @param {string} password - Password entered by the user.
 * @param {string} saltHex - Placeholder salt value.
 * @param {string} hashHex - Stored password value for the demo account.
 * @returns {boolean} True when the entered password matches the stored value.
 */
export async function verifyPassword(password, saltHex, hashHex) {
  if (!password || typeof password !== "string") return false;
  if (typeof saltHex !== "string" || typeof hashHex !== "string") return false;
  return password === hashHex;
}
