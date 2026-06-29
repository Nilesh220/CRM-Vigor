// ============================================================
// VERCEL SERVERLESS FUNCTION — Forgot Password
// Generates reset token, stores in Supabase, sends email via Resend
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    // Look up user in Supabase
    const { data: users, error: lookupErr } = await supabase
      .from('vlcrm_users')
      .select('id, name, email')
      .ilike('email', email.trim())
      .limit(1);

    if (lookupErr) {
      console.error('[forgot-password] Supabase lookup error:', lookupErr);
      return res.status(500).json({ error: 'Database error. Please try again.' });
    }

    // Always return success to prevent email enumeration attacks
    if (!users || users.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    const user = users[0];
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour expiry

    // Store reset token in Supabase
    const { error: tokenErr } = await supabase
      .from('vlcrm_password_resets')
      .upsert({
        user_id: user.id,
        email: user.email,
        token,
        expires_at: expiresAt,
        used: false,
      }, { onConflict: 'user_id' });

    if (tokenErr) {
      console.error('[forgot-password] Token store error:', tokenErr);
      // If table doesn't exist, give a helpful message
      if (tokenErr.message?.includes('relation') || tokenErr.code === '42P01') {
        return res.status(500).json({
          error: 'Password reset table not set up. Please create the vlcrm_password_resets table in Supabase.',
        });
      }
      return res.status(500).json({ error: 'Failed to generate reset token.' });
    }

    // Send email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.warn('[forgot-password] RESEND_API_KEY not configured — skipping email');
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
        // In dev mode, return token for testing
        ...(process.env.NODE_ENV !== 'production' ? { devToken: token } : {}),
      });
    }

    // Build the reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    const emailResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'VigorLaunchpad CRM <noreply@vigorlaunchpad.com>',
        to: [user.email],
        subject: 'Reset Your VigorLaunchpad CRM Password',
        html: `
          <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 0;">
            <div style="background: linear-gradient(135deg, #1e40af, #7c3aed); padding: 28px 32px; border-radius: 12px 12px 0 0;">
              <h1 style="color: #fff; font-size: 20px; margin: 0; font-weight: 700;">🚀 VigorLaunchpad CRM</h1>
            </div>
            <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="font-size: 18px; color: #111827; margin: 0 0 12px;">Password Reset Request</h2>
              <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                Hi <strong>${user.name}</strong>,<br/><br/>
                We received a request to reset your password. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
              </p>
              <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #7c3aed); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                Reset Password →
              </a>
              <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0; line-height: 1.5;">
                If you didn't request this, you can safely ignore this email. Your password will remain unchanged.<br/><br/>
                <span style="color: #d1d5db;">Reset link: ${resetUrl}</span>
              </p>
            </div>
            <p style="text-align: center; color: #9ca3af; font-size: 11px; margin-top: 16px;">
              © ${new Date().getFullYear()} VigorLaunchpad — Internal Operations Portal
            </p>
          </div>
        `,
      }),
    });

    if (!emailResp.ok) {
      const emailErr = await emailResp.json().catch(() => ({}));
      console.error('[forgot-password] Resend error:', emailErr);
      // Don't leak the error to the user
    }

    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (err) {
    console.error('[forgot-password] Unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
}
