-- PostgreSQL Production Exclusion Constraint Migration
-- Prevents overlapping appointments for the same staff member at the database engine level.

-- 1. Enable btree_gist extension (required for combining scalar types like UUID/text with range types in GiST indexes)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Add generated tstzrange column to Appointment table
-- Range bound '[)' represents [startsAt, endsAt) — inclusive start, exclusive end
ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "duringRange" tstzrange
  GENERATED ALWAYS AS (tstzrange("startsAt", "endsAt", '[)')) STORED;

-- 3. Add Exclusion Constraint
-- Rejects any concurrent or direct INSERT/UPDATE where staffId matches and the time ranges overlap (&&),
-- only for active CONFIRMED appointments (cancelled appointments do not block the slot).
ALTER TABLE "Appointment"
  DROP CONSTRAINT IF EXISTS no_overlapping_appointments;

ALTER TABLE "Appointment"
  ADD CONSTRAINT no_overlapping_appointments
  EXCLUDE USING gist (
    "staffId" WITH =,
    "duringRange" WITH &&
  )
  WHERE (status = 'CONFIRMED');
