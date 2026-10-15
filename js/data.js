// GymControl — datos: guardado local (siempre) + sincronización con Supabase (opcional).
// Todo cambio se aplica primero en este equipo; en modo nube se encola y se sube cuando hay internet.

export const pad = n => String(n).padStart(2, '0');
export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => iso(new Date());
export const parse = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
export const nowTime = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
export const uid = () => (crypto.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));

const KEY = 'gymcontrol:v1';
export const TABLES = ['members', 'plans', 'payments', 'checkins', 'settings', 'pt_clients', 'pt_sessions'];
// Columnas reales de cada tabla en Supabase: solo esto se sube.
const COLS = {
  members: ['id', 'name', 'phone', 'plan_id', 'start_date', 'end_date', 'notes', 'created_at', 'example'],
  plans: ['id', 'name', 'days', 'price', 'color'],
  payments: ['id', 'type', 'date', 'amount', 'method', 'concept', 'member_id', 'member_name', 'client_id', 'created_at', 'example'],
  checkins: ['id', 'member_id', 'date', 'time', 'created_at', 'example'],
  settings: ['id', 'gym_name', 'currency', 'cc'],
  // Entrenamiento personalizado: clientes con mensualidad y horario fijo, y cada sesión dada.
  pt_clients: ['id', 'member_id', 'name', 'phone', 'price', 'days', 'time', 'goal', 'notes', 'start_date', 'end_date', 'active', 'created_at', 'example'],
  pt_sessions: ['id', 'client_id', 'date', 'time', 'status', 'notes', 'created_at', 'example'],
};
const clean = (table, row) => Object.fromEntries(COLS[table].map(k => [k, row[k] ?? null]));

export const db = { members: {}, plans: {}, payments: {}, checkins: {}, settings: {}, pt_clients: {}, pt_sessions: {} };
export const meta = { mode: 'local', cloud: { url: '', key: '' }, outbox: [], lastSync: null, setupDone: false };
export const status = { state: 'local', pending: 0, error: '', email: '' };

const listeners = new Set();
export const onChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
let emitT;
const emit = () => { clearTimeout(emitT); emitT = setTimeout(() => listeners.forEach(f => f()), 16); };

let saveT;
function persist() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ db, meta })); }
    catch (e) { console.warn('No se pudo guardar en este equipo', e); }
  }, 120);
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      TABLES.forEach(t => { db[t] = s.db?.[t] || {}; });
      Object.assign(meta, s.meta || {});
    }
  } catch (e) { console.warn(e); }
  // Proyecto de Supabase que trae la app (js/config.js): no hace falta pegar la URL ni la clave.
  const def = window.GYM_CONFIG || {};
  if (!meta.cloud?.url && def.supabaseUrl && def.supabaseKey) meta.cloud = { url: def.supabaseUrl, key: def.supabaseKey };
  status.pending = meta.outbox.length;
  status.state = meta.mode === 'cloud' ? 'auth' : 'local';
}

export const settings = () => ({ gym_name: 'Mi Gym', currency: 'COP', cc: '57', ...(db.settings.main || {}) });

/* ---------- escritura ---------- */
export function put(table, row) {
  db[table][row.id] = { ...row };
  enqueue({ op: 'upsert', table, id: row.id, row: clean(table, row) });
  persist(); emit();
}
export function patch(table, id, fields) {
  if (!db[table][id]) return;
  put(table, { ...db[table][id], ...fields });
}
export function remove(table, id) {
  delete db[table][id];
  enqueue({ op: 'delete', table, id });
  persist(); emit();
}
function enqueue(op) {
  if (meta.mode !== 'cloud') return;
  meta.outbox = meta.outbox.filter(o => !(o.table === op.table && o.id === op.id));
  meta.outbox.push(op);
  status.pending = meta.outbox.length;
  scheduleFlush();
}
export function setMeta(fields) { Object.assign(meta, fields); persist(); emit(); }

/* Reemplaza todo (importar copia / datos de ejemplo). No encola: usar uploadAll si se está en la nube. */
export function replaceAll(data) {
  TABLES.forEach(t => { db[t] = data[t] || {}; });
  persist(); emit();
}

/* ---------- nube (Supabase) ---------- */
let sb = null, session = null, channel = null, flushing = false, flushT = null, pullT = null, timer = null;
const isNetErr = e => !navigator.onLine || /fetch|network|timeout|Load failed/i.test(String(e?.message || e));
const setStatus = (state, error = '') => { status.state = state; status.error = error; status.pending = meta.outbox.length; emit(); };

export const cloudConfigured = () => !!(meta.cloud.url && meta.cloud.key);
export const signedIn = () => !!session;

function client() {
  if (sb) return sb;
  if (!window.supabase?.createClient) throw new Error('No se pudo cargar el conector de la nube. Revisa tu internet.');
  sb = window.supabase.createClient(meta.cloud.url, meta.cloud.key, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'gymcontrol-auth' },
  });
  sb.auth.onAuthStateChange((_e, s) => { session = s; status.email = s?.user?.email || ''; if (!s && meta.mode === 'cloud') setStatus('auth'); });
  return sb;
}

export async function initCloud() {
  if (meta.mode !== 'cloud' || !cloudConfigured()) return;
  try {
    const { data } = await client().auth.getSession();
    session = data.session; status.email = session?.user?.email || '';
    if (session) startSync(); else setStatus('auth');
  } catch (e) { setStatus(isNetErr(e) ? 'offline' : 'error', e.message); }
}

export function configureCloud(url, key) {
  url = url.trim().replace(/\/+$/, ''); key = key.trim();
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) throw new Error('La URL debe verse así: https://abcd1234.supabase.co');
  if (key.length < 30) throw new Error('La clave pública (anon key) parece incompleta.');
  sb = null; session = null;
  meta.cloud = { url, key }; persist();
}

const authMsg = m => /Invalid login/i.test(m) ? 'Correo o contraseña incorrectos.'
  : /Email not confirmed/i.test(m) ? 'Falta confirmar tu correo: abre el enlace que te llegó de Supabase.'
    : /already registered/i.test(m) ? 'Ese correo ya tiene cuenta. Inicia sesión.'
      : /at least 6|Password should/i.test(m) ? 'La contraseña debe tener al menos 6 caracteres.' : m;

/* Inicia sesión y une los datos: lo que había solo en este equipo (sin ejemplos) se sube, y luego baja todo lo de la nube. */
export async function signIn(email, password) {
  const c = client();
  const { data, error } = await c.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(authMsg(error.message));
  return afterLogin(data.session);
}
/* Crea la cuenta. Si Supabase pide confirmar el correo, devuelve { confirm: true }. */
export async function signUp(email, password) {
  const c = client();
  const { data, error } = await c.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: location.origin + location.pathname } });
  if (error) throw new Error(authMsg(error.message));
  if (!data.session) return { confirm: true };
  return afterLogin(data.session);
}
async function afterLogin(s) {
  const c = client();
  session = s; status.email = s.user.email;
  const { count, error: e2 } = await c.from('members').select('id', { count: 'exact', head: true });
  if (e2) throw new Error(/relation|does not exist|schema cache/i.test(e2.message) ? 'Falta crear las tablas: ejecuta el archivo schema.sql en Supabase.' : e2.message);
  const wasLocal = meta.mode !== 'cloud';
  const hasReal = TABLES.some(t => t !== 'settings' && t !== 'plans' && Object.values(db[t]).some(r => !r.example));
  meta.mode = 'cloud'; meta.outbox = []; persist();
  let uploaded = false;
  // Nube vacía: sube todo (planes y ajustes incluidos). Nube con datos: suma lo real de este equipo sin pisar los ajustes.
  if (wasLocal && (!count || hasReal)) { await uploadAll(true, !!count); uploaded = true; }
  startSync();
  return { uploaded };
}

export async function signOut() {
  try { await sb?.auth.signOut(); } catch {}
  stopSync(); session = null;
  meta.mode = 'local'; meta.outbox = []; persist();
  setStatus('local');
}

/* Sube todo lo que hay en este equipo (skipExamples: no sube los datos de ejemplo). */
export async function uploadAll(skipExamples = false, keepCloudSetup = false) {
  const c = client();
  for (const t of ['settings', 'plans', 'members', 'payments', 'checkins', 'pt_clients', 'pt_sessions']) {
    if (keepCloudSetup && (t === 'settings' || t === 'plans')) continue;
    const rows = Object.values(db[t]).filter(r => !(skipExamples && r.example)).map(r => clean(t, r));
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await c.from(t).upsert(rows.slice(i, i + 500));
      if (error) throw new Error(error.message);
    }
  }
}

function scheduleFlush(ms = 300) { clearTimeout(flushT); flushT = setTimeout(flush, ms); }

async function flush() {
  if (!sb || !session || flushing) return;
  if (!navigator.onLine) return setStatus('offline');
  flushing = true; setStatus('syncing');
  try {
    while (meta.outbox.length) {
      const o = meta.outbox[0];
      const r = o.op === 'upsert' ? await sb.from(o.table).upsert(o.row) : await sb.from(o.table).delete().eq('id', o.id);
      if (r.error) {
        if (isNetErr(r.error)) { flushing = false; return setStatus('offline'); }
        console.error('Cambio rechazado por la nube', o, r.error);
        status.error = r.error.message; // se descarta para no bloquear la cola
      }
      meta.outbox.shift(); status.pending = meta.outbox.length; persist();
    }
    flushing = false;
    await pull();
  } catch (e) {
    flushing = false;
    setStatus(isNetErr(e) ? 'offline' : 'error', e.message);
  }
}

async function fetchAll(table, build) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(sb.from(table).select('*')).range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

export async function pull() {
  if (!sb || !session) return;
  if (meta.outbox.length) return scheduleFlush();
  try {
    setStatus('syncing');
    const cutoff = addDays(today(), -400);
    const [members, plans, payments, checkins, sets, ptc, pts] = await Promise.all([
      fetchAll('members', q => q), fetchAll('plans', q => q),
      fetchAll('payments', q => q.gte('date', cutoff)), fetchAll('checkins', q => q.gte('date', addDays(today(), -120))),
      fetchAll('settings', q => q), fetchAll('pt_clients', q => q), fetchAll('pt_sessions', q => q.gte('date', cutoff)),
    ]);
    if (meta.outbox.length) return scheduleFlush(); // hubo cambios mientras bajaba
    const by = a => Object.fromEntries(a.map(r => [r.id, r]));
    db.members = by(members); db.plans = by(plans); db.payments = by(payments); db.checkins = by(checkins); db.settings = by(sets);
    db.pt_clients = by(ptc); db.pt_sessions = by(pts);
    meta.lastSync = new Date().toISOString();
    persist(); setStatus('online');
  } catch (e) { setStatus(isNetErr(e) ? 'offline' : 'error', e.message); }
}

function startSync() {
  stopSync();
  setStatus('syncing');
  flush().then(() => { if (!meta.outbox.length) pull(); });
  channel = sb.channel('gymcontrol')
    .on('postgres_changes', { event: '*', schema: 'public' }, () => { clearTimeout(pullT); pullT = setTimeout(pull, 700); })
    .subscribe();
  timer = setInterval(() => { if (document.visibilityState === 'visible') flush(); }, 60000);
}
function stopSync() {
  if (channel) { try { sb.removeChannel(channel); } catch {} channel = null; }
  clearInterval(timer);
}
window.addEventListener('online', () => { if (meta.mode === 'cloud' && session) flush(); });
window.addEventListener('offline', () => { if (meta.mode === 'cloud') setStatus('offline'); });
window.addEventListener('focus', () => { if (meta.mode === 'cloud' && session) flush(); });
