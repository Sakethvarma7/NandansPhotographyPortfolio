/*
# Create reusable client portfolio system

1. New Tables
- `portfolio_profiles` stores the public brand, hero, introduction, contact, and social settings for each client.
- `portfolio_categories` stores configurable portfolio categories and their display order.
- `portfolio_items` stores projects, cover images, metadata, and optional video links.
- `portfolio_item_images` stores ordered gallery images for each project.
- `portfolio_testimonials` stores editorial client quotes and optional attribution imagery.

2. Security
- Every table has row level security enabled.
- This first portfolio is a public single-tenant experience without sign-in, so anon and authenticated roles can manage the shared configuration.
- CRUD policies are separated by operation for each table.

3. Important Notes
- The schema is intentionally reusable across client types such as photographers, planners, decorators, and venues.
- Image fields store URLs so the system can use existing hosted storage or an external CDN without downloading social media assets.
*/

CREATE TABLE IF NOT EXISTS portfolio_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  logo_url text,
  hero_image_url text,
  tagline text,
  intro_eyebrow text,
  intro_heading text,
  intro_description text,
  profile_image_url text,
  instagram_url text,
  facebook_url text,
  youtube_url text,
  whatsapp_url text,
  website_url text,
  phone text,
  email text,
  city text,
  portfolio_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolio_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES portfolio_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  cover_image_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES portfolio_profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES portfolio_categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  subtitle text,
  description text,
  cover_image_url text NOT NULL,
  location text,
  event_date date,
  is_featured boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  video_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolio_item_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES portfolio_items(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  alt_text text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolio_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES portfolio_profiles(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  quote text NOT NULL,
  image_url text,
  category text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE portfolio_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_item_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_portfolio_profiles" ON portfolio_profiles;
CREATE POLICY "public_read_portfolio_profiles" ON portfolio_profiles FOR SELECT TO anon, authenticated USING (portfolio_enabled = true);
DROP POLICY IF EXISTS "public_insert_portfolio_profiles" ON portfolio_profiles;
CREATE POLICY "public_insert_portfolio_profiles" ON portfolio_profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_portfolio_profiles" ON portfolio_profiles;
CREATE POLICY "public_update_portfolio_profiles" ON portfolio_profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_portfolio_profiles" ON portfolio_profiles;
CREATE POLICY "public_delete_portfolio_profiles" ON portfolio_profiles FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_read_portfolio_categories" ON portfolio_categories;
CREATE POLICY "public_read_portfolio_categories" ON portfolio_categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_portfolio_categories" ON portfolio_categories;
CREATE POLICY "public_insert_portfolio_categories" ON portfolio_categories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_portfolio_categories" ON portfolio_categories;
CREATE POLICY "public_update_portfolio_categories" ON portfolio_categories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_portfolio_categories" ON portfolio_categories;
CREATE POLICY "public_delete_portfolio_categories" ON portfolio_categories FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_read_portfolio_items" ON portfolio_items;
CREATE POLICY "public_read_portfolio_items" ON portfolio_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_portfolio_items" ON portfolio_items;
CREATE POLICY "public_insert_portfolio_items" ON portfolio_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_portfolio_items" ON portfolio_items;
CREATE POLICY "public_update_portfolio_items" ON portfolio_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_portfolio_items" ON portfolio_items;
CREATE POLICY "public_delete_portfolio_items" ON portfolio_items FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_read_portfolio_item_images" ON portfolio_item_images;
CREATE POLICY "public_read_portfolio_item_images" ON portfolio_item_images FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_portfolio_item_images" ON portfolio_item_images;
CREATE POLICY "public_insert_portfolio_item_images" ON portfolio_item_images FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_portfolio_item_images" ON portfolio_item_images;
CREATE POLICY "public_update_portfolio_item_images" ON portfolio_item_images FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_portfolio_item_images" ON portfolio_item_images;
CREATE POLICY "public_delete_portfolio_item_images" ON portfolio_item_images FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_read_portfolio_testimonials" ON portfolio_testimonials;
CREATE POLICY "public_read_portfolio_testimonials" ON portfolio_testimonials FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "public_insert_portfolio_testimonials" ON portfolio_testimonials;
CREATE POLICY "public_insert_portfolio_testimonials" ON portfolio_testimonials FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_portfolio_testimonials" ON portfolio_testimonials;
CREATE POLICY "public_update_portfolio_testimonials" ON portfolio_testimonials FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_portfolio_testimonials" ON portfolio_testimonials;
CREATE POLICY "public_delete_portfolio_testimonials" ON portfolio_testimonials FOR DELETE TO anon, authenticated USING (true);