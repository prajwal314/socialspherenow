import jwt from 'jsonwebtoken';

export default function handler(req, res) {
  const cookieHeader = req.headers.cookie || '';
  const cookie = cookieHeader.split('; ').find((c) => c.startsWith('ssession='));
  
  if (!cookie) {
    return res.json({ user: null });
  }

  const token = cookie.split('=')[1];
  
  if (!process.env.SESSION_SECRET) {
    console.error('SESSION_SECRET environment variable is not set');
    return res.status(500).json({ error: 'server_configuration_error' });
  }

  try {
    const payload = jwt.verify(token, process.env.SESSION_SECRET);
    return res.json({ user: { id: payload.sub } });
  } catch (e) {
    console.error('JWT verification failed:', e.message);
    // Clear invalid cookie
    res.setHeader('Set-Cookie', 'ssession=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    return res.json({ user: null });
  }
}
