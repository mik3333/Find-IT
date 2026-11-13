# FIND IT

A community lost-and-found demo with SQLite-backed accounts, shared reports, and item photos.

## What's new

FIND IT includes a local account flow and a shared community board:

- Account registration and sign-in with email and password-policy validation
- Admin and user roles with session-based access control
- Demo accounts for quick local testing
- Admin-only report creation, editing, and deletion
- Admin-only upload and replacement of one photo per report
- JPG, PNG, and WebP photo support, up to 5 MB per image
- Signed-in users can browse reports and view their photos
- Shared report and image storage in the local SQLite database
- Searchable report cards, responsive layouts, and the FIND IT logo

## Run locally

Install Node.js 22.5 or later, then run these commands from this folder:

```powershell
npm start
```

Open <http://localhost:3000>. On first start, FIND IT creates
`data/findit.sqlite`, adds the demo accounts below, and seeds the sample reports.
Registration is available from the "Create an account" link on the login page.

## Demo login

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@findit.test` | `FindIT-admin-2026` |
| User | `user@findit.test` | `FindIT-user-2026` |

New accounts need a valid email and a password with at least 8 characters, one
uppercase letter, one number, and one special character.

## Notes

This project is intended for local demonstration, not production hosting.
Demo credentials are stored using a simple, reversible XOR scheme; this is not
production-grade password security. Sign-in sessions are kept in server memory
and end when the server restarts. A public deployment needs HTTPS, secure
password hashing, persistent sessions, and production account management.

Reports and uploaded images are stored in `data/findit.sqlite` and shared by
users connected to this server.

## Test

```powershell
npm test
```
