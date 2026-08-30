# Booking Board — Technical Build Guide

**Product:** A booking tool that lets small businesses (salons, clinics, tutors, repair shops, consultants) manage appointments without spreadsheets.

**Core value prop:** Business owner sets up services + staff + working hours once. Customers book online. Owner sees everything on one calendar board. No more double-bookings, no more manual reminder texts.

---

## 1. Product Scope (v1)

To keep the build achievable, v1 focuses on the smallest feature set that fully replaces a spreadsheet:

| In scope (v1) | Out of scope (later) |
|---|---|
| Business signup & onboarding | Multi-location businesses |
| Services (name, duration, price) | Package deals / memberships |
| Staff members & individual schedules | Staff commission/payroll tracking |
| Working hours & availability rules | Native mobile apps |
| Public booking page (customer-facing) | Marketplace/discovery (customers finding new businesses) |
| Calendar/board view for the business | POS / in-person checkout |
| Email + SMS reminders | Deep analytics / forecasting |
| Basic online payment (deposit or full) | Multi-currency, tax engines |
| Simple dashboard (today's bookings, upcoming, cancellations) | |

---

## 2. Tech Stack

Pick a stack that's boring, fast to ship, and has a clear upgrade path. Recommendation below; alternatives noted where it matters.

### Frontend
- **Next.js (React, TypeScript)** — server-rendered pages for the public booking page (SEO + speed matters when a customer clicks a link), client-rendered dashboard for the business owner.
- **Tailwind CSS** — fast styling, easy to keep consistent.
- **React Query (TanStack Query)** — data fetching/caching for the dashboard.
- **date-fns + date-fns-tz** — all date/time math. Never hand-roll timezone logic.

### Backend
- **Node.js + TypeScript**, using **Next.js API routes** (or a separate **Express/Fastify** service if you want backend and frontend deployed independently — recommended once you have staff working on both).
- **PostgreSQL** — relational integrity matters a lot here (double-booking prevention, foreign keys between businesses → staff → services → appointments).
- **Prisma ORM** — type-safe queries, migrations, easy to reason about schema changes.
- **Redis** — short-lived booking locks (prevent race conditions when two customers grab the same slot) and job queue backing store.

### Auth
- **Auth.js (NextAuth)** or **Clerk/Auth0** for business-owner login. Customers booking appointments generally should NOT need an account — capture name/email/phone only, to reduce friction.

### Background jobs / notifications
- **BullMQ** (Redis-backed queue) for scheduled reminder jobs.
- **Resend** or **Postmark** for transactional email.
- **Twilio** for SMS reminders.

### Payments
- **Stripe** (Checkout + Payment Intents) — deposits, no-show protection, full prepayment.

### Infrastructure
- **Vercel** for the Next.js app (fastest path to production).
- **Railway, Render, or Supabase** for managed Postgres + Redis.
- **Cloudflare** for DNS and if you later support custom domains per business (e.g. `book.acmehair.com`).

### Why this stack
- Single language (TypeScript) across frontend/backend — one team can move fast.
- Postgres + Prisma gives you real transactions, which you need for slot-locking.
- Everything here has a generous free/cheap tier, so early cost is near zero.

---

## 3. High-Level Architecture

```
Customer Browser                Business Owner Browser
      |                                  |
      v                                  v
   Public Booking Pages          Owner Dashboard (auth'd)
      \_______________      _______________/
                      \    /
                   Next.js App (frontend + API routes)
                            |
        ------------------------------------------
        |              |               |          |
   PostgreSQL        Redis          BullMQ      Stripe
  (source of truth) (locks/cache) (jobs/queue) (payments)
                            |
                     Email/SMS providers
```

Multi-tenancy model: every business is a row in `businesses`, and nearly every other table has a `business_id` foreign key. This is a **single database, shared-schema multi-tenant** design — simplest to build and scale for a v1 SaaS. Enforce tenant isolation at the query layer (Prisma middleware that auto-injects `business_id` filters) rather than trusting each API route to remember it.

---

## 4. Project Setup

### 4.1 Repository structure

```
booking-board/
  apps/
    web/                # Next.js app (dashboard + public booking pages)
  packages/
    db/                 # Prisma schema + migrations, shared client
    shared/             # shared types, zod schemas, date/time utils
  infra/                # deployment configs
  package.json          # workspace root (pnpm/turborepo)
```

Using a monorepo (pnpm workspaces + Turborepo) from day one avoids painful refactors once you split out a worker service for notifications.

### 4.2 Step-by-step bootstrap

1. `pnpm dlx create-turbo@latest booking-board` — scaffold monorepo.
2. Inside `apps/web`: `pnpm create next-app@latest --typescript --tailwind --app`.
3. Add Prisma: `pnpm add -D prisma && pnpm add @prisma/client`, then `pnpm prisma init` inside `packages/db`.
4. Provision Postgres + Redis (Railway/Supabase) and drop connection strings into `.env`.
5. Set up Auth.js with email/password + Google OAuth for business owners.
6. Set up Stripe test account and add API keys to `.env`.
7. Set up Resend/Postmark and Twilio sandbox accounts.
8. Add `zod` for input validation shared between frontend forms and API routes.
9. Configure CI (GitHub Actions): lint, typecheck, `prisma migrate deploy --dry-run`, run tests on every PR.
10. Deploy an empty "Hello World" version to Vercel immediately — get the pipeline working before building features.

### 4.3 Environment variables (baseline)

```
DATABASE_URL=
REDIS_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
APP_BASE_URL=
```

---

## 5. Database Schema (core tables)

```prisma
model Business {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique   // used in public booking URL: /b/{slug}
  timezone      String             // IANA tz, e.g. "Africa/Addis_Ababa"
  ownerUserId   String
  createdAt     DateTime @default(now())
  services      Service[]
  staff         Staff[]
  appointments  Appointment[]
}

model Staff {
  id          String   @id @default(cuid())
  businessId  String
  name        String
  email       String?
  active      Boolean  @default(true)
  business    Business @relation(fields: [businessId], references: [id])
  workingHours WorkingHours[]
  appointments Appointment[]
}

model WorkingHours {
  id        String  @id @default(cuid())
  staffId   String
  weekday   Int      // 0-6
  startMin  Int      // minutes from midnight, local business tz
  endMin    Int
  staff     Staff   @relation(fields: [staffId], references: [id])
}

model Service {
  id          String   @id @default(cuid())
  businessId  String
  name        String
  durationMin Int
  priceCents  Int
  bufferMin   Int      @default(0)   // cleanup/prep time after appointment
  active      Boolean  @default(true)
  business    Business @relation(fields: [businessId], references: [id])
  appointments Appointment[]
}

model Customer {
  id          String   @id @default(cuid())
  businessId  String
  name        String
  email       String?
  phone       String?
  createdAt   DateTime @default(now())
  appointments Appointment[]
}

model Appointment {
  id          String   @id @default(cuid())
  businessId  String
  staffId     String
  serviceId   String
  customerId  String
  startsAt    DateTime  // stored UTC
  endsAt      DateTime  // stored UTC
  status      AppointmentStatus @default(CONFIRMED)
  paymentStatus PaymentStatus @default(NONE)
  notes       String?
  createdAt   DateTime @default(now())

  business    Business @relation(fields: [businessId], references: [id])
  staff       Staff    @relation(fields: [staffId], references: [id])
  service     Service  @relation(fields: [serviceId], references: [id])
  customer    Customer @relation(fields: [customerId], references: [id])

  @@index([staffId, startsAt])
}

enum AppointmentStatus {
  CONFIRMED
  CANCELLED
  COMPLETED
  NO_SHOW
}

enum PaymentStatus {
  NONE
  DEPOSIT_PAID
  PAID
  REFUNDED
}
```

Key design decisions:
- **Store all timestamps in UTC**, convert to the business's IANA timezone only at display/input time. This is the single most common source of booking bugs.
- **`@@index([staffId, startsAt])`** — every availability query filters by staff + time range; this index makes it fast.
- **Buffer time lives on the Service**, not hardcoded, since a haircut and a deep-tissue massage need different cleanup gaps.

---

## 6. Feature-by-Feature Plan

### 6.1 Business onboarding
**Goal:** Owner signs up and has a working booking page in under 5 minutes.

- Steps: create account → business name/timezone → add 1+ services → add staff (or default to "just me") → set working hours → done, show public link.
- Auto-generate a URL-safe `slug` from business name; check uniqueness; allow edit later.
- Seed sensible defaults (Mon–Fri 9–5) so the owner isn't staring at a blank grid.

### 6.2 Service management
- CRUD screen: name, duration, price, buffer time, active/inactive toggle.
- Inactive services stay in history (past appointments) but disappear from the public booking page — never hard-delete a service once it has appointments; soft-delete via `active = false`.

### 6.3 Staff & working hours
- Each staff member has their own weekly schedule (`WorkingHours`).
- Support "time off" as a separate table (`StaffTimeOff: staffId, startsAt, endsAt`) for vacations/sick days, checked at slot-generation time.
- For solo businesses, auto-create one default "Staff" record on signup so the data model stays consistent (don't special-case "no staff" throughout the code).

### 6.4 Availability engine (the core logic)
This is the feature worth the most design care.

**Slot generation algorithm** (given a service + staff + date):
1. Get the staff's `WorkingHours` for that weekday → base window(s).
2. Subtract any `StaffTimeOff` overlapping that day.
3. Subtract existing `Appointment`s for that staff (with service duration + buffer already applied).
4. Walk the remaining free windows in increments of the service's duration (or a configurable slot granularity, e.g. 15 min) to produce bookable start times.
5. Filter out slots in the past or inside a configurable minimum-notice window (e.g. "no bookings within 2 hours").

**Race condition handling:** two customers can click "book" on the same slot within milliseconds.
- Use a short-lived Redis lock keyed on `staffId + startsAt` while the booking transaction runs, OR
- Rely on a Postgres unique/exclusion constraint (`EXCLUDE USING gist` on a time-range column with `btree_gist`) so a double-booked insert fails at the database level — this is the more robust option and doesn't depend on Redis being up.
- Either way, wrap the "check availability + create appointment" step in a single DB transaction and re-validate availability inside it, not just in the UI.

### 6.5 Public booking page
- Route: `/b/[slug]`.
- Flow: pick service → pick staff (or "any available") → pick date/time from generated slots → enter name/email/phone → confirm.
- No login required for customers. Store customer by email/phone match within that business (create if new).
- Show the business's timezone explicitly on the page (customers in a different timezone need this).
- Send confirmation immediately (email + SMS if phone given) with an ICS calendar attachment.

### 6.6 Owner dashboard / "the board"
- Default view: calendar/agenda for today, with a day/week toggle.
- Color-code by staff or by status (confirmed/cancelled/completed).
- Click an appointment → see customer details, notes, reschedule/cancel actions.
- Quick "add appointment manually" for walk-ins or phone bookings — must go through the same availability-check code path as the public page (don't duplicate logic).
- Simple filters: by staff, by service, by status.

### 6.7 Notifications
- **Confirmation:** sent immediately on booking (email + optional SMS).
- **Reminder:** scheduled job (BullMQ) fires e.g. 24h and 2h before `startsAt`. Schedule the job at booking time; cancel/reschedule it if the appointment is cancelled or moved.
- **Cancellation notice:** sent to the other party whenever either the customer or the business cancels.
- Keep templates in one place (`packages/shared/templates`) so email and SMS copy stay consistent.

### 6.8 Payments (deposit / prepay)
- Business owner can require a fixed deposit or full payment per service.
- Flow: on booking, create a Stripe Checkout Session (or Payment Intent) before confirming the appointment — don't mark the appointment `CONFIRMED` until the webhook confirms payment succeeded (avoids "confirmed but never paid" states).
- Handle `payment_intent.succeeded`, `payment_intent.payment_failed`, and `charge.refunded` webhooks.
- Cancellation policy: configurable — full refund, partial, or no refund based on how close to the appointment time the cancellation happens.

### 6.9 Cancellations & rescheduling
- Customer-facing cancel/reschedule link included in confirmation emails (signed token, no login needed).
- Rescheduling re-runs the full availability engine — never just "move the row" without re-validating.
- Enforce a configurable cancellation cutoff (e.g. "cannot cancel within 4 hours") set per business.

### 6.10 Basic reporting
- v1 dashboard widgets: today's appointment count, this week's revenue (from `priceCents` on completed/paid appointments), no-show rate, busiest staff member.
- Keep this as simple SQL aggregate queries first — don't build a separate analytics pipeline until usage justifies it.

---

## 7. API Design (representative endpoints)

```
POST   /api/businesses                     create business (onboarding)
GET    /api/businesses/:slug/public        public info for booking page
GET    /api/businesses/:slug/services      list active services (public)
GET    /api/businesses/:slug/availability  ?serviceId&staffId&date -> slots
POST   /api/businesses/:slug/appointments  create appointment (public booking)
GET    /api/appointments                   list (auth'd, business-scoped)
PATCH  /api/appointments/:id               update status / reschedule
DELETE /api/appointments/:id               cancel
POST   /api/staff                          create staff member
PATCH  /api/staff/:id/hours                update working hours
POST   /api/webhooks/stripe                payment events
POST   /api/webhooks/twilio                delivery status (optional)
```

Validate every request body with a shared `zod` schema so frontend forms and backend routes can't drift apart.

---

## 8. Testing Strategy

- **Unit tests** on the availability engine — this is the highest-risk logic; test timezone edge cases (DST transitions), overlapping time-off, back-to-back bookings, buffer time.
- **Integration tests** for the booking transaction (simulate concurrent bookings for the same slot, assert only one succeeds).
- **E2E tests** (Playwright) for the full public booking flow and the owner's "add appointment manually" flow.

---

## 9. Deployment & Rollout Plan

1. Deploy `apps/web` to Vercel with preview deployments per PR.
2. Managed Postgres with automated daily backups from day one — appointment data loss is unacceptable even in beta.
3. Run Prisma migrations via CI on merge to `main`, not manually in production.
4. Add error monitoring (Sentry) and uptime monitoring before onboarding real businesses.
5. Soft-launch with 2–3 friendly businesses; watch the availability engine and notification jobs closely for the first two weeks.

---

## 10. Suggested Build Order (Milestones)

1. **M1 — Foundation:** repo, DB schema, auth, empty dashboard shell.
2. **M2 — Core data:** services CRUD, staff CRUD, working hours.
3. **M3 — Availability engine:** slot generation + tests (this unblocks everything else).
4. **M4 — Public booking page:** end-to-end booking without payment.
5. **M5 — Owner dashboard/board:** calendar view, manual add, cancel/reschedule.
6. **M6 — Notifications:** confirmation + reminder emails/SMS.
7. **M7 — Payments:** deposits via Stripe.
8. **M8 — Polish:** reporting widgets, cancellation policy, edge-case hardening, beta launch.

---

*This guide is a starting blueprint — adjust the stack choices (e.g. swap Stripe for a local payment provider, or Twilio for a regional SMS gateway) based on where your first customers actually operate.*
