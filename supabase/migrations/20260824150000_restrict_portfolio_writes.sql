/*
# Restrict portfolio writes to signed-in users

## Why

The initial migration granted INSERT, UPDATE and DELETE on every portfolio
table to the `anon` role. The anon key ships inside the public JavaScript
bundle, so in practice that let ANY visitor rewrite or delete the entire
portfolio with a single HTTP request. This migration closes that.

The client brief asks for a login that can "add, delete, and rearrange the
order", for himself plus one or two team members. That maps to:

  - `anon`          -> read only (the public website)
  - `authenticated` -> full CRUD (the studio's own logins)

Team logins are created as normal Supabase Auth users; there is no separate
role table because every signed-in user here is studio staff.

## Changes

1. Drops the permissive anon write policies on all five portfolio tables.
2. Recreates INSERT / UPDATE / DELETE policies for `authenticated` only.
3. Leaves public SELECT in place so the site still renders for visitors.
4. Adds indexes on the columns the site actually orders and filters by.
*/

/* ---------- portfolio_profiles ---------- */
DROP POLICY IF EXISTS "public_insert_portfolio_profiles" ON portfolio_profiles;
DROP POLICY IF EXISTS "public_update_portfolio_profiles" ON portfolio_profiles;
DROP POLICY IF EXISTS "public_delete_portfolio_profiles" ON portfolio_profiles;

CREATE POLICY "staff_insert_portfolio_profiles" ON portfolio_profiles
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "staff_update_portfolio_profiles" ON portfolio_profiles
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_delete_portfolio_profiles" ON portfolio_profiles
  FOR DELETE TO authenticated USING (true);

/* Staff must be able to see a profile even while it is switched off. */
DROP POLICY IF EXISTS "public_read_portfolio_profiles" ON portfolio_profiles;
CREATE POLICY "public_read_portfolio_profiles" ON portfolio_profiles
  FOR SELECT TO anon USING (portfolio_enabled = true);
CREATE POLICY "staff_read_portfolio_profiles" ON portfolio_profiles
  FOR SELECT TO authenticated USING (true);

/* ---------- portfolio_categories ---------- */
DROP POLICY IF EXISTS "public_insert_portfolio_categories" ON portfolio_categories;
DROP POLICY IF EXISTS "public_update_portfolio_categories" ON portfolio_categories;
DROP POLICY IF EXISTS "public_delete_portfolio_categories" ON portfolio_categories;

CREATE POLICY "staff_insert_portfolio_categories" ON portfolio_categories
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "staff_update_portfolio_categories" ON portfolio_categories
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_delete_portfolio_categories" ON portfolio_categories
  FOR DELETE TO authenticated USING (true);

/* ---------- portfolio_items ---------- */
DROP POLICY IF EXISTS "public_insert_portfolio_items" ON portfolio_items;
DROP POLICY IF EXISTS "public_update_portfolio_items" ON portfolio_items;
DROP POLICY IF EXISTS "public_delete_portfolio_items" ON portfolio_items;

CREATE POLICY "staff_insert_portfolio_items" ON portfolio_items
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "staff_update_portfolio_items" ON portfolio_items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_delete_portfolio_items" ON portfolio_items
  FOR DELETE TO authenticated USING (true);

/* ---------- portfolio_item_images ---------- */
DROP POLICY IF EXISTS "public_insert_portfolio_item_images" ON portfolio_item_images;
DROP POLICY IF EXISTS "public_update_portfolio_item_images" ON portfolio_item_images;
DROP POLICY IF EXISTS "public_delete_portfolio_item_images" ON portfolio_item_images;

CREATE POLICY "staff_insert_portfolio_item_images" ON portfolio_item_images
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "staff_update_portfolio_item_images" ON portfolio_item_images
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_delete_portfolio_item_images" ON portfolio_item_images
  FOR DELETE TO authenticated USING (true);

/* ---------- portfolio_testimonials ---------- */
DROP POLICY IF EXISTS "public_insert_portfolio_testimonials" ON portfolio_testimonials;
DROP POLICY IF EXISTS "public_update_portfolio_testimonials" ON portfolio_testimonials;
DROP POLICY IF EXISTS "public_delete_portfolio_testimonials" ON portfolio_testimonials;

CREATE POLICY "staff_insert_portfolio_testimonials" ON portfolio_testimonials
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "staff_update_portfolio_testimonials" ON portfolio_testimonials
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_delete_portfolio_testimonials" ON portfolio_testimonials
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "public_read_portfolio_testimonials" ON portfolio_testimonials;
CREATE POLICY "public_read_portfolio_testimonials" ON portfolio_testimonials
  FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "staff_read_portfolio_testimonials" ON portfolio_testimonials
  FOR SELECT TO authenticated USING (true);

/* ---------- indexes for the ordering the brief asks for ---------- */
CREATE INDEX IF NOT EXISTS portfolio_categories_order_idx
  ON portfolio_categories (profile_id, display_order);
CREATE INDEX IF NOT EXISTS portfolio_items_order_idx
  ON portfolio_items (category_id, display_order);
CREATE INDEX IF NOT EXISTS portfolio_item_images_order_idx
  ON portfolio_item_images (item_id, display_order);
CREATE UNIQUE INDEX IF NOT EXISTS portfolio_categories_profile_slug_idx
  ON portfolio_categories (profile_id, slug);
