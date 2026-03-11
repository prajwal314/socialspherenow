import { WorkOS } from '@workos-inc/node';

// Initialize WorkOS
const workos = new WorkOS(process.env.WORKOS_API_KEY, {
  clientId: process.env.WORKOS_CLIENT_ID,
});

// Helper to parse cookies from request header
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    cookies[name] = rest.join('=');
  });
  
  return cookies;
}

// GET /api/auth/logout - End user session and redirect to WorkOS logout
export default async function handler(req, res) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionData = cookies['wos-session'];

    // Clear the session cookie regardless
    res.setHeader('Set-Cookie', 'wos-session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');

    if (!sessionData || !process.env.WORKOS_COOKIE_PASSWORD) {
      // No session to end, just redirect to home
      return res.json({ ok: true, redirectTo: '/' });
    }

    try {
      // Load the session to get logout URL
      const session = workos.userManagement.loadSealedSession({
        sessionData,
        cookiePassword: process.env.WORKOS_COOKIE_PASSWORD,
      });

      const logoutUrl = await session.getLogoutUrl();
      
      return res.json({ ok: true, redirectTo: logoutUrl });
    } catch (e) {
      // Session invalid, just redirect to home
      console.error('Logout error:', e.message);
      return res.json({ ok: true, redirectTo: '/' });
    }
  } catch (err) {
    console.error('Logout error:', err.message || err);
    return res.json({ ok: true, redirectTo: '/' });
  }
}
