/**
 * Chambers-online — Servidor Express
 * 
 * Responsabilidades:
 * 1. Servir los 4 HTML y db-client.js como archivos estáticos
 * 2. Inyectar SUPABASE_URL y SUPABASE_ANON_KEY en window._ENV
 *    (las env vars nunca van en el HTML directamente ni en el repo)
 * 3. Health check para Railway
 */

const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️  SUPABASE_URL / SUPABASE_ANON_KEY not set — set them in Railway variables');
}

// ── Security headers ────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ── Health check ────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app:    'Chambers-online',
    supabase: !!SUPABASE_URL,
  });
});

// ── Inject env vars as window._ENV ──────────────────────────────
// This snippet is served BEFORE db-client.js is loaded.
// The anon key is public-safe (it's the same key Supabase exposes to browsers).
app.get('/_env.js', (req, res) => {
  res.type('application/javascript');
  res.send(
    `window._ENV = ${JSON.stringify({
      SUPABASE_URL:      SUPABASE_URL      || '',
      SUPABASE_ANON_KEY: SUPABASE_ANON_KEY || '',
    })};`
  );
});

// ── Static files ────────────────────────────────────────────────
app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
  index:      false,
}));

// ── Page routes ─────────────────────────────────────────────────
const send = (file) => (req, res) =>
  res.sendFile(path.join(__dirname, file));

app.get('/',          send('cliente.html'));
app.get('/cliente',   send('cliente.html'));
app.get('/admin',     send('admin.html'));
app.get('/proveedor', send('proveedor.html'));
app.get('/registro',  send('registro-proveedor.html'));

// ── 404 ─────────────────────────────────────────────────────────
app.use((req, res) => res.redirect('/'));

app.listen(PORT, () => {
  console.log(`Chambers-online on :${PORT}`);
  console.log(`  Supabase: ${SUPABASE_URL ? '✅ connected' : '❌ missing env vars'}`);
});
