import jwt from 'jsonwebtoken';

export default function handler(req, res) {
  const cookieHeader = req.headers.cookie || '';
  const cookie = cookieHeader.split('; ').find((c) => c.startsWith('ssession='));
  if (!cookie) return res.json({ user: null });

  const token = cookie.split('=')[1];
  try {
    const payload = jwt.verify(token, process.env.SESSION_SECRET);
    return res.json({ user: { id: payload.sub } });
  } catch (e) {
    return res.json({ user: null });
  }
}
