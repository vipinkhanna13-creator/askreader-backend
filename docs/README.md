# ASKreader — Delivery Package

This package covers everything that could be fully decided and built from
specification alone. It stops exactly where real infrastructure — a live
database, a payment gateway merchant account, cloud hosting, app-store
accounts — would need to exist, because those require the publisher's own
credentials and cannot be provisioned on their behalf.

## What's included

| File | What it is | Status |
|---|---|---|
| `askreader.jsx` | Reader web app: four-category library, search, reader view with TOC/zoom/theme, bookmarks, notes, last-read position, subscription/expiry display | Working, click-through prototype with real sample content (see below). Data persists locally. |
| `askreader-admin.jsx` | Admin portal: catalogue management with the full publication-status workflow, subscriber/entitlement management with 365-day renewal logic, reports, audit log | Working, click-through prototype. Data persists locally. |
| `database-schema.sql` | Complete PostgreSQL schema — every entity in the blueprint's Section 9, plus auth, sessions, notifications, and audit tables it implies | Ready to run against a real Postgres instance. |
| `api-specification.md` | Full REST contract: every endpoint the two apps above would call in production, entitlement-enforcement logic spelled out, error codes, idempotency rules | Ready for a backend team to implement against. |
| `architecture-and-deployment.md` | Concrete stack choices (no open menus), environment layout, the exact request flow for protected content, and a layered content-protection design | Ready to follow. |

## Sample content

The eight sample titles loaded into both prototypes (Bharatiya Nyaya Sanhita,
Bharatiya Nagarik Suraksha Sanhita, Bharatiya Sakshya Adhiniyam, the U.P.
Municipalities Act 1916, U.P. Municipal Corporation Act 1959, U.P. Revenue
Code 2006, U.P. Urban Planning and Development Act 1973, and Rules of Court
1952) come from the EPUB files you uploaded. Bare Act text is reproduced
directly, since statute text is excluded from copyright under Section 52 of
the Copyright Act. The Rules of Court title is a commentary edition, so its
sample section uses an original summary rather than the publisher's own
commentary text. Per your instruction, all eight titles are tagged under all
four categories in this sample set — in a real catalogue you'd normally
assign each title to the one or two categories it actually belongs to.

## What still requires you or a development team

Nothing further can be *decided* from the blueprint alone — the remaining
items need real-world accounts and content, not more specification:

1. **Cloud & accounts** — a cloud provider account, a Postgres instance, an
   object storage bucket, a payment gateway merchant account (Razorpay/
   Cashfree KYC), and Google Play / Apple Developer accounts.
2. **Legal sign-off** — copyright clearance for any non-statutory
   (commentary) content, GST/invoicing setup, privacy policy, and terms of
   service, reviewed by the publisher's own advisers (blueprint Section 10).
3. **Real content pipeline** — OCR/digitisation and editorial proofreading of
   the actual catalogue at production scale (blueprint Section 8).
4. **Engineering build-out** — implementing the API against the schema and
   spec here, then pointing the two prototype UIs at it instead of local
   storage; building the Flutter mobile client against the same API.

## Suggested order of work from here

1. Stand up Postgres from `database-schema.sql` in a dev environment.
2. Implement the auth + catalogue + entitlement endpoints from
   `api-specification.md` (in that order — everything else depends on them).
3. Swap the reader/admin prototypes' local-storage calls for real API calls.
4. Wire a payment gateway's test mode to the `/orders` and
   `/webhooks/payment` endpoints and run the Section 13 acceptance tests
   (especially: duplicate webhook delivery must not double-grant access).
5. Pilot with a small group (blueprint Section 13) before opening
   registration publicly.
