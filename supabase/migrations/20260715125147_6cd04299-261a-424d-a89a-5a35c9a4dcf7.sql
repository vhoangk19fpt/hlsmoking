
-- Prevent privilege escalation: users must not be able to UPDATE wallet_balance directly.
-- Revoke table-level UPDATE and grant only on safe columns.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, email) ON public.profiles TO authenticated;

-- Defense-in-depth trigger: reject any change to wallet_balance not made by service_role / security definer function.
CREATE OR REPLACE FUNCTION public.protect_wallet_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
    IF current_setting('request.jwt.claims', true) IS NOT NULL
       AND (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'authenticated' THEN
      RAISE EXCEPTION 'wallet_balance can only be modified via topup_wallet()';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_wallet_balance_trg ON public.profiles;
CREATE TRIGGER protect_wallet_balance_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_wallet_balance();
