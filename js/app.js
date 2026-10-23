import { OFFICES, DEPARTMENTS, TOTEM, METERS_PER_PX } from './data.js';
import { createScene } from './scene.js';

const IDLE_MS = 90_000; // vuelve a la pantalla de reposo tras 90 s sin uso

// Palabras extra para que la búsqueda encuentre lo que la gente suele escribir.
const KEYWORDS = {
  soporte: ['computador', 'pc', 'notebook', 'proyector', 'mouse', 'teclado', 'reparacion', 'equipo'],
  redes: ['wifi', 'internet', 'red', 'acceso', 'bloqueo', 'pagina bloqueada'],
  sistemas: ['plataforma', 'servidor', 'sistema'],
  transformacion: ['ley 21180', 'digital', 'desarrollo'],
  ingenieria: ['desarrollo', 'software'],
  ccosto: ['documentos', 'compras informatica'],
  'adq-2': ['plan anual de compras'],
  'adq-3': ['chilecompra', 'proveedor', 'mercadopublico'],
  'adq-4': ['orden de compra'],
  secretaria: ['documentos', 'recepcion', 'informacion'],
  abogados: ['legal', 'juridico', 'abogado'],
};

const $ = (s) => document.querySelector(s);
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const deptColor = (o) => (o.dept ? DEPARTMENTS[o.dept].color : '#a78bfa');

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
const view = createScene($('#viewport'), { onSelect: openOffice });

// ---------- Indicaciones ----------
function directions(office) {
  const [dx, dy] = office.door;
  const meters = Math.max(5, Math.round((view.routeLengthPx(office) * METERS_PER_PX) / 5) * 5);
  const steps = [];

  if (dx > TOTEM.x) {
    steps.push('Desde el tótem, camine hacia el extremo del hall, en dirección contraria al pasillo de oficinas.');
    steps.push(`La ${office.short} está al fondo, junto a la Escalera N°1.`);
    return { steps, meters };
  }

  const north = dy < 230; // fila de Informática
  const side = north ? 'derecha' : 'izquierda';
  steps.push('Desde el tótem, entre al pasillo central (de espaldas a los ascensores, gire hacia las oficinas).');

  if (office.id.startsWith('jefe-')) {
    steps.push(`Recorra el pasillo completo, pasando la Escalera N°2 (≈ ${meters} m).`);
    steps.push(`Al final del pasillo, la oficina queda a su ${side}.`);
  } else {
    const before = OFFICES.filter((o) => o !== office
      && !o.id.startsWith('jefe-')
      && o.door[0] < TOTEM.x
      && (o.door[1] < 230) === north
      && o.door[0] > dx).length;
    steps.push(`Avance por el pasillo ≈ ${meters} m.`);
    steps.push(`Es la ${before + 1}.ª puerta a su ${side}.`);
  }
  steps.push(`Busque el letrero «${office.short}».`);
  return { steps, meters };
}

// ---------- Ficha ----------
function openOffice(id) {
  const office = OFFICES.find((o) => o.id === id);
  if (!office) return;
  view.select(id);
  const detail = $('#detail');
  detail.style.setProperty('--c', deptColor(office));
  $('#detail-icon').textContent = office.icon;
  $('#detail-dept').textContent = office.dept ? DEPARTMENTS[office.dept].full : 'Espacio común';
  $('#detail-name').textContent = office.name;
  $('#detail-services').replaceChildren(...office.services.map((s) => {
    const li = document.createElement('li');
    li.textContent = s;
    return li;
  }));
  const { steps, meters } = directions(office);
  $('#detail-route').replaceChildren(...steps.map((s) => {
    const li = document.createElement('li');
    li.textContent = s;
    return li;
  }));
  $('#detail-distance').textContent = `🚶 ≈ ${meters} m · ${Math.max(1, Math.round(meters / 60))} min caminando`;
  detail.hidden = false;
  detail.scrollTop = 0;
  hideKeyboard();
}

function closeOffice() {
  $('#detail').hidden = true;
  view.select(null);
  view.resetView();
}
$('#detail-close').addEventListener('click', closeOffice);

// ---------- Listado y búsqueda ----------
let filter = 'all';
let query = '';

function renderResults() {
  const q = norm(query.trim());
  const list = OFFICES.filter((o) => filter === 'all' || o.dept === filter)
    .map((o) => {
      if (!q) return { o, hits: [] };
      const hits = o.services.filter((s) => norm(s).includes(q));
      const haystack = norm([o.name, o.short, o.dept ? DEPARTMENTS[o.dept].name : '', ...(KEYWORDS[o.id] || [])].join(' '));
      return hits.length || haystack.includes(q) ? { o, hits } : null;
    })
    .filter(Boolean);

  const box = $('#results');
  if (!list.length) {
    box.innerHTML = '<div class="empty">No encontramos resultados.<br>Pruebe con otra palabra o consulte en Secretaría.</div>';
    return;
  }
  box.replaceChildren(...list.map(({ o, hits }) => {
    const b = document.createElement('button');
    b.className = 'result';
    b.style.setProperty('--c', deptColor(o));
    b.innerHTML = `<span class="ic"></span><span class="tx"><b></b><small></small></span>`;
    b.querySelector('.ic').textContent = o.icon;
    b.querySelector('b').textContent = o.short;
    b.querySelector('small').textContent = (hits.length ? hits : o.services).join(' · ');
    b.addEventListener('click', () => openOffice(o.id));
    return b;
  }));
}

document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === t));
  filter = t.dataset.filter;
  renderResults();
}));

function setQuery(q) {
  query = q;
  const txt = $('#search-text');
  txt.textContent = q || 'Buscar trámite u oficina…';
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

// ---------- Reposo ----------
let idleTimer = null;
function goIdle() {
  $('#detail').hidden = true;
  view.select(null);
  view.resetView();
  hideKeyboard();
  setQuery('');
  $('#attract').classList.remove('hidden');
  view.setAutoRotate(true);
}
function wake() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(goIdle, IDLE_MS);
}
$('#attract').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  $('#attract').classList.add('hidden');
  view.setAutoRotate(false);
  view.resetView();
  wake();
});
window.addEventListener('pointerdown', wake, true);
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Permite abrir una oficina directo por URL (útil para pruebas): ?oficina=soporte
const initial = new URLSearchParams(location.search).get('oficina');
renderResults();
if (!initial) view.setAutoRotate(true);
if (initial) {
  $('#attract').classList.add('hidden');
  openOffice(initial);
}
wake();
