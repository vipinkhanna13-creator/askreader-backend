# ASKreader API Specification

Base URL: `https://api.askreader.example/v1`
Format: JSON over HTTPS. Auth: short-lived JWT access token (15 min) + rotating
refresh token (30 days), refresh token bound to a `device_id`.

Every response envelope:
```json
{ "data": {...} | [...], "error": null }
{ "data": null, "error": { "code": "ENTITLEMENT_EXPIRED", "message": "..." } }
```

---

## 1. Authentication

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create account with email or phone. Body: `{ name, email?, phone?, password? }`. Triggers OTP. |
| POST | `/auth/otp/verify` | Body: `{ destination, code, purpose }`. Marks contact verified; on `signup` purpose, activates the user. |
| POST | `/auth/login` | Body: `{ email|phone, password }` or `{ email|phone }` to request a login OTP. |
| POST | `/auth/refresh` | Body: `{ refresh_token }`. Returns new access + refresh token pair. Old refresh token is revoked (rotation). |
| POST | `/auth/logout` | Revokes the current session's refresh token. |
| GET  | `/auth/devices` | List the caller's registered devices with last-active timestamps. |
| DELETE | `/auth/devices/:id` | Revoke a device (forces logout there), enforcing the plan's `device_limit`. |

**Rate limiting:** login and OTP endpoints: 5 requests / 10 minutes per IP+destination pair (Section 10).

---

## 2. Catalogue

| Method | Path | Purpose |
|---|---|---|
| GET | `/categories` | Returns the four top-level categories with counts. Public (no auth) — used for the guest preview. |
| GET | `/categories/:id/books` | Paginated book list within a category. Query: `state, subject, year, author, status=current|superseded`. |
| GET | `/books/:id` | Book metadata + list of editions (id, version_label, status, effective_date) — **not** the file itself. |
| GET | `/books/:id/editions/:editionId` | Edition detail: table of contents (`edition_sections` tree), file_type. Requires a valid entitlement covering this book — see §5. |
| GET | `/books/:id/editions/:editionId/content` | Returns a **short-lived signed URL** (5 minute TTL) to the private file/page range in object storage. Never returns the file inline. Requires entitlement check (§5) on every call — this is the enforcement point described in Section 7.3. |
| GET | `/search?q=...` | Full-text search across `edition_sections.search_text`, **filtered server-side to editions the caller is entitled to** before matching — never search first and filter after, to avoid ever revealing that a match exists in unentitled content. |

---

## 3. Subscriptions & Payments

| Method | Path | Purpose |
|---|---|---|
| GET | `/plans` | Public list of active plans with price, duration, included categories. |
| POST | `/orders` | Body: `{ plan_id }`. Creates an `orders` row (`status=created`) and an order with the payment gateway; returns the gateway's client-side payment token/order id. |
| POST | `/webhooks/payment` | **Server-to-server only**, called by the payment gateway. Verifies signature, looks up `orders.gateway_order_id`, and only on first-seen `idempotency_key` does it: mark order `paid`, create/extend the `entitlements` row per the renewal rule below, and enqueue a receipt notification. Duplicate webhook deliveries are no-ops (Section 6.6, Section 13 "Payment" acceptance test). |
| GET | `/me/entitlement` | Returns the caller's current entitlement: plan, start/end dates, status, days remaining, included categories. This is the call the reader app makes at login and periodically during a session (Section 5.2). |
| POST | `/me/entitlement/renew` | Starts a renewal order for the same or a new plan. Renewal-date logic: **if `end_at > now()`, the new term is appended to `end_at`; otherwise it starts from the payment confirmation time** (Section 5.1). |
| GET | `/me/orders` | Order and invoice history for the logged-in user. |
| GET | `/me/orders/:id/invoice` | Returns invoice PDF (generated server-side, GST-compliant per the publisher's finalised tax setup). |

**Entitlement status is derived, not just stored:** a scheduled job flips `active → expired` (or `→ grace` if `grace_days > 0`) the moment `end_at` passes, and enqueues the day-of-expiry notification. Do not rely solely on read-time comparison for anything that fans out to notifications.

---

## 4. Reader Workspace (bookmarks, highlights, notes, progress)

| Method | Path | Purpose |
|---|---|---|
| GET | `/me/annotations?edition_id=` | List bookmarks/highlights/notes for an edition. |
| POST | `/me/annotations` | Body: `{ edition_id, section_id, type, location, text? }`. |
| PATCH | `/me/annotations/:id` | Edit note text or location. |
| DELETE | `/me/annotations/:id` | Remove. |
| PUT | `/me/progress/:editionId` | Upsert last-read position — called on a debounce (e.g. every 10s of active reading, not every scroll event). |
| GET | `/me/library` | "Continue reading" list: editions with progress, most recent first. |

**Edition migration:** when an edition is superseded (`editions.superseded_by` set), a background job attempts to remap each annotation's `section_id` by matching section titles between old and new `edition_sections`; unmatched annotations are flagged `stale: true` in the API response rather than silently dropped (Section 6.5).

---

## 5. Entitlement Enforcement (cross-cutting)

Every endpoint under `/books/:id/editions/:editionId/*` and `/search` runs this check before touching content:

1. Resolve caller's active entitlement(s) (`entitlements` where `status='active' AND end_at > now()`).
2. Resolve which `categories`/`books` those entitlements include (via `plans.included_category_ids` / `included_book_ids`).
3. If the requested book is not covered → `403 ENTITLEMENT_REQUIRED` with the plan's exact expiry/upgrade info, never a generic 404 (so legitimate users get an actionable renewal prompt, per Section 5.2).
4. If covered but the entitlement's device count for this session exceeds `plans.device_limit` → `403 DEVICE_LIMIT_REACHED` with the list of active devices so the user can revoke one.

This check is implemented once as middleware, not duplicated per route.

---

## 6. Admin API (role-gated: `content_admin`, `subscription_admin`, `super_admin`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/admin/books` | Create a book record. |
| PATCH | `/admin/books/:id` | Edit metadata. |
| POST | `/admin/books/:id/editions` | Upload a new edition: multipart file + metadata. Backend runs virus scan, extracts a TOC (`edition_sections`) via the ingestion pipeline (Section 8), and sets `status=draft`. |
| PATCH | `/admin/editions/:id/status` | Transition `draft → in_review → scheduled → published → superseded/withdrawn/archived`. Publishing an edition automatically sets the book's previous `published` edition to `superseded` and stamps `superseded_by`. |
| POST | `/admin/amendments` | Record an amendment against a base Act (Section 8.2 fields). |
| GET | `/admin/subscribers` | Paginated, filterable by `status`, `plan`, `expiring_within_days`. |
| POST | `/admin/subscribers/:id/entitlement/extend` | Manual extension (support override, per Section 5.2/Section 17 service targets). |
| POST | `/admin/subscribers/:id/entitlement/suspend` | Suspend access without cancelling (e.g. payment dispute). |
| GET | `/admin/reports/sales?from=&to=&groupBy=plan\|state\|channel` | |
| GET | `/admin/reports/content` | Most-read, most-searched, publication/amendment history. |
| GET | `/admin/audit?target_table=&target_id=&from=&to=` | Read-only; the API role backing this table has no UPDATE/DELETE grant (Section 10). |

All admin mutations write an `audit_events` row in the same DB transaction as the mutation — never as a fire-and-forget async call, so an audit gap can't outlive a partial failure.

---

## 7. Notifications

| Method | Path | Purpose |
|---|---|---|
| GET | `/me/notifications` | In-app notification feed. |
| PATCH | `/me/notifications/:id/read` | Mark read. |
| (internal) | scheduled job | At 30/15/7/1 days before `entitlements.end_at` and on the expiry date itself, enqueue `notifications` rows across the user's opted-in channels (Section 5.3). |

---

## 8. Error Codes (partial — extend as needed)

| Code | HTTP | Meaning |
|---|---|---|
| `ENTITLEMENT_REQUIRED` | 403 | Valid account, but no active entitlement covers this content. |
| `ENTITLEMENT_EXPIRED` | 403 | Had an entitlement; it lapsed. Includes `expired_at`, renewal link. |
| `DEVICE_LIMIT_REACHED` | 403 | Plan's concurrent-device cap hit. |
| `OTP_INVALID` | 400 | Wrong or expired code. |
| `RATE_LIMITED` | 429 | Too many attempts; includes `retry_after_seconds`. |
| `PAYMENT_SIGNATURE_INVALID` | 400 | Webhook signature failed verification — log and drop, do not process. |
| `DUPLICATE_ORDER` | 409 | Idempotency key already processed. |

---

## Notes for implementers

- Store all money as integer paise, never floating point (see `plans.price_paise`).
- The `/webhooks/payment` handler must be idempotent on `idempotency_key` — this is the single most important correctness property in the whole system per the blueprint's Section 13 acceptance criteria ("duplicate callbacks do not create duplicate entitlements").
- Content endpoints should be covered by an automated test that attempts access with an expired entitlement and asserts a 403 — this is the Section 13 "Content security" acceptance test, and it should run in CI on every deploy, not just at UAT.
