-- Multi-mode payment workflows: booking-time payment mode (full/advance/pay
-- after service), an admin-recordable payment ledger, and DB-generated
-- payment_status/balance_amount so they can never drift from the ledger.
--
-- Unlike 002_..., this migration is NOT safely re-runnable end-to-end: it
-- drops and regenerates payment_status and drops the old single-payment
-- razorpay_order_id/razorpay_payment_id columns. Run this once against the
-- live Supabase project (SQL editor) before deploying the matching backend
-- code, which assumes these columns/tables already exist.

-- 1. Payment mode chosen at booking time.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'advance'
  CHECK (payment_mode IN ('full', 'advance', 'pay_after_service'));

-- 2. Running total collected, maintained by the backend on every payment write.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0;

-- 3. Backfill amount_paid for bookings already paid under the old single-payment model.
UPDATE bookings SET amount_paid = advance_amount WHERE payment_status = 'paid';

-- 4. Payment ledger — every payment (online or admin-recorded) is one row here.
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('cash', 'upi', 'google_pay', 'phonepe', 'razorpay', 'card', 'bank_transfer')),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  note TEXT,
  recorded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_records_razorpay_payment_id
  ON payment_records(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_records_booking ON payment_records(booking_id, created_at);

-- 5. Backfill ledger history from bookings already paid, so nothing is lost.
INSERT INTO payment_records (booking_id, amount, method, razorpay_order_id, razorpay_payment_id, recorded_by, created_at)
SELECT id, advance_amount, 'razorpay', razorpay_order_id, razorpay_payment_id, 'migration-backfill', created_at
FROM bookings
WHERE payment_status = 'paid'
  AND razorpay_payment_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM payment_records pr WHERE pr.razorpay_payment_id = bookings.razorpay_payment_id
  );

-- 6. payment_status becomes derived from amount_paid vs total_amount — it can
--    no longer be hand-set by application code, so it can never drift from
--    the ledger. Every backend write path is updated to stop writing it.
ALTER TABLE bookings DROP COLUMN payment_status;
ALTER TABLE bookings ADD COLUMN payment_status TEXT GENERATED ALWAYS AS (
  CASE
    WHEN amount_paid >= total_amount THEN 'paid'
    WHEN amount_paid > 0 THEN 'partially_paid'
    ELSE 'unpaid'
  END
) STORED;

-- 7. Balance due, also derived.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(10,2) GENERATED ALWAYS AS (
  GREATEST(total_amount - amount_paid, 0)
) STORED;

-- 8. The old single-payment columns are superseded by payment_records.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_razorpay_payment_id_key;
ALTER TABLE bookings DROP COLUMN IF EXISTS razorpay_order_id;
ALTER TABLE bookings DROP COLUMN IF EXISTS razorpay_payment_id;

-- 9. RLS on the new table, mirroring the existing "customers see only their
--    own" pattern (defense in depth — the backend itself uses the service
--    role key and bypasses RLS).
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own booking payments" ON payment_records;
CREATE POLICY "Users can view own booking payments" ON payment_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM bookings b WHERE b.id = payment_records.booking_id AND b.user_id = auth.uid())
);
