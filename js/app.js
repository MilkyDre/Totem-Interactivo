import { OFFICES, DEPARTMENTS, TOTEM, METERS_PER_PX } from './data.js';
import { createScene } from './scene.js';

const IDLE_MS = 90_000; // vuelve a la pantalla de reposo tras 90 s sin uso
const ATTRACT_MS = 5_500; // cambio de mensaje en reposo

// Palabras extra para que la búsqueda encuentre lo que la gente suele escribir.
const KEYWORDS = {
  soporte: ['computador', 'pc', 'notebook', 'proyector', 'mouse', 'teclado', 'reparacion', 'equipo', 'impresora'],
  redes: ['wifi', 'internet', 'red', 'acceso', 'bloqueo', 'conexion'],
  sistemas: ['plataforma', 'servidor', 'sistema'],
  transformacion: ['ley 21180', 'digital', 'desarrollo'],
  ingenieria: ['desarrollo', 'software'],
  ccosto: ['documentos', 'compras informatica'],
  'adq-2': ['plan anual de compras', 'estado'],
  'adq-3': ['chilecompra', 'proveedor', 'mercadopublico'],
  'adq-4': ['orden de compra'],
  secretaria: ['documentos', 'recepcion', 'informacion'],
  abogados: ['legal', 'juridico', 'abogado'],
};

// Mensajes del modo reposo: [oficina, ícono, pregunta].
const PROMPTS = [
  ['soporte', '🔧', '¿Tu computador tiene problemas?'],
  ['redes', '🌐', '¿Te quedaste sin internet?'],
  ['adq-2', '🔎', '¿Quieres saber en qué va tu compra?'],
  ['secretaria', '📥', '¿Vienes a entregar documentos?'],
  ['soporte', '🖨️', '¿Falla tu impresora?'],
  ['adq-3', '🧭', '¿No sabes cómo comprar en Mercado Público?'],
  ['abogados', '⚖️', '¿Necesitas revisión legal de una contratación?'],
  ['transformacion', '🏛️', '¿Dudas sobre la Ley 21.180?'],
  ['adq-5', '📜', '¿Buscas un decreto que aprueba un llamado?'],
  ['sistemas', '🧩', '¿Problemas con una plataforma municipal?'],
];

// Orden de la pantalla principal: lo más consultado primero.
const ORDER = ['soporte', 'redes', 'secretaria', 'adq-2', 'adq-3', 'adq-1', 'sistemas', 'transformacion',
  'ccosto', 'abogados', 'adq-4', 'adq-5', 'ingenieria', 'jefe-adq', 'jefe-tic'];

const $ = (s) => document.querySelector(s);
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const deptColor = (o) => (o.dept ? DEPARTMENTS[o.dept].color : '#a78bfa');
const byId = (id) => OFFICES.find((o) => o.id === id);

// ---------- Escalado del lienzo 1080x1920 ----------
function fit() {
  const scale = Math.min(window.innerWidth / 1080, window.innerHeight / 1920);
  $('#stage').style.setProperty('--scale', scale);
}
fit();
window.addEventListener('resize', fit);

// ---------- Reloj ----------
function tick() {
  const now = new Date();
  $('#clock-time').textContent = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  $('#clock-date').textContent = now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
}
tick();
setInterval(tick, 10_000);

// ---------- Escena 3D ----------
const view = createScene($('#viewport'), { onSelect: (id) => openOffice(id) });

// ---------- Ubicación resumida ----------
function where(office) {
  const [dx, dy] = office.door;
  const meters = Math.max(5, Math.round((view.routeLengthPx(office) * METERS_PER_PX) / 5) * 5);
  if (dx > TOTEM.x) return `Al fondo del hall, junto a la Escalera N°1 · ≈ ${meters} m`;
  const north = dy < 230;
  const side = north ? 'derecha' : 'izquierda';
  if (office.id.startsWith('jefe-')) return `Al final del pasillo, a la ${side} · ≈ ${meters} m`;
  const before = OFFICES.filter((o) => o !== office
    && !o.id.startsWith('jefe-')
    && o.door[0] < TOTEM.x
    && (o.door[1] < 230) === north
    && o.door[0] > dx).length;
  return `${before + 1}.ª puerta a la ${side} del pasillo · ≈ ${meters} m`;
}

// ---------- Ficha de la oficina ----------
function openOffice(id, highlight = null) {
  const office = byId(id);
  if (!office) return;
  view.select(id);
  const detail = $('#detail');
  detail.style.setProperty('--c', deptColor(office));
  $('#detail-icon').textContent = office.icon;
  $('#detail-dept').textContent = office.dept ? DEPARTMENTS[office.dept].full : 'Espacio común';
  $('#detail-name').textContent = office.name;
  $('#detail-tagline').textContent = office.tagline || '';
  $('#detail-services').replaceChildren(...office.services.map((s, i) => {
    const card = document.createElement('div');
    card.className = `svc${i === highlight ? ' hl' : ''}`;
    card.style.animationDelay = `${0.08 * i + 0.15}s`;
    card.innerHTML = '<span class="svc-ic"></span><span class="svc-tx"><b></b><small></small></span>';
    card.querySelector('.svc-ic').textContent = s.i;
    card.querySelector('b').textContent = s.t;
    card.querySelector('small').textContent = s.d;
    return card;
  }));
  const n = office.services.length;
  $('#detail-services').dataset.n = n === 1 ? '1' : n > 4 ? 'many' : 'few';
  $('#detail-where').textContent = `📍 ${where(office)}`;
  detail.hidden = false;
  detail.classList.remove('enter');
  void detail.offsetWidth; // reinicia la animación
  detail.classList.add('enter');
  hideKeyboard();
}

function closeOffice() {
  $('#detail').hidden = true;
  view.select(null);
  view.resetView();
}
$('#detail-close').addEventListener('click', closeOffice);
$('#detail-tour').addEventListener('click', () => view.playTour());

// ---------- Trámites (pantalla principal) ----------
let filter = 'all';
let query = '';

function renderResults() {
  const q = norm(query.trim());
  const items = [];
  ORDER.map(byId).filter((o) => filter === 'all' || o.dept === filter).forEach((o) => {
    const extra = norm([o.name, o.short, DEPARTMENTS[o.dept].name, ...(KEYWORDS[o.id] || [])].join(' '));
    o.services.forEach((s, i) => {
      if (!q || norm(`${s.t} ${s.d}`).includes(q) || extra.includes(q)) items.push({ o, s, i });
    });
  });

  const box = $('#results');
  if (!items.length) {
    box.innerHTML = '<div class="empty">No encontramos resultados 🤔<br>Prueba con otra palabra o consulta en Secretaría.</div>';
    return;
  }
  box.replaceChildren(...items.map(({ o, s, i }, n) => {
    const b = document.createElement('button');
    b.className = 'tile';
    b.style.setProperty('--c', deptColor(o));
    b.style.animationDelay = `${Math.min(n, 12) * 0.03}s`;
    b.innerHTML = '<span class="tile-ic"></span><b></b><span class="tile-office"></span>';
    b.querySelector('.tile-ic').textContent = s.i;
    b.querySelector('b').textContent = s.t;
    b.querySelector('.tile-office').textContent = o.short;
    b.addEventListener('click', () => openOffice(o.id, i));
    return b;
  }));
  box.scrollTop = 0;
}

document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === t));
  filter = t.dataset.filter;
  renderResults();
}));

function setQuery(q) {
  query = q;
  const txt = $('#search-text');
  txt.textContent = q || 'Buscar…';
  txt.classList.toggle('placeholder', !q);
  $('#search-clear').hidden = !q;
  renderResults();
}

// ---------- Teclado en pantalla ----------
const ROWS = ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM⌫'];
const kb = $('#keyboard');
ROWS.forEach((row) => {
  const r = document.createElement('div');
  r.className = 'kb-row';
  [...row].forEach((ch) => {
    const k = document.createElement('button');
    k.className = 'key';
    k.textContent = ch;
    k.dataset.key = ch === '⌫' ? 'back' : ch.toLowerCase();
    r.appendChild(k);
  });
  kb.appendChild(r);
});
const last = document.createElement('div');
last.className = 'kb-row';
last.innerHTML = '<button class="key mid" data-key="clear">Borrar</button>'
  + '<button class="key wide" data-key=" ">espacio</button>'
  + '<button class="key mid" data-key="done">Listo</button>';
kb.appendChild(last);

kb.addEventListener('click', (e) => {
  const key = e.target.closest('.key')?.dataset.key;
  if (!key) return;
  if (key === 'back') setQuery(query.slice(0, -1));
  else if (key === 'clear') setQuery('');
  else if (key === 'done') hideKeyboard();
  else if (query.length < 40) setQuery(query + key);
});

function showKeyboard() {
  kb.hidden = false;
  $('.tabs').hidden = true;
  $('#search-box').classList.add('focus');
}
function hideKeyboard() {
  kb.hidden = true;
  $('.tabs').hidden = false;
  $('#search-box').classList.remove('focus');
}
$('#search-box').addEventListener('click', (e) => {
  if (e.target.closest('#search-clear')) return;
  showKeyboard();
});
$('#search-clear').addEventListener('click', () => setQuery(''));

// ---------- Herramientas de la vista ----------
$('#btn-reset').addEventListener('click', () => {
  if (!$('#detail').hidden) closeOffice();
  else view.resetView();
});
$('#btn-plan').addEventListener('click', (e) => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  e.currentTarget.setAttribute('aria-pressed', String(on));
  view.setPlanVisible(on);
});

// ---------- Reposo: va mostrando trámites en el modelo ----------
let idleTimer = null;
let attractTimer = null;
let promptIdx = 0;

function showPrompt() {
  const [id, icon, q] = PROMPTS[promptIdx % PROMPTS.length];
  promptIdx++;
  const office = byId(id);
  const card = $('.attract-card');
  card.style.setProperty('--c', deptColor(office));
  card.classList.remove('swap');
  void card.offsetWidth;
  card.classList.add('swap');
  $('#attract-icon').textContent = icon;
  $('#attract-q').textContent = q;
  $('#attract-a').textContent = `${office.short} te ayuda · ${office.dept === 'adq' ? 'Adquisiciones' : 'Informática'}`;
  view.select(id);
}

function goIdle() {
  $('#detail').hidden = true;
  hideKeyboard();
  setQuery('');
  $('#attract').classList.remove('hidden');
  view.select(null);
  view.resetView();
  view.setAutoRotate(false);
  clearInterval(attractTimer);
  attractTimer = setInterval(showPrompt, ATTRACT_MS);
  setTimeout(showPrompt, 1500);
}

function wake() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(goIdle, IDLE_MS);
}

$('#attract').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  clearInterval(attractTimer);
  $('#attract').classList.add('hidden');
  view.select(null);
  view.resetView();
  wake();
});
window.addEventListener('pointerdown', wake, true);
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Permite abrir una oficina directo por URL (útil para pruebas o QR): ?oficina=soporte
const initial = new URLSearchParams(location.search).get('oficina');
renderResults();
if (initial) {
  $('#attract').classList.add('hidden');
  openOffice(initial);
  wake();
} else {
  goIdle();
}
