import { WorkOS } from '@workos-inc/node';

// Initialize WorkOS
const workos = new WorkOS(process.env.WORKOS_API_KEY, {
  clientId: process.env.WORKOS_CLIENT_ID,
});

// GET /api/auth/callback - OAuth callback handler
// WorkOS redirects here after user authenticates
export default async function handler(req, res) {
  try {
    const { code } = req.query;

    if (!code) {
      console.error('No authorization code provided');
      return res.redirect('/login?error=missing_code');
    }

    // Check required env vars
    if (!process.env.WORKOS_API_KEY || !process.env.WORKOS_CLIENT_ID || !process.env.WORKOS_COOKIE_PASSWORD) {
      console.error('Missing required environment variables');
      return res.redirect('/login?error=config_error');
    }

    // Exchange code for user + sealed session
    const { user, sealedSession } = await workos.userManagement.authenticateWithCode({
      clientId: process.env.WORKOS_CLIENT_ID,
      code,
      session: {
        sealSession: true,
        cookiePassword: process.env.WORKOS_COOKIE_PASSWORD,
      },
    });

    // Set the sealed session cookie
    res.setHeader('Set-Cookie', `wos-session=${sealedSession}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);

    // Redirect to frontend callback page which will:
    // 1. Save user to Convex
    // 2. Check onboarding status
    // 3. Redirect to appropriate page
    return res.redirect('/callback');

  } catch (err) {
    console.error('Callback error:', err.message || err);
    return res.redirect(`/login?error=auth_failed`);
  }
}
