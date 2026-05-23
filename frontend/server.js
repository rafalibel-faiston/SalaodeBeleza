import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { fileURLToPath } from 'url';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND = 'https://salaodebeleza-production-351e.up.railway.app';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const proxy = createProxyMiddleware({
  target: BACKEND,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(502).json({ error: 'Backend indisponível' });
    },
  },
});

const apiRoutes = [
  '/appointments',
  '/services',
  '/clients',
  '/auth',
  '/blocked-slots',
  '/stats',
  '/webhooks',
  '/minha-conta',
];

apiRoutes.forEach(route => app.use(route, proxy));

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => console.log(`Frontend na porta ${PORT}, proxy -> ${BACKEND}`));
