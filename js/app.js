// GymControl — interfaz.
import * as D from './data.js';
import { buildDemo } from './demo.js';
const { db, meta, status, today, addDays, diffDays, parse, uid, nowTime, settings, pad } = D;

/* =========================================================
   Utilidades
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const ini = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
const first = n => String(n || '').trim().split(/\s+/)[0];
const hueOf = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
// Avatares en la gama verde (de lima a verde azulado), distintos por persona.
const av = (name, cls = '') => { const h = 80 + hueOf(name) % 105; return `<span class="av ${cls}" style="background:linear-gradient(135deg,hsl(${h} 75% 58%),hsl(${h + 30} 80% 30%))">${esc(ini(name))}</span>`; };
const METHODS = ['Efectivo', 'Nequi', 'Daviplata', 'Transferencia', 'Tarjeta'];
const METHOD_COLORS = { Efectivo: '#A3E635', Nequi: '#34D399', Daviplata: '#2DD4BF', Transferencia: '#38BDF8', Tarjeta: '#FBBF24' };
const PLAN_COLORS = { violet: ['#34D399', '#047857'], cyan: ['#2DD4BF', '#0F766E'], pink: ['#BEF264', '#4D7C0F'], amber: ['#FDE047', '#CA8A04'], emerald: ['#6EE7B7', '#059669'], rose: ['#7DD3FC', '#0369A1'] };
const pgrad = c => { const [a, b] = PLAN_COLORS[c] || PLAN_COLORS.violet; return `linear-gradient(135deg,${a},${b})`; };
const WD = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const fmtDate = s => s ? parse(s).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace('.', '') : '—';
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const fmtLong = s => cap(parse(s).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }));
const fmtMonth = ym => { const [y, m] = ym.split('-').map(Number); return cap(new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })); };
const ago = d => { if (!d) return 'Sin visitas'; const n = diffDays(d, today()); return n <= 0 ? 'Hoy' : n === 1 ? 'Ayer' : `Hace ${n} días`; };
function money(n, compact = false) {
  const c = settings().currency, zero = ['COP', 'CLP', 'ARS'].includes(c);
  const o = compact ? { notation: 'compact', maximumFractionDigits: 1 } : { maximumFractionDigits: zero ? 0 : 2, minimumFractionDigits: 0 };
  try { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: c, ...o }).format(n || 0); }
  catch { return '$' + Math.round(n || 0).toLocaleString('es-CO'); }
}

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M17.8 14.8c1.9.7 3.2 2.4 3.7 5.2"/>',
  door: '<path d="M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h12v3"/><rect x="3" y="7.5" width="18" height="12.5" rx="2.5"/><path d="M16 13.7h2"/>',
  layers: '<path d="M12 3 2.5 8 12 13l9.5-5z"/><path d="M2.5 12.5 12 17.5l9.5-5"/><path d="M2.5 16.5 12 21.5l9.5-5"/>',
  gear: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
  left: '<path d="M15 6l-6 6 6 6"/>', right: '<path d="M9 6l6 6-6 6"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>', edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', chat: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9 10.5h6M9 13.5h4"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 8.5a4.5 4.5 0 0 1-.5 9.5z"/>', download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>', userplus: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M19 8v6M16 11h6"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>', install: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 7.5v6M9 10.5l3 3 3-3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', in: '<path d="M12 19V5M6 11l6-6 6 6"/>', out: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  note: '<path d="M5 4h10l4 4v12H5z"/><path d="M14 4v5h5M8.5 13h7M8.5 16.5h5"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
};
const ic = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* =========================================================
   Lógica del negocio
   ========================================================= */
function st(m) {
  if (!m || !m.end_date) return { k: 'none', label: 'Sin plan', left: -9999 };
  const left = diffDays(today(), m.end_date);
  if (left < 0) return { k: 'bad', label: left === -1 ? 'Venció ayer' : `Venció hace ${-left} d`, left };
  if (left === 0) return { k: 'warn', label: 'Vence hoy', left };
  if (left <= 5) return { k: 'warn', label: left === 1 ? 'Vence mañana' : `Vence en ${left} d`, left };
  return { k: 'ok', label: `${left} días`, left };
}
const members = () => Object.values(db.members).sort((a, b) => norm(a.name).localeCompare(norm(b.name)));
const plans = () => Object.values(db.plans).sort((a, b) => (a.days || 0) - (b.days || 0));
const planOf = m => db.plans[m?.plan_id];
const planName = m => planOf(m)?.name || (m?.plan_id ? 'Plan eliminado' : 'Sin plan');
const calcEnd = (start, planId) => { const p = db.plans[planId]; return p ? addDays(start, Math.max(1, +p.days || 1) - 1) : null; };

let IX = null;
function ix() {
  if (IX) return IX;
  const byDate = {}, last = {}, dates = {};
  for (const c of Object.values(db.checkins)) {
    (byDate[c.date] ||= []).push(c);
    (dates[c.member_id] ||= new Set()).add(c.date);
    if (!last[c.member_id] || c.date > last[c.member_id]) last[c.member_id] = c.date;
  }
  Object.values(byDate).forEach(a => a.sort((x, y) => String(y.time).localeCompare(String(x.time))));
  return (IX = { byDate, last, dates });
}
const dayList = d => ix().byDate[d] || [];
const todayEntry = id => dayList(today()).find(c => c.member_id === id);

function matchMembers(q, limit = 8) {
  const n = norm(q.trim()); if (!n) return [];
  const digits = n.replace(/\D/g, '');
  return members().filter(m => norm(m.name).includes(n) || (digits.length >= 3 && String(m.phone || '').replace(/\D/g, '').includes(digits)))
    .sort((a, b) => (norm(a.name).startsWith(n) ? 0 : 1) - (norm(b.name).startsWith(n) ? 0 : 1)).slice(0, limit);
}
/* Socios que suelen llegar a esta hora (±100 min) y aún no han entrado hoy. */
function usualNow(limit = 6) {
  const d = new Date(), nowM = d.getHours() * 60 + d.getMinutes(), since = addDays(today(), -28), t = today(), score = {};
  for (const c of Object.values(db.checkins)) {
    if (c.date < since || c.date === t) continue;
    const [h, m] = String(c.time).split(':').map(Number);
    if (Math.abs(h * 60 + m - nowM) <= 100) score[c.member_id] = (score[c.member_id] || 0) + 1;
  }
  const inToday = new Set(dayList(t).map(c => c.member_id));
  return Object.entries(score).filter(([id]) => db.members[id] && !inToday.has(id)).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => db.members[id]);
}
function waLink(m, what) {
  let d = String(m.phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length <= 10) d = String(settings().cc || '57') + d.replace(/^0+/, '');
  const s = st(m), gym = settings().gym_name, pn = what || `plan ${planName(m)}`;
  let t = `Hola ${first(m.name)}, te escribimos de ${gym}.`;
  if (s.k === 'bad') t += ` Tu ${pn} venció el ${fmtDate(m.end_date)}. ¿Te lo renovamos para que sigas entrenando?`;
  else if (s.k === 'warn') t += ` Tu ${pn} vence el ${fmtDate(m.end_date)}. Cuando quieras te lo renovamos.`;
  return `https://wa.me/${d}?text=${encodeURIComponent(t)}`;
}
const monthPays = ym => Object.values(db.payments).filter(p => String(p.date).startsWith(ym));
const sum = (arr, type) => arr.filter(p => p.type === type).reduce((a, p) => a + (+p.amount || 0), 0);

/* =========================================================
   Acciones
   ========================================================= */
function checkIn(id) {
  const m = db.members[id]; if (!m) return;
  const prev = todayEntry(id);
  if (prev) return toast(`${first(m.name)} ya entró hoy a las ${prev.time}`, { type: 'info' });
  const t = nowTime(), cid = uid();
  D.put('checkins', { id: cid, member_id: id, date: today(), time: t, created_at: new Date().toISOString(), example: !!m.example });
  const s = st(m);
  toast(`Entrada de ${first(m.name)} · ${t}${s.k === 'bad' || s.k === 'none' ? ' · plan vencido' : ''}`, { type: s.k === 'bad' || s.k === 'none' ? 'warn' : 'ok', action: { label: 'Deshacer', fn: () => D.remove('checkins', cid) } });
}
async function deleteMember(id) {
  const m = db.members[id]; if (!m) return;
  if (!await confirmDialog({ title: 'Eliminar socio', text: `Se eliminará a <b>${esc(m.name)}</b> y su historial de entradas. Los pagos quedan en la caja.` })) return;
  Object.values(db.checkins).filter(c => c.member_id === id).forEach(c => D.remove('checkins', c.id));
  D.remove('members', id);
  closeDrawer();
  toast('Socio eliminado');
}
async function clearExamples() {
  if (!await confirmDialog({ title: 'Borrar datos de ejemplo', text: 'Se quitan los socios, clientes de personalizados, entradas, sesiones y movimientos marcados como ejemplo. Tus datos reales y tus planes no se tocan.', ok: 'Borrar ejemplos' })) return;
  ['checkins', 'pt_sessions', 'payments', 'members', 'pt_clients'].forEach(t => Object.values(db[t] || {}).filter(r => r.example).forEach(r => D.remove(t, r.id)));
  toast('Datos de ejemplo borrados');
}
const hasExamples = () => ['members', 'payments', 'pt_clients'].some(t => Object.values(db[t] || {}).some(r => r.example));

/* =========================================================
   Entrenamiento personalizado
   ========================================================= */
const WEEK = [[1, 'Lun'], [2, 'Mar'], [3, 'Mié'], [4, 'Jue'], [5, 'Vie'], [6, 'Sáb'], [0, 'Dom']];
const dayShort = n => (WEEK.find(w => w[0] === n) || [, ''])[1];
const hm12 = t => { if (!t) return ''; const [h, m] = String(t).split(':').map(Number); return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'am' : 'pm'}`; };
const addMonths = (s, n) => { const d = parse(s), day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return D.iso(d); };
const ptEnd = start => addDays(addMonths(start, 1), -1);
const ptClients = () => Object.values(db.pt_clients || {}).sort((a, b) => norm(a.name).localeCompare(norm(b.name)));
const ptActive = () => ptClients().filter(c => c.active !== false);
const ptSessions = id => Object.values(db.pt_sessions || {}).filter(s => s.client_id === id).sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.time).localeCompare(String(a.time)));
const ptSessionOn = (id, d) => Object.values(db.pt_sessions || {}).find(s => s.client_id === id && s.date === d);
const ptScheduledOn = d => ptActive().filter(c => (c.days || []).includes(parse(d).getDay())).sort((a, b) => String(a.time).localeCompare(String(b.time)));
const ptSchedule = c => (c.days || []).length ? `${WEEK.filter(w => c.days.includes(w[0])).map(w => w[1]).join(' · ')}${c.time ? ` · ${hm12(c.time)}` : ''}` : 'Sin horario fijo';
function ptMonthStats(id, ym = today().slice(0, 7)) {
  const ss = ptSessions(id).filter(s => String(s.date).startsWith(ym));
  return { done: ss.filter(s => s.status === 'done').length, missed: ss.filter(s => s.status === 'missed').length };
}
function ptMark(id, status, date = today()) {
  const c = db.pt_clients[id]; if (!c) return;
  const prev = ptSessionOn(id, date);
  if (prev) D.patch('pt_sessions', prev.id, { status });
  else D.put('pt_sessions', { id: uid(), client_id: id, date, time: nowTime(), status, notes: '', created_at: new Date().toISOString(), example: !!c.example });
  const s = ptSessionOn(id, date);
  toast(status === 'done' ? `Sesión de ${first(c.name)} registrada` : `${first(c.name)} marcado como falta`, { type: status === 'done' ? 'ok' : 'warn', action: { label: 'Agregar nota', fn: () => ptSessionForm(id, s?.id) } });
}
async function deletePt(id) {
  const c = db.pt_clients[id]; if (!c) return;
  if (!await confirmDialog({ title: 'Eliminar cliente', text: `Se eliminará a <b>${esc(c.name)}</b> de personalizados junto con su historial de sesiones. Los pagos quedan en la caja.` })) return;
  ptSessions(id).forEach(s => D.remove('pt_sessions', s.id));
  D.remove('pt_clients', id);
  closeDrawer();
  toast('Cliente eliminado');
}

function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function exportJSON() {
  download(`gymcontrol-copia-${today()}.json`, JSON.stringify({ app: 'GymControl', version: 1, exported: new Date().toISOString(), data: db }, null, 1), 'application/json');
  toast('Copia descargada');
}
function exportCSV() {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['Nombre', 'Celular', 'Plan', 'Desde', 'Vence', 'Estado', 'Última visita', 'Notas']];
  members().forEach(m => rows.push([m.name, m.phone, planName(m), m.start_date, m.end_date, st(m).label, ix().last[m.id] || '', m.notes]));
  download(`socios-${today()}.csv`, '﻿' + rows.map(r => r.map(q).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
  toast('Lista de socios descargada');
}
function importJSON(file) {
  const r = new FileReader();
  r.onload = async () => {
    try {
      const j = JSON.parse(r.result); const data = j.data || j;
      if (!data.members || !data.plans) throw new Error('formato');
      const n = Object.keys(data.members).length;
      if (!await confirmDialog({ title: 'Restaurar copia', text: `La copia tiene <b>${n} socios</b>. Reemplazará los datos de este equipo${meta.mode === 'cloud' ? ' y se subirá a la nube' : ''}.`, ok: 'Restaurar', danger: false })) return;
      D.replaceAll(data);
      if (meta.mode === 'cloud') { await D.uploadAll(); D.pull(); }
      toast('Copia restaurada');
    } catch (e) { console.error(e); toast('Ese archivo no es una copia de GymControl.', { type: 'err' }); }
  };
  r.readAsText(file);
}

/* =========================================================
   Gráficos (SVG medido al ancho real)
   ========================================================= */
let gid = 0;
const niceMax = (v, floor = 4) => { if (v <= floor) return floor; const p = 10 ** Math.floor(Math.log10(v)), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };
function smooth(P, top, bottom) {
  if (!P.length) return '';
  let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2, k = .17;
    const c1 = [p1[0] + (p2[0] - p0[0]) * k, clamp(p1[1] + (p2[1] - p0[1]) * k, top, bottom)];
    const c2 = [p2[0] - (p3[0] - p1[0]) * k, clamp(p2[1] - (p3[1] - p1[1]) * k, top, bottom)];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}
function hover(el, n, xOf, yOf, tipHtml, onMove) {
  const tip = el.querySelector('.tip'), svg = el.querySelector('svg');
  const move = e => {
    const r = svg.getBoundingClientRect(), x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    let best = 0, bd = Infinity;
    for (let i = 0; i < n; i++) { const d = Math.abs(xOf(i) - x); if (d < bd) { bd = d; best = i; } }
    tip.hidden = false; tip.innerHTML = tipHtml(best);
    tip.style.left = clamp(xOf(best), 60, r.width - 60) + 'px'; tip.style.top = yOf(best) + 'px';
    onMove?.(best);
  };
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerleave', () => { tip.hidden = true; onMove?.(-1); });
}
function areaChart(el, pts, { h = 220, fmt = v => v, aria = '' } = {}) {
  const w = Math.max(260, Math.floor(el.clientWidth || 600)), L = 38, R = 14, T = 14, B = 28, n = pts.length;
  const max = niceMax(Math.max(...pts.map(p => p.v), 1));
  const X = i => L + (n === 1 ? (w - L - R) / 2 : i * (w - L - R) / (n - 1));
  const Y = v => T + (h - T - B) * (1 - v / max);
  const P = pts.map((p, i) => [X(i), Y(p.v)]), line = smooth(P, T, Y(0)), g = 'a' + (++gid);
  const ticks = [0, max / 2, max].filter(t => Number.isInteger(t) || fmt !== String);
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((w - L - R) / 64))));
  const labels = pts.map((p, i) => ((n - 1 - i) % every === 0) ? `<text x="${X(i)}" y="${h - 6}" text-anchor="middle">${esc(p.label)}</text>` : '').join('');
  const last = P[n - 1];
  el.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(aria)}">
    <defs><linearGradient id="${g}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10B981" stop-opacity=".5"/><stop offset=".7" stop-color="#14B8A6" stop-opacity=".06"/><stop offset="1" stop-color="#14B8A6" stop-opacity="0"/></linearGradient>
    <linearGradient id="${g}l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#D9F99D"/><stop offset=".55" stop-color="#34D399"/><stop offset="1" stop-color="#2DD4BF"/></linearGradient></defs>
    ${ticks.map(t => `<line x1="${L}" x2="${w - R}" y1="${Y(t)}" y2="${Y(t)}" stroke="rgba(255,255,255,${t ? .06 : .12})" ${t ? 'stroke-dasharray="3 6"' : ''}/><text x="${L - 10}" y="${Y(t) + 4}" text-anchor="end">${esc(fmt(t))}</text>`).join('')}
    <path d="${line} L${X(n - 1)},${Y(0)} L${X(0)},${Y(0)} Z" fill="url(#${g}f)"/>
    <path d="${line}" fill="none" stroke="url(#${g}l)" stroke-width="2.8" stroke-linecap="round" style="filter:drop-shadow(0 6px 14px rgba(16,185,129,.55))"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="10" fill="#A3E635" opacity=".2"/><circle cx="${last[0]}" cy="${last[1]}" r="4.5" fill="#BEF264" stroke="#04120D" stroke-width="2"/>
    ${labels}
    <g class="hov" style="opacity:0;transition:opacity .15s"><line class="hl" y1="${T}" y2="${Y(0)}" stroke="rgba(255,255,255,.28)" stroke-dasharray="3 4"/><circle class="hd" r="5.5" fill="#fff" stroke="#10B981" stroke-width="3"/></g>
  </svg><div class="tip" hidden></div>`;
  const hov = el.querySelector('.hov'), hl = el.querySelector('.hl'), hd = el.querySelector('.hd');
  hover(el, n, X, i => P[i][1], i => `<b>${esc(pts[i].tipV ?? fmt(pts[i].v))}</b>${esc(pts[i].tip || pts[i].label)}`, i => {
    if (i < 0) { hov.style.opacity = 0; return; }
    hov.style.opacity = 1; hl.setAttribute('x1', X(i)); hl.setAttribute('x2', X(i)); hd.setAttribute('cx', X(i)); hd.setAttribute('cy', P[i][1]);
  });
}
function barChart(el, pts, { h = 190, fmt = v => v, aria = '', series = 1, peak = false } = {}) {
  const w = Math.max(260, Math.floor(el.clientWidth || 600)), L = series > 1 ? 52 : 30, R = 8, T = 12, B = 26, n = pts.length;
  const max = niceMax(Math.max(...pts.map(p => Math.max(p.v, p.v2 || 0))), series > 1 ? 1 : .5);
  const band = (w - L - R) / n, bw = Math.min(series > 1 ? 9 : 26, band * (series > 1 ? .32 : .62));
  const X = i => L + band * i + band / 2, Y = v => T + (h - T - B) * (1 - v / max), g = 'b' + (++gid);
  const top = pts.reduce((b, p, i) => p.v > pts[b].v ? i : b, 0);
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((w - L - R) / 44))));
  const bar = (x, v, fill) => { const y = Y(v), hh = Math.max(v > 0 ? 3 : 0, Y(0) - y); return `<rect x="${(x - bw / 2).toFixed(1)}" y="${(Y(0) - hh).toFixed(1)}" width="${bw.toFixed(1)}" height="${hh.toFixed(1)}" rx="${Math.min(5, bw / 2)}" fill="${fill}"/>`; };
  el.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(aria)}">
    <defs><linearGradient id="${g}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A7F3D0"/><stop offset="1" stop-color="#10B981"/></linearGradient>
    <linearGradient id="${g}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34D399" stop-opacity=".5"/><stop offset="1" stop-color="#047857" stop-opacity=".25"/></linearGradient>
    <linearGradient id="${g}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9F99D"/><stop offset="1" stop-color="#10B981"/></linearGradient>
    <linearGradient id="${g}i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BEF264"/><stop offset="1" stop-color="#14B8A6"/></linearGradient>
    <linearGradient id="${g}o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F9A8D4"/><stop offset="1" stop-color="#FB7185"/></linearGradient></defs>
    ${[0, max / 2, max].map(t => `<line x1="${L}" x2="${w - R}" y1="${Y(t)}" y2="${Y(t)}" stroke="rgba(255,255,255,${t ? .06 : .12})" ${t ? 'stroke-dasharray="3 6"' : ''}/><text x="${L - 8}" y="${Y(t) + 4}" text-anchor="end">${esc(fmt(t))}</text>`).join('')}
    ${pts.map((p, i) => series > 1
      ? bar(X(i) - bw * .6, p.v, `url(#${g}i)`) + bar(X(i) + bw * .6, p.v2 || 0, `url(#${g}o)`)
      : bar(X(i), p.v, peak && i === top && p.v > 0 ? `url(#${g}p)` : `url(#${g}${peak ? 's' : 'a'})`)).join('')}
    ${pts.map((p, i) => i % every === 0 ? `<text x="${X(i)}" y="${h - 6}" text-anchor="middle">${esc(p.label)}</text>` : '').join('')}
  </svg><div class="tip" hidden></div>`;
  hover(el, n, X, i => Y(Math.max(pts[i].v, pts[i].v2 || 0)), i => pts[i].tip);
}
function ring(el, { pct, size = 168, stroke = 14, big, lbl, colors = ['#D9F99D', '#2DD4BF'] }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - clamp(pct || 0, 0, 1));
  const prog = el.querySelector('circle.prog');
  if (prog && el.dataset.size == size) {
    prog.style.strokeDashoffset = off; el.querySelector('.big').textContent = big; el.querySelector('.lbl').textContent = lbl; return;
  }
  const g = 'r' + (++gid);
  el.dataset.size = size; el.style.width = el.style.height = size + 'px';
  el.innerHTML = `<svg width="${size}" height="${size}" aria-hidden="true"><defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${colors[0]}"/><stop offset=".5" stop-color="#34D399"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="${stroke}"/>
    <circle class="prog" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#${g})" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" style="stroke-dashoffset:${c};filter:drop-shadow(0 0 10px rgba(52,211,153,.55))"/></svg>
    <div class="rv"><span class="big">${esc(big)}</span><span class="lbl">${esc(lbl)}</span></div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => { const p = el.querySelector('circle.prog'); if (p) p.style.strokeDashoffset = off; }));
}
function spark(values, id) {
  const n = values.length, max = Math.max(...values, 1), W = 200, H = 38;
  const P = values.map((v, i) => [n === 1 ? W : i * W / (n - 1), 4 + (H - 8) * (1 - v / max)]);
  const d = smooth(P, 2, H);
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34D399" stop-opacity=".45"/><stop offset="1" stop-color="#34D399" stop-opacity="0"/></linearGradient></defs>
    <path d="${d} L${W},${H} L0,${H} Z" fill="url(#${id})"/><path d="${d}" fill="none" stroke="#6EE7B7" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
}
function donut(parts, size = 150, stroke = 18) {
  const total = parts.reduce((a, p) => a + p.v, 0) || 1, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  let acc = 0;
  const segs = parts.map(p => { const len = c * p.v / total, gap = parts.length > 1 ? Math.min(4, len / 2) : 0; const s = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${p.color}" stroke-width="${stroke}" stroke-dasharray="${Math.max(0, len - gap)} ${c}" stroke-dashoffset="${-acc}" stroke-linecap="butt"/>`; acc += len; return s; }).join('');
  return `<svg width="${size}" height="${size}" style="transform:rotate(-90deg);flex:none" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="${stroke}"/>${segs}</svg>`;
}

/* =========================================================
   Capas: modal, panel lateral, paleta, confirmación, avisos
   ========================================================= */
const layers = [];
function openLayer(kind, inner, onClose) {
  const scrim = Object.assign(document.createElement('div'), { className: 'scrim' });
  const panel = Object.assign(document.createElement('div'), { className: kind, innerHTML: inner });
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
  $('#layer').append(scrim, panel);
  const prev = document.activeElement;
  const L = { kind, panel, close() { scrim.remove(); panel.remove(); const i = layers.indexOf(L); if (i >= 0) layers.splice(i, 1); onClose?.(); if (prev?.isConnected) prev.focus?.(); } };
  scrim.onclick = () => L.close();
  layers.push(L);
  return L;
}
function openModal(title, body, mount, onClose) {
  const L = openLayer('modal', `<div class="m-head"><h3>${title}</h3><button class="btn ghost icon-btn" data-close aria-label="Cerrar">${ic('x')}</button></div><div class="m-body">${body}</div>`, onClose);
  mount?.(L.panel, L);
  setTimeout(() => L.panel.querySelector('input:not([type=checkbox]):not([type=radio]),select')?.focus(), 60);
  return L;
}
function confirmDialog({ title, text, ok = 'Eliminar', danger = true }) {
  return new Promise(res => {
    let done = false;
    const L = openModal(esc(title), `<p class="hint" style="font-size:15px">${text}</p><div class="actions" style="margin-top:20px"><button class="btn" data-close>Cancelar</button><button class="btn ${danger ? 'danger solid' : 'primary'}" id="cOk">${esc(ok)}</button></div>`, null, () => { if (!done) res(false); });
    const b = L.panel.querySelector('#cOk'); b.focus();
    b.onclick = () => { done = true; res(true); L.close(); };
  });
}
function toast(msg, { type = 'ok', action, ms = 3200 } = {}) {
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'err' || type === 'warn' ? ' err' : '');
  t.innerHTML = `<span class="t-ic">${ic(type === 'err' ? 'x' : type === 'info' ? 'clock' : type === 'warn' ? 'bolt' : 'check')}</span><span>${esc(msg)}</span>${action ? `<button class="btn xs" style="pointer-events:auto;margin-left:6px">${esc(action.label)}</button>` : ''}`;
  if (action) t.querySelector('button').onclick = () => { action.fn(); t.remove(); };
  $('#toasts').append(t);
  setTimeout(() => t.remove(), action ? 6500 : ms);
}

/* ---------- ficha del socio (panel lateral) ---------- */
let drawer = null, drawerId = null;
function openDrawer(id) { closeDrawer(); drawerId = id; drawerKind = 'member'; drawer = openLayer('drawer', '', () => { drawer = null; drawerId = null; }); renderDrawer(); }
let drawerKind = 'member';
function openPtDrawer(id) { closeDrawer(); drawerId = id; drawerKind = 'pt'; drawer = openLayer('drawer', '', () => { drawer = null; drawerId = null; drawerKind = 'member'; }); renderDrawer(); }
function closeDrawer() { drawer?.close(); }
function renderDrawer() {
  if (!drawer) return;
  if (drawerKind === 'pt') return renderPtDrawer();
  const m = db.members[drawerId]; if (!m) return closeDrawer();
  const s = st(m), p = planOf(m), t = todayEntry(m.id), wa = waLink(m), dates = ix().dates[m.id] || new Set();
  let visits = 0; for (let i = 0; i < 30; i++) if (dates.has(addDays(today(), -i))) visits++;
  const td = parse(today()), mondayOff = (td.getDay() + 6) % 7, start = addDays(today(), -mondayOff - 28);
  const cal = Array.from({ length: 35 }, (_, i) => { const d = addDays(start, i); return `<span class="${dates.has(d) ? 'on' : ''} ${d > today() ? 'out' : ''} ${d === today() ? 'today' : ''}" title="${esc(fmtLong(d))}"></span>`; }).join('');
  const pays = Object.values(db.payments).filter(x => x.member_id === m.id).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 6);
  drawer.panel.innerHTML = `
    <div class="m-head"><span class="sec-t" style="margin:0">Ficha del socio</span><button class="btn ghost icon-btn" data-close aria-label="Cerrar">${ic('x')}</button></div>
    <div class="d-body">
      <div class="d-top">${av(m.name, 'lg')}<div class="main"><h3>${esc(m.name)}</h3><div class="sub"><span class="pill ${s.k}">${esc(s.label)}</span>${m.example ? '<span class="tag">Ejemplo</span>' : ''}</div></div></div>
      <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <div class="ring" id="dRing"></div>
        <dl class="facts" style="flex:1;min-width:220px">
          <div><dt>Plan</dt><dd>${esc(planName(m))}</dd></div>
          <div><dt>Vence</dt><dd>${esc(fmtDate(m.end_date))}</dd></div>
          <div><dt>Celular</dt><dd style="user-select:all">${esc(m.phone || '—')}</dd></div>
          <div><dt>Entradas 30 d</dt><dd class="num">${visits}</dd></div>
        </dl>
      </div>
      <div class="d-actions">
        ${t ? `<button class="btn" disabled>${ic('check')}Entró a las ${esc(t.time)}</button>` : `<button class="btn ${s.k === 'ok' || s.k === 'warn' ? 'primary' : ''}" data-act="checkin" data-id="${m.id}">${ic('door')}Registrar entrada</button>`}
        <button class="btn ${s.k === 'bad' || s.k === 'none' ? 'primary' : ''}" data-act="renew" data-id="${m.id}">${ic('refresh')}Renovar plan</button>
        ${wa ? `<a class="btn wa" href="${esc(wa)}" target="_blank" rel="noopener">${ic('chat')}WhatsApp</a>` : `<button class="btn" disabled>${ic('chat')}Sin celular</button>`}
        <button class="btn" data-act="edit-member" data-id="${m.id}">${ic('edit')}Editar</button>
      </div>
      ${m.notes ? `<div class="notes"><b style="color:var(--ink)">Notas · </b>${esc(m.notes)}</div>` : ''}
      <div><div class="sec-t">Asistencia, últimas 5 semanas</div><div class="cal-h">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => `<span>${x}</span>`).join('')}</div><div class="cal">${cal}</div></div>
      <div><div class="sec-t">Pagos</div><div class="list">${pays.length ? pays.map(x => `<div class="item"><div class="date-col"><b>${parse(x.date).getDate()}</b><span>${esc(parse(x.date).toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''))}</span></div><div class="main"><span class="nm">${esc(x.concept)}</span><span class="sub">${esc(x.method || '')}</span></div><span class="amt in">${money(x.amount)}</span></div>`).join('') : '<p class="hint">Sin pagos registrados.</p>'}</div></div>
      <div style="display:flex;justify-content:flex-end"><button class="btn sm danger" data-act="del-member" data-id="${m.id}">${ic('trash')}Eliminar socio</button></div>
    </div>`;
  ring($('#dRing', drawer.panel), { pct: p ? (s.left + 1) / (p.days || 30) : 0, size: 112, stroke: 10, big: s.left >= 0 ? s.left : 0, lbl: s.left >= 0 ? (s.left === 1 ? 'día' : 'días') : 'vencido' });
}

/* ---------- ficha de cliente de personalizado ---------- */
function renderPtDrawer() {
  const c = db.pt_clients[drawerId]; if (!c) return closeDrawer();
  const s = st(c), wa = waLink(c, 'mensualidad de entrenamiento personalizado'), ses = ptSessions(c.id), tday = ptSessionOn(c.id, today());
  const ms = ptMonthStats(c.id), tot = ms.done + ms.missed;
  const pays = Object.values(db.payments).filter(x => x.client_id === c.id).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 6);
  const total = Math.max(1, diffDays(c.start_date || today(), c.end_date || today()) + 1);
  drawer.panel.innerHTML = `
    <div class="m-head"><span class="sec-t" style="margin:0">Entrenamiento personalizado</span><button class="btn ghost icon-btn" data-close aria-label="Cerrar">${ic('x')}</button></div>
    <div class="d-body">
      <div class="d-top">${av(c.name, 'lg')}<div class="main"><h3>${esc(c.name)}</h3><div class="sub"><span class="pill ${s.k}">${esc(s.label)}</span>${c.active === false ? '<span class="pill none">Pausado</span>' : ''}${c.example ? '<span class="tag">Ejemplo</span>' : ''}</div></div></div>
      <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <div class="ring" id="dRing"></div>
        <dl class="facts" style="flex:1;min-width:220px">
          <div><dt>Mensualidad</dt><dd>${money(c.price)}</dd></div>
          <div><dt>Vence</dt><dd>${esc(fmtDate(c.end_date))}</dd></div>
          <div style="grid-column:1/-1"><dt>Horario</dt><dd>${esc(ptSchedule(c))}</dd></div>
          <div style="grid-column:1/-1"><dt>Este mes</dt><dd>${ms.done} ${ms.done === 1 ? 'sesión' : 'sesiones'}${ms.missed ? ` · ${ms.missed} ${ms.missed === 1 ? 'falta' : 'faltas'}` : ''}${tot ? ` · ${Math.round(ms.done / tot * 100)} % de asistencia` : ''}</dd></div>
        </dl>
      </div>
      <div class="d-actions">
        ${tday ? `<button class="btn" data-act="pt-note" data-id="${c.id}" data-sid="${tday.id}">${ic('note')}${tday.status === 'done' ? 'Asistió hoy · nota' : 'Faltó hoy · nota'}</button>` : `<button class="btn primary" data-act="pt-done" data-id="${c.id}">${ic('check')}Asistió hoy</button>`}
        <button class="btn ${s.k === 'bad' || s.k === 'warn' ? 'primary' : ''}" data-act="pt-renew" data-id="${c.id}">${ic('refresh')}Cobrar mes</button>
        ${wa ? `<a class="btn wa" href="${esc(wa)}" target="_blank" rel="noopener">${ic('chat')}WhatsApp</a>` : `<button class="btn" disabled>${ic('chat')}Sin celular</button>`}
        <button class="btn" data-act="edit-pt" data-id="${c.id}">${ic('edit')}Editar</button>
      </div>
      ${c.goal ? `<div class="notes"><b style="color:var(--ink)">Objetivo · </b>${esc(c.goal)}</div>` : ''}
      ${c.notes ? `<div class="notes"><b style="color:var(--ink)">Notas · </b>${esc(c.notes)}</div>` : ''}
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div class="sec-t" style="margin:0">Sesiones</div><button class="btn xs" data-act="pt-note" data-id="${c.id}">${ic('plus')}Agregar sesión</button></div>
        <div class="list">${ses.length ? ses.slice(0, 12).map(x => `<div class="item"><div class="date-col"><b>${parse(x.date).getDate()}</b><span>${esc(parse(x.date).toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''))}</span></div>
          <div class="main"><span class="sub"><span class="pill ${x.status === 'done' ? 'ok' : 'bad'}">${x.status === 'done' ? 'Asistió' : 'Faltó'}</span>${esc(dayShort(parse(x.date).getDay()))}${x.time ? ` · ${esc(hm12(x.time))}` : ''}</span><span style="font-size:13.5px;color:${x.notes ? 'var(--ink)' : 'var(--faint)'}">${esc(x.notes || 'Sin nota')}</span></div>
          <button class="btn xs ghost icon-btn" style="width:30px" data-act="pt-note" data-id="${c.id}" data-sid="${x.id}" aria-label="Editar sesión">${ic('edit')}</button></div>`).join('') : '<p class="hint">Aún no hay sesiones registradas.</p>'}</div>
      </div>
      <div><div class="sec-t">Pagos</div><div class="list">${pays.length ? pays.map(x => `<div class="item"><div class="date-col"><b>${parse(x.date).getDate()}</b><span>${esc(parse(x.date).toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''))}</span></div><div class="main"><span class="nm">${esc(x.concept)}</span><span class="sub">${esc(x.method || '')}</span></div><span class="amt in">${money(x.amount)}</span></div>`).join('') : '<p class="hint">Sin pagos registrados.</p>'}</div></div>
      <div style="display:flex;justify-content:flex-end"><button class="btn sm danger" data-act="del-pt" data-id="${c.id}">${ic('trash')}Eliminar cliente</button></div>
    </div>`;
  ring($('#dRing', drawer.panel), { pct: (s.left + 1) / total, size: 112, stroke: 10, big: s.left >= 0 ? s.left : 0, lbl: s.left >= 0 ? (s.left === 1 ? 'día' : 'días') : 'vencido' });
}

function ptForm(id) {
  const c = id ? db.pt_clients[id] : null;
  const memOpts = members().map(m => `<option value="${m.id}" ${c?.member_id === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('');
  const days = c?.days || [1, 3, 5];
  openModal(c ? 'Editar cliente' : 'Nuevo cliente de personalizado', `<form class="form" id="f">
      ${members().length ? `<label class="field"><span>¿Ya es socio del gym? (opcional)</span><select id="tMember"><option value="">No, es un cliente nuevo</option>${memOpts}</select></label>` : ''}
      <label class="field"><span>Nombre completo</span><input id="tName" required maxlength="60" autocomplete="off" value="${esc(c?.name || '')}"></label>
      <div class="row2">
        <label class="field"><span>Celular (WhatsApp)</span><input id="tPhone" type="tel" inputmode="tel" maxlength="20" placeholder="300 123 4567" value="${esc(c?.phone || '')}"></label>
        <label class="field"><span>Mensualidad</span><input id="tPrice" type="number" inputmode="decimal" min="0" step="any" required value="${esc(c?.price ?? '')}" placeholder="300000"></label>
      </div>
      <div class="field"><span>Días de entrenamiento</span><div class="daypick">${WEEK.map(([n, l]) => `<label><input type="checkbox" value="${n}" ${days.includes(n) ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
      <div class="row2">
        <label class="field"><span>Hora</span><input id="tTime" type="time" value="${esc(c?.time || '06:00')}"></label>
        <label class="field"><span>${c ? 'Vence' : 'Empieza'}</span><input id="tDate" type="date" value="${esc(c ? (c.end_date || '') : today())}"></label>
      </div>
      <label class="field"><span>Objetivo</span><input id="tGoal" maxlength="120" placeholder="Bajar de peso, ganar fuerza, rehabilitación…" value="${esc(c?.goal || '')}"></label>
      <label class="field"><span>Notas</span><textarea id="tNotes" rows="2" maxlength="300" placeholder="Lesiones, restricciones, preferencias…">${esc(c?.notes || '')}</textarea></label>
      ${c ? `<label class="check"><input type="checkbox" id="tActive" ${c.active !== false ? 'checked' : ''}> Activo (aparece en la agenda)</label>` : `<label class="check"><input type="checkbox" id="tPay" checked> Cobrar el primer mes ahora</label><label class="field" id="tMethodL"><span>Medio de pago</span><select id="tMethod">${methodOpts('Efectivo')}</select></label>`}
      <p class="hint" id="tHint"></p>
      <div class="actions"><button type="button" class="btn" data-close>Cancelar</button><button class="btn primary">${ic('check')}${c ? 'Guardar cambios' : 'Agregar cliente'}</button></div>
    </form>`, (P, L) => {
    const g = q => $(q, P);
    const sync = () => { if (!c) { g('#tHint').innerHTML = `El mes queda pago hasta el <b>${esc(fmtLong(ptEnd(g('#tDate').value || today())))}</b>.`; g('#tMethodL').hidden = !g('#tPay').checked; } };
    g('#tMember')?.addEventListener('change', e => { const m = db.members[e.target.value]; if (m) { g('#tName').value = m.name; if (!g('#tPhone').value) g('#tPhone').value = m.phone || ''; } });
    g('#tDate').onchange = sync; g('#tPay')?.addEventListener('change', sync); sync();
    g('#f').onsubmit = e => {
      e.preventDefault();
      const name = g('#tName').value.trim(); if (!name) return;
      const row = { member_id: g('#tMember')?.value || null, name, phone: g('#tPhone').value.trim(), price: +g('#tPrice').value || 0,
        days: [...P.querySelectorAll('.daypick input:checked')].map(i => +i.value), time: g('#tTime').value || null, goal: g('#tGoal').value.trim(), notes: g('#tNotes').value.trim() };
      if (c) { D.patch('pt_clients', c.id, { ...row, end_date: g('#tDate').value || c.end_date, active: g('#tActive').checked }); toast('Cambios guardados'); L.close(); return; }
      const start = g('#tDate').value || today(), nid = uid();
      D.put('pt_clients', { id: nid, ...row, start_date: start, end_date: ptEnd(start), active: true, created_at: today(), example: false });
      if (g('#tPay').checked) D.put('payments', { id: uid(), type: 'in', date: today(), amount: row.price, method: g('#tMethod').value, concept: `Personalizado ${name}`, member_id: row.member_id, member_name: name, client_id: nid, created_at: new Date().toISOString(), example: false });
      toast(`${first(name)} agregado a personalizados`);
      L.close();
    };
  });
}

function ptRenewForm(id) {
  const c = db.pt_clients[id]; if (!c) return;
  const s = st(c), start0 = c.end_date && c.end_date >= today() ? addDays(c.end_date, 1) : today();
  openModal('Cobrar mensualidad', `<form class="form" id="f">
      <div class="item" style="margin:0">${av(c.name)}<div class="main"><span class="nm">${esc(c.name)}</span><span class="sub"><span class="pill ${s.k}">${esc(s.label)}</span>${esc(ptSchedule(c))}</span></div></div>
      <div class="row2">
        <label class="field"><span>Nuevo mes empieza</span><input id="rStart" type="date" value="${start0}"></label>
        <label class="field"><span>Valor</span><input id="rAmount" type="number" inputmode="decimal" min="0" step="any" required value="${esc(c.price ?? '')}"></label>
      </div>
      <label class="field"><span>Medio de pago</span><select id="rMethod">${methodOpts('Efectivo')}</select></label>
      <p class="hint" id="rHint"></p>
      <div class="actions"><button type="button" class="btn" data-close>Cancelar</button><button class="btn primary">${ic('check')}Cobrar y renovar</button></div>
    </form>`, (P, L) => {
    const g = q => $(q, P);
    const sync = () => { g('#rHint').innerHTML = `Queda pago hasta el <b>${esc(fmtLong(ptEnd(g('#rStart').value || today())))}</b>.`; };
    g('#rStart').onchange = sync; sync();
    g('#f').onsubmit = e => {
      e.preventDefault();
      const start = g('#rStart').value || today(), end = ptEnd(start);
      D.patch('pt_clients', id, { start_date: start, end_date: end, active: true });
      D.put('payments', { id: uid(), type: 'in', date: today(), amount: +g('#rAmount').value || 0, method: g('#rMethod').value, concept: `Personalizado ${c.name}`, member_id: c.member_id || null, member_name: c.name, client_id: id, created_at: new Date().toISOString(), example: !!c.example });
      toast(`Mensualidad cobrada hasta el ${fmtDate(end)}`);
      L.close();
    };
  });
}

function ptSessionForm(clientId, sessionId) {
  const c = db.pt_clients[clientId]; if (!c) return;
  const x = sessionId ? db.pt_sessions[sessionId] : null;
  openModal(x ? 'Sesión' : 'Agregar sesión', `<form class="form" id="f">
      <div class="item" style="margin:0">${av(c.name, 'sm')}<div class="main"><span class="nm">${esc(c.name)}</span><span class="sub">${esc(c.goal || ptSchedule(c))}</span></div></div>
      <div class="seg" id="sStatus" role="group" aria-label="Asistencia"><button type="button" data-s="done" aria-pressed="${!x || x.status === 'done'}">Asistió</button><button type="button" data-s="missed" aria-pressed="${x?.status === 'missed'}">Faltó</button></div>
      <div class="row2">
        <label class="field"><span>Fecha</span><input id="sDate" type="date" value="${esc(x?.date || today())}" max="${today()}"></label>
        <label class="field"><span>Hora</span><input id="sTime" type="time" value="${esc(x?.time || c.time || nowTime())}"></label>
      </div>
      <label class="field"><span>¿Qué entrenó?</span><textarea id="sNotes" rows="3" maxlength="400" placeholder="Ej: Pierna — sentadilla 4x10 con 60 kg, prensa, zancadas">${esc(x?.notes || '')}</textarea></label>
      <div class="actions">${x ? `<button type="button" class="btn danger" id="sDel" style="margin-right:auto">${ic('trash')}Borrar</button>` : ''}<button type="button" class="btn" data-close>Cancelar</button><button class="btn primary">${ic('check')}Guardar</button></div>
    </form>`, (P, L) => {
    const g = q => $(q, P);
    let status = x?.status || 'done';
    g('#sStatus').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; status = b.dataset.s; P.querySelectorAll('#sStatus button').forEach(k => k.setAttribute('aria-pressed', k.dataset.s === status)); };
    setTimeout(() => g('#sNotes').focus(), 80);
    g('#f').onsubmit = e => {
      e.preventDefault();
      const date = g('#sDate').value || today(), row = { status, date, time: g('#sTime').value || null, notes: g('#sNotes').value.trim() };
      const dup = !x && ptSessionOn(clientId, date);
      if (x) D.patch('pt_sessions', x.id, row);
      else if (dup) D.patch('pt_sessions', dup.id, row);
      else D.put('pt_sessions', { id: uid(), client_id: clientId, ...row, created_at: new Date().toISOString(), example: !!c.example });
      toast('Sesión guardada'); L.close();
    };
    g('#sDel')?.addEventListener('click', async () => { if (await confirmDialog({ title: 'Borrar sesión', text: 'Se quitará esta sesión del historial.', ok: 'Borrar' })) { D.remove('pt_sessions', x.id); toast('Sesión borrada'); L.close(); } });
  });
}

/* ---------- paleta rápida de entradas (Ctrl K) ---------- */
let pal = null;
function openPalette() {
  if (pal) return pal.input.focus();
  const L = openLayer('palette', `
    <div class="p-search">${ic('search')}<input id="pq" placeholder="¿Quién llegó? Escribe nombre o celular…" autocomplete="off" aria-label="Buscar socio"><kbd>Esc</kbd></div>
    <div class="p-list" id="plist" role="listbox"></div>
    <div class="p-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> elegir</span><span><kbd>Enter</kbd> registrar entrada</span><span><kbd>Shift</kbd> + <kbd>Enter</kbd> abrir ficha</span></div>`, () => { pal = null; });
  pal = { L, sel: 0, items: [], input: $('#pq', L.panel) };
  pal.input.addEventListener('input', () => { pal.sel = 0; renderPalette(); });
  pal.input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); pal.sel = clamp(pal.sel + (e.key === 'ArrowDown' ? 1 : -1), 0, Math.max(0, pal.items.length - 1)); renderPalette(); }
    if (e.key === 'Enter') { const m = pal.items[pal.sel]; if (!m) return; e.preventDefault(); if (e.shiftKey) { L.close(); openDrawer(m.id); } else { checkIn(m.id); pal.input.value = ''; pal.sel = 0; renderPalette(); } }
  });
  $('#plist', L.panel).addEventListener('click', e => {
    const it = e.target.closest('[data-i]'); if (!it) return;
    const m = pal.items[+it.dataset.i]; if (!m) return;
    if (e.target.closest('[data-open]')) { L.close(); openDrawer(m.id); } else { checkIn(m.id); pal.input.value = ''; renderPalette(); pal.input.focus(); }
  });
  renderPalette();
  setTimeout(() => pal?.input.focus(), 30);
}
function renderPalette() {
  if (!pal) return;
  const q = pal.input.value, sugg = !q.trim();
  pal.items = sugg ? usualNow(6) : matchMembers(q, 8);
  const el = $('#plist', pal.L.panel);
  if (!pal.items.length) {
    el.innerHTML = sugg ? `<div class="empty"><span class="em-ic">${ic('search')}</span>Escribe el nombre o el celular del socio que llegó.</div>`
      : `<div class="empty">No hay socios con “${esc(q.trim())}”.<button class="btn sm primary" data-act="new-member" data-name="${esc(q.trim())}">${ic('userplus')}Agregarlo como socio</button></div>`;
    return;
  }
  el.innerHTML = (sugg ? '<div class="sec-t" style="padding:8px 12px 2px">Suelen venir a esta hora</div>' : '') + pal.items.map((m, i) => {
    const s = st(m), t = todayEntry(m.id);
    return `<div class="p-item" role="option" data-i="${i}" aria-selected="${i === pal.sel}">${av(m.name, 'sm')}
      <div class="main"><span class="nm">${esc(m.name)}</span><span class="sub"><span class="pill ${s.k}">${esc(s.label)}</span>${esc(planName(m))}</span></div>
      <span class="end">${t ? `<span class="pill ok">Entró ${esc(t.time)}</span>` : i === pal.sel ? '<kbd>Enter</kbd>' : ''}<button class="btn xs ghost" data-open>Ficha</button></span></div>`;
  }).join('');
  el.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
}

/* =========================================================
   Formularios
   ========================================================= */
const methodOpts = sel => METHODS.map(m => `<option ${m === sel ? 'selected' : ''}>${m}</option>`).join('');
const planOpts = sel => plans().map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)} · ${money(p.price)}</option>`).join('');

function memberForm(id, preset = '') {
  const m = id ? db.members[id] : null;
  const pl = plans();
  const def = m ? (m.plan_id || '') : (pl.find(p => p.days >= 28 && p.days <= 31)?.id || pl[0]?.id || '');
  openModal(m ? 'Editar socio' : 'Nuevo socio', `<form class="form" id="f">
      <label class="field"><span>Nombre completo</span><input id="fName" required maxlength="60" autocomplete="off" value="${esc(m?.name || preset)}"></label>
      <label class="field"><span>Celular (WhatsApp)</span><input id="fPhone" type="tel" inputmode="tel" maxlength="20" placeholder="300 123 4567" value="${esc(m?.phone || '')}"></label>
      <div class="row2">
        <label class="field"><span>Plan</span><select id="fPlan"><option value="">Sin plan</option>${planOpts(def)}</select></label>
        <label class="field"><span>Empieza</span><input id="fStart" type="date" value="${esc(m?.start_date || today())}"></label>
      </div>
      ${m ? `<label class="field"><span>Vence</span><input id="fEnd" type="date" value="${esc(m.end_date || '')}"></label>` : '<p class="hint" id="fHint"></p>'}
      <label class="field"><span>Notas</span><textarea id="fNotes" rows="2" maxlength="300" placeholder="Lesiones, objetivo, horario…">${esc(m?.notes || '')}</textarea></label>
      ${m ? '' : `<label class="check" id="fPayL"><input type="checkbox" id="fPay" checked> Cobrar el plan ahora</label>
        <div class="row2" id="fPayRow"><label class="field"><span>Valor</span><input id="fAmount" type="number" inputmode="decimal" min="0" step="any"></label><label class="field"><span>Medio de pago</span><select id="fMethod">${methodOpts('Efectivo')}</select></label></div>`}
      <div class="actions"><button type="button" class="btn" data-close>Cancelar</button><button class="btn primary">${m ? 'Guardar cambios' : `${ic('userplus')}Agregar socio`}</button></div>
    </form>`, (P, L) => {
    const g = s => $(s, P);
    const sync = user => {
      const pid = g('#fPlan').value, start = g('#fStart').value || today();
      if (m) { if (user) g('#fEnd').value = calcEnd(start, pid) || ''; return; }
      g('#fHint').innerHTML = pid ? `Queda activo hasta el <b>${esc(fmtLong(calcEnd(start, pid)))}</b>.` : 'Sin plan: queda registrado pero no activo.';
      if (user !== 'pay') g('#fAmount').value = db.plans[pid]?.price ?? '';
      g('#fPayL').hidden = !pid; g('#fPayRow').hidden = !pid || !g('#fPay').checked;
    };
    g('#fPlan').onchange = () => sync(true); g('#fStart').onchange = () => sync(true);
    if (!m) g('#fPay').onchange = () => sync('pay');
    sync(false);
    g('#f').onsubmit = e => {
      e.preventDefault();
      const name = g('#fName').value.trim(); if (!name) return;
      const plan_id = g('#fPlan').value || null, start = g('#fStart').value || today();
      const row = { name, phone: g('#fPhone').value.trim(), notes: g('#fNotes').value.trim(), plan_id, start_date: plan_id ? start : null,
        end_date: plan_id ? (m ? (g('#fEnd').value || calcEnd(start, plan_id)) : calcEnd(start, plan_id)) : null };
      if (m) { D.patch('members', m.id, row); toast('Cambios guardados'); L.close(); return; }
      const nid = uid();
      D.put('members', { id: nid, ...row, created_at: today(), example: false });
      if (plan_id && g('#fPay').checked) D.put('payments', { id: uid(), type: 'in', date: today(), amount: +g('#fAmount').value || 0, method: g('#fMethod').value, concept: `Plan ${db.plans[plan_id]?.name || ''}`.trim(), member_id: nid, member_name: name, created_at: new Date().toISOString(), example: false });
      toast(`${first(name)} ya es socio`);
      L.close();
      pal?.L.close();
    };
  });
}

function renewForm(id) {
  const m = db.members[id]; if (!m) return;
  const pl = plans();
  if (!pl.length) return openModal('Renovar plan', `<p class="hint">Primero crea un plan.</p><div class="actions"><a class="btn primary" href="#/planes" data-close>Ir a Planes</a></div>`);
  const pid0 = db.plans[m.plan_id] ? m.plan_id : pl[0].id;
  const start0 = m.end_date && m.end_date >= today() ? addDays(m.end_date, 1) : today();
  const s = st(m);
  openModal('Renovar plan', `<form class="form" id="f">
      <div class="item" style="margin:0">${av(m.name)}<div class="main"><span class="nm">${esc(m.name)}</span><span class="sub"><span class="pill ${s.k}">${esc(s.label)}</span>${esc(planName(m))}</span></div></div>
      <div class="row2">
        <label class="field"><span>Plan</span><select id="rPlan">${planOpts(pid0)}</select></label>
        <label class="field"><span>Empieza</span><input id="rStart" type="date" value="${start0}"></label>
      </div>
      <p class="hint" id="rHint"></p>
      <div class="row2">
        <label class="field"><span>Valor cobrado</span><input id="rAmount" type="number" inputmode="decimal" min="0" step="any" required></label>
        <label class="field"><span>Medio de pago</span><select id="rMethod">${methodOpts('Efectivo')}</select></label>
      </div>
      <div class="actions"><button type="button" class="btn" data-close>Cancelar</button><button class="btn primary">${ic('check')}Cobrar y renovar</button></div>
    </form>`, (P, L) => {
    const g = q => $(q, P);
    const sync = amt => { const pid = g('#rPlan').value, st0 = g('#rStart').value || today(); g('#rHint').innerHTML = `Queda activo hasta el <b>${esc(fmtLong(calcEnd(st0, pid)))}</b>.`; if (amt) g('#rAmount').value = db.plans[pid]?.price ?? ''; };
    g('#rPlan').onchange = () => sync(true); g('#rStart').onchange = () => sync(false); sync(true);
    g('#f').onsubmit = e => {
      e.preventDefault();
      const pid = g('#rPlan').value, start = g('#rStart').value || today(), end = calcEnd(start, pid);
      D.patch('members', id, { plan_id: pid, start_date: start, end_date: end });
      D.put('payments', { id: uid(), type: 'in', date: today(), amount: +g('#rAmount').value || 0, method: g('#rMethod').value, concept: `Plan ${db.plans[pid]?.name || ''}`.trim(), member_id: id, member_name: m.name, created_at: new Date().toISOString(), example: !!m.example });
      toast(`Renovado hasta el ${fmtDate(end)}`);
      L.close();
    };
  });
}

function payForm(type = 'in') {
  const sug = { in: ['Mensualidad', 'Pase de día', 'Venta de bebidas', 'Suplementos', 'Entrenamiento personal'], out: ['Arriendo', 'Servicios (luz, agua, internet)', 'Sueldo entrenador', 'Mantenimiento de máquinas', 'Aseo', 'Compra de productos'] };
  openModal('Nuevo movimiento', `<form class="form" id="f">
      <div class="seg" id="pType" role="group" aria-label="Tipo"><button type="button" data-t="in" aria-pressed="${type === 'in'}">${'Ingreso'}</button><button type="button" data-t="out" aria-pressed="${type === 'out'}">Gasto</button></div>
      <label class="field"><span>Concepto</span><input id="pConcept" required maxlength="60" list="pSug" autocomplete="off"></label>
      <datalist id="pSug"></datalist>
      <div class="row2">
        <label class="field"><span>Valor</span><input id="pAmount" type="number" inputmode="decimal" min="0" step="any" required></label>
        <label class="field"><span>Fecha</span><input id="pDate" type="date" value="${today()}" required></label>
      </div>
      <label class="field"><span>Medio de pago</span><select id="pMethod">${methodOpts(type === 'out' ? 'Transferencia' : 'Efectivo')}</select></label>
      <div class="actions"><button type="button" class="btn" data-close>Cancelar</button><button class="btn primary">${ic('check')}Guardar</button></div>
    </form>`, (P, L) => {
    const g = q => $(q, P);
    const setT = t => { type = t; P.querySelectorAll('#pType button').forEach(b => b.setAttribute('aria-pressed', b.dataset.t === t)); g('#pSug').innerHTML = sug[t].map(s => `<option value="${esc(s)}">`).join(''); g('#pConcept').placeholder = sug[t][t === 'in' ? 2 : 0]; };
    g('#pType').onclick = e => { const b = e.target.closest('[data-t]'); if (b) setT(b.dataset.t); };
    setT(type);
    g('#f').onsubmit = e => {
      e.preventDefault();
      const date = g('#pDate').value || today();
      D.put('payments', { id: uid(), type, date, amount: +g('#pAmount').value || 0, method: g('#pMethod').value, concept: g('#pConcept').value.trim(), member_id: null, member_name: null, created_at: new Date().toISOString(), example: false });
      toast(type === 'in' ? 'Ingreso registrado' : 'Gasto registrado');
      cashMonth = date.slice(0, 7);
      L.close();
    };
  });
}

function planForm(id) {
  const p = id ? db.plans[id] : null;
  const color = p?.color || Object.keys(PLAN_COLORS)[plans().length % 6];
  openModal(p ? 'Editar plan' : 'Nuevo plan', `<form class="form" id="f">
      <label class="field"><span>Nombre</span><input id="plName" required maxlength="30" placeholder="Mensual" value="${esc(p?.name || '')}"></label>
      <div class="row2">
        <label class="field"><span>Duración (días)</span><input id="plDays" type="number" inputmode="numeric" min="1" max="730" required value="${esc(p?.days ?? 30)}"></label>
        <label class="field"><span>Precio</span><input id="plPrice" type="number" inputmode="decimal" min="0" step="any" required value="${esc(p?.price ?? '')}"></label>
      </div>
      <div class="field"><span>Color</span><div class="swatches">${Object.keys(PLAN_COLORS).map(c => `<label><input type="radio" name="plColor" value="${c}" ${c === color ? 'checked' : ''} aria-label="${c}"><span style="background:${pgrad(c)}"></span></label>`).join('')}</div></div>
      <p class="hint">Un plan de 30 días que empieza hoy vence el ${esc(fmtLong(addDays(today(), 29)))}.</p>
      <div class="actions">${p ? `<button type="button" class="btn danger" id="plDel" style="margin-right:auto">${ic('trash')}Eliminar</button>` : ''}<button type="button" class="btn" data-close>Cancelar</button><button class="btn primary">${ic('check')}Guardar</button></div>
    </form>`, (P, L) => {
    const g = q => $(q, P);
    g('#f').onsubmit = e => {
      e.preventDefault();
      D.put('plans', { id: p?.id || uid(), name: g('#plName').value.trim(), days: Math.max(1, Math.round(+g('#plDays').value || 30)), price: +g('#plPrice').value || 0, color: P.querySelector('input[name=plColor]:checked')?.value || 'violet' });
      toast('Plan guardado'); L.close();
    };
    g('#plDel')?.addEventListener('click', async () => {
      const n = Object.values(db.members).filter(m => m.plan_id === p.id).length;
      if (!await confirmDialog({ title: 'Eliminar plan', text: n ? `${n} socios tienen este plan. Conservan su fecha de vencimiento, pero el plan aparecerá como eliminado.` : 'Este plan no tiene socios.' })) return;
      D.remove('plans', p.id); toast('Plan eliminado'); L.close();
    });
  });
}

/* =========================================================
   Vistas
   ========================================================= */
let memQ = '', memF = 'todos', memSort = 'name', entDate = today(), cashMonth = today().slice(0, 7), cashF = 'all';
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; };
const emptyBox = (icon, title, text, btn = '') => `<div class="empty"><span class="em-ic">${ic(icon)}</span><strong>${title}</strong><span>${text}</span>${btn}</div>`;

const VIEWS = {
  /* ---------------- INICIO ---------------- */
  inicio: {
    title: () => greet(), eyebrow: () => `${fmtLong(today())} · ${settings().gym_name}`,
    html: () => `<div class="dash">
      <section class="card hero"><div class="ring" id="hRing"></div><div class="hero-side"><div><h2>Tu gimnasio hoy</h2><p class="hint" id="hSub"></p></div><div class="legend" id="hLegend"></div>
        <div class="btns"><button class="btn primary" data-act="palette">${ic('door')}Registrar entrada</button><button class="btn" data-act="new-member">${ic('userplus')}Nuevo socio</button></div></div></section>
      <div class="kpis" id="kpis"></div>
      <section class="card trend"><div class="card-h"><div><h2>Asistencia</h2><p>Entradas por día, últimos 30 días</p></div><div class="sub" id="trendMeta"></div></div><div class="chart" id="trend"></div></section>
      <section class="card"><div class="card-h"><div><h2>Para cobrar</h2><p>Vencen en 5 días o vencieron hace poco</p></div></div><div class="list" id="attn"></div></section>
      <section class="card"><div class="card-h"><div><h2>Entradas de hoy</h2><p id="liveSub"></p></div><button class="btn sm primary" data-act="palette">${ic('plus')}Entrada</button></div><div class="list timeline" id="live"></div></section>
      <section class="card"><div class="card-h"><div><h2>Horas pico</h2><p>Promedio de entradas por hora, últimas 4 semanas</p></div></div><div class="chart" id="hours"></div></section>
      <section class="card"><div class="card-h"><div><h2>Caja del mes</h2><p id="cashSub"></p></div><a class="btn sm" href="#/caja">Ver caja</a></div><div id="cashMini"></div></section>
    </div>`,
    update(v) {
      const ms = members(), S = ms.map(st), total = ms.length;
      const active = S.filter(s => s.left >= 0).length, soon = S.filter(s => s.left >= 0 && s.left <= 5).length, late = S.filter(s => s.left < 0).length;
      ring($('#hRing', v), { pct: total ? active / total : 0, big: active, lbl: active === 1 ? 'socio activo' : 'socios activos' });
      $('#hSub', v).textContent = total ? `${Math.round(active / total * 100)} % de tus ${total} socios tiene el plan al día.` : 'Agrega tu primer socio para empezar.';
      $('#hLegend', v).innerHTML = `<div><span class="dot ok"></span>Al día<b>${active - soon}</b></div><div><span class="dot warn"></span>Por vencer (5 días)<b>${soon}</b></div><div><span class="dot bad"></span>Vencidos o sin plan<b>${late}</b></div>`;

      // KPIs
      const t = today(), nowT = nowTime(), nT = dayList(t).length;
      const lw = dayList(addDays(t, -7)).filter(c => c.time <= nowT).length;
      const dlt = nT - lw, wd = parse(t).toLocaleDateString('es-CO', { weekday: 'long' });
      const days14 = Array.from({ length: 14 }, (_, i) => dayList(addDays(t, i - 13)).length);
      const ym = t.slice(0, 7), dom = parse(t).getDate(), inc = sum(monthPays(ym), 'in');
      const pd = parse(t); pd.setDate(1); pd.setMonth(pd.getMonth() - 1); const pym = D.iso(pd).slice(0, 7);
      const prevInc = sum(monthPays(pym).filter(p => parse(p.date).getDate() <= dom), 'in');
      const cum = []; let acc = 0; for (let d = 1; d <= dom; d++) { acc += sum(monthPays(`${ym}-${pad(d)}`), 'in'); cum.push(acc); }
      const incPct = prevInc ? Math.round((inc - prevInc) / prevInc * 100) : null;
      const news = ms.filter(m => String(m.created_at || '').startsWith(ym)).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      const delta = (d, txt) => `<span class="delta ${d > 0 ? 'up' : d < 0 ? 'down' : 'flat'}">${d > 0 ? '▲' : d < 0 ? '▼' : '='} ${txt}</span>`;
      $('#kpis', v).innerHTML = `
        <div class="card kpi"><div class="k-top"><span class="k-lbl">Entradas hoy</span><span class="k-ic">${ic('door')}</span></div><div class="k-val">${nT}</div>
          <div class="k-foot">${delta(dlt, Math.abs(dlt))}<span>vs el ${esc(wd)} pasado a esta hora</span></div>${spark(days14, 'sp1')}</div>
        <div class="card kpi"><div class="k-top"><span class="k-lbl">Ingresos del mes</span><span class="k-ic">${ic('trend')}</span></div><div class="k-val money">${money(inc)}</div>
          <div class="k-foot">${incPct === null ? '<span>Primer mes con datos</span>' : `${delta(incPct, Math.abs(incPct) + ' %')}<span>vs mismo día del mes pasado</span>`}</div>${spark(cum.length > 1 ? cum : [0, ...cum], 'sp2')}</div>
        <div class="card kpi"><div class="k-top"><span class="k-lbl">Socios nuevos del mes</span><span class="k-ic">${ic('userplus')}</span></div><div class="k-val">${news.length}</div>
          <div class="k-foot">${news.length ? `<span class="stack">${news.slice(0, 5).map(m => av(m.name)).join('')}</span><span>${esc(first(news[0].name))}${news.length > 1 ? ` y ${news.length - 1} más` : ''}</span>` : '<span>Ninguno todavía este mes</span>'}</div></div>`;

      // Tendencia 30 días
      const pts = Array.from({ length: 30 }, (_, i) => { const d = addDays(t, i - 29); const n = dayList(d).length; return { v: n, label: `${WD[parse(d).getDay()]} ${parse(d).getDate()}`, tip: fmtLong(d), tipV: `${n} ${n === 1 ? 'entrada' : 'entradas'}` }; });
      const tot = pts.reduce((a, p) => a + p.v, 0);
      $('#trendMeta', v).innerHTML = tot ? `<span class="pill none">Promedio ${(tot / 30).toFixed(1).replace('.', ',')} por día</span>` : '';
      if (tot) areaChart($('#trend', v), pts, { aria: 'Entradas por día en los últimos 30 días' });
      else $('#trend', v).innerHTML = emptyBox('trend', 'Aún no hay entradas', 'Cuando registres entradas verás aquí la asistencia de cada día.');

      // Para cobrar
      const near = x => { const l = st(x).left; return x.end_date && l <= 5 && l >= -15; };
      const att = [...ms.filter(near).map(m => ({ m, pt: false })), ...ptActive().filter(near).map(m => ({ m, pt: true }))].sort((a, b) => a.m.end_date.localeCompare(b.m.end_date));
      $('#attn', v).innerHTML = att.length ? att.slice(0, 6).map(({ m, pt }) => { const s = st(m), wa = pt ? waLink(m, 'mensualidad de entrenamiento personalizado') : waLink(m); return `<div class="item click" data-act="${pt ? 'pt' : 'member'}" data-id="${m.id}">${av(m.name)}<div class="main"><span class="nm">${esc(m.name)}</span><span class="sub"><span class="pill ${s.k}">${esc(s.label)}</span>${pt ? '<span class="tag">Personalizado</span>' : ''}</span></div>
          <span class="end">${wa ? `<a class="btn xs wa icon-btn" style="width:30px" href="${esc(wa)}" target="_blank" rel="noopener" title="Escribir por WhatsApp" aria-label="WhatsApp">${ic('chat')}</a>` : ''}<button class="btn xs primary" data-act="${pt ? 'pt-renew' : 'renew'}" data-id="${m.id}">${pt ? 'Cobrar' : 'Renovar'}</button></span></div>`; }).join('')
        + (att.length > 6 ? `<a class="btn sm ghost" href="#/socios" data-filter="pronto" style="margin-top:6px">Ver los ${att.length}</a>` : '')
        : emptyBox('check', 'Todo al día', 'Ningún plan vence en los próximos 5 días.');

      // Hoy
      const live = dayList(t);
      $('#liveSub', v).textContent = live.length ? `${live.length} ${live.length === 1 ? 'persona' : 'personas'} · última a las ${live[0].time}` : 'Nadie todavía';
      $('#live', v).innerHTML = live.length ? live.map(c => { const m = db.members[c.member_id] || { name: 'Socio eliminado' }; const s = st(m); return `<div class="item click" data-act="member" data-id="${c.member_id}"><span class="tl-time">${esc(c.time)}</span>${av(m.name, 'sm')}<div class="main"><span class="nm">${esc(m.name)}</span></div><span class="pill ${s.k}">${esc(s.label)}</span></div>`; }).join('')
        : emptyBox('door', 'Sin entradas hoy', 'Pulsa <kbd>Ctrl K</kbd> para registrar al primero.');

      // Horas pico
      const since = addDays(t, -28), hrs = Array(24).fill(0);
      Object.values(db.checkins).forEach(c => { if (c.date >= since && c.date < t) hrs[+String(c.time).slice(0, 2)]++; });
      const lo = 5, hi = 22, hp = [];
      for (let h = lo; h <= hi; h++) { const a = hrs[h] / 28; hp.push({ v: a, label: h % 3 === 0 ? `${h}h` : '', tip: `<b>${a.toFixed(1).replace('.', ',')}</b>entradas por día a las ${h}:00` }); }
      if (hrs.some(Boolean)) barChart($('#hours', v), hp, { h: 170, peak: true, fmt: x => x ? x.toFixed(x < 2 ? 1 : 0).replace('.', ',') : '0', aria: 'Promedio de entradas por hora' });
      else $('#hours', v).innerHTML = emptyBox('clock', 'Sin datos aún', 'Con unas semanas de entradas verás a qué hora se llena el gym.');

      // Caja
      const mp = monthPays(ym), out = sum(mp, 'out'), mx = Math.max(inc, out, 1);
      $('#cashSub', v).textContent = fmtMonth(ym);
      $('#cashMini', v).innerHTML = `<div class="minibars">
        <div class="mb"><div class="mb-top"><span>Ingresos</span><b>${money(inc)}</b></div><div class="track"><div class="fill in" style="width:${inc / mx * 100}%"></div></div></div>
        <div class="mb"><div class="mb-top"><span>Gastos</span><b>${money(out)}</b></div><div class="track"><div class="fill out" style="width:${out / mx * 100}%"></div></div></div>
        <div class="balance"><span class="hint">Balance</span><span class="amt ${inc - out < 0 ? 'out' : 'in'}">${money(inc - out)}</span></div></div>`;
    },
  },

  /* ---------------- SOCIOS ---------------- */
  socios: {
    title: () => 'Socios', eyebrow: () => { const ms = members(); return `${ms.length} registrados · ${ms.filter(m => st(m).left >= 0).length} activos`; },
    html: () => `<div class="toolbar">
        <label class="search">${ic('search')}<input class="input" id="mq" placeholder="Buscar por nombre o celular…" autocomplete="off" aria-label="Buscar socio" value="${esc(memQ)}"></label>
        <div class="seg" id="mf" role="group" aria-label="Filtrar"></div>
        <select class="input" id="ms" style="width:auto;min-width:170px" aria-label="Ordenar"><option value="name">Orden: nombre</option><option value="due">Orden: vencimiento</option><option value="last">Orden: última visita</option></select>
        <button class="btn primary" data-act="new-member">${ic('userplus')}Nuevo socio</button>
      </div>
      <section class="card" style="padding:14px 10px"><div class="table-head"><span>Socio</span><span>Plan</span><span>Vence</span><span class="c-status">Estado</span><span class="c-last">Última visita</span><span></span></div><div id="rows"></div></section>`,
    mount(v) {
      $('#mq', v).addEventListener('input', e => { memQ = e.target.value; VIEWS.socios.update(v); });
      $('#ms', v).value = memSort;
      $('#ms', v).addEventListener('change', e => { memSort = e.target.value; VIEWS.socios.update(v); });
      $('#mf', v).addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { memF = b.dataset.f; VIEWS.socios.update(v); } });
    },
    update(v) {
      const all = members(), last = ix().last;
      const G = { todos: all, aldia: all.filter(m => st(m).left > 5), pronto: all.filter(m => { const l = st(m).left; return l >= 0 && l <= 5; }), vencidos: all.filter(m => st(m).left < 0) };
      const labels = { todos: 'Todos', aldia: 'Al día', pronto: 'Por vencer', vencidos: 'Vencidos' };
      $('#mf', v).innerHTML = Object.keys(labels).map(k => `<button data-f="${k}" aria-pressed="${memF === k}">${labels[k]}<span class="n">${G[k].length}</span></button>`).join('');
      let list = G[memF];
      const n = norm(memQ.trim()), dg = n.replace(/\D/g, '');
      if (n) list = list.filter(m => norm(m.name).includes(n) || (dg.length >= 3 && String(m.phone || '').replace(/\D/g, '').includes(dg)));
      if (memSort === 'due') list = [...list].sort((a, b) => String(a.end_date || '0').localeCompare(String(b.end_date || '0')));
      if (memSort === 'last') list = [...list].sort((a, b) => String(last[b.id] || '').localeCompare(String(last[a.id] || '')));
      const el = $('#rows', v);
      if (!all.length) { el.innerHTML = emptyBox('users', 'Aún no tienes socios', 'Agrega el primero y empieza a llevar el control.', `<button class="btn primary" data-act="new-member">${ic('userplus')}Nuevo socio</button>`); return; }
      if (!list.length) { el.innerHTML = emptyBox('search', 'Sin resultados', 'No hay socios que coincidan con la búsqueda o el filtro.'); return; }
      el.innerHTML = list.map(m => {
        const s = st(m), p = planOf(m), t = todayEntry(m.id);
        const frac = p && m.end_date ? clamp((s.left + 1) / (p.days || 30), 0, 1) : 0;
        const col = s.k === 'ok' ? 'linear-gradient(90deg,#A3E635,#34D399)' : s.k === 'warn' ? 'linear-gradient(90deg,#FBBF24,#F97316)' : 'var(--bad)';
        return `<div class="trow" data-act="member" data-id="${m.id}">
          <div class="who">${av(m.name)}<div class="main"><span class="nm">${esc(m.name)}</span><span class="sub">${esc(m.phone || 'Sin celular')}${m.example ? ' <span class="tag">Ejemplo</span>' : ''}</span></div></div>
          <div><span class="plan-chip"><i style="background:${p ? pgrad(p.color) : 'var(--glass-3)'}"></i>${esc(planName(m))}</span></div>
          <div class="due"><span>${esc(fmtDate(m.end_date))}</span><div class="track"><div class="fill" style="width:${frac * 100}%;background:${col}"></div></div></div>
          <div class="c-status"><span class="pill ${s.k}">${esc(s.label)}</span></div>
          <div class="cell-muted c-last">${esc(ago(last[m.id]))}</div>
          <div class="end">${t ? `<span class="pill ok">${esc(t.time)}</span>` : `<button class="btn xs" data-act="checkin" data-id="${m.id}" title="Registrar entrada">${ic('door')}</button>`}<button class="btn xs ${s.k === 'ok' ? '' : 'primary'}" data-act="renew" data-id="${m.id}">Renovar</button></div>
        </div>`;
      }).join('');
    },
  },

  /* ---------------- ENTRADAS ---------------- */
  entradas: {
    title: () => 'Entradas', eyebrow: () => 'Registro de asistencia',
    html: () => `<div class="kiosk">
        <section class="card kiosk-hero">
          <div><h2>¿Quién llegó?</h2><p class="hint" style="margin-top:6px">Escribe el nombre o el celular. Con <kbd>Enter</kbd> registras al primero de la lista.</p></div>
          <label class="search">${ic('search')}<input class="input" id="kq" placeholder="Buscar socio…" autocomplete="off" aria-label="Buscar socio"></label>
          <div id="kTitle" class="sec-t" style="margin:0"></div>
          <div class="res-grid" id="kres"></div>
        </section>
        <section class="card">
          <div class="card-h"><div><h2 id="dTitle"></h2><p id="dSub"></p></div>
            <div class="day-nav"><button class="btn icon-btn" data-day="-1" aria-label="Día anterior">${ic('left')}</button><button class="btn sm" data-day="0">Hoy</button><button class="btn icon-btn" data-day="1" aria-label="Día siguiente">${ic('right')}</button></div></div>
          <div class="stats3" id="dStats"></div>
          <div class="list timeline" id="dList" style="max-height:520px"></div>
        </section>
      </div>`,
    mount(v) {
      const q = $('#kq', v);
      q.addEventListener('input', () => VIEWS.entradas.update(v));
      q.addEventListener('keydown', e => { if (e.key === 'Enter') { const b = $('#kres [data-act="checkin"]', v); if (b) { b.click(); q.value = ''; VIEWS.entradas.update(v); } } });
      $('.day-nav', v).addEventListener('click', e => { const b = e.target.closest('[data-day]'); if (!b) return; const d = +b.dataset.day; entDate = d === 0 ? today() : addDays(entDate, d); if (entDate > today()) entDate = today(); VIEWS.entradas.update(v); });
      setTimeout(() => q.focus(), 80);
    },
    update(v) {
      const q = $('#kq', v).value, list = q.trim() ? matchMembers(q, 9) : usualNow(6);
      $('#kTitle', v).textContent = q.trim() ? (list.length ? 'Resultados' : '') : (list.length ? 'Suelen venir a esta hora' : '');
      $('#kres', v).innerHTML = list.length ? list.map(m => {
        const s = st(m), t = todayEntry(m.id), late = s.k === 'bad' || s.k === 'none';
        return `<div class="res ${t ? 'in' : ''}"><div class="who" data-act="member" data-id="${m.id}" style="cursor:pointer">${av(m.name)}<div class="main"><span class="nm">${esc(m.name)}</span><span class="sub"><span class="pill ${s.k}">${esc(s.label)}</span></span></div></div>
          ${t ? `<button class="btn" disabled>${ic('check')}Entró a las ${esc(t.time)}</button>`
            : late ? `<div class="row2"><button class="btn primary" data-act="renew" data-id="${m.id}">Renovar</button><button class="btn" data-act="checkin" data-id="${m.id}">Entrada</button></div>`
              : `<button class="btn primary" data-act="checkin" data-id="${m.id}">${ic('door')}Registrar entrada</button>`}</div>`;
      }).join('') : q.trim() ? `<div class="empty" style="grid-column:1/-1">No hay socios con “${esc(q.trim())}”.<button class="btn sm primary" data-act="new-member" data-name="${esc(q.trim())}">${ic('userplus')}Agregarlo como socio</button></div>` : '';

      const d = entDate, L = dayList(d), isToday = d === today();
      $('#dTitle', v).textContent = isToday ? 'Hoy' : fmtLong(d);
      $('#dSub', v).textContent = isToday ? fmtLong(d) : `Hace ${diffDays(d, today())} días`;
      let week = 0, m28 = 0; for (let i = 0; i < 7; i++) week += dayList(addDays(d, -i)).length; for (let i = 1; i <= 28; i++) m28 += dayList(addDays(today(), -i)).length;
      $('#dStats', v).innerHTML = `<div class="stat"><b>${L.length}</b><span>Este día</span></div><div class="stat"><b>${week}</b><span>7 días</span></div><div class="stat"><b>${(m28 / 28).toFixed(1).replace('.', ',')}</b><span>Promedio diario</span></div>`;
      $('#dList', v).innerHTML = L.length ? L.map(c => { const m = db.members[c.member_id] || { name: 'Socio eliminado' }; return `<div class="item"><span class="tl-time">${esc(c.time)}</span>${av(m.name, 'sm')}<div class="main" data-act="member" data-id="${c.member_id}" style="cursor:pointer"><span class="nm">${esc(m.name)}</span><span class="sub">${esc(planName(m))}</span></div><button class="btn xs ghost icon-btn" style="width:30px" data-act="del-checkin" data-id="${c.id}" title="Quitar entrada" aria-label="Quitar entrada">${ic('x')}</button></div>`; }).join('')
        : emptyBox('door', 'Sin entradas', isToday ? 'Busca al socio a la izquierda para registrar su entrada.' : 'Ese día no se registraron entradas.');
      $('[data-day="1"]', v).disabled = isToday;
    },
  },

  /* ---------------- CAJA ---------------- */
  caja: {
    title: () => 'Caja', eyebrow: () => 'Ingresos y gastos',
    html: () => `<div class="toolbar">
        <div class="month"><button class="btn ghost icon-btn" data-m="-1" aria-label="Mes anterior">${ic('left')}</button><strong id="mLabel"></strong><button class="btn ghost icon-btn" data-m="1" aria-label="Mes siguiente">${ic('right')}</button></div>
        <span style="flex:1"></span>
        <button class="btn" data-act="new-out">${ic('out')}Gasto</button><button class="btn primary" data-act="new-in">${ic('in')}Ingreso</button>
      </div>
      <div class="k3" id="ck"></div>
      <section class="card"><div class="card-h"><div><h2>Flujo diario</h2><p>Ingresos y gastos de cada día del mes</p></div><div class="key"><span><span class="dot ok"></span>Ingresos</span><span><span class="dot bad"></span>Gastos</span></div></div><div class="chart" id="cChart"></div></section>
      <div class="cash-grid">
        <section class="card"><div class="card-h"><div><h2>Movimientos</h2><p id="cCount"></p></div><div class="seg" id="cf" role="group" aria-label="Filtrar"></div></div><div class="list" id="cList"></div></section>
        <section class="card"><div class="card-h"><div><h2>Medios de pago</h2><p>De dónde entró el dinero</p></div></div><div id="cDonut"></div></section>
      </div>`,
    mount(v) {
      $('.month', v).addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; const [y, m] = cashMonth.split('-').map(Number); const d = new Date(y, m - 1 + +b.dataset.m, 1); cashMonth = D.iso(d).slice(0, 7); VIEWS.caja.update(v); });
      $('#cf', v).addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { cashF = b.dataset.f; VIEWS.caja.update(v); } });
    },
    update(v) {
      const ym = cashMonth, mp = monthPays(ym), inc = sum(mp, 'in'), out = sum(mp, 'out'), bal = inc - out;
      $('#mLabel', v).textContent = fmtMonth(ym);
      $('[data-m="1"]', v).disabled = ym >= today().slice(0, 7);
      $('#ck', v).innerHTML = `
        <div class="card kpi"><div class="k-top"><span class="k-lbl">Ingresos</span><span class="k-ic" style="color:var(--ok)">${ic('in')}</span></div><div class="k-val money" style="color:var(--ok)">${money(inc)}</div><div class="k-foot">${mp.filter(p => p.type === 'in').length} movimientos</div></div>
        <div class="card kpi"><div class="k-top"><span class="k-lbl">Gastos</span><span class="k-ic">${ic('out')}</span></div><div class="k-val money" style="color:var(--bad)">${money(out)}</div><div class="k-foot">${mp.filter(p => p.type === 'out').length} movimientos</div></div>
        <div class="card kpi"><div class="k-top"><span class="k-lbl">Balance</span><span class="k-ic">${ic('wallet')}</span></div><div class="k-val money">${money(bal)}</div><div class="k-foot">${bal < 0 ? 'Los gastos superan lo que entró' : 'Lo que queda después de gastos'}</div></div>`;
      const [y, m] = ym.split('-').map(Number), dim = new Date(y, m, 0).getDate();
      const pts = Array.from({ length: dim }, (_, i) => { const d = `${ym}-${pad(i + 1)}`, dp = mp.filter(p => p.date === d), a = sum(dp, 'in'), b = sum(dp, 'out'); return { v: a, v2: b, label: (i + 1) % 5 === 0 || i === 0 ? String(i + 1) : '', tip: `<b>${esc(fmtDate(d))}</b>Ingresos ${esc(money(a))}<br>Gastos ${esc(money(b))}` }; });
      if (mp.length) barChart($('#cChart', v), pts, { h: 200, series: 2, fmt: x => money(x, true), aria: 'Ingresos y gastos por día' });
      else $('#cChart', v).innerHTML = emptyBox('wallet', 'Sin movimientos este mes', 'Registra un ingreso o un gasto con los botones de arriba.');
      const F = { all: 'Todos', in: 'Ingresos', out: 'Gastos' };
      $('#cf', v).innerHTML = Object.keys(F).map(k => `<button data-f="${k}" aria-pressed="${cashF === k}">${F[k]}</button>`).join('');
      const list = mp.filter(p => cashF === 'all' || p.type === cashF).sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.created_at || '').localeCompare(String(a.created_at || '')));
      $('#cCount', v).textContent = `${list.length} en ${fmtMonth(ym)}`;
      $('#cList', v).innerHTML = list.length ? list.map(p => { const who = p.member_id && db.members[p.member_id] ? db.members[p.member_id].name : p.member_name; return `<div class="item"><div class="date-col"><b>${parse(p.date).getDate()}</b><span>${esc(parse(p.date).toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', ''))}</span></div><span class="mv-ic ${p.type}">${ic(p.type === 'in' ? 'in' : 'out')}</span>
          <div class="main"><span class="nm">${esc(p.concept || 'Sin concepto')}</span><span class="sub">${esc(p.method || '')}${who ? ` · ${esc(who)}` : ''}${p.example ? ' <span class="tag">Ejemplo</span>' : ''}</span></div>
          <span class="amt ${p.type}">${p.type === 'out' ? '−' : '+'}${money(p.amount)}</span><button class="btn xs ghost icon-btn" style="width:30px" data-act="del-pay" data-id="${p.id}" aria-label="Borrar movimiento">${ic('trash')}</button></div>`; }).join('')
        : emptyBox('wallet', 'Nada por aquí', 'No hay movimientos con este filtro.');
      const by = {}; mp.filter(p => p.type === 'in').forEach(p => { by[p.method || 'Otro'] = (by[p.method || 'Otro'] || 0) + (+p.amount || 0); });
      const parts = Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, val]) => ({ label: k, v: val, color: METHOD_COLORS[k] || '#94A3B8' }));
      $('#cDonut', v).innerHTML = parts.length ? `<div class="donut-wrap"><div style="position:relative;display:grid;place-items:center">${donut(parts)}<div style="position:absolute;text-align:center"><b class="amt" style="font-size:16px">${money(inc, true)}</b><div class="hint" style="font-size:11.5px">ingresos</div></div></div>
          <div class="donut-legend">${parts.map(p => `<div><i style="background:${p.color}"></i>${esc(p.label)}<b>${Math.round(p.v / inc * 100)} %</b></div>`).join('')}</div></div>`
        : emptyBox('wallet', 'Sin ingresos', 'Aún no entra dinero este mes.');
    },
  },

  /* ---------------- PERSONALIZADOS ---------------- */
  personal: {
    title: () => 'Personalizados', eyebrow: () => 'Entrenamiento personal con mensualidad',
    html: () => `<div class="toolbar"><p class="hint" style="flex:1;min-width:220px">Tu agenda de clientes, su asistencia y lo que entrenó cada uno.</p>
        <button class="btn primary" data-act="new-pt">${ic('userplus')}Nuevo cliente</button></div>
      <div class="kpis4" id="ptK"></div>
      <div class="pt-top">
        <section class="card"><div class="card-h"><div><h2>Hoy</h2><p id="ptTodaySub"></p></div></div><div class="list" id="ptToday"></div></section>
        <section class="card"><div class="card-h"><div><h2>Esta semana</h2><p id="ptWeekSub"></p></div></div><div class="week-wrap"><div class="week" id="ptWeek"></div></div></section>
      </div>
      <div class="card-h" style="margin:6px 0 0"><div><h2 style="font-size:19px">Clientes</h2><p id="ptCount"></p></div></div>
      <div class="pt-grid" id="ptList"></div>`,
    update(v) {
      const all = ptClients(), act = ptActive(), t = today(), ym = t.slice(0, 7);
      const live = act.filter(c => st(c).left >= 0);
      const due = act.filter(c => { const l = st(c).left; return c.end_date && l <= 5; });
      let done = 0, missed = 0; all.forEach(c => { const m = ptMonthStats(c.id, ym); done += m.done; missed += m.missed; });
      const income = live.reduce((a, c) => a + (+c.price || 0), 0);
      $('#ptK', v).innerHTML = `
        <div class="card kpi"><div class="k-top"><span class="k-lbl">Clientes activos</span><span class="k-ic">${ic('target')}</span></div><div class="k-val">${live.length}</div><div class="k-foot">${all.length} en total</div></div>
        <div class="card kpi"><div class="k-top"><span class="k-lbl">Ingreso mensual</span><span class="k-ic">${ic('trend')}</span></div><div class="k-val money">${money(income)}</div><div class="k-foot">Suma de mensualidades al día</div></div>
        <div class="card kpi"><div class="k-top"><span class="k-lbl">Asistencia del mes</span><span class="k-ic">${ic('check')}</span></div><div class="k-val">${done + missed ? Math.round(done / (done + missed) * 100) + ' %' : '–'}</div><div class="k-foot">${done} sesiones · ${missed} faltas</div></div>
        <div class="card kpi"><div class="k-top"><span class="k-lbl">Por cobrar</span><span class="k-ic">${ic('wallet')}</span></div><div class="k-val" style="${due.length ? 'color:var(--warn)' : ''}">${due.length}</div><div class="k-foot">${due.length ? esc(due.slice(0, 2).map(c => first(c.name)).join(', ')) + (due.length > 2 ? ` y ${due.length - 2} más` : '') : 'Todos al día'}</div></div>`;

      // Hoy
      const todayList = ptScheduledOn(t), extra = all.filter(c => !todayList.includes(c) && ptSessionOn(c.id, t));
      const rows = [...todayList, ...extra];
      const pend = todayList.filter(c => !ptSessionOn(c.id, t)).length;
      $('#ptTodaySub', v).textContent = rows.length ? `${rows.length} ${rows.length === 1 ? 'sesión' : 'sesiones'}${pend ? ` · ${pend} por registrar` : ' · todas registradas'}` : fmtLong(t);
      $('#ptToday', v).innerHTML = rows.length ? rows.map(c => {
        const x = ptSessionOn(c.id, t), s = st(c);
        return `<div class="item"><span class="tl-time" style="width:62px">${esc(hm12(c.time))}</span>${av(c.name, 'sm')}
          <div class="main" data-act="pt" data-id="${c.id}" style="cursor:pointer"><span class="nm">${esc(c.name)}</span><span class="sub">${s.k === 'ok' ? esc(c.goal || ptSchedule(c)) : `<span class="pill ${s.k}">${esc(s.label)}</span>`}</span></div>
          <span class="end">${x ? `<span class="pill ${x.status === 'done' ? 'ok' : 'bad'}">${x.status === 'done' ? 'Asistió' : 'Faltó'}</span><button class="btn xs ghost icon-btn" style="width:30px" data-act="pt-note" data-id="${c.id}" data-sid="${x.id}" title="Nota de la sesión" aria-label="Nota de la sesión">${ic('note')}</button>`
            : `<button class="btn xs" data-act="pt-missed" data-id="${c.id}">Faltó</button><button class="btn xs primary" data-act="pt-done" data-id="${c.id}">${ic('check')}Asistió</button>`}</span></div>`;
      }).join('') : emptyBox('cal', 'Sin sesiones hoy', all.length ? 'Ningún cliente tiene entrenamiento programado para hoy.' : 'Agrega tu primer cliente con su horario.');

      // Semana (lunes a domingo)
      const mon = addDays(t, -((parse(t).getDay() + 6) % 7));
      let wkDone = 0, wkTotal = 0;
      $('#ptWeek', v).innerHTML = WEEK.map((w, i) => {
        const d = addDays(mon, i), list = ptScheduledOn(d), isT = d === t;
        return `<div class="wk-col ${isT ? 'now' : ''}"><div class="wk-h"><span>${w[1]}</span><b>${parse(d).getDate()}</b></div>${list.map(c => {
          const x = ptSessionOn(c.id, d), stt = x ? x.status : d < t ? 'unk' : 'next';
          if (d <= t) { wkTotal++; if (x?.status === 'done') wkDone++; }
          return `<button class="wk-chip ${stt}" data-act="pt" data-id="${c.id}" title="${esc(c.name)} · ${esc(hm12(c.time))}${x ? (x.status === 'done' ? ' · asistió' : ' · faltó') : d < t ? ' · sin registrar' : ''}"><span>${esc(hm12(c.time).replace(' ', ''))}</span>${esc(first(c.name))}</button>`;
        }).join('') || '<span class="wk-free">Libre</span>'}</div>`;
      }).join('');
      $('#ptWeekSub', v).textContent = wkTotal ? `${wkDone} de ${wkTotal} sesiones dadas hasta hoy` : 'Sin sesiones programadas';

      // Clientes
      const monthStart = `${ym}-01`;
      $('#ptCount', v).textContent = all.length ? `${act.length} activos${all.length > act.length ? ` · ${all.length - act.length} pausados` : ''}` : '';
      $('#ptList', v).innerHTML = all.length ? [...act, ...all.filter(c => c.active === false)].map(c => {
        const s = st(c), m = ptMonthStats(c.id, ym), wa = waLink(c, 'mensualidad de entrenamiento personalizado');
        let exp = 0; for (let d = monthStart; d <= t; d = addDays(d, 1)) if ((c.days || []).includes(parse(d).getDay())) exp++;
        const pct = exp ? clamp(m.done / exp, 0, 1) : 0;
        return `<article class="card ptc ${c.active === false ? 'off' : ''}" data-act="pt" data-id="${c.id}">
          <div class="who">${av(c.name)}<div class="main"><span class="nm">${esc(c.name)}</span><span class="sub"><span class="pill ${c.active === false ? 'none' : s.k}">${c.active === false ? 'Pausado' : esc(s.k === 'ok' ? `Pago · ${s.left} d` : s.label)}</span>${c.example ? '<span class="tag">Ejemplo</span>' : ''}</span></div></div>
          <div class="ptc-days">${WEEK.map(([n, l]) => `<span class="${(c.days || []).includes(n) ? 'on' : ''}" title="${l}">${'LMXJVSD'[(n + 6) % 7]}</span>`).join('')}<b>${esc(hm12(c.time))}</b></div>
          <div><div class="mb-top" style="display:flex;justify-content:space-between;font-size:13px;color:var(--muted);margin-bottom:6px"><span>Este mes</span><span><b style="color:var(--ink)">${m.done}</b> de ${exp} sesiones</span></div><div class="track" style="height:7px"><div class="fill in" style="width:${pct * 100}%"></div></div></div>
          ${c.goal ? `<p class="ptc-goal">${esc(c.goal)}</p>` : ''}
          <div class="ptc-foot"><span class="amt">${money(c.price)}<small>/mes</small></span><span class="end">${wa ? `<a class="btn xs wa icon-btn" style="width:30px" href="${esc(wa)}" target="_blank" rel="noopener" aria-label="WhatsApp">${ic('chat')}</a>` : ''}<button class="btn xs ${s.k === 'ok' ? '' : 'primary'}" data-act="pt-renew" data-id="${c.id}">Cobrar mes</button></span></div>
        </article>`;
      }).join('') : `<div class="card" style="grid-column:1/-1">${emptyBox('target', 'Aún no tienes clientes de personalizado', 'Agrega a cada cliente con su mensualidad y sus días de entrenamiento. La app arma tu agenda sola.', `<div class="actions" style="justify-content:center"><button class="btn" data-act="pt-demo">${ic('sparkle')}Ver con ejemplos</button><button class="btn primary" data-act="new-pt">${ic('userplus')}Nuevo cliente</button></div>`)}</div>`;
    },
  },

  /* ---------------- PLANES ---------------- */
  planes: {
    title: () => 'Planes', eyebrow: () => 'Precios y duración de tus membresías',
    html: () => `<div class="plans" id="pl"></div>`,
    update(v) {
      const ms = members();
      $('#pl', v).innerHTML = plans().map(p => {
        const act = ms.filter(m => m.plan_id === p.id && st(m).left >= 0).length, [c1] = PLAN_COLORS[p.color] || PLAN_COLORS.violet;
        return `<section class="card plan click" data-act="edit-plan" data-id="${p.id}" style="cursor:pointer"><span class="p-glow" style="background:radial-gradient(circle,${c1}66,transparent 70%)"></span>
          <span class="p-badge" style="background:${pgrad(p.color)}">${esc(ini(p.name).slice(0, 1))}</span>
          <div><h3>${esc(p.name)}</h3><p class="hint">${p.days} ${p.days == 1 ? 'día' : 'días'} de acceso</p></div>
          <div class="price">${money(p.price)}</div>
          <div class="p-meta"><span><b>${act}</b> ${act === 1 ? 'socio activo' : 'socios activos'}</span><span>${money(p.price / Math.max(1, p.days))}/día</span></div></section>`;
      }).join('') + `<button class="card plan add" data-act="new-plan">${ic('plus')}<span>Nuevo plan</span></button>`;
    },
  },

  /* ---------------- AJUSTES ---------------- */
  ajustes: {
    title: () => 'Ajustes', eyebrow: () => 'Configuración de GymControl',
    html: () => `<div class="settings">
        <form class="card form" id="gymF"><div class="card-h" style="margin:0"><div><h2>Tu gimnasio</h2><p>Nombre, moneda y WhatsApp</p></div></div>
          <label class="field"><span>Nombre del gimnasio</span><input id="sName" maxlength="40" placeholder="Mi Gym"></label>
          <div class="row2">
            <label class="field"><span>Moneda</span><select id="sCur"><option value="COP">Peso colombiano (COP)</option><option value="MXN">Peso mexicano (MXN)</option><option value="CLP">Peso chileno (CLP)</option><option value="ARS">Peso argentino (ARS)</option><option value="PEN">Sol peruano (PEN)</option><option value="USD">Dólar (USD)</option><option value="EUR">Euro (EUR)</option></select></label>
            <label class="field"><span>Indicativo WhatsApp</span><input id="sCc" inputmode="numeric" maxlength="4" placeholder="57"></label>
          </div>
          <p class="hint">El indicativo se antepone a los celulares para abrir WhatsApp (57 = Colombia).</p>
          <div class="actions"><button class="btn primary">${ic('check')}Guardar</button></div>
        </form>
        <section class="card" id="cloudCard"></section>
        <section class="card" id="installCard"></section>
        <section class="card"><div class="card-h"><div><h2>Copia de seguridad</h2><p>Guarda tus datos en un archivo o pásalos a Excel</p></div></div>
          <div class="actions" style="justify-content:flex-start"><button class="btn" data-act="export">${ic('download')}Descargar copia</button><label class="btn">${ic('upload')}Restaurar copia<input type="file" id="imp" accept="application/json,.json" hidden></label><button class="btn" data-act="csv">${ic('download')}Socios a Excel</button></div>
          <div id="exBox"></div>
        </section>
      </div>`,
    mount(v) {
      const s = settings();
      $('#sName', v).value = s.gym_name; $('#sCur', v).value = s.currency; $('#sCc', v).value = s.cc;
      $('#gymF', v).onsubmit = e => { e.preventDefault(); D.put('settings', { id: 'main', gym_name: $('#sName', v).value.trim() || 'Mi Gym', currency: $('#sCur', v).value, cc: $('#sCc', v).value.replace(/\D/g, '') || '57' }); toast('Ajustes guardados'); };
      $('#imp', v).onchange = e => { const f = e.target.files[0]; if (f) importJSON(f); e.target.value = ''; };
      cloudKey = '';
    },
    update(v) {
      renderCloud($('#cloudCard', v));
      const inst = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
      $('#installCard', v).innerHTML = `<div class="card-h"><div><h2>Instalar en este equipo</h2><p>Ícono propio, ventana propia y funciona sin internet</p></div></div>
        ${inst ? `<div class="cloud-state"><span class="dot ok"></span><div class="main"><b>GymControl ya está instalada</b><div class="hint">La abres desde el menú Inicio o la barra de tareas.</div></div></div>`
          : installEvt ? `<button class="btn primary" data-act="install">${ic('install')}Instalar GymControl</button>`
            : `<ol class="steps"><li>Abre esta página en <b>Microsoft Edge</b> o <b>Google Chrome</b>.</li><li>Edge: menú <b>⋯</b> → <b>Aplicaciones</b> → <b>Instalar este sitio como aplicación</b>. Chrome: el ícono <b>Instalar</b> a la derecha de la barra de direcciones.</li><li>Fíjala en la barra de tareas con clic derecho → <b>Anclar</b>.</li></ol>`}`;
      $('#exBox', v).innerHTML = hasExamples() ? `<div class="cloud-state" style="margin:16px 0 0"><span class="dot warn"></span><div class="main"><b>Hay datos de ejemplo</b><div class="hint">Bórralos cuando empieces con tu gimnasio. Tus datos reales y tus planes no se tocan.</div></div><button class="btn sm danger" data-act="clear-ex">Borrar</button></div>` : '';
    },
  },
};

/* ---------- tarjeta de la nube ---------- */
let cloudKey = '';
function renderCloud(el) {
  const key = `${meta.mode}|${status.state}|${D.cloudConfigured()}|${D.signedIn()}|${status.pending}|${meta.lastSync}|${status.email}`;
  if (key === cloudKey && el.childElementCount) return; // no borrar lo que el usuario está escribiendo
  cloudKey = key;
  const head = `<div class="card-h"><div><h2>Nube y sincronización</h2><p>Tus datos iguales en todos tus equipos</p></div></div>`;
  if (meta.mode === 'cloud' && D.signedIn()) {
    const s = status.state;
    el.innerHTML = head + `<div class="cloud-state"><span class="dot ${s === 'online' ? 'ok' : s === 'syncing' ? 'spin' : s === 'offline' ? 'warn' : 'bad'}"></span><div class="main"><b>${esc(status.email)}</b><div class="hint">${s === 'offline' ? `Sin conexión${status.pending ? ` · ${status.pending} cambios esperando` : ''}` : meta.lastSync ? `Última sincronización: ${new Date(meta.lastSync).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}` : 'Sincronizando…'}</div>${status.error && s === 'error' ? `<div class="hint" style="color:var(--bad)">${esc(status.error)}</div>` : ''}</div></div>
      <div class="actions" style="justify-content:flex-start"><button class="btn" data-act="sync-now">${ic('refresh')}Sincronizar ahora</button><button class="btn" data-act="upload-all">${ic('upload')}Subir datos de este equipo</button><button class="btn danger" data-act="sign-out">Cerrar sesión</button></div>`;
    return;
  }
  if (D.cloudConfigured()) {
    let mode = 'in';
    el.innerHTML = head + `<p class="hint" style="margin-bottom:14px">Entra con tu cuenta y tus datos quedan iguales en el PC, el teléfono y cualquier otro equipo. Cada cuenta solo ve sus propios datos.</p>
      <form class="form" id="loginF">
      <div class="seg" id="lMode" role="group" aria-label="Cuenta"><button type="button" data-m="in" aria-pressed="true">Ya tengo cuenta</button><button type="button" data-m="up" aria-pressed="false">Crear cuenta</button></div>
      <label class="field"><span>Correo</span><input id="lEmail" type="email" required autocomplete="username"></label>
      <label class="field"><span>Contraseña</span><input id="lPass" type="password" required minlength="6" autocomplete="current-password"></label>
      <p class="hint" id="lErr" style="color:var(--bad)" hidden></p>
      <p class="hint" id="lOk" hidden></p>
      <div class="actions"><button class="btn primary" id="lGo">${ic('cloud')}Iniciar sesión</button></div></form>`;
    $('#lMode', el).onclick = e => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      mode = b.dataset.m;
      el.querySelectorAll('#lMode button').forEach(k => k.setAttribute('aria-pressed', k.dataset.m === mode));
      $('#lGo', el).innerHTML = `${ic(mode === 'in' ? 'cloud' : 'userplus')}${mode === 'in' ? 'Iniciar sesión' : 'Crear cuenta'}`;
      $('#lPass', el).autocomplete = mode === 'in' ? 'current-password' : 'new-password';
    };
    $('#loginF', el).onsubmit = async e => {
      e.preventDefault();
      const b = $('#lGo', el), err = $('#lErr', el), okp = $('#lOk', el);
      b.disabled = true; err.hidden = true; okp.hidden = true;
      try {
        const r = mode === 'in' ? await D.signIn($('#lEmail', el).value, $('#lPass', el).value) : await D.signUp($('#lEmail', el).value, $('#lPass', el).value);
        if (r.confirm) { okp.innerHTML = `<b>Cuenta creada.</b> Te llegó un correo de Supabase: abre el enlace para confirmarla y luego vuelve aquí a <b>Ya tengo cuenta</b>.`; okp.hidden = false; b.disabled = false; return; }
        toast(r.uploaded ? 'Conectado. Tus datos se subieron a la nube.' : 'Conectado. Datos sincronizados.');
      } catch (x) { err.textContent = x.message; err.hidden = false; b.disabled = false; }
    };
    return;
  }
  el.innerHTML = head + `<p class="hint" style="margin-bottom:14px">Ahora los datos viven solo en este equipo. Conéctala a <b>Supabase</b> (gratis) para usarla en varios equipos y tener respaldo automático.</p>
    <ol class="steps" style="margin-bottom:16px"><li>Crea una cuenta y un proyecto en <b>supabase.com</b>.</li><li>En <b>SQL Editor</b> pega y ejecuta el archivo <code>supabase/schema.sql</code>.</li><li>En <b>Authentication → Users</b> crea tu usuario (correo y contraseña).</li><li>En <b>Project Settings → API</b> copia la <b>Project URL</b> y la clave <b>anon public</b> aquí abajo.</li></ol>
    <form class="form" id="cfgF"><label class="field"><span>Project URL</span><input id="cUrl" placeholder="https://abcd1234.supabase.co" autocomplete="off"></label>
      <label class="field"><span>Clave anon public</span><input id="cKey" placeholder="eyJhbGciOi…" autocomplete="off"></label>
      <p class="hint" id="cErr" style="color:var(--bad)" hidden></p>
      <div class="actions"><button class="btn primary">${ic('cloud')}Continuar</button></div></form>`;
  $('#cfgF', el).onsubmit = e => {
    e.preventDefault();
    try { D.configureCloud($('#cUrl', el).value, $('#cKey', el).value); cloudKey = ''; renderCloud(el); setTimeout(() => $('#lEmail', el)?.focus(), 50); }
    catch (x) { const c = $('#cErr', el); c.textContent = x.message; c.hidden = false; }
  };
}

/* =========================================================
   Marco: navegación, estado de sincronización, enrutado
   ========================================================= */
const NAV = [['inicio', 'Inicio', 'home'], ['socios', 'Socios', 'users'], ['entradas', 'Entradas', 'door'], ['personal', 'Personalizados', 'target', 'Personal'], ['caja', 'Caja', 'wallet'], ['planes', 'Planes', 'layers'], ['ajustes', 'Ajustes', 'gear']];
let current = 'inicio', installEvt = null;

function renderNav() {
  const soon = members().filter(m => { const l = st(m).left; return l >= 0 && l <= 5; }).length;
  const ptPend = ptScheduledOn(today()).filter(c => !ptSessionOn(c.id, today())).length;
  const badge = { socios: [soon, 'Planes por vencer'], personal: [ptPend, 'Sesiones de hoy por registrar'] };
  const html = NAV.map(([k, l, i]) => `<a href="#/${k}" ${k === current ? 'aria-current="page"' : ''}><span class="ic">${ic(i)}</span><span>${l}</span>${badge[k]?.[0] ? `<span class="badge" title="${badge[k][1]}">${badge[k][0]}</span>` : ''}</a>`).join('');
  $('#nav').innerHTML = html;
  $('#bnav').innerHTML = NAV.map(([k, l, i, short]) => `<a href="#/${k}" ${k === current ? 'aria-current="page"' : ''}>${ic(i)}<span>${short || l}</span></a>`).join('');
}
function renderChrome() {
  $('#sbGym').textContent = settings().gym_name;
  document.title = `GymControl · ${settings().gym_name}`;
  const s = status.state, P = status.pending;
  const map = { local: ['', 'Solo este equipo'], online: ['ok', 'Sincronizado'], syncing: ['spin', 'Sincronizando…'], offline: ['warn', `Sin conexión${P ? ` · ${P} pendientes` : ''}`], auth: ['bad', 'Inicia sesión'], error: ['bad', 'Error al sincronizar'] };
  const [cls, txt] = map[s] || map.local;
  $('#syncPill').innerHTML = `<span class="dot ${cls}"></span>${esc(txt)}`;
  $('#syncPill').title = status.error || 'Ver ajustes de la nube';
  const foot = [];
  if (installEvt) foot.push(`<div class="sb-card"><b>Instala GymControl</b>Ábrela desde el menú Inicio como cualquier programa.<button class="btn sm primary" data-act="install">${ic('install')}Instalar</button></div>`);
  else if (meta.mode !== 'cloud') foot.push(`<div class="sb-card"><b>Respalda tus datos</b>Conecta la nube para usarla en varios equipos.<a class="btn sm" href="#/ajustes">${ic('cloud')}Conectar</a></div>`);
  $('#sbFoot').innerHTML = foot.join('');
  $('#pageTitle').textContent = VIEWS[current].title();
  $('#pageEyebrow').textContent = VIEWS[current].eyebrow();
}
function route() {
  const k = (location.hash.match(/^#\/(\w+)/) || [])[1];
  current = VIEWS[k] ? k : 'inicio';
  const V = VIEWS[current], el = $('#view');
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  el.innerHTML = V.html();
  V.mount?.(el);
  renderNav(); renderChrome();
  V.update(el);
  window.scrollTo(0, 0);
}
function refresh() {
  IX = null;
  renderNav(); renderChrome();
  VIEWS[current].update($('#view'));
  renderDrawer(); renderPalette();
}

/* ---------- eventos globales ---------- */
document.addEventListener('click', async e => {
  const close = e.target.closest('[data-close]');
  if (close) { const L = layers.find(l => l.panel.contains(close)); if (L) { if (close.tagName !== 'A') e.preventDefault(); L.close(); } }
  const f = e.target.closest('[data-filter]'); if (f) memF = f.dataset.filter;
  if (e.target.closest('a[href^="https://"]')) return; // WhatsApp dentro de una fila: no abrir la ficha
  const b = e.target.closest('[data-act]'); if (!b) return;
  const id = b.dataset.id, a = b.dataset.act;
  switch (a) {
    case 'palette': openPalette(); break;
    case 'member': openDrawer(id); break;
    case 'pt': openPtDrawer(id); break;
    case 'new-pt': ptForm(); break;
    case 'edit-pt': ptForm(id); break;
    case 'pt-renew': ptRenewForm(id); break;
    case 'pt-done': ptMark(id, 'done'); break;
    case 'pt-missed': ptMark(id, 'missed'); break;
    case 'pt-note': ptSessionForm(id, b.dataset.sid); break;
    case 'del-pt': deletePt(id); break;
    case 'pt-demo': {
      // Solo agrega los ejemplos de personalizados (se borran luego en Ajustes → Borrar ejemplos).
      const demo = buildDemo(settings());
      Object.values(demo.pt_clients).forEach(r => D.put('pt_clients', r));
      Object.values(demo.pt_sessions).forEach(r => D.put('pt_sessions', r));
      Object.values(demo.payments).filter(p => p.client_id).forEach(r => D.put('payments', r));
      toast('Ejemplos de personalizados cargados');
      break;
    }
    case 'checkin': checkIn(id); break;
    case 'renew': renewForm(id); break;
    case 'new-member': memberForm(null, b.dataset.name || ''); break;
    case 'edit-member': memberForm(id); break;
    case 'del-member': deleteMember(id); break;
    case 'del-checkin': if (await confirmDialog({ title: 'Quitar entrada', text: 'Se quitará esta entrada del registro.', ok: 'Quitar' })) { D.remove('checkins', id); toast('Entrada quitada'); } break;
    case 'new-in': payForm('in'); break;
    case 'new-out': payForm('out'); break;
    case 'del-pay': if (await confirmDialog({ title: 'Borrar movimiento', text: `Se borrará <b>${esc(db.payments[id]?.concept || 'el movimiento')}</b> por ${esc(money(db.payments[id]?.amount))}.`, ok: 'Borrar' })) { D.remove('payments', id); toast('Movimiento borrado'); } break;
    case 'new-plan': planForm(); break;
    case 'edit-plan': planForm(id); break;
    case 'clear-ex': clearExamples(); break;
    case 'export': exportJSON(); break;
    case 'csv': exportCSV(); break;
    case 'install': if (installEvt) { installEvt.prompt(); const r = await installEvt.userChoice; if (r.outcome === 'accepted') { installEvt = null; toast('GymControl instalada'); refresh(); } } break;
    case 'sync-now': D.pull(); break;
    case 'upload-all': try { await D.uploadAll(); toast('Datos subidos a la nube'); D.pull(); } catch (x) { toast(x.message, { type: 'err' }); } break;
    case 'sign-out': if (await confirmDialog({ title: 'Cerrar sesión', text: 'La app seguirá funcionando solo con los datos de este equipo hasta que vuelvas a iniciar sesión.', ok: 'Cerrar sesión', danger: false })) { await D.signOut(); toast('Sesión cerrada'); } break;
    case 'cloud-reset': D.setMeta({ cloud: { url: '', key: '' }, mode: 'local' }); cloudKey = ''; refresh(); break;
  }
});
$('#cmdBtn').onclick = openPalette;
$('#syncPill').onclick = () => { location.hash = '#/ajustes'; };
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
  if (e.key === 'Escape' && layers.length) { e.preventDefault(); layers[layers.length - 1].close(); }
});
window.addEventListener('hashchange', () => { layers.slice().forEach(l => l.close()); route(); });
let rzT; window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => VIEWS[current].update($('#view')), 150); });
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; renderChrome(); if (current === 'ajustes') VIEWS.ajustes.update($('#view')); });
window.addEventListener('appinstalled', () => { installEvt = null; renderChrome(); });
setInterval(() => { if (!layers.length) refresh(); }, 60000);

/* ---------- bienvenida (primer uso) ---------- */
function welcome() {
  const w = document.createElement('div');
  w.className = 'welcome';
  w.innerHTML = `<div class="w-card">
    <img src="icons/icon.svg" alt="" width="56" height="56" style="border-radius:16px;filter:drop-shadow(0 10px 30px rgba(16,185,129,.6))">
    <div><h2>Tu gimnasio, <em>bajo control</em>.</h2><p class="hint" style="margin-top:10px;font-size:15px">Socios, entradas, vencimientos y caja en un solo lugar. ¿Cómo quieres empezar?</p></div>
    <label class="field"><span>Nombre de tu gimnasio</span><input class="input" id="wName" maxlength="40" placeholder="Ej: Titan Fitness"></label>
    <div style="display:flex;flex-direction:column;gap:10px">
      <button class="choice" data-w="demo"><span class="c-ic">${ic('sparkle')}</span><span><b>Explorar con datos de ejemplo</b><span>14 socios ficticios para probar todo. Luego los borras con un clic.</span></span></button>
      <button class="choice" data-w="empty"><span class="c-ic">${ic('userplus')}</span><span><b>Empezar con mi gimnasio</b><span>Arranca vacío con 4 planes base que puedes editar.</span></span></button>
      <button class="choice" data-w="cloud"><span class="c-ic">${ic('cloud')}</span><span><b>Entrar con mi cuenta</b><span>Trae los datos que ya tienes en la nube (por ejemplo, desde tu PC).</span></span></button>
    </div></div>`;
  document.body.append(w);
  w.addEventListener('click', e => {
    const b = e.target.closest('[data-w]'); if (!b) return;
    const name = $('#wName', w).value.trim() || 'Mi Gym', k = b.dataset.w;
    if (k === 'demo') D.replaceAll(buildDemo({ gym_name: name }));
    if (k === 'empty') {
      const base = buildDemo({ gym_name: name });
      D.replaceAll({ plans: base.plans, settings: base.settings, members: {}, payments: {}, checkins: {} });
    }
    if (k === 'cloud') D.put('settings', { id: 'main', gym_name: name, currency: 'COP', cc: '57' });
    D.setMeta({ setupDone: true });
    w.remove();
    location.hash = k === 'cloud' ? '#/ajustes' : '#/inicio';
    route();
    if (k === 'demo') toast('Datos de ejemplo cargados. Prueba Ctrl K para registrar una entrada.');
  });
  setTimeout(() => $('#wName', w).focus(), 100);
}

/* ---------- arranque ---------- */
D.load();
D.onChange(refresh);
route();
if (!meta.setupDone) welcome();
window.addEventListener('load', () => D.initCloud());
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('Hay una versión nueva de GymControl.', { type: 'info', action: { label: 'Actualizar', fn: () => { nw.postMessage('skip'); } } });
      });
    });
  }).catch(e => console.warn('Sin modo offline', e));
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
}
