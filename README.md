# JWT Cookie Auth – Angular + Node.js

Simple project: **Angular** frontend and **Node.js** API with JWT in **cookies**, **10-minute** access token, **refresh token**, **auth interceptor**, **route guard**, and **logout on unauthorized**.

---

## What’s in the project

| Part | Description |
|------|-------------|
| **API** (`api/`) | Express server on `http://localhost:3000`. Login, refresh, logout; JWT in httpOnly cookies. |
| **Client** (`client/`) | Angular 17 app on `http://localhost:4200`. Login page, protected dashboard, error page. |
| **Access token** | 10 minutes. Stored in cookie `accessToken`. |
| **Refresh token** | 7 days. Stored in cookie `refreshToken`. |
| **Interceptor** | Sends cookies with every request; on **401** tries refresh once, then **logout** if still unauthorized. |
| **Auth guard** | Protects `/dashboard`; if not logged in (or cookies invalid), redirects to `/login`. |
| **Error route** | `/error` (and `**`) for “page not found”. |

---

## Step 1 – Run the API (Node.js)

```bash
cd api
npm install
npm start
```

- Server runs at **http://localhost:3000**.
- **Login:** `POST /api/auth/login` with body `{ "username": "any", "password": "any" }`.
- **Refresh:** `POST /api/auth/refresh` (uses `refreshToken` cookie).
- **Logout:** `POST /api/auth/logout`.
- **Protected:** `GET /api/dashboard` (requires valid `accessToken` cookie).

---

## Step 2 – Run the Angular app

```bash
cd client
npm install
npm start
```

- App runs at **http://localhost:4200**.
- Default route goes to **Login**; from there you can go to **Dashboard** (protected) or **Error** (e.g. `/error` or any unknown path).

---

## Step 3 – How auth works (step by step)

1. **Login**
   - User enters username/password on Login page.
   - Angular calls `POST /api/auth/login` with `withCredentials: true` (so cookies are sent/received).
   - API checks credentials (demo: any user/pass), creates:
     - **Access JWT** (10 min) → cookie `accessToken`
     - **Refresh JWT** (7 days) → cookie `refreshToken`
   - API sets both cookies; Angular stores user in `AuthService` and redirects to `/dashboard`.

2. **Every API request (interceptor)**
   - Angular’s HTTP interceptor adds **nothing** to the body/headers; it only ensures `withCredentials: true` so the browser sends cookies.
   - So every request to `http://localhost:3000` automatically sends `accessToken` and `refreshToken` cookies.

3. **When access token expires (10 minutes)**
   - Any request (e.g. `GET /api/dashboard`) returns **401**.
   - Interceptor catches 401 → calls `POST /api/auth/refresh` (with `refreshToken` cookie).
   - If refresh succeeds: API issues a new `accessToken` cookie; interceptor **retries the original request** once.
   - If refresh fails (e.g. refresh token expired): `AuthService.logout()` runs → clears state and redirects to **Login**.

4. **Route guard (dashboard)**
   - Route `/dashboard` is protected by `authGuard`.
   - Guard checks if user is “logged in” in memory; if not, it may try one request (e.g. dashboard) to see if cookies still valid.
   - If that request fails (401 and refresh fails), interceptor runs and triggers **logout** → redirect to Login.
   - So: no valid auth → user cannot open Dashboard; they are sent to Login or Error as configured.

5. **Logout**
   - User clicks Logout (or code calls `AuthService.logout()`).
   - Angular calls `POST /api/auth/logout` with credentials (cookies sent).
   - API clears refresh token from store and clears `accessToken` / `refreshToken` cookies.
   - Angular clears user and redirects to **Login**.

6. **Error / other routes**
   - `/error` shows the error (e.g. “Page not found”) component.
   - Any other path (`**`) can redirect to `/error` (or Login, depending on your routes).

---

## Step 4 – Project structure (what does what)

**API (`api/`)**

- `server.js` – Express app, CORS with credentials, cookie-parser, JWT sign/verify.
- **Cookies:** `accessToken` (10 min), `refreshToken` (7 days); both httpOnly.
- **Endpoints:** login, refresh, logout, `GET /api/dashboard` (protected).

**Client (`client/`)**

- `src/app/core/services/auth.service.ts` – Login, logout, refresh, `user` signal, `isLoggedIn`.
- `src/app/core/interceptors/auth.interceptor.ts` – `withCredentials: true`; on 401 → refresh once → retry or logout.
- `src/app/core/guards/auth.guard.ts` – Protects `/dashboard`; redirects to login when not authenticated.
- `src/app/features/login/` – Login form; on success navigate to dashboard.
- `src/app/features/dashboard/` – Protected page; calls `GET /api/dashboard`; logout button.
- `src/app/features/error/` – Error / not-found page.
- `src/environments/environment.ts` – `apiUrl: 'http://localhost:3000'` for local API.

---

## Step 5 – Quick test (10‑minute expiry)

1. Start API and client as above.
2. Open **http://localhost:4200** → Login with any username/password → you should land on Dashboard.
3. Wait **10+ minutes** (or temporarily set access expiry in `api/server.js` to e.g. `30s` and wait 30 seconds).
4. Click something that calls the API again (e.g. reload Dashboard or trigger a request).
5. You should see: **401** → interceptor calls **refresh** → new access token → request retries and succeeds.
6. If you then invalidate the refresh token (e.g. restart API so in-memory store is empty, or wait for refresh to expire), the next 401 will lead to **refresh failing** → **logout** → redirect to Login.

---

## Summary

- **JWT in cookies** (access 10 min, refresh 7 days).
- **Interceptor:** credentials on every request; 401 → one refresh attempt → then **unauthorized = logout**.
- **Auth guard** on dashboard; error component for other/error routes.
- **Local API:** Node.js in `api/`; Angular in `client/` using `http://localhost:3000`.

For production: use env vars for JWT secrets, HTTPS, and a real user store (e.g. DB) instead of in-memory refresh list.
