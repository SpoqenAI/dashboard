-- Add atomic subscription upsert function to handle race conditions
-- between webhook and success callback

CREATE OR REPLACE FUNCTION public.upsert_subscription(
  p_subscription_data jsonb
) RETURNS jsonb AS $$
DECLARE
  result_record subscriptions%ROWTYPE;
  conflict_occurred boolean := false;
BEGIN
  -- Validate required fields
  IF p_subscription_data->>'id' IS NULL OR p_subscription_data->>'user_id' IS NULL THEN
    RAISE EXCEPTION 'Missing required fields: id and user_id are mandatory';
  END IF;

  -- Attempt to insert the subscription
  BEGIN
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
      created_at,
      updated_at
    ) VALUES (
      (p_subscription_data->>'id')::text,
      (p_subscription_data->>'user_id')::uuid,
      (p_subscription_data->>'status')::text,
      (p_subscription_data->>'price_id')::text,
      (p_subscription_data->>'quantity')::integer,
      COALESCE((p_subscription_data->>'cancel_at_period_end')::boolean, false),
      (p_subscription_data->>'current_period_start_at')::timestamptz,
      (p_subscription_data->>'current_period_end_at')::timestamptz,
      (p_subscription_data->>'ended_at')::timestamptz,
      (p_subscription_data->>'cancel_at')::timestamptz,
      (p_subscription_data->>'canceled_at')::timestamptz,
      (p_subscription_data->>'trial_start_at')::timestamptz,
      (p_subscription_data->>'trial_end_at')::timestamptz,
      COALESCE((p_subscription_data->>'created_at')::timestamptz, NOW()),
      COALESCE((p_subscription_data->>'updated_at')::timestamptz, NOW())
    ) RETURNING * INTO result_record;
    
  EXCEPTION WHEN unique_violation THEN
    -- Handle the case where a subscription already exists for this user
    conflict_occurred := true;
    
    -- Update the existing subscription with new data
    UPDATE public.subscriptions SET
      id = (p_subscription_data->>'id')::text,
      status = COALESCE((p_subscription_data->>'status')::text, status),
      price_id = COALESCE((p_subscription_data->>'price_id')::text, price_id),
      quantity = COALESCE((p_subscription_data->>'quantity')::integer, quantity),
      cancel_at_period_end = COALESCE((p_subscription_data->>'cancel_at_period_end')::boolean, cancel_at_period_end),
      current_period_start_at = COALESCE((p_subscription_data->>'current_period_start_at')::timestamptz, current_period_start_at),
      current_period_end_at = COALESCE((p_subscription_data->>'current_period_end_at')::timestamptz, current_period_end_at),
      ended_at = COALESCE((p_subscription_data->>'ended_at')::timestamptz, ended_at),
      cancel_at = COALESCE((p_subscription_data->>'cancel_at')::timestamptz, cancel_at),
      canceled_at = COALESCE((p_subscription_data->>'canceled_at')::timestamptz, canceled_at),
      trial_start_at = COALESCE((p_subscription_data->>'trial_start_at')::timestamptz, trial_start_at),
      trial_end_at = COALESCE((p_subscription_data->>'trial_end_at')::timestamptz, trial_end_at),
      updated_at = NOW()
    WHERE user_id = (p_subscription_data->>'user_id')::uuid
    RETURNING * INTO result_record;
  END;

  -- Return the result with operation metadata
  RETURN jsonb_build_object(
    'success', true,
    'operation', CASE WHEN conflict_occurred THEN 'updated' ELSE 'inserted' END,
    'subscription', row_to_json(result_record)
  );

EXCEPTION WHEN OTHERS THEN
  -- Return error information
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.upsert_subscription(jsonb) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.upsert_subscription(jsonb) IS 
'Atomically inserts or updates a subscription record to handle race conditions between webhook and success callback'; 