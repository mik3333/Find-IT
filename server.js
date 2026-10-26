/**
 * Server entry point for the FIND IT demo application.
 *
 * This module starts the HTTP server, backs the account API with SQLite, keeps
 * short-lived sign-in sessions in memory, and serves the static pages and client
 * scripts used by the browser.
 */
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AuthError, authenticateUser, registerUser } from "./src/auth.js";
import { findUserByEmail, insertUser, openDatabase } from "./src/database.js";
import { hashPassword } from "./src/passwords.js";

const port = Number(process.env.PORT || 3000);
const projectRoot = resolve(fileURLToPath(new URL(".", import.meta.url)));
// Accounts stay in SQLite; short-lived sign-in sessions live in server memory.
const database = openDatabase();
const sessions = new Map();
const sessionLifetime = 7 * 24 * 60 * 60 * 1000;
const staticFiles = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/home.html", ["home.html", "text/html; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/home.js", ["home.js", "text/javascript; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/assets/find-it-logo.png", ["assets/find-it-logo.png", "image/png"]],
  ["/shared/password-policy.js", ["shared/password-policy.js", "text/javascript; charset=utf-8"]],
]);

/**
 * Populates the database with a couple of demo accounts when they do not exist.
 */
async function seedDemoAccounts() {
  const demoAccounts = [
    { email: "admin@findit.test", password: "FindIT-admin-2026", role: "admin" },
    { email: "user@findit.test", password: "FindIT-user-2026", role: "user" },
  ];

  for (const account of demoAccounts) {
    if (findUserByEmail(database, account.email)) continue;
    const { salt, hash } = await hashPassword(account.password);
    insertUser(database, {
      email: account.email,
      passwordSalt: salt,
      passwordHash: hash,
      role: account.role,
    });
  }
}

/**
 * Sends a JSON response with a consistent content type and no-store headers.
 *
 * @param {import("node:http").ServerResponse} response - HTTP response object.
 * @param {number} statusCode - HTTP status code to send.
 * @param {object} body - JSON-serializable payload.
 * @param {Record<string, string>} [headers={}] - Extra response headers.
 */
function sendJson(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

/**
 * Parses a JSON request body and validates the maximum payload size.
 *
 * @param {import("node:http").IncomingMessage} request - HTTP request object.
 * @returns {Promise<object>} Parsed JSON body.
 */
function readJson(request) {
  return new Promise((resolveBody, reject) => {
    let body = "";
    let tooLarge = false;
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      if (tooLarge) return;
      if (Buffer.byteLength(body) + Buffer.byteLength(chunk) > 16_384) {
        tooLarge = true;
        reject(new AuthError("Request is too large.", 413));
        return;
      }
      body += chunk;
    });
    request.on("end", () => {
      if (tooLarge) return;
      try {
        resolveBody(JSON.parse(body));
      } catch {
        reject(new AuthError("Request must contain valid JSON.", 400));
      }
    });
    request.on("error", reject);
  });
}

/**
 * Builds the browser cookie value used for session tracking.
 *
 * @param {string} token - Random session token.
 * @param {number} maxAge - Cookie lifetime in seconds.
 * @returns {string} Set-Cookie header value.
 */
function sessionCookie(token, maxAge) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `findit.session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

/**
 * Retrieves the current signed-in session from the request cookie.
 *
 * @param {import("node:http").IncomingMessage} request - HTTP request object.
 * @returns {{ token: string, user: object, expiresAt: number } | null} Matching session record or null.
 */
function getSession(request) {
  const cookie = request.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("findit.session="));
  if (!cookie) return null;

  const token = cookie.slice("findit.session=".length);
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return { token, ...session };
}

/**
 * Creates a fresh signed-in session and cleans out expired tokens.
 *
 * @param {{ id: number, email: string, role: string }} user - Authenticated user.
 * @returns {string} Random session token.
 */
function startSession(user) {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(token);
  }

  const token = randomBytes(32).toString("hex");
  sessions.set(token, {
    user: { id: user.id, email: user.email, role: user.role },
    expiresAt: now + sessionLifetime,
  });
  return token;
}

/**
 * Serves a static file for the app shell and client scripts.
 *
 * @param {string} pathname - Requested URL path.
 * @param {import("node:http").ServerResponse} response - HTTP response object.
 * @returns {Promise<boolean>} True when a file was served, otherwise false.
 */
async function serveStatic(pathname, response) {
  const file = staticFiles.get(pathname);
  if (!file) return false;

  const content = await readFile(resolve(projectRoot, file[0]));
  response.writeHead(200, {
    "Content-Type": file[1],
    "X-Content-Type-Options": "nosniff",
  });
  response.end(content);
  return true;
}

/**
 * Routes all incoming HTTP requests for login, session checks, and static pages.
 *
 * @param {import("node:http").IncomingMessage} request - HTTP request object.
 * @param {import("node:http").ServerResponse} response - HTTP response object.
 */
async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const { pathname } = url;

  if (request.method === "POST" && (pathname === "/api/register" || pathname === "/api/login")) {
    const body = await readJson(request);
    if (
      !body ||
      typeof body.email !== "string" ||
      typeof body.password !== "string" ||
      body.email.length > 254 ||
      body.password.length > 1024
    ) {
      throw new AuthError("Enter an email address and password.", 400);
    }

    const user = pathname === "/api/register"
      ? await registerUser(database, body.email, body.password)
      : await authenticateUser(database, body.email, body.password);
    const token = startSession(user);
    sendJson(response, pathname === "/api/register" ? 201 : 200, { user }, {
      "Set-Cookie": sessionCookie(token, sessionLifetime / 1000),
    });
    return;
  }

  if (pathname === "/api/session" && request.method === "GET") {
    const session = getSession(request);
    if (!session) {
      sendJson(response, 401, { error: "Please log in to continue." });
      return;
    }
    sendJson(response, 200, { user: session.user });
    return;
  }

  if (pathname === "/api/logout" && request.method === "POST") {
    const session = getSession(request);
    if (session) sessions.delete(session.token);
    sendJson(response, 200, { ok: true }, { "Set-Cookie": sessionCookie("", 0) });
    return;
  }

  if (request.method === "GET" && await serveStatic(pathname, response)) return;
  sendJson(response, 404, { error: "Page not found." });
}

await seedDemoAccounts();

const server = createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    if (response.headersSent) {
      response.destroy(error);
      return;
    }
    if (error instanceof AuthError) {
      sendJson(response, error.statusCode, { error: error.message });
      return;
    }
    console.error("Request failed.", error);
    sendJson(response, 500, { error: "Something went wrong. Please try again." });
  });
});

server.listen(port, () => {
  console.log(`FIND IT is running at http://localhost:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => {
      database.close();
      process.exit(0);
    });
  });
}
