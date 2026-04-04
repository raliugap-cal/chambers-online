# Chambers-online — Supabase + Railway

## Stack
- **Frontend:** 4 HTML apps estáticas
- **BD + API:** Supabase (PostgreSQL + REST automático)
- **Hosting:** Railway (solo sirve los HTML)
- **Futuro:** Migrar a React (db-client.js mantiene la misma interfaz)

---

## Deploy — paso a paso

### PASO 1 — Crear proyecto en Supabase

1. Entrar a [supabase.com](https://supabase.com) → **New project**
2. Elegir nombre, password, región (US East para Railway por latencia)
3. Esperar ~2 min a que termine de aprovisionar

### PASO 2 — Crear las tablas

1. En Supabase → **SQL Editor** → **New Query**
2. Pegar el contenido completo de `supabase-schema.sql`
3. Hacer clic en **Run** (▶)
4. Verificar que aparezcan las tablas en **Table Editor**

### PASO 3 — Obtener las credenciales

En Supabase → **Project Settings** → **API**:

| Variable | Dónde encontrarla |
|---|---|
| `SUPABASE_URL` | "Project URL" |
| `SUPABASE_ANON_KEY` | "anon public" key |

> La `anon key` es pública — está diseñada para usarse en el browser.

### PASO 4 — Deploy en Railway

```bash
git init
git add .
git commit -m "feat: chambers-online supabase"
git remote add origin https://github.com/TU_USER/chambers-online.git
git push -u origin main
```

En Railway:
1. **New Project → Deploy from GitHub** → seleccionar el repo
2. Railway detecta el Dockerfile y hace el build

### PASO 5 — Agregar variables de entorno en Railway

En tu servicio Railway → **Variables** → **Add Variable**:

```
SUPABASE_URL      = https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6...
NODE_ENV          = production
```

### PASO 6 — Verificar

```
https://TU-APP.railway.app/health
→ { "status": "ok", "app": "Chambers-online", "supabase": true }
```

---

## Cómo funciona

```
Browser                    Railway (Express)       Supabase
  │                              │                     │
  ├─ GET /                       │                     │
  │    ← cliente.html ───────────┤                     │
  ├─ GET /_env.js                │                     │
  │    ← window._ENV = {...} ────┤                     │
  ├─ GET /db-client.js           │                     │
  │    ← DB module ──────────────┤                     │
  │                              │                     │
  ├─ DB.providers.load() ────────┼── fetch Supabase REST ──►
  │                              │    ◄── JSON rows ───────
  ├─ DB.bookings.save(bk) ───────┼── POST /rest/v1/bookings ►
  │                              │    ◄── 201 Created ──────
```

Railway **nunca** toca la base de datos directamente.  
El browser llama a Supabase REST con la `anon key`.  
Railway solo sirve los archivos HTML/JS y protege las env vars.

---

## Archivos del proyecto

```
chambers-online/
├── cliente.html              # App cliente
├── admin.html                # Panel admin
├── proveedor.html            # App proveedor
├── registro-proveedor.html   # Registro
├── db-client.js              # Módulo DB → Supabase REST
├── server.js                 # Express: sirve archivos + /_env.js
├── supabase-schema.sql       # Ejecutar UNA VEZ en Supabase SQL Editor
├── package.json
├── Dockerfile
├── railway.toml
└── .gitignore
```

---

## Migración a React (cuando estés listo)

`db-client.js` expone exactamente la misma interfaz `DB.*`.  
Cuando migres a React, solo tienes que:

1. Instalar `@supabase/supabase-js` (cliente oficial)
2. Reemplazar `db-client.js` por el SDK de Supabase
3. Los componentes React usan exactamente los mismos métodos

```js
// Hoy (HTML vanilla)
const providers = DB.providers.getAll();

// Mañana (React)
const { data: providers } = await supabase.from('providers').select('*');
```
