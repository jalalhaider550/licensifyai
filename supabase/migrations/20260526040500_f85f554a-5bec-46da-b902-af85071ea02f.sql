CREATE OR REPLACE FUNCTION public.refund_contract()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.profiles
     SET contracts_used = GREATEST(contracts_used - 1, 0),
         updated_at = now()
   WHERE user_id = _uid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refund_contract() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refund_contract() TO authenticated;