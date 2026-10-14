# FIND IT 

A standalone, static prototype of FIND IT. It has no server or database.

## Demo login

Use either demo account to open its role-specific homepage:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@findit.test` | `FindIT-admin-2026` |
| User | `user@findit.test` | `FindIT-user-2026` |

Admins can add and edit community reports. Users can search and view reports.
Added and edited reports are stored in this browser's local storage. The demo
credential check and role permissions run in browser JavaScript and are not
secure or intended for real accounts; production access control requires a
backend. The initial homepage report cards are sample content.

## Preview

Open `index.html` in a browser, or start a local static server from this folder:

```powershell
python -m http.server 5500
```

Then visit <http://localhost:5500>.

The password visibility control, remember-me checkbox, forgot-password
explanation, login check, homepage search, admin item management, and logout are
interactive. The page uses Google Fonts when available and falls back to system
fonts.
