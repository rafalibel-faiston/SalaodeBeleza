import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { fileURLToPath } from 'url';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND = 'https://salaodebeleza-production-351e.up.railway.app';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

app.use(
  apiRoutes,
  createProxyMiddleware({
    target: BACKEND,
    changeOrigin: true,
  })
);

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => console.log(`Servidor frontend na porta ${PORT}`));
