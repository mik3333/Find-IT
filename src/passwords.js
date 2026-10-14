import { passwordProblem } from "../shared/password-policy.js";

const studentKey = "FINDIT-STUDENT-KEY";

/**
 * Student-level XOR encryption used to keep stored credentials hidden in the
 * local demo database without using a production-grade password library.
 *
 * @param {string} value - Plain text to encrypt.
 * @param {string} key - Repeating XOR key used to scramble the value.
 * @returns {string} Lowercase hexadecimal output safe for SQLite storage.
 */
function xorEncrypt(value, key = studentKey) {
  const bytes = new TextEncoder().encode(value);
  const keyBytes = new TextEncoder().encode(key);
  let output = "";

  for (let index = 0; index < bytes.length; index += 1) {
    const encryptedByte = bytes[index] ^ keyBytes[index % keyBytes.length];
    output += encryptedByte.toString(16).padStart(2, "0");
  }

  return output;
}

/**
 * Reverses the XOR encryption used for stored local credentials.
 *
 * @param {string} value - Hex-encoded encrypted text.
 * @param {string} key - Matching XOR key used during encryption.
 * @returns {string} Original plain text.
 */
function xorDecrypt(value, key = studentKey) {
  if (typeof value !== "string") return "";
  if (!/^[0-9a-f]+$/iu.test(value) || value.length % 2 !== 0) return value;

  const keyBytes = new TextEncoder().encode(key);
  const bytes = new Uint8Array(value.length / 2);

  for (let index = 0; index < bytes.length; index += 1) {
    const pair = value.slice(index * 2, index * 2 + 2);
    bytes[index] = Number.parseInt(pair, 16) ^ keyBytes[index % keyBytes.length];
  }

  return new TextDecoder().decode(bytes);
}

/**
 * Encrypts a plain-text email so the database does not store the raw address.
 *
 * @param {string} email - Email address before storage.
 * @returns {string} Encrypted email text.
 */
export function encryptEmail(email) {
  return xorEncrypt(email, `${studentKey}-EMAIL`);
}

/**
 * Decrypts an encrypted email back into its original value for the signed-in user.
 *
 * @param {string} encryptedEmail - Stored encrypted email value.
 * @returns {string} Original email address.
 */
export function decryptEmail(encryptedEmail) {
  const value = xorDecrypt(encryptedEmail, `${studentKey}-EMAIL`);
  return /^[0-9a-f]+$/iu.test(encryptedEmail) ? value : encryptedEmail;
}

/**
 * Validates and encrypts a password before it is stored in the local database.
 *
 * @param {string} password - The candidate password to validate.
 * @returns {{ salt: string, hash: string }} A placeholder salt plus encrypted password hash.
 * @throws {Error} When the password does not meet the project policy.
 */
export async function hashPassword(password) {
  if (passwordProblem(password)) {
    throw new Error(passwordProblem(password));
  }
  return { salt: "", hash: xorEncrypt(password) };
}

/**
 * Checks whether the supplied password matches the stored encrypted demo password.
 *
 * @param {string} password - Password entered by the user.
 * @param {string} saltHex - Placeholder salt value.
 * @param {string} hashHex - Stored encrypted password value for the demo account.
 * @returns {boolean} True when the entered password matches the stored value.
 */
export async function verifyPassword(password, saltHex, hashHex) {
  if (!password || typeof password !== "string") return false;
  if (typeof saltHex !== "string" || typeof hashHex !== "string") return false;
  const decryptedHash = xorDecrypt(hashHex);
  return password === decryptedHash || password === hashHex;
}
