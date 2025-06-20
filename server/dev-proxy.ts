import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Simple proxy server to bypass Vite host restrictions
const app = express();

// Proxy API requests to the main server
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  secure: false,
}));

// Serve static files and proxy everything else to Vite dev server
app.use('/', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  secure: false,
  ws: true, // Enable WebSocket proxying for HMR
}));

const PORT = 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dev proxy server running on 0.0.0.0:${PORT}`);
});