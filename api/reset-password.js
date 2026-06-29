// ============================================================
// VERCEL SERVERLESS FUNCTION — Reset Password
// Validates token, updates password in Supabase
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, newPassword } = req.body;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Reset token is required.' });
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    // Look up the token
    const { data: resets, error: lookupErr } = await supabase
      .from('vlcrm_password_resets')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .limit(1);

    if (lookupErr) {
      console.error('[reset-password] Token lookup error:', lookupErr);
      return res.status(500).json({ error: 'Database error. Please try again.' });
    }

    if (!resets || resets.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new password reset.' });
    }

    const resetRecord = resets[0];

    // Check expiry
    if (new Date(resetRecord.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This reset link has expired. Please request a new password reset.' });
    }

    // Update password in vlcrm_users
    const { error: updateErr } = await supabase
      .from('vlcrm_users')
      .update({ password: newPassword })
      .eq('id', resetRecord.user_id);

    if (updateErr) {
      console.error('[reset-password] Password update error:', updateErr);
      return res.status(500).json({ error: 'Failed to update password. Please try again.' });
    }

    // Mark token as used
    await supabase
      .from('vlcrm_password_resets')
      .update({ used: true })
      .eq('token', token);

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully! You can now sign in with your new password.',
    });
  } catch (err) {
    console.error('[reset-password] Unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
}
