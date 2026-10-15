import assert from "node:assert/strict";
import { test } from "node:test";
import { authenticateUser, AuthError, registerUser } from "../src/auth.js";
import { openDatabase } from "../src/database.js";
import { hashPassword, verifyPassword } from "../src/passwords.js";
import { passwordProblem } from "../shared/password-policy.js";

test("passwords need eight characters, an uppercase letter, a number, and a symbol", () => {
  assert.equal(passwordProblem("Goodpass1!"), null);
  assert.match(passwordProblem("short1!"), /8 characters/u);
  assert.match(passwordProblem("lowercase1!"), /uppercase/u);
  assert.match(passwordProblem("NoNumber!!"), /number/u);
  assert.match(passwordProblem("NoSymbol123"), /special character/u);
});

test("demo password helpers compare the stored value without hashing", async () => {
  const { salt, hash } = await hashPassword("Goodpass1!");
  assert.equal(salt, "");
  assert.notEqual(hash, "Goodpass1!");
  assert.equal(await verifyPassword("Goodpass1!", salt, hash), true);
  assert.equal(await verifyPassword("Wrongpass1!", salt, hash), false);
});

test("registration stores unique normalized emails and login checks the password", async (context) => {
  const database = openDatabase(":memory:");
  context.after(() => database.close());

  const user = await registerUser(database, " Person@Example.com ", "Goodpass1!");
  assert.equal(user.email, "person@example.com");
  assert.equal(user.role, "user");

  const storedUser = database.prepare("SELECT email, password_hash FROM users WHERE id = ?").get(user.id);
  assert.notEqual(storedUser.email, "person@example.com");
  assert.notEqual(storedUser.password_hash, "Goodpass1!");

  const signedInUser = await authenticateUser(database, "PERSON@example.com", "Goodpass1!");
  assert.equal(signedInUser.id, user.id);
  assert.equal(signedInUser.email, user.email);
  assert.equal(signedInUser.role, user.role);

  await assert.rejects(
    registerUser(database, "person@example.com", "Goodpass2!"),
    (error) => error instanceof AuthError && error.statusCode === 409,
  );
  await assert.rejects(
    authenticateUser(database, user.email, "Wrongpass1!"),
    (error) => error instanceof AuthError && error.statusCode === 401,
  );
});
