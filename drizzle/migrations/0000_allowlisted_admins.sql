CREATE OR REPLACE FUNCTION public.claim_first_admin()
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF lower(coalesce(auth.jwt()->>'email','')) NOT IN ('lbadenhorst@gmail.com','marikeholscher@gmail.com') THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin') ON CONFLICT DO NOTHING;
  RETURN true;
END; $function$;