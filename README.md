# Aswini Makeover Artist

> Enhance • Empower • Transform — book bridal, party, engagement and HD makeup appointments online.

## Project Structure

```
Aswini Makeover Artist/
├── backend/          # FastAPI Python backend
├── frontend/         # React + Tailwind CSS frontend
└── supabase/         # Database schema
```

## Setup Guide

### 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL editor (this also seeds the service catalog)
3. If you already ran `schema.sql` before 2026-07-29, also run `supabase/migrations/002_security_and_integrity_fixes.sql` — it adds the coupons RLS policy, the coupon-code foreign key, the past-date and double-booking constraints, and the payment-id uniqueness constraint. It will fail if existing rows already violate one of these constraints (e.g. a past-dated booking) — clean those up first.
4. Note your Project URL, anon key and service role key

### 2. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Mac/Linux

pip install -r requirements.txt

cp .env.example .env
# Fill in your Supabase and Razorpay keys in .env

python run.py
# API runs at http://localhost:8000
```

**Required .env values:**
- `SUPABASE_URL` — from Supabase project settings
- `SUPABASE_KEY` — anon key
- `SUPABASE_SERVICE_KEY` — service role key
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — from [Razorpay Dashboard](https://dashboard.razorpay.com) (for advance payment collection)
- `ADMIN_EMAILS` — comma-separated list of emails that get admin panel access
- `ADVANCE_PAYMENT_PERCENT` — % of the service price collected as advance (default 30)

### 3. Frontend Setup

```bash
cd frontend
npm install

cp .env.example .env.local
# Fill in your Supabase URL, anon key and WhatsApp number

npm run dev
# App runs at http://localhost:5173
```

## Features

| Feature | How to use |
|---------|-----------|
| **Service Catalog** | Browse party, engagement, bridal, reception, baby shower, mature-skin and add-on services with pricing, duration, gallery, prep tips & FAQ |
| **Portfolio Gallery** | Filter past work by category (Bride, Reception, Engagement, Baby Shower, Party, HD, Airbrush) with full-screen viewer |
| **Multi-step Booking** | Service → Date & time (live slot availability) → customer details → advance payment → confirmation |
| **Razorpay Payments** | Secure advance payment collection with signature verification |
| **My Bookings** | Upcoming / completed / cancelled tabs, reschedule, cancel, download invoice, add to calendar |
| **Reviews** | Star ratings + photos, admin replies, average rating shown on Home |
| **Admin Panel** | Dashboard (today's appointments, monthly revenue, status counts), booking status management, customer list, services & portfolio CRUD, coupons, blocked-date availability |
| **WhatsApp** | Floating chat button + booking confirmation deep-link |

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, React Router
- **Backend**: FastAPI, Python 3.11+
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password, password reset)
- **Payments**: Razorpay (order creation + signature verification)
- **Storage**: Supabase Storage (portfolio images, review photos)

## API Endpoints

```
GET  /api/v1/services              — List active services (optional ?category=)
GET  /api/v1/services/{slug}       — Service detail
POST /api/v1/services              — Create service (admin)
PUT  /api/v1/services/{id}         — Update service (admin)
DELETE /api/v1/services/{id}       — Deactivate service (admin)

GET  /api/v1/portfolio              — List portfolio images (optional ?category=)
POST /api/v1/portfolio              — Add portfolio image (admin)
DELETE /api/v1/portfolio/{id}       — Remove portfolio image (admin)

GET  /api/v1/bookings/slots         — Booked slots + blocked status for a date
POST /api/v1/bookings                — Create booking
GET  /api/v1/bookings/my             — Customer's own bookings
GET  /api/v1/bookings/{id}           — Booking detail
PUT  /api/v1/bookings/{id}/reschedule — Reschedule
PUT  /api/v1/bookings/{id}/cancel     — Cancel
PUT  /api/v1/bookings/{id}/status     — Update status (admin)

POST /api/v1/payments/create-order   — Create Razorpay order for advance payment
POST /api/v1/payments/verify         — Verify payment signature, confirm booking

GET  /api/v1/reviews                 — List reviews (optional ?service_id=)
GET  /api/v1/reviews/summary         — Average rating + total count
POST /api/v1/reviews                 — Submit a review
PUT  /api/v1/reviews/{id}/reply      — Admin reply

GET  /api/v1/admin/dashboard         — Today's appointments, revenue, status counts (admin)
GET  /api/v1/admin/bookings          — All bookings (admin)
GET  /api/v1/admin/customers         — Customer list with spend (admin)
GET/POST/DELETE /api/v1/admin/blocked-dates — Manage availability (admin)
GET/POST/DELETE /api/v1/admin/coupons       — Manage coupons (admin)
```

## Service Catalog (seeded)

| Service | Price |
|---------|-------|
| Party Makeup | ₹3,000 |
| HD Party Makeup | ₹4,500 |
| Engagement Makeup | ₹8,000 |
| HD Engagement Makeup | ₹9,000 |
| Bridal Makeup | ₹12,000 |
| HD Bridal Makeup | ₹15,000 |
| Airbrush Bridal Makeup | ₹22,000 |
| Reception Makeup | ₹8,000 |
| Baby Shower Makeup | ₹5,000 |
| Mature Skin Makeup | ₹5,500 |
| Saree Pre Pleating & Draping | ₹500 |
| Hair Styling | ₹1,000 |
| False Lashes | ₹500 |

## Contact

- Phone: 9094678502 / 7708566191
- Email: aswinisaleena@gmail.com
- Instagram: [@aswini_makover_artist](https://instagram.com/aswini_makover_artist)

## Not Yet Implemented

This build covers the core booking-and-catalog product end to end. It intentionally does **not** include the heavier AI/ML features from the original wishlist (AI selfie-based look/shade recommendation, face-shape & skin-tone detection, AI virtual makeover preview) or multi-artist scheduling, loyalty points, and gift vouchers — those need dedicated ML models or significant extra scope and are best scoped as follow-up milestones once the core app is live.
