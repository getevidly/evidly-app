-- SOCIAL-PROOF-01: testimonials table
-- Stores operator testimonials collected after first_inspection_passed milestone.
-- Public-facing display on ScoreTable pages (county-filtered, approved only).
-- Admin management at /admin/testimonials.

CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  quote text NOT NULL,
  author_name text,
  role_title text,
  org_name text,
  county text,
  city text,
  approved boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for ScoreTable county-filtered queries
CREATE INDEX idx_testimonials_county_approved
  ON public.testimonials (county, approved)
  WHERE approved = true;

-- RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Users can insert their own testimonials
CREATE POLICY testimonials_insert_own ON public.testimonials
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Anyone can read approved testimonials (public ScoreTable pages)
CREATE POLICY testimonials_select_approved ON public.testimonials
  FOR SELECT TO anon, authenticated
  USING (approved = true);

-- Platform admins can read all testimonials
CREATE POLICY testimonials_select_admin ON public.testimonials
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

-- Platform admins can update testimonials (approve/reject/feature)
CREATE POLICY testimonials_update_admin ON public.testimonials
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

-- Platform admins can delete testimonials
CREATE POLICY testimonials_delete_admin ON public.testimonials
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );
