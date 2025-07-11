'use server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * Server action to set welcome_completed=true for the current user.
 * Idempotent and robust to errors (missing user, missing user_settings row, etc.).
 * Returns { success: boolean, error?: string }
 */
export async function setWelcomeCompletedAction() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Try to update user_settings row
  try {
    // Check if user_settings row exists
    const { data: settings, error: fetchError } = await supabase
      .from('user_settings')
      .select('id, welcome_completed')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchError) {
      logger.error(
        'WELCOME_ACTION',
        'Error fetching user_settings',
        fetchError,
        { userId: logger.maskUserId(user.id) }
      );
      return { success: false, error: 'Failed to fetch user settings' };
    }

    if (!settings) {
      // Try to insert a new row if missing
      const { error: insertError } = await supabase
        .from('user_settings')
        .insert({ id: user.id, welcome_completed: true });
      if (insertError) {
        logger.error(
          'WELCOME_ACTION',
          'Error inserting user_settings',
          insertError,
          { userId: logger.maskUserId(user.id) }
        );
        return { success: false, error: 'Failed to create user settings' };
      }
      // Immediately select the row to verify creation
      const { data: verifySettings, error: verifyError } = await supabase
        .from('user_settings')
        .select('id, welcome_completed')
        .eq('id', user.id)
        .maybeSingle();
      if (verifyError || !verifySettings) {
        logger.error(
          'WELCOME_ACTION',
          'Failed to verify user_settings after insert',
          verifyError || new Error('No row returned'),
          { userId: logger.maskUserId(user.id) }
        );
        return {
          success: false,
          error: 'User settings creation verification failed',
        };
      }
      return { success: true };
    }

    if (settings.welcome_completed === true) {
      // Already completed, idempotent
      return { success: true };
    }

    // Update welcome_completed to true
    const { error: updateError } = await supabase
      .from('user_settings')
      .update({ welcome_completed: true })
      .eq('id', user.id);
    if (updateError) {
      logger.error(
        'WELCOME_ACTION',
        'Error updating welcome_completed',
        updateError,
        { userId: logger.maskUserId(user.id) }
      );
      return { success: false, error: 'Failed to update welcome status' };
    }
    return { success: true };
  } catch (err: any) {
    logger.error('WELCOME_ACTION', 'Unexpected error', err, {
      userId: logger.maskUserId(user.id),
    });
    return { success: false, error: 'Unexpected error' };
  }
}
