# Getting Started — from zero to a running, integrated stack

This scaffold is a real, working Node/Express + PostgreSQL backend that
implements the core of `docs/api-specification.md` and matches
`docs/database-schema.sql` exactly (it's the same file). It ships with a
one-page vanilla-JS demo so you can prove the whole chain works — login →
browse categories → read an entitlement-gated section — before investing
time wiring up the full React UIs.

## Step 1 — Create the Repl

1. On Replit, click **Create Repl** → choose the **Node.js** template.
2. Upload every file in this package into the Repl, preserving the folder
   structure (`routes/`, `middleware/`, `public/` as subfolders).

## Step 2 — Add a real Postgres database

1. In the Repl, open **Tools → Database** and add **PostgreSQL**.
2. Replit will generate a connection string and can inject it automatically,
   or show it to you to copy.
3. Open **Tools → Secrets** and add:
   - `DATABASE_URL` — the connection string from step 2
   - `JWT_SECRET` — any long random string (e.g. run `openssl rand -hex 32`
     in the Replit shell and paste the result)

Never put real secrets in `.env` in source control — `.env.example` is a
template only.

## Step 3 — Install and seed

In the Replit shell:
```bash
npm install
npm run seed
```
`seed.js` applies `schema.sql` to your new database, then inserts the four
categories, one demo plan, an admin account, and a demo subscriber with an
**already-active** entitlement, plus the eight sample titles from the
uploaded EPUBs. You'll see two demo logins printed at the end:
```
Admin  -> admin@askreader.test / Admin@12345
Reader -> reader@askreader.test / Reader@12345
```

## Step 4 — Run it

Click **Run**, or:
```bash
npm start
```
Open the Repl's webview — you'll see the demo page at `public/index.html`.
Log in as the demo reader, load categories, and fetch a section. If that
section's text renders, your database, auth, and entitlement-enforcement
middleware are all working together correctly. If you instead see an
`ENTITLEMENT_REQUIRED` error, you're logged in as a user with no active
entitlement — that's the access-control gate working as designed, not a bug.

## Step 5 — Replace the demo page with the real reader UI

The demo page in `public/index.html` exists only to prove the wiring. The
real interface is `askreader.jsx` from the earlier package. To connect it:

1. On your own machine (or a second Repl), scaffold a Vite React app:
   ```bash
   npm create vite@latest askreader-web -- --template react
   cd askreader-web
   npm install lucide-react
   ```
2. Drop `askreader.jsx` in as `src/App.jsx`.
3. **The only structural change needed:** replace every `window.storage.get`
   / `window.storage.set` call with `fetch()` calls to this backend's API,
   using the same shape:

   | Prototype currently does | Replace with |
   |---|---|
   | `window.storage.get(STORE_KEY)` on mount | `GET /api/auth/me` + `GET /api/me/entitlement` (add this route — see spec §3) + `GET /api/categories` |
   | Reading a book's chapters (`BOOKS` constant) | `GET /api/books/:id` then `GET /api/books/:id/editions/:editionId/sections` |
   | `toggleBookmark` / `saveNote` writing to storage | `POST /api/me/annotations` (add this route — see spec §4; not yet implemented in this scaffold) |
   | Mock `PLAN` constant | Response from `GET /api/me/entitlement` (already implemented) |

4. Deploy the Vite build's output (`dist/`) as static files served by this
   same Express app — add `app.use(express.static("askreader-web/dist"))`
   in `server.js` — so the whole product is one Repl, one URL, one process.
5. Repeat for `askreader-admin.jsx` calling the `/api/admin/*` routes,
   which **are** fully implemented in this scaffold.

## Step 6 — Fill the gaps this scaffold intentionally leaves open

This is a working baseline, not the finished spec. Before treating it as
more than a demo:

- **Payments**: `POST /api/orders/:id/mock-pay` stands in for a real payment
  gateway. Replace it with `POST /webhooks/payment` from the API spec, wired
  to Razorpay or Cashfree's server-to-server callback, once you have a
  merchant account. Keep the idempotency pattern (`idempotency_key`,
  transaction-wrapped) — that's the part most likely to cause real bugs if
  simplified.
- **OTP verification**: `routes/auth.js` uses plain email+password. Section
  6.1 of the blueprint calls for OTP; add that once you have an email/SMS
  provider.
- **Signed URLs for files**: this scaffold stores section text directly in
  Postgres (`edition_sections.content`) for simplicity. A real deployment
  stores PDF/EPUB files in private object storage and serves them via
  short-lived signed URLs, per `docs/architecture-and-deployment.md` §3 —
  necessary once you're serving real files instead of plain text.
- **Annotations, notifications, reports endpoints**: listed in the API spec
  but not yet implemented here. They follow the exact same
  route → middleware → `pool.query` pattern as everything else in
  `routes/`; add them incrementally as the frontend needs them.
- **Content ingestion pipeline**: still a separate piece of work (blueprint
  Section 8) — this backend expects clean, structured section data to
  already exist by the time it reaches `edition_sections`.

## Moving off Replit later

Once the product is past prototype stage, the same codebase runs anywhere
Node + Postgres run — Railway, Render, Fly.io, or your own AWS/GCP account.
Nothing here is Replit-specific except the `.replit` file and the Secrets
panel; swap Secrets for your host's environment-variable equivalent and the
code is unchanged. At that point, open the project in VS Code for real
day-to-day development — Replit's browser editor is great for getting to a
running demo fast, but a local editor with your own extensions, terminal,
and git workflow is what you'll want once more than one person is touching
this code.
