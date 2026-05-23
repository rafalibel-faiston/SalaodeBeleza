import express from 'express';
import https from 'https';
import { fileURLToPath } from 'url';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_HOST = 'salaodebeleza-production-351e.up.railway.app';

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

app.use((req, res, next) => {
  if (!isApiRoute(req.url)) return next();

  const options = {
    hostname: BACKEND_HOST,
    port: 443,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: BACKEND_HOST },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    if (!res.headersSent) res.status(502).json({ error: 'Backend indisponível' });
  });

  req.pipe(proxyReq, { end: true });
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => console.log(`Servidor na porta ${PORT}`));
