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

// GET /api/auth/session - Check if user has valid session
export default async function handler(req, res) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionData = cookies['wos-session'];

    if (!sessionData) {
      return res.json({ user: null, reason: 'no_session_cookie' });
    }

    if (!process.env.WORKOS_COOKIE_PASSWORD) {
      console.error('Missing WORKOS_COOKIE_PASSWORD');
      return res.status(500).json({ error: 'config_error', message: 'WORKOS_COOKIE_PASSWORD not configured' });
    }

    // Load and verify the sealed session
    const session = workos.userManagement.loadSealedSession({
      sessionData,
      cookiePassword: process.env.WORKOS_COOKIE_PASSWORD,
    });

    const { authenticated, user, reason } = await session.authenticate();

    if (authenticated && user) {
      return res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePictureUrl: user.profilePictureUrl,
        },
      });
    }

    // Session expired or invalid - try to refresh
    if (reason === 'session_expired') {
      try {
        const refreshResult = await session.refresh();
        
        if (refreshResult.authenticated && refreshResult.sealedSession) {
          // Update the cookie with new session
          res.setHeader('Set-Cookie', `wos-session=${refreshResult.sealedSession}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);
          
          return res.json({
            user: {
              id: refreshResult.user.id,
              email: refreshResult.user.email,
              firstName: refreshResult.user.firstName,
              lastName: refreshResult.user.lastName,
              profilePictureUrl: refreshResult.user.profilePictureUrl,
            },
          });
        }
      } catch (refreshError) {
        console.error('Session refresh failed:', refreshError.message);
      }
    }

    // Clear invalid cookie
    res.setHeader('Set-Cookie', 'wos-session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    return res.json({ user: null, reason: reason || 'session_invalid' });

  } catch (err) {
    console.error('Session check error:', err.message || err);
    // Clear potentially corrupted cookie
    res.setHeader('Set-Cookie', 'wos-session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    return res.json({ user: null, reason: 'session_error' });
  }
}
