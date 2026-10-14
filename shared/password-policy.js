/**
 * Shared password policy module.
 *
 * The browser and server both import this file so they enforce the same rules for
 * local account creation and login validation.
 */
// Keep the password rules in one place so the browser and server agree.
export function passwordProblem(password) {
  const length = Array.from(password).length;
  if (length < 8) {
    return "Use at least 8 characters.";
  }
  if (!/[A-Z]/u.test(password)) {
    return "Add at least one uppercase letter.";
  }
  if (!/[0-9]/u.test(password)) {
    return "Add at least one number.";
  }
  if (!/[^A-Za-z0-9]/u.test(password)) {
    return "Add at least one special character.";
  }
  if (length > 128) {
    return "Use no more than 128 characters.";
  }
  return null;
}
