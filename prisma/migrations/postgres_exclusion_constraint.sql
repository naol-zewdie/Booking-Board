-- PostgreSQL Production Exclusion Constraint Migration
-- Prevents overlapping appointments for the same staff member at the database engine level.

-- 1. Enable btree_gist extension (required for combining scalar types like text/UUID with range types in GiST indexes)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Add Exclusion Constraint directly using tsrange with half-open bound '[)'
-- Range bound '[)' represents [startsAt, endsAt) — inclusive start, exclusive end
-- Rejects concurrent or overlapping inserts for the same specialist,
-- covering active CONFIRMED appointments and PENDING_PAYMENT slot holds.
-- Terminal states ('CANCELLED', 'NO_SHOW', 'COMPLETED') do not block the slot.
ALTER TABLE "Appointment"
  DROP CONSTRAINT IF EXISTS no_overlapping_appointments;

ALTER TABLE "Appointment"
  ADD CONSTRAINT no_overlapping_appointments
  EXCLUDE USING gist (
    "staffId" WITH =,
    tsrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE ("status" IN ('CONFIRMED', 'PENDING_PAYMENT'));
