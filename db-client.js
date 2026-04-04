/**
 * Chambers-online — Supabase DB Client
 * 
 * Reemplaza el módulo localStorage.
 * Misma interfaz DB.* para que los 4 HTML funcionen sin cambios.
 * 
 * Requiere: SUPABASE_URL y SUPABASE_ANON_KEY en window._ENV
 * (inyectados por el servidor Express desde variables de entorno)
 */

// ── Supabase REST helper (sin SDK — fetch puro) ──────────────────
const _SB = (() => {
  const url = window._ENV?.SUPABASE_URL;
  const key = window._ENV?.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('[DB] Supabase env vars missing. Check SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  const headers = () => ({
    'Content-Type':  'application/json',
    'apikey':        key,
    'Authorization': 'Bearer ' + key,
    'Prefer':        'return=representation',
  });

  // SELECT with PostgREST query params
  async function select(table, params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.set(k, v);
    });
    // Always request JSON count
    const res = await fetch(`${url}/rest/v1/${table}?${qs}`, {
      headers: { ...headers(), 'Prefer': 'count=exact' },
    });
    if (!res.ok) throw new Error(`[${table}] ${await res.text()}`);
    return res.json();
  }

  // INSERT — returns the inserted row(s)
  async function insert(table, data) {
    const res = await fetch(`${url}/rest/v1/${table}`, {
      method:  'POST',
      headers: headers(),
      body:    JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`[${table}] ${await res.text()}`);
    const json = await res.json();
    return Array.isArray(json) ? json[0] : json;
  }

  // UPSERT
  async function upsert(table, data, onConflict = 'id') {
    const res = await fetch(`${url}/rest/v1/${table}`, {
      method:  'POST',
      headers: { ...headers(), 'Prefer': `resolution=merge-duplicates,return=representation` },
      body:    JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`[${table}] ${await res.text()}`);
    const json = await res.json();
    return Array.isArray(json) ? json[0] : json;
  }

  // UPDATE with eq filter: { col: val }
  async function update(table, filter, data) {
    const qs = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => qs.set(k, `eq.${v}`));
    const res = await fetch(`${url}/rest/v1/${table}?${qs}`, {
      method:  'PATCH',
      headers: headers(),
      body:    JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`[${table}] ${await res.text()}`);
    return true;
  }

  // DELETE with eq filter
  async function remove(table, filter) {
    const qs = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => qs.set(k, `eq.${v}`));
    const res = await fetch(`${url}/rest/v1/${table}?${qs}`, {
      method:  'DELETE',
      headers: headers(),
    });
    if (!res.ok) throw new Error(`[${table}] ${await res.text()}`);
    return true;
  }

  // RPC (stored procedures)
  async function rpc(fn, args = {}) {
    const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method:  'POST',
      headers: headers(),
      body:    JSON.stringify(args),
    });
    if (!res.ok) throw new Error(`[rpc:${fn}] ${await res.text()}`);
    return res.json();
  }

  return { select, insert, upsert, update, remove, rpc };
})();

// ── Hash helper (same as before — simple demo hash) ─────────────
function _hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return 'h_' + Math.abs(h).toString(36);
}

// ── notify (same CustomEvent pattern) ───────────────────────────
function _notify(key) {
  window.dispatchEvent(new CustomEvent('db:change', { detail: { key } }));
}

// ── Row mappers Supabase snake_case → JS camelCase ───────────────
function _mapProvider(r) {
  if (!r) return null;
  return {
    id: r.id, name: r.name, businessName: r.business_name,
    type: r.type, country: r.country, currency: r.currency,
    services: r.services || [],
    rating: parseFloat(r.rating || 0), reviewCount: parseInt(r.review_count || 0),
    dist: parseFloat(r.dist || 0), price: parseInt(r.price || 0),
    exp: parseInt(r.exp || 0), score: parseInt(r.score || 0),
    verified: r.verified, status: r.status, riskScore: parseInt(r.risk_score || 0),
    bookings: parseInt(r.bookings_count || 0),
    icon: r.icon, email: r.email, phone: r.phone, city: r.city, bio: r.bio,
    docs: r.docs || {}, schedule: r.schedule || {}, createdAt: r.created_at,
  };
}

function _mapBooking(r) {
  if (!r) return null;
  return {
    id: r.id, userId: r.user_id, clientName: r.client_name,
    providerId: r.provider_id, providerName: r.provider_name,
    service: r.service, category: r.category, date: r.date, time: r.time,
    price: parseFloat(r.price || 0), platformFee: parseFloat(r.platform_fee || 0),
    tip: parseFloat(r.tip || 0), total: parseFloat(r.total || 0),
    status: r.status, paymentStatus: r.payment_status,
    dist: r.dist, notes: r.notes, rated: r.rated, ratingValue: r.rating_value,
    createdAt: r.created_at,
  };
}

function _mapAd(r) {
  if (!r) return null;
  return {
    id: r.id, providerId: r.provider_id, name: r.name, tagline: r.tagline,
    promoText: r.promo_text, promoBadge: r.promo_badge,
    promoBadgeColor: r.promo_badge_color, imageUrl: r.image_url,
    logoUrl: r.logo_url, ctaLabel: r.cta_label, url: r.url,
    icon: r.icon, category: r.category, plan: r.plan, placement: r.placement,
    budget: parseFloat(r.budget || 0), status: r.status,
    impressions: parseInt(r.impressions || 0), clicks: parseInt(r.clicks || 0),
    startDate: r.start_date, endDate: r.end_date, createdAt: r.created_at,
  };
}

// ════════════════════════════════════════════════════════════════
// DB — Public interface (same as before)
// ════════════════════════════════════════════════════════════════
const DB = (() => {

  // ── In-memory cache ────────────────────────────────────────────
  let _providers  = null;
  let _bookings   = null;
  let _ads        = null;
  let _categories = null;
  let _reviews    = [];

  // ── PROVIDERS ──────────────────────────────────────────────────
  const providers = {
    getAll() { return _providers || []; },
    getById(id) { return (_providers || []).find(p => p.id === id) || null; },
    getByStatus(status) {
      const all = this.getAll();
      return status === 'all' ? all : all.filter(p => p.status === status);
    },

    async load(status) {
      const params = { select: '*', order: 'score.desc,created_at.desc' };
      if (status && status !== 'all') params.status = 'eq.' + status;
      const rows = await _SB.select('providers', params);
      _providers = rows.map(_mapProvider);
      _notify('chambers-online_providers');
      return _providers;
    },

    async save(data) {
      const row = {
        id:            data.id || ('pv_' + Date.now().toString(36)),
        name:          data.name,
        business_name: data.businessName || null,
        type:          data.type || 'individual',
        country:       data.country || 'mx',
        currency:      data.currency || 'MXN',
        services:      data.services || [],
        rating:        data.rating || 0,
        review_count:  data.reviewCount || 0,
        dist:          data.dist || 1.0,
        price:         data.price || 300,
        exp:           data.exp || 1,
        score:         data.score || 50,
        verified:      data.verified || false,
        status:        data.status || 'review',
        risk_score:    data.riskScore || 50,
        icon:          data.icon || '👤',
        email:         data.email || null,
        phone:         data.phone || null,
        city:          data.city || null,
        bio:           data.bio || null,
        docs:          data.docs || {},
        schedule:      data.schedule || {},
      };
      await _SB.upsert('providers', row);
      await this.load();
      return data;
    },

    async updateStatus(id, status) {
      await _SB.update('providers', { id }, { status, updated_at: new Date().toISOString() });
      if (_providers) {
        const p = _providers.find(x => x.id === id);
        if (p) p.status = status;
      }
      _notify('chambers-online_providers');
      return true;
    },

    counts() {
      const all = this.getAll();
      return {
        total:     all.length,
        active:    all.filter(p => p.status === 'active').length,
        review:    all.filter(p => p.status === 'review').length,
        suspended: all.filter(p => p.status === 'suspended').length,
        rejected:  all.filter(p => p.status === 'rejected').length,
      };
    },
  };

  // ── BOOKINGS ───────────────────────────────────────────────────
  const bookings = {
    getAll()           { return _bookings || []; },
    getById(id)        { return (_bookings || []).find(b => b.id === id) || null; },
    getByProvider(pid) { return this.getAll().filter(b => b.providerId === pid); },
    getByClient(uid)   { return this.getAll().filter(b => b.userId === uid); },

    async load(filters) {
      const params = { select: '*', order: 'created_at.desc' };
      if (filters?.userId)     params.user_id     = 'eq.' + filters.userId;
      if (filters?.providerId) params.provider_id = 'eq.' + filters.providerId;
      if (filters?.status)     params.status      = 'eq.' + filters.status;
      const rows = await _SB.select('bookings', params);
      _bookings = rows.map(_mapBooking);
      _notify('chambers-online_bookings');
      return _bookings;
    },

    async save(bk) {
      const row = {
        id:             bk.id || ('BK-' + Date.now().toString().slice(-6)),
        user_id:        bk.userId,
        client_name:    bk.clientName || 'Cliente',
        provider_id:    bk.providerId,
        provider_name:  bk.providerName || '',
        service:        bk.service || '',
        category:       bk.category || '',
        date:           bk.date || '',
        time:           bk.time || '',
        price:          bk.price || 0,
        platform_fee:   bk.platformFee || 0,
        tip:            bk.tip || 0,
        total:          bk.total || 0,
        status:         bk.status || 'pending',
        payment_status: bk.paymentStatus || 'escrow',
        dist:           bk.dist || '',
        notes:          bk.notes || '',
        rated:          bk.rated || false,
        rating_value:   bk.ratingValue || null,
      };
      await _SB.upsert('bookings', row);
      // Update local cache
      if (!_bookings) _bookings = [];
      const idx = _bookings.findIndex(x => x.id === row.id);
      const mapped = _mapBooking(row);
      if (idx >= 0) _bookings[idx] = { ..._bookings[idx], ...mapped };
      else _bookings.unshift(mapped);
      _notify('chambers-online_bookings');
      return bk;
    },

    counts() {
      const all = this.getAll();
      return {
        total:     all.length,
        completed: all.filter(b => b.status === 'completed').length,
        upcoming:  all.filter(b => b.status === 'upcoming').length,
        cancelled: all.filter(b => b.status === 'cancelled').length,
      };
    },
  };

  // ── REVIEWS ────────────────────────────────────────────────────
  const reviews = {
    getAll()           { return _reviews; },
    getByProvider(pid) { return _reviews.filter(r => r.providerId === pid); },

    async load(providerId) {
      const params = { select: '*', order: 'created_at.desc' };
      if (providerId) params.provider_id = 'eq.' + providerId;
      const rows = await _SB.select('reviews', params);
      _reviews = rows.map(r => ({
        id: r.id, bookingId: r.booking_id, providerId: r.provider_id,
        userId: r.user_id, rating: r.rating, comment: r.comment,
        createdAt: r.created_at,
      }));
      return _reviews;
    },

    async save(rv) {
      const row = {
        booking_id:  rv.bookingId || null,
        provider_id: rv.providerId,
        user_id:     rv.userId,
        rating:      rv.rating,
        comment:     rv.comment || '',
      };
      await _SB.insert('reviews', row);
      // Recalc provider rating via Supabase aggregate
      const rows = await _SB.select('reviews', {
        select:      'rating',
        provider_id: 'eq.' + rv.providerId,
      });
      if (rows.length) {
        const avg = rows.reduce((s, r) => s + r.rating, 0) / rows.length;
        await _SB.update('providers', { id: rv.providerId }, {
          rating:       parseFloat(avg.toFixed(1)),
          review_count: rows.length,
        });
        if (_providers) {
          const p = _providers.find(x => x.id === rv.providerId);
          if (p) { p.rating = parseFloat(avg.toFixed(1)); p.reviewCount = rows.length; }
        }
      }
      _reviews.unshift({ ...rv, createdAt: new Date().toISOString() });
      return rv;
    },
  };

  // ── ADS ────────────────────────────────────────────────────────
  const ads_module = {
    getAll()   { return _ads || []; },
    getById(id){ return (_ads || []).find(a => a.id === id) || null; },

    async load() {
      const rows = await _SB.select('ads', { select: '*', order: 'created_at.desc' });
      _ads = rows.map(_mapAd);
      _notify('chambers-online_ads');
      return _ads;
    },

    async save(ad) {
      const row = {
        id:               ad.id || ('ad_' + Date.now().toString(36)),
        provider_id:      ad.providerId || null,
        name:             ad.name,
        tagline:          ad.tagline || '',
        promo_text:       ad.promoText || '',
        promo_badge:      ad.promoBadge || '',
        promo_badge_color:ad.promoBadgeColor || 'accent',
        image_url:        ad.imageUrl || '',
        logo_url:         ad.logoUrl || '',
        cta_label:        ad.ctaLabel || 'Ver oferta',
        url:              ad.url || '',
        icon:             ad.icon || '📢',
        category:         ad.category || '',
        plan:             ad.plan || 'basic',
        placement:        ad.placement || 'both',
        budget:           ad.budget || 0,
        status:           ad.status || 'active',
        start_date:       ad.startDate || null,
        end_date:         ad.endDate || null,
      };
      await _SB.upsert('ads', row);
      await this.load();
      return ad;
    },

    async delete(id) {
      await _SB.remove('ads', { id });
      _ads = (_ads || []).filter(a => a.id !== id);
      _notify('chambers-online_ads');
    },

    async trackImpression(id) {
      // Fire and forget — increment counter
      const ad = this.getById(id);
      if (!ad) return;
      _SB.update('ads', { id }, { impressions: (ad.impressions || 0) + 1 }).catch(() => {});
    },

    async trackClick(id) {
      const ad = this.getById(id);
      if (!ad) return;
      _SB.update('ads', { id }, { clicks: (ad.clicks || 0) + 1 }).catch(() => {});
    },
  };

  // ── CATEGORIES ─────────────────────────────────────────────────
  const categories = {
    getAll() { return _categories || []; },

    async load() {
      const rows = await _SB.select('categories', {
        select: '*', active: 'eq.true', order: 'sort_order.asc,name.asc'
      });
      _categories = rows.length ? rows : null; // null = use defaults
      _notify('chambers-online_categories');
      return _categories;
    },

    async save(list) {
      // Delete all then re-insert
      await fetch(`${window._ENV.SUPABASE_URL}/rest/v1/categories`, {
        method:  'DELETE',
        headers: {
          'apikey':        window._ENV.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + window._ENV.SUPABASE_ANON_KEY,
          'Content-Type':  'application/json',
        },
      });
      for (const c of list) {
        await _SB.upsert('categories', {
          id:          c.id,
          name:        c.name,
          icon:        c.icon || '',
          description: c.description || '',
          active:      c.active !== false,
          sort_order:  c.sort_order || 0,
        });
      }
      _categories = list;
      _notify('chambers-online_categories');
    },
  };

  // ── ANALYTICS ──────────────────────────────────────────────────
  const analytics = {
    track(event, data = {}) {
      _SB.insert('analytics_events', {
        event, data: JSON.stringify(data),
      }).catch(() => {});
    },

    async kpis() {
      const [provs, bks, revs] = await Promise.all([
        _SB.select('providers', { select: 'status' }),
        _SB.select('bookings',  { select: 'status,total,platform_fee,tip' }),
        _SB.select('reviews',   { select: 'rating' }),
      ]);
      const active    = provs.filter(p => p.status === 'active').length;
      const pending   = provs.filter(p => p.status === 'review').length;
      const completed = bks.filter(b => b.status === 'completed');
      const gmv       = completed.reduce((s, b) => s + parseFloat(b.total || 0), 0);
      const revenue   = completed.reduce((s, b) => s + parseFloat(b.platform_fee || 0), 0);
      const avgRating = revs.length ? revs.reduce((s, r) => s + r.rating, 0) / revs.length : 0;
      return {
        totalProviders:    provs.length,
        activeProviders:   active,
        pendingReview:     pending,
        totalBookings:     bks.length,
        completedBookings: completed.length,
        gmv, revenue,
        avgRating: parseFloat(avgRating.toFixed(2)),
      };
    },
  };

  // ── SESSION (UI state — localStorage only) ─────────────────────
  const session = {
    get()    {
      try { return JSON.parse(localStorage.getItem('chambers-online_session') || 'null'); }
      catch  { return null; }
    },
    set(data){ localStorage.setItem('chambers-online_session', JSON.stringify({ ...this.get(), ...data })); },
    clear()  { localStorage.removeItem('chambers-online_session'); },
  };

  // ── Client auth (simple — use Supabase Auth in production) ──────
  const clientAuth = {
    async register(name, firstName, email, pwd) {
      // Check email not taken
      const existing = await _SB.select('clients', { email: 'eq.' + email.toLowerCase(), select: 'user_id' });
      if (existing.length) throw new Error('email_taken');
      const userId = 'client_' + Date.now().toString(36);
      await _SB.insert('clients', {
        user_id:    userId,
        name,
        first_name: firstName || name,
        email:      email.toLowerCase(),
        pwd_hash:   _hash(pwd),
      });
      return { userId, name, firstName: firstName || name, email };
    },

    async login(email, pwd) {
      const rows = await _SB.select('clients', { email: 'eq.' + email.toLowerCase(), select: '*' });
      if (!rows.length || rows[0].pwd_hash !== _hash(pwd)) throw new Error('invalid_credentials');
      const c = rows[0];
      return { userId: c.user_id, name: c.name, firstName: c.first_name, email: c.email };
    },
  };

  // ── Helpers ────────────────────────────────────────────────────
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
  function now() { return new Date().toISOString(); }

  // ── Init: pre-load all data ─────────────────────────────────────
  async function _init() {
    try {
      await Promise.all([
        providers.load(),
        bookings.load(),
        ads_module.load(),
        categories.load(),
      ]);
      console.log('[DB] Supabase data loaded ✅');
    } catch (e) {
      console.warn('[DB] Init failed:', e.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  return {
    providers,
    bookings,
    reviews,
    ads: ads_module,
    categories,
    analytics,
    session,
    clientAuth,
    uid, now,
    reload: _init,
  };

})();
