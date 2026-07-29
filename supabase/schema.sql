-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- SERVICES
-- =============================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- Party, Engagement, Bridal, Reception, Baby Shower, Mature Skin, Add-on
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  description TEXT,
  image_url TEXT,
  gallery_urls TEXT[],
  whats_included TEXT[],
  preparation_tips TEXT[],
  faq JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_category ON services(category, active);

-- =============================================
-- PORTFOLIO
-- =============================================
CREATE TABLE portfolio_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL, -- Bride, Reception, Engagement, Baby Shower, Party, HD Makeup, Airbrush
  image_url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portfolio_category ON portfolio_items(category);

-- =============================================
-- HOLIDAYS / BLOCKED DATES (admin availability)
-- =============================================
CREATE TABLE blocked_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- COUPONS
-- =============================================
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  discount_percent NUMERIC(5,2) NOT NULL,
  valid_from DATE,
  valid_until DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- BOOKINGS
-- =============================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_code TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_address TEXT,
  booking_date DATE NOT NULL CHECK (booking_date >= CURRENT_DATE),
  time_slot TEXT NOT NULL, -- e.g. "09:00 - 10:00"
  special_request TEXT,
  coupon_code TEXT REFERENCES coupons(code) ON DELETE SET NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  advance_amount NUMERIC(10,2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, failed
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, completed, cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_user ON bookings(user_id, created_at DESC);
CREATE INDEX idx_bookings_date ON bookings(booking_date, time_slot);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Prevents two active bookings (pending/confirmed) from claiming the same
-- date + time slot, closing the race condition the application-level check alone leaves open.
CREATE UNIQUE INDEX uq_bookings_active_slot ON bookings(booking_date, time_slot)
  WHERE status IN ('pending', 'confirmed');

-- =============================================
-- REVIEWS
-- =============================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  photo_urls TEXT[],
  admin_reply TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_service ON reviews(service_id, created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Public read access for catalog-style tables (writes go through the
-- service-role backend only, so no INSERT/UPDATE policies are needed here)
CREATE POLICY "Public can view active services" ON services FOR SELECT USING (active = true);
CREATE POLICY "Public can view portfolio" ON portfolio_items FOR SELECT USING (true);
CREATE POLICY "Public can view blocked dates" ON blocked_dates FOR SELECT USING (true);
CREATE POLICY "Public can view reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Public can view active coupons" ON coupons FOR SELECT USING (active = true);

-- Bookings — customers see only their own
CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reviews — customers can add their own
CREATE POLICY "Users can insert own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- STORAGE BUCKETS
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio-images', 'portfolio-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('review-photos', 'review-photos', true);

CREATE POLICY "Public can view portfolio images" ON storage.objects
  FOR SELECT USING (bucket_id = 'portfolio-images');

CREATE POLICY "Users can upload review photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'review-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public can view review photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'review-photos');

-- =============================================
-- SEED: SERVICE CATALOG
-- =============================================
INSERT INTO services (slug, name, category, price, duration_minutes, description, whats_included, preparation_tips, sort_order) VALUES
('party-makeup', 'Party Makeup', 'Party', 3000, 60, 'Fresh, glam makeup perfect for birthdays, get-togethers and casual celebrations.', ARRAY['Base & foundation', 'Eye makeup', 'Contour & blush', 'Lip color', 'Setting spray'], ARRAY['Cleanse and moisturize skin the night before', 'Avoid heavy sun exposure on the day', 'Bring a reference photo if you have one'], 1),
('hd-party-makeup', 'HD Party Makeup', 'Party', 4500, 75, 'Camera-ready HD makeup with a flawless, long-lasting finish for parties.', ARRAY['HD foundation', 'Eye makeup with lashes', 'Contour & highlight', 'Lip color', 'HD setting spray'], ARRAY['Exfoliate skin 1-2 days prior', 'Stay hydrated', 'Avoid retinol products 2 days before'], 2),
('engagement-makeup', 'Engagement Makeup', 'Engagement', 8000, 90, 'Elegant, radiant makeup to make your engagement look unforgettable.', ARRAY['Base & foundation', 'Eye makeup with lashes', 'Contour & highlight', 'Lip color', 'Touch-up kit'], ARRAY['Trial session recommended 1 week prior', 'Avoid facials 2 days before', 'Get adequate sleep the night before'], 3),
('hd-engagement-makeup', 'HD Engagement Makeup', 'Engagement', 9000, 90, 'HD finish engagement makeup for a flawless look in photos and videos.', ARRAY['HD foundation', 'Eye makeup with lashes', 'Contour & highlight', 'Lip color', 'Touch-up kit'], ARRAY['Trial session recommended 1 week prior', 'Avoid facials 2 days before', 'Get adequate sleep the night before'], 4),
('bridal-makeup', 'Bridal Makeup', 'Bridal', 12000, 120, 'Classic bridal makeup designed to last through your entire wedding day.', ARRAY['Base & foundation', 'Bridal eye makeup with lashes', 'Contour & highlight', 'Lip color', 'Saree/dupatta pinning', 'Touch-up kit'], ARRAY['Book a trial at least 2 weeks in advance', 'Avoid sun tanning close to the date', 'Share outfit & jewelry photos in advance'], 5),
('hd-bridal-makeup', 'HD Bridal Makeup', 'Bridal', 15000, 150, 'HD bridal makeup for a picture-perfect, long-lasting bridal look.', ARRAY['HD foundation', 'Bridal eye makeup with lashes', 'Contour & highlight', 'Lip color', 'Saree/dupatta pinning', 'Touch-up kit'], ARRAY['Book a trial at least 2 weeks in advance', 'Avoid sun tanning close to the date', 'Share outfit & jewelry photos in advance'], 6),
('airbrush-bridal-makeup', 'Airbrush Bridal Makeup', 'Bridal', 22000, 180, 'Premium airbrush bridal makeup for a weightless, ultra-HD, waterproof finish.', ARRAY['Airbrush foundation', 'Bridal eye makeup with lashes', 'Contour & highlight', 'Lip color', 'Saree/dupatta pinning', 'Touch-up kit', 'Priority scheduling'], ARRAY['Book at least 3 weeks in advance', 'Patch test recommended for airbrush products', 'Share outfit & jewelry photos in advance'], 7),
('reception-makeup', 'Reception Makeup', 'Reception', 8000, 90, 'Glamorous reception makeup that complements your bridal look.', ARRAY['Base & foundation', 'Glam eye makeup with lashes', 'Contour & highlight', 'Lip color', 'Touch-up kit'], ARRAY['Avoid facials 2 days before', 'Get adequate sleep the night before', 'Share outfit & jewelry photos in advance'], 8),
('baby-shower-makeup', 'Baby Shower Makeup', 'Baby Shower', 5000, 60, 'Soft, radiant makeup tailored for a comfortable baby shower celebration.', ARRAY['Base & foundation', 'Soft eye makeup', 'Contour & blush', 'Lip color'], ARRAY['Inform artist of any skin sensitivities', 'Wear a comfortable button-front outfit for easy makeup application'], 9),
('mature-skin-makeup', 'Mature Skin Makeup', 'Mature Skin', 5500, 75, 'Makeup techniques tailored to mature skin for a natural, radiant finish.', ARRAY['Hydrating base & foundation', 'Soft eye makeup', 'Contour & blush', 'Lip color'], ARRAY['Moisturize well the night before', 'Avoid heavy exfoliation right before the appointment'], 10),
('saree-draping', 'Saree Pre Pleating & Draping', 'Add-on', 500, 30, 'Professional saree pre-pleating and draping for a neat, elegant look.', ARRAY['Pre-pleating', 'Draping', 'Pinning & finishing touches'], ARRAY['Bring the saree and petticoat ready', 'Bring safety pins and the blouse you plan to wear'], 11),
('hair-styling', 'Hair Styling', 'Add-on', 1000, 45, 'Elegant hairstyling to complement your makeup look.', ARRAY['Wash & blow-dry (if needed)', 'Styling', 'Accessories placement'], ARRAY['Come with clean, dry hair unless wash is requested', 'Bring hair accessories if you have specific ones'], 12),
('false-lashes', 'False Lashes', 'Add-on', 500, 15, 'Natural or dramatic false lashes to complete your eye makeup.', ARRAY['Lash selection', 'Application', 'Adhesive touch-up'], ARRAY['Mention any eye sensitivities in advance'], 13);
