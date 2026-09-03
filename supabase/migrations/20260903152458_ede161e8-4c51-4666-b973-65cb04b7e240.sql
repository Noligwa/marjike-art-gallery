CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE claimed boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
  ON CONFLICT DO NOTHING;
  claimed := true;
  RETURN claimed;
END; $$;

REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;