# FIND IT

A small FIND IT community lost-and-found demo with SQLite-backed user accounts.

## What's new

This version adds a working local authentication flow, stronger local credential handling, and a complete community board experience:

- Secure sign-up and sign-in with email validation and password checks
- SQLite-backed user accounts with a local demo auth flow
- XOR encryption for stored email and password values
- Encrypted user credential storage in the local database instead of plain-text values
- Modularized
- Admin and user roles with session-based access control
- Demo accounts for quick local testing
- Login and registration UI with password visibility toggle and account-mode switching
- Community home page with search, report cards, item creation, and admin editing
- Browser-side saved reports using localStorage for a lightweight demo workflow

## Run locally

Install Node.js 22.5 or later, then run these commands from this folder:

```powershell
npm start
```

Open <http://localhost:3000>. The first start creates `data/findit.sqlite` and
adds the demo accounts below. Registration works from the "Create an account"
link on the login page.

## Demo login

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@findit.test` | `FindIT-admin-2026` |
| User | `user@findit.test` | `FindIT-user-2026` |

New accounts need a valid email and a password with at least 8 characters, one
uppercase letter, one number, and one special character. The local demo stores
credentials in the SQLite database on this computer using a simple XOR-based
student encryption layer. This is intentionally not production-grade security,
but it keeps the demo data hidden from casual inspection.

The main code is split by job: `server.js` serves the pages and account API,
`src/database.js` creates and reads the SQLite database, `src/auth.js` handles
sign-up and sign-in, `src/passwords.js` manages the encrypted demo credential
flow, and `shared/password-policy.js` shares the password rules between the
browser and server. `app.js` handles the login and registration form; `home.js`
checks the server session before showing the community page.

Sign-in sessions are kept in server memory and end when the server restarts.
This setup is for local use, not production hosting. A public service needs
HTTPS, persistent sessions, and production access checks for admin actions.
Community reports remain saved in each browser's local storage.

## Test

```powershell
npm test
```
