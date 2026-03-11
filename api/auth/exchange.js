import jwt from 'jsonwebtoken';

// Serverless exchange endpoint for WorkOS OAuth code (raw HTTP implementation)
// Expects: GET /api/auth/exchange?code=...&state=...

export default async function handler(req, res) {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).json({ error: 'missing code' });

    const tokenEndpoint = process.env.WORKOS_TOKEN_ENDPOINT || 'https://api.workos.com/oauth/token';

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    // Server-side env vars don't have VITE_ prefix - check both for flexibility
    const clientId = process.env.WORKOS_CLIENT_ID || process.env.VITE_WORKOS_CLIENT_ID;
    if (clientId) params.append('client_id', clientId);
    // Use WORKOS_CLIENT_SECRET (preferred) or fallback to WORKOS_API_KEY
    const clientSecret = process.env.WORKOS_CLIENT_SECRET || process.env.WORKOS_API_KEY;
    if (clientSecret) params.append('client_secret', clientSecret);
    // Server-side env vars - check both with and without VITE_ prefix
    const redirectUri = process.env.WORKOS_REDIRECT_URI || process.env.VITE_WORKOS_REDIRECT_URI;
    if (redirectUri) params.append('redirect_uri', redirectUri);

    const tokenResp = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!tokenResp.ok) {
      const txt = await tokenResp.text();
      console.error('token exchange failed', txt);
      return res.status(502).json({ error: 'token_exchange_failed', details: txt });
    }

    const tokenData = await tokenResp.json();

    const userId = tokenData.user?.id || tokenData.principal_id || tokenData.sub || null;

    if (!process.env.SESSION_SECRET) {
      console.error('missing SESSION_SECRET');
      return res.status(500).json({ error: 'missing_session_secret' });
    }

    const sessionPayload = {
      sub: userId || 'unknown',
      access_token: tokenData.access_token,
    };

    const sessionJwt = jwt.sign(sessionPayload, process.env.SESSION_SECRET, { expiresIn: '7d' });

    // Set cookie and return JSON so the client fetch can observe success
    res.setHeader('Set-Cookie', `ssession=${sessionJwt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);

    return res.json({ ok: true, user: { id: userId } });
  } catch (err) {
    console.error('Exchange error', err);
    res.status(500).json({ error: 'exchange_failed' });
  }
}
