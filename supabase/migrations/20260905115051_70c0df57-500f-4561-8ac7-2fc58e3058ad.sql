CREATE TABLE public.external_db_config (
  id boolean PRIMARY KEY DEFAULT true,
  url text NOT NULL DEFAULT '',
  publishable_key text NOT NULL DEFAULT '',
  service_key_ciphertext text NOT NULL DEFAULT '',
  service_key_last4 text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT external_db_config_singleton CHECK (id = true)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_db_config TO service_role;

ALTER TABLE public.external_db_config ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER external_db_config_updated_at
BEFORE UPDATE ON public.external_db_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();