import { getStore } from '@netlify/blobs';

const auth = (req) => {
  const token = req.headers.get('authorization')?.replace('Bearer ','');
  return token === process.env.ADMIN_PASSWORD;
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  const store = getStore('nervio-sessions');

  // POST — save a session (public, called from chat)
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const key = body.id || Date.now().toString(36);
      await store.setJSON(key, { ...body, savedAt: new Date().toISOString() });
      return new Response(JSON.stringify({ ok: true, id: key }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors });
    }
  }

  // GET — list sessions (admin only)
  if (req.method === 'GET') {
    if (!auth(req)) return new Response('Unauthorized', { status: 401, headers: cors });
    try {
      const { blobs } = await store.list();
      const sessions = await Promise.all(
        blobs.map(async (b) => {
          try { return await store.get(b.key, { type: 'json' }); }
          catch { return null; }
        })
      );
      const sorted = sessions
        .filter(Boolean)
        .sort((a, b) => new Date(b.ts || b.savedAt) - new Date(a.ts || a.savedAt));
      return new Response(JSON.stringify(sorted), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify([]), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
  }

  return new Response('Method not allowed', { status: 405, headers: cors });
};

export const config = { path: '/api/sessions' };
