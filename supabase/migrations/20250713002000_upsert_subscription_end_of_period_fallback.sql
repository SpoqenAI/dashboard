-- Migration: Update upsert_subscription for end-of-period fallback to free
-- Purpose: Only fallback to free after paid period ends, not immediately on cancellation

CREATE OR REPLACE FUNCTION public.upsert_subscription(p_subscription_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_record subscriptions%ROWTYPE;
  v_user_id uuid := (p_subscription_data->>'user_id')::uuid;
  v_id text := p_subscription_data->>'id';
  v_status text := p_subscription_data->>'status';
  v_tier_type text := COALESCE(p_subscription_data->>'tier_type', 'free');
  v_now timestamptz := NOW();
  v_current_period_end_at timestamptz := (p_subscription_data->>'current_period_end_at')::timestamptz;
  v_is_paid boolean := v_tier_type = 'paid';
  v_is_end boolean := v_status IN ('ended', 'deleted') OR (v_current_period_end_at IS NOT NULL AND v_current_period_end_at < v_now);
  v_free_row_exists boolean;
BEGIN
  -- 1. Archive all current subscriptions for this user
  UPDATE public.subscriptions
    SET ended_at = v_now, current = false
    WHERE user_id = v_user_id AND current = true;

  -- 2. Insert the new subscription row as current
  INSERT INTO public.subscriptions (
    id,
    user_id,
    status,
    price_id,
    quantity,
    cancel_at_period_end,
    current_period_start_at,
    current_period_end_at,
    ended_at,
    cancel_at,
    canceled_at,
    trial_start_at,
    trial_end_at,
    paddle_customer_id,
    created_at,
    updated_at,
    tier_type,
    current
  ) VALUES (
    v_id,
    v_user_id,
    v_status,
    p_subscription_data->>'price_id',
    (p_subscription_data->>'quantity')::integer,
    COALESCE((p_subscription_data->>'cancel_at_period_end')::boolean, false),
    (p_subscription_data->>'current_period_start_at')::timestamptz,
    (p_subscription_data->>'current_period_end_at')::timestamptz,
    (p_subscription_data->>'ended_at')::timestamptz,
    (p_subscription_data->>'cancel_at')::timestamptz,
    (p_subscription_data->>'canceled_at')::timestamptz,
    (p_subscription_data->>'trial_start_at')::timestamptz,
    (p_subscription_data->>'trial_end_at')::timestamptz,
    p_subscription_data->>'paddle_customer_id',
    COALESCE((p_subscription_data->>'created_at')::timestamptz, v_now),
    COALESCE((p_subscription_data->>'updated_at')::timestamptz, v_now),
    v_tier_type,
    true
  ) RETURNING * INTO result_record;

  -- 3. Only fallback to free if the paid subscription is truly ended
  IF v_is_end THEN
    SELECT EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = v_user_id AND tier_type = 'free' AND current = true
    ) INTO v_free_row_exists;
    IF NOT v_free_row_exists THEN
      INSERT INTO public.subscriptions (
        id, user_id, status, tier_type, created_at, updated_at, current
      ) VALUES (
        gen_random_uuid()::text, v_user_id, 'active', 'free', v_now, v_now, true
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'operation', 'upserted',
    'subscription', row_to_json(result_record)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$; 