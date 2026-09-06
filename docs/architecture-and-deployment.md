# ASKreader — Architecture & Deployment Guide

This document makes the concrete technology decisions the blueprint (Section 7)
left open, so a development team has a single answer for each choice rather
than a menu.

## 1. Stack decisions

| Layer | Choice | Why |
|---|---|---|
| Web reader + admin portal | React + TypeScript, Vite build | Matches the two working prototypes already built; TypeScript catches entitlement-shape bugs at compile time. |
| Mobile | Flutter | Single codebase for Android now, iOS later, as the blueprint recommends. |
| Backend API | Node.js + TypeScript, Fastify or NestJS | Strong async I/O for signed-URL issuance and webhook handling; TypeScript shares types with the frontend. |
| Database | PostgreSQL 15+ (managed, e.g. RDS/Cloud SQL) | Relational integrity for entitlements/orders matters more here than NoSQL flexibility. Schema in `database-schema.sql`. |
| File storage | Private S3-compatible bucket, **no public ACLs ever** | Served only via signed URLs per API spec §2. |
| Search | PostgreSQL full-text search (`tsvector`, already in the schema) for launch; move to OpenSearch only if catalogue size or query volume outgrows it | Avoids running a second stateful service before it's needed. |
| Payments | Razorpay or Cashfree (India-first, UPI + card + netbanking + subscriptions) | Final choice is a commercial decision for the publisher, not a technical one — the API spec's webhook contract works with either. |
| Notifications | Transactional email (SES/Postmark) + SMS via an approved Indian DLT-registered provider | WhatsApp Business API only if the publisher secures the required business verification. |
| Hosting | Single cloud provider (AWS or GCP) for API, DB, storage, and CDN, to keep IAM and networking in one place | Reduces operational surface area for a small ops team (Section 17). |
| CI/CD | GitHub Actions → staging → manual promote to production | Matches the three-environment requirement in Section 10. |
| Monitoring | Sentry (errors) + provider-native metrics/logs (CloudWatch/Cloud Monitoring) | Minimum viable observability for launch; add a dedicated APM later if needed. |

## 2. Environments

Three environments, each with its own database, storage bucket, and payment
gateway keys (test-mode keys in dev/staging):

```
dev        → feature branches, seeded with synthetic data only
staging    → mirrors production config, used for UAT (Section 13)
production → real subscriber and payment data
```

Never point staging or dev at production's object storage bucket — a
misconfigured test upload should not be able to overwrite a live edition file.

## 3. Request flow for protected content (Section 7.3, implemented)

```
Reader app
   │  GET /books/:id/editions/:editionId/content   (Authorization: Bearer <JWT>)
   ▼
API Gateway → Auth middleware (validate JWT, resolve user)
   ▼
Entitlement middleware (API spec §5): does an active entitlement cover this book?
   │
   ├─ No  → 403 ENTITLEMENT_REQUIRED / ENTITLEMENT_EXPIRED
   ▼
   Yes → generate a signed URL (5 min TTL) scoped to this file, log the
         access in a lightweight access_log table (user, edition, timestamp, ip)
   ▼
Reader app fetches the file directly from object storage using the signed URL
```

No request for file bytes ever reaches the API process itself — it only ever
hands out a scoped, time-limited URL. This keeps the API stateless and cheap
to scale, and means a leaked application log never contains a working file
URL for longer than 5 minutes.

## 4. Content protection layers (Section 10, concretely)

1. **Access control** — the entitlement middleware above; this is the primary
   control and the one every acceptance test should target first.
2. **Signed, short-lived URLs** — no permanent link ever exists to a protected
   file.
3. **Watermarking** — stamp the subscriber's user ID and access timestamp
   into the rendered page (for PDF) or inject it into the rendered DOM (for
   HTML/EPUB) at serve time, not at upload time, so every access gets a
   unique watermark without needing per-user file copies in storage.
4. **Device/session limits** — enforced via `plans.device_limit` and the
   `devices` table.
5. **Rate limiting** — per API spec, on auth and content endpoints.
6. **Audit logging** — every admin mutation and, at lighter volume, every
   content access.

No single layer is sufficient on its own (screen capture defeats
watermarking, for instance) — the point of stacking them is that
circumventing all six at once is meaningfully harder than defeating any one.

## 5. Scaling notes

At launch scale (a few thousand subscribers, a few hundred titles) a single
small API instance behind a load balancer, one managed Postgres instance, and
a CDN in front of object storage is enough. The design decisions above (signed
URLs, stateless API, Postgres full-text search) are chosen specifically so
that the *first* thing to scale, if needed, is instance count — not a
rearchitecture.

## 6. What this repository does **not** include yet

- No live database, payment gateway account, or hosting has been provisioned —
  those require the publisher's own cloud, banking, and app-store accounts.
- No OCR/ingestion pipeline code — Section 8's workflow is process guidance;
  building the actual conversion pipeline is a follow-on engineering task
  once real source files and a target file format (PDF vs. EPUB vs. HTML)
  are decided.
- No mobile app code — Flutter project scaffolding is a reasonable next step
  once the API above is actually running, since the mobile client is a
  consumer of the same endpoints as the web reader.
