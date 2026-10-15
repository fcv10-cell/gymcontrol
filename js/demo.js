// Datos de ejemplo para explorar la app. Todo lo creado aquí lleva example: true (menos los planes).
import { today, addDays, parse, uid, pad } from './data.js';

export function buildDemo(base = {}) {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const t = today();
  const plans = {};
  const P = (name, days, price, color) => { const id = uid(); plans[id] = { id, name, days, price, color }; return id; };
  const dia = P('Pase de día', 1, 10000, 'amber');
  const quin = P('Quincena', 15, 50000, 'pink');
  const mens = P('Mensual', 30, 90000, 'violet');
  const tri = P('Trimestral', 90, 240000, 'cyan');
  void dia;

  const people = [
    ['Laura Gómez', 13, mens, 'am'], ['Andrés Ruiz', 1, mens, 'pm'], ['Camila Torres', 23, tri, 'am'],
    ['Julián Pérez', -3, mens, 'pm'], ['Valentina Rojas', 5, quin, 'pm'], ['Sebastián Castro', 18, mens, 'pm'],
    ['Daniela Herrera', -10, mens, 'am'], ['Mateo López', 68, tri, 'pm'], ['Sofía Martínez', 3, mens, 'am'],
    ['Carlos Moreno', 24, mens, 'am'], ['Mariana Vargas', -21, mens, 'pm'], ['Felipe Ramírez', 9, mens, 'pm'],
    ['Isabella Ortiz', 0, quin, 'am'], ['Santiago Díaz', 27, mens, 'pm'],
  ];
  const notes = { 'Julián Pérez': 'Molestia en la rodilla derecha.', 'Laura Gómez': 'Objetivo: tonificar. Entrena antes del trabajo.', 'Mateo López': 'Rutina de fuerza, 4 días por semana.' };
  const members = {}, payments = {}, checkins = {};
  const pay = (date, amount, concept, method, type = 'in', m = null) => {
    const id = uid();
    payments[id] = { id, type, date, amount, method, concept, member_id: m?.id || null, member_name: m?.name || null, created_at: date + 'T12:00:00', example: true };
  };
  const methods = ['Efectivo', 'Nequi', 'Efectivo', 'Transferencia', 'Daviplata', 'Tarjeta'];

  people.forEach(([name, left, planId, slot], i) => {
    const p = plans[planId], end = addDays(t, left), start = addDays(end, -(p.days - 1));
    const id = uid();
    members[id] = { id, name, phone: `300 555 01${pad(i + 1)}`, plan_id: planId, start_date: start, end_date: end, notes: notes[name] || '', created_at: addDays(start, -Math.floor(rnd() * 120)), example: true, _slot: slot };
    pay(start, p.price, `Plan ${p.name}`, methods[i % methods.length], 'in', members[id]);
    if (rnd() > .35) pay(addDays(start, -p.days), p.price, `Plan ${p.name}`, methods[(i + 2) % methods.length], 'in', members[id]);
  });

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  for (let back = 45; back >= 0; back--) {
    const d = addDays(t, -back), dow = parse(d).getDay();
    const prob = dow === 0 ? .12 : dow === 6 ? .32 : .58;
    Object.values(members).forEach(m => {
      if (d < m.start_date || d > m.end_date) return;
      if (rnd() > prob) return;
      const base = dow === 0 || dow === 6 ? 8 * 60 + 30 : m._slot === 'am' ? 5 * 60 + 30 : 17 * 60;
      const min = base + Math.floor(rnd() * 170);
      if (back === 0 && min > nowMin) return;
      const id = uid();
      checkins[id] = { id, member_id: m.id, date: d, time: `${pad(Math.floor(min / 60))}:${pad(min % 60)}`, created_at: d, example: true };
    });
  }
  Object.values(members).forEach(m => delete m._slot);

  for (let back = 40; back >= 0; back -= 3 + Math.floor(rnd() * 4)) pay(addDays(t, -back), 8000 + Math.round(rnd() * 6) * 3000, rnd() > .5 ? 'Venta de bebidas' : 'Pase de día', 'Efectivo');
  const firstOf = (off) => { const d = parse(t); d.setMonth(d.getMonth() + off, 1); return d; };
  [-1, 0].forEach(off => {
    const d0 = firstOf(off), ym = `${d0.getFullYear()}-${pad(d0.getMonth() + 1)}`;
    const add = (day, amount, concept) => { const d = `${ym}-${pad(day)}`; if (d <= t) pay(d, amount, concept, 'Transferencia', 'out'); };
    add(1, 1200000, 'Arriendo'); add(5, 185000, 'Servicios (luz, agua, internet)'); add(15, 900000, 'Sueldo entrenador'); add(20, 140000, 'Mantenimiento de máquinas');
  });

  // Entrenamiento personalizado: mensualidad, horario fijo y sesiones de las últimas semanas.
  const pt_clients = {}, pt_sessions = {};
  const notesBank = ['Pierna: sentadilla 4x10, prensa, zancadas', 'Pecho y tríceps: press banca 4x8', 'Espalda: dominadas asistidas, remo con barra', 'Cardio HIIT 25 min + core', 'Hombro: press militar, elevaciones laterales', 'Full body + movilidad', 'Glúteo: hip thrust 4x12, peso muerto rumano'];
  [
    ['Paola Jiménez', 350000, [1, 3, 5], '06:00', 'Bajar 6 kg antes de diciembre', 12],
    ['Ricardo Suárez', 300000, [2, 4], '18:30', 'Ganar masa muscular', 3],
    ['Natalia Rincón', 400000, [1, 2, 4, 5], '07:00', 'Rehabilitación de rodilla y fuerza', 20],
    ['Jorge Medina', 300000, [1, 3], '19:30', 'Mejorar resistencia para fútbol', -2],
  ].forEach(([name, price, days, time, goal, left], i) => {
    const id = uid(), end = addDays(t, left);
    const d0 = parse(end); d0.setMonth(d0.getMonth() - 1); const start = addDays(`${d0.getFullYear()}-${pad(d0.getMonth() + 1)}-${pad(d0.getDate())}`, 1);
    pt_clients[id] = { id, member_id: null, name, phone: `310 555 02${pad(i + 1)}`, price, days, time, goal, notes: i === 2 ? 'Evitar impacto en rodilla izquierda.' : '', start_date: start, end_date: end, active: true, created_at: addDays(start, -40), example: true };
    pay(start, price, `Personalizado ${name}`, methods[(i + 1) % methods.length], 'in', null);
    payments[Object.keys(payments).pop()].client_id = id;
    for (let back = 34; back >= 1; back--) {
      const d = addDays(t, -back);
      if (!days.includes(parse(d).getDay())) continue;
      const sid = uid(), ok = rnd() > .14;
      pt_sessions[sid] = { id: sid, client_id: id, date: d, time, status: ok ? 'done' : 'missed', notes: ok ? notesBank[Math.floor(rnd() * notesBank.length)] : 'No vino, avisó por WhatsApp', created_at: d, example: true };
    }
  });

  return {
    plans, members, payments, checkins, pt_clients, pt_sessions,
    settings: { main: { id: 'main', gym_name: base.gym_name || 'Mi Gym', currency: 'COP', cc: '57' } },
  };
}
