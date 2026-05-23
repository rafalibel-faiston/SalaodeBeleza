import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND = 'https://salaodebeleza-production-351e.up.railway.app';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_PREFIXES = [
  '/appointments',
  '/services',
  '/clients',
  '/auth',
  '/blocked-slots',
  '/stats',
  '/webhooks',
  '/minha-conta',
];

function isApiRoute(url) {
  return API_PREFIXES.some(p => url.startsWith(p));
}

app.use(async (req, res, next) => {
  if (!isApiRoute(req.url)) return next();

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);

    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (!['host', 'content-encoding', 'transfer-encoding', 'connection'].includes(k)) {
        headers[k] = v;
      }
    }

    const fetchRes = await fetch(`${BACKEND}${req.url}`, {
      method: req.method,
      headers,
      body: body.length > 0 ? body : undefined,
    });

    const buf = await fetchRes.arrayBuffer();
    console.log(`[proxy] ${req.method} ${req.url} → ${fetchRes.status} (${buf.byteLength}b)`);
    if (fetchRes.status >= 400) console.log('[proxy] body:', Buffer.from(buf).toString());

    res.status(fetchRes.status);
    fetchRes.headers.forEach((v, k) => {
      if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(k)) res.setHeader(k, v);
    });
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error('Proxy error:', err.message);
    if (!res.headersSent) res.status(502).json({ error: 'Backend indisponível' });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => console.log(`Servidor na porta ${PORT}`));
