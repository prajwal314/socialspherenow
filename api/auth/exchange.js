import { WorkOS } from '@workos-inc/node';
import jwt from 'jsonwebtoken';

// Serverless exchange endpoint for WorkOS OAuth code
// Expects: GET /api/auth/exchange?code=...&state=...

const workos = new WorkOS(process.env.WORKOS_API_KEY || process.env.WORKOS_SECRET);

export default async function handler(req, res) {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).json({ error: 'missing code' });

    // Exchange code for tokens using the WorkOS SDK
    const tokenResponse = await workos.oauth.tokenGrant({ code });

    // tokenResponse contains access_token, refresh_token, and possibly
    // user info depending on your provider. We'll create a session JWT
    // based on the access token and user id (if available).
    const sessionPayload = {
      sub: tokenResponse.user?.id || tokenResponse.principal_id || 'unknown',
      access_token: tokenResponse.access_token,
    };

    const sessionJwt = jwt.sign(sessionPayload, process.env.SESSION_SECRET, {
      expiresIn: '7d',
    });

    res.setHeader('Set-Cookie', `ssession=${sessionJwt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7*24*60*60}`);

    // Redirect back to the app; preserve state.returnTo if present
    let redirectTo = '/';
    if (state) {
      try {
        const parsed = JSON.parse(state);
        if (parsed.returnTo) redirectTo = parsed.returnTo;
      } catch {}
    }

    res.writeHead(302, { Location: redirectTo });
    res.end();
  } catch (err) {
    console.error('Exchange error', err);
    res.status(500).json({ error: 'exchange_failed' });
  }
}
