-- Run this against the existing Supabase project (SQL editor or `supabase db push`)
-- to apply the guardrail-audit fixes without re-running schema.sql from scratch.
-- Idempotent: safe to re-run.

-- 1. Coupons had RLS enabled with zero policies, which blocked all access
--    (including any future direct client read of active coupon codes).
DROP POLICY IF EXISTS "Public can view active coupons" ON coupons;
CREATE POLICY "Public can view active coupons" ON coupons FOR SELECT USING (active = true);

-- 2. bookings.coupon_code referenced coupons.code by convention only, with no FK.
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_coupon_code_fkey;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_coupon_code_fkey
  FOREIGN KEY (coupon_code) REFERENCES coupons(code) ON DELETE SET NULL;

-- 3. No DB-level check stopped a booking_date in the past (app-logic only, and
--    the app-logic check was itself missing).
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_booking_date_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_booking_date_check CHECK (booking_date >= CURRENT_DATE);

-- 4. Double-booking was only prevented by a check-then-insert in application code,
--    which is race-condition-prone under concurrent requests. This unique partial
--    index makes the same (date, slot) unbookable twice at the DB level.
DROP INDEX IF EXISTS uq_bookings_active_slot;
CREATE UNIQUE INDEX uq_bookings_active_slot ON bookings(booking_date, time_slot)
  WHERE status IN ('pending', 'confirmed');

-- 5. razorpay_payment_id had no uniqueness constraint, so the same payment could
--    theoretically be attached to more than one booking row.
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_razorpay_payment_id_key;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_razorpay_payment_id_key UNIQUE (razorpay_payment_id);
