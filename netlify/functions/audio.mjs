import { getStore } from '@netlify/blobs';

const auth = (req) => {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  return token === process.env.ADMIN_PASSWORD;
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  const store = getStore('nervio-audio');
  const url = new URL(req.url);
  const name = url.searchParams.get('name');

  // GET /api/audio?name=xxx — serve audio file (public)
  if (req.method === 'GET' && name) {
    try {
      const blob = await store.get(name, { type: 'arrayBuffer' });
      if (!blob) return new Response('Not found', { status: 404, headers: cors });
      return new Response(blob, {
        headers: {
          ...cors,
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=86400',
          'Accept-Ranges': 'bytes',
        },
      });
    } catch {
      return new Response('Not found', { status: 404, headers: cors });
    }
  }

  // GET /api/audio — list all audio files (admin)
  if (req.method === 'GET') {
    if (!auth(req)) return new Response('Unauthorized', { status: 401, headers: cors });
    try {
      const metaStore = getStore('nervio-audio-meta');
      const { blobs } = await store.list();
      const files = await Promise.all(
        blobs.map(async (b) => {
          let meta = {};
          try { meta = await metaStore.get(b.key, { type: 'json' }) || {}; } catch {}
          return { name: b.key, size: meta.size || '—', state: meta.state || '—', url: `/api/audio?name=${encodeURIComponent(b.key)}` };
        })
      );
      return new Response(JSON.stringify(files), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    } catch {
      return new Response(JSON.stringify([]), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
  }

  // POST /api/audio — upload audio file (admin)
  if (req.method === 'POST') {
    if (!auth(req)) return new Response('Unauthorized', { status: 401, headers: cors });
    try {
      const formData = await req.formData();
      const file = formData.get('file');
      if (!file) return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400, headers: cors });

      const filename = file.name;
      const buffer = await file.arrayBuffer();
      const sizeKB = Math.round(buffer.byteLength / 1024);
      const sizeMB = (sizeKB / 1024).toFixed(1) + ' MB';

      await store.set(filename, buffer);

      // Save metadata separately
      const metaStore = getStore('nervio-audio-meta');
      await metaStore.setJSON(filename, { size: sizeMB, uploadedAt: new Date().toISOString() });

      const audioUrl = `/api/audio?name=${encodeURIComponent(filename)}`;
      return new Response(JSON.stringify({ ok: true, name: filename, url: audioUrl, size: sizeMB }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors });
    }
  }

  // DELETE /api/audio?name=xxx — delete audio (admin)
  if (req.method === 'DELETE') {
    if (!auth(req)) return new Response('Unauthorized', { status: 401, headers: cors });
    if (!name) return new Response(JSON.stringify({ error: 'name required' }), { status: 400, headers: cors });
    try {
      await store.delete(name);
      const metaStore = getStore('nervio-audio-meta');
      await metaStore.delete(name).catch(() => {});
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors });
    }
  }

  return new Response('Method not allowed', { status: 405, headers: cors });
};

export const config = { path: ['/api/audio', '/api/audio/*'] };
