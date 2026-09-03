CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.artworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Untitled',
  medium text NOT NULL DEFAULT '',
  dimensions text NOT NULL DEFAULT '',
  year text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  image_path text NOT NULL DEFAULT '',
  alt_text text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.artworks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artworks TO authenticated;
GRANT ALL ON public.artworks TO service_role;
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published artworks" ON public.artworks FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "Admins can view all artworks" ON public.artworks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert artworks" ON public.artworks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update artworks" ON public.artworks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete artworks" ON public.artworks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER artworks_updated_at BEFORE UPDATE ON public.artworks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.site_content (
  key text PRIMARY KEY,
  label text NOT NULL DEFAULT '',
  value text NOT NULL DEFAULT '',
  multiline boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view site content" ON public.site_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert site content" ON public.site_content FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update site content" ON public.site_content FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER site_content_updated_at BEFORE UPDATE ON public.site_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Public can read artwork images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'artworks');
CREATE POLICY "Admins can upload artwork images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'artworks' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update artwork images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'artworks' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete artwork images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'artworks' AND public.has_role(auth.uid(), 'admin'));

INSERT INTO public.site_content (key, label, value, multiline, sort_order) VALUES
 ('hero_eyebrow', 'Hero eyebrow', 'Light studies · Mixed media · 2019 — Now', false, 1),
 ('hero_title', 'Hero headline', 'I paint the way sunlight lingers on a wall.', false, 2),
 ('hero_body', 'Hero paragraph', 'Warm, gestural work made in a small studio in Porto. Each piece begins with a single window and ends somewhere quieter than it started.', true, 3),
 ('gallery_title', 'Gallery heading', 'Selected works', false, 4),
 ('about_title', 'About heading', 'I work slowly, in small batches, in the hours when the light is most honest.', true, 5),
 ('about_body_1', 'About paragraph 1', 'Marjike has painted in her Porto studio since 2019, building a quiet body of work around light, gesture, and the warm colours of a room at the end of the day. Her pieces have shown in small group exhibitions across the northwest and live in private collections across Europe.', true, 6),
 ('about_body_2', 'About paragraph 2', 'She welcomes commissions for light studies and gesture figures — a short series, each one made by hand and finished in the studio.', true, 7),
 ('commission_title', 'Commission heading', 'Let''s make something for your space.', false, 8),
 ('commission_body', 'Commission paragraph', 'Commissions open for the coming season. Tell me about the room, the light, and the feeling you''re after — I''ll reply within a few days with a sketch and a plan.', true, 9),
 ('contact_email', 'Contact email', 'studio@marjike.art', false, 10),
 ('instagram_url', 'Instagram URL', 'https://www.instagram.com/marjike_art/', false, 11);