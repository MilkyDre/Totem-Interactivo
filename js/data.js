// Datos del plano. Todas las coordenadas están en píxeles del plano original
// (assets/plano.png, 1495 x 471): x hacia la derecha, y hacia abajo.

export const PLAN = { width: 1495, height: 471 };

// Extremos redondeados del edificio (semicírculos).
const CAP = {
  left: { cx: 192, cy: 225, r: 187 },
  right: { cx: 1303, cy: 225, r: 187 },
};

export const CORRIDOR_Y = 230; // eje del pasillo central
export const METERS_PER_PX = 0.05; // escala aproximada (1 px ≈ 5 cm)

function rect(x1, y1, x2, y2) {
  return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
}

// Habitación recortada por el arco de un extremo del edificio.
function capRoom(side, xInner, yA, yB, steps = 14) {
  const { cx, cy, r } = CAP[side];
  const sign = side === 'left' ? -1 : 1;
  const arc = [];
  for (let i = 0; i <= steps; i++) {
    const y = yA + ((yB - yA) * i) / steps;
    const dx = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
    arc.push([cx + sign * (dx - 6), y]);
  }
  return [[xInner, yA], ...arc, [xInner, yB]];
}

export function buildingOutline(steps = 40) {
  const pts = [];
  const { left, right } = CAP;
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / steps;
    pts.push([right.cx + right.r * Math.cos(a), right.cy + right.r * Math.sin(a)]);
  }
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI / 2 + (Math.PI * i) / steps;
    pts.push([left.cx + left.r * Math.cos(a), left.cy + left.r * Math.sin(a)]);
  }
  return pts;
}

export const DEPARTMENTS = {
  adq: {
    name: 'Adquisiciones',
    full: 'Departamento de Adquisiciones (DAF)',
    color: '#f59e0b',
  },
  tic: {
    name: 'Informática',
    full: 'Departamento de Gestión de Sistemas y TICs',
    color: '#38bdf8',
  },
};

// "Usted está aquí": hall frente a los 3 ascensores.
export const TOTEM = { x: 1240, y: 192 };

// Cada trámite: i = ícono, t = qué puede hacer, d = detalle breve.
// desks: puestos de trabajo [x, y, orientación del usuario: 'n' | 's' | 'e' | 'w'].
export const OFFICES = [
  // ---------- Departamento de Gestión de Sistemas y TICs (fila norte) ----------
  {
    id: 'jefe-tic',
    dept: 'tic',
    name: 'Jefatura Depto. de Gestión de Sistemas y TICs',
    short: 'Jefatura TICs',
    icon: '👔',
    tagline: 'Dirección del departamento',
    poly: capRoom('left', 168, 55, 213),
    door: [130, 213],
    desks: [[120, 130, 'w']],
    roundTable: [70, 150],
    services: [
      { i: '👔', t: 'Jefatura del departamento', d: 'Dirección del Depto. de Gestión de Sistemas y TICs' },
    ],
  },
  {
    id: 'ccosto',
    dept: 'tic',
    name: 'Centro de Costos de Informática',
    short: 'Centro de Costos',
    icon: '🧾',
    tagline: 'Documentos y compras de Informática',
    poly: rect(430, 40, 540, 213),
    door: [522, 213],
    desks: [[485, 105, 'e']],
    services: [
      { i: '📥', t: 'Entregar documentación', d: 'Recepción de documentos dirigidos al departamento' },
      { i: '🧾', t: 'Compras de Informática', d: 'Compras del Depto. de Gestión de Sistemas y TICs' },
    ],
  },
  {
    id: 'ingenieria',
    dept: 'tic',
    name: 'Oficina de Ingeniería y Desarrollo',
    short: 'Ingeniería y Desarrollo',
    icon: '🛠️',
    tagline: 'Soluciones informáticas a medida',
    poly: rect(540, 40, 705, 213),
    door: [680, 213],
    desks: [[592, 90, 'w'], [638, 90, 'e'], [592, 160, 'w'], [638, 160, 'e']],
    services: [
      { i: '⚙️', t: 'Ingeniería y desarrollo', d: 'Desarrollo de soluciones informáticas' },
    ],
  },
  {
    id: 'sistemas',
    dept: 'tic',
    name: 'Oficina de Sistemas e Infraestructura',
    short: 'Sistemas e Infraestructura',
    icon: '🗄️',
    tagline: 'Plataformas municipales y servidores',
    poly: rect(705, 40, 850, 213),
    door: [820, 213],
    desks: [[745, 95, 'w'], [745, 145, 'w']],
    services: [
      { i: '🧩', t: 'Sistemas y plataformas municipales', d: 'Consultas y problemas con las plataformas' },
      { i: '🗄️', t: 'Servidores e infraestructura', d: 'Infraestructura tecnológica municipal' },
    ],
  },
  {
    id: 'soporte',
    dept: 'tic',
    name: 'Oficina de Soporte Informático',
    short: 'Soporte Informático',
    icon: '🖥️',
    tagline: 'Equipos, impresoras y periféricos',
    poly: rect(850, 40, 945, 213),
    door: [930, 213],
    desks: [[878, 85, 'w'], [918, 85, 'e'], [878, 160, 'w'], [918, 160, 'e']],
    services: [
      { i: '🔧', t: 'Reparar mi computador', d: 'Computadores y notebooks con fallas' },
      { i: '🖨️', t: 'Problemas con impresoras', d: 'Instalación, atascos y fallas de impresión' },
      { i: '🛒', t: 'Asesoría para comprar equipos', d: 'Consultas sobre compra de equipamiento' },
      { i: '📽️', t: 'Data show y periféricos', d: 'Proyectores, mouse, teclados y otros' },
    ],
  },
  {
    id: 'redes',
    dept: 'tic',
    name: 'Oficina de Redes y Conectividad',
    short: 'Redes y Conectividad',
    icon: '📶',
    tagline: 'Internet, red y accesos',
    poly: rect(945, 40, 1060, 213),
    door: [995, 213],
    desks: [[1030, 85, 'e'], [1030, 140, 'e'], [975, 140, 'w']],
    services: [
      { i: '🌐', t: 'Problemas de conexión', d: 'Internet, red cableada y Wi-Fi' },
      { i: '🔒', t: 'Bloqueo de accesos', d: 'Bloqueo de accesos a sitios y servicios' },
    ],
  },
  {
    id: 'transformacion',
    dept: 'tic',
    name: 'Oficina de Transformación Digital',
    short: 'Transformación Digital',
    icon: '🚀',
    tagline: 'Desarrollos y Ley 21.180',
    poly: rect(1060, 40, 1150, 213),
    door: [1120, 213],
    desks: [[1100, 90, 'n'], [1100, 150, 'n']],
    services: [
      { i: '💡', t: 'Desarrollos digitales', d: 'Nuevas soluciones y proyectos digitales' },
      { i: '🏛️', t: 'Ley 21.180', d: 'Transformación Digital del Estado' },
    ],
  },

  // ---------- Adquisiciones (fila sur) ----------
  {
    id: 'jefe-adq',
    dept: 'adq',
    name: 'Jefatura de Adquisiciones',
    short: 'Jefatura Adquisiciones',
    icon: '👔',
    tagline: 'Dirección de Adquisiciones',
    poly: capRoom('left', 168, 247, 395),
    door: [130, 247],
    desks: [[125, 330, 'w']],
    roundTable: [70, 310],
    services: [
      { i: '👔', t: 'Jefatura de Adquisiciones', d: 'Dirección del área de compras' },
    ],
  },
  {
    id: 'secretaria',
    dept: 'adq',
    name: 'Secretaría de Adquisiciones',
    short: 'Secretaría',
    icon: '📥',
    tagline: 'Consultas, guías y recepción de documentos',
    poly: rect(360, 247, 455, 410),
    door: [430, 247],
    desks: [[405, 345, 's']],
    services: [
      { i: '📥', t: 'Entregar documentos', d: 'Recepción de documentos de Adquisiciones' },
      { i: '💬', t: 'Consultas generales', d: 'Orientación sobre trámites de compra' },
      { i: '📘', t: 'Guías de compra', d: 'Material de apoyo para sus trámites' },
      { i: '📑', t: 'Trámites de licitación', d: 'Información sobre licitaciones' },
      { i: '⚡', t: 'Compra ágil', d: 'Orientación sobre compra ágil' },
      { i: '📜', t: 'Decretos', d: 'Consultas sobre decretos' },
    ],
  },
  {
    id: 'abogados',
    dept: 'adq',
    name: 'Abogados DAF',
    short: 'Abogados DAF',
    icon: '⚖️',
    tagline: 'Revisión legal de contrataciones',
    poly: rect(455, 247, 600, 410),
    door: [570, 247],
    desks: [[530, 290, 'w'], [505, 365, 's'], [550, 365, 's']],
    services: [
      { i: '⚖️', t: 'Revisión de legalidad', d: 'Antecedentes de contrataciones públicas' },
    ],
  },
  {
    id: 'adq-1',
    dept: 'adq',
    name: 'Adquisiciones · Procesos y Licitaciones',
    short: 'Procesos y Licitaciones',
    icon: '📋',
    tagline: 'Procesos a cargo y dudas de proyectos',
    poly: rect(600, 247, 710, 410),
    door: [620, 247],
    desks: [[655, 290, 'e'], [655, 365, 'e']],
    services: [
      { i: '📋', t: 'Procesos a cargo', d: 'Consultar los procesos asignados' },
      { i: '💬', t: 'Dudas de proyectos', d: 'Resolver dudas sobre su proyecto de compra' },
      { i: '📑', t: 'Licitaciones', d: 'Consultas sobre licitaciones en curso' },
    ],
  },
  {
    id: 'adq-2',
    dept: 'adq',
    name: 'Adquisiciones · Requerimientos y PAC',
    short: 'Requerimientos y PAC',
    icon: '🗂️',
    tagline: 'Requerimientos, PAC y estado de compras',
    poly: rect(710, 247, 850, 410),
    door: [730, 247],
    desks: [[760, 320, 'w'], [810, 320, 'e'], [810, 370, 'e']],
    services: [
      { i: '📘', t: 'Guía de requerimientos', d: 'Cómo preparar un requerimiento de compra' },
      { i: '📅', t: 'PAC', d: 'Plan Anual de Compras' },
      { i: '🔎', t: 'Estado de mi compra', d: 'Saber en qué etapa va su proceso' },
      { i: '⚡', t: 'Compra ágil', d: 'Gestión de compras ágiles' },
      { i: '📑', t: 'Licitaciones', d: 'Apoyo en procesos de licitación' },
    ],
  },
  {
    id: 'adq-3',
    dept: 'adq',
    name: 'Adquisiciones · Orientación Mercado Público',
    short: 'Mercado Público',
    icon: '🛒',
    tagline: 'Cómo comprar y seguimiento de procesos',
    poly: rect(850, 247, 960, 410),
    door: [880, 247],
    desks: [[905, 310, 'e'], [905, 365, 'e']],
    services: [
      { i: '📦', t: 'Entregar documentos de licitación', d: 'Documentación de licitaciones públicas' },
      { i: '🧭', t: 'Cómo comprar', d: 'Orientación paso a paso' },
      { i: '🏛️', t: 'Mercado Público', d: 'Uso de la plataforma' },
      { i: '📍', t: 'Seguimiento de procesos', d: 'Revisar el avance de su compra' },
    ],
  },
  {
    id: 'adq-4',
    dept: 'adq',
    name: 'Adquisiciones · Operador de Compras Públicas',
    short: 'Operador de Compras',
    icon: '💼',
    tagline: 'Gestión de compras públicas',
    poly: rect(960, 247, 1060, 410),
    door: [1048, 247],
    desks: [[1000, 305, 'w'], [1000, 360, 'w']],
    services: [
      { i: '💼', t: 'Operador de compras públicas', d: 'Gestión de compras en Mercado Público' },
    ],
  },
  {
    id: 'adq-5',
    dept: 'adq',
    name: 'Adquisiciones · Decretos',
    short: 'Decretos',
    icon: '📜',
    tagline: 'Decretos que aprueban llamados',
    poly: rect(1060, 247, 1150, 410),
    door: [1085, 247],
    desks: [[1110, 305, 'e'], [1110, 360, 'e']],
    services: [
      { i: '📜', t: 'Decretos que aprueban llamados', d: 'Elaboración de decretos de llamado' },
      { i: '✉️', t: 'Respuestas', d: 'Respuestas a consultas sobre decretos' },
    ],
  },

  // ---------- Espacios comunes ----------
  {
    id: 'reuniones',
    dept: null,
    name: 'Sala de Reuniones',
    short: 'Sala de Reuniones',
    icon: '🤝',
    tagline: 'Espacio común',
    poly: capRoom('right', 1345, 262, 395),
    door: [1400, 262],
    meetingTable: [1405, 325],
    services: [
      { i: '🤝', t: 'Sala de reuniones', d: 'Espacio para reuniones' },
    ],
  },
];

// Zonas no seleccionables (núcleos, escaleras, baños).
export const LANDMARKS = [
  { id: 'nucleo-2', kind: 'core', label: 'Escalera N°2 · Baños', labelAt: [320, 110], poly: rect(175, 40, 430, 213), height: 2.4 },
  { id: 'escalera-2', kind: 'stairs', label: 'Escalera N°2', poly: rect(175, 247, 360, 410), height: 2.4 },
  { id: 'escalera-1', kind: 'stairs', label: 'Escalera N°1', labelAt: [1260, 360], poly: rect(1150, 247, 1310, 410), height: 2.4 },
  { id: 'ascensores', kind: 'elevators', label: 'Ascensores', labelAt: [1290, 80], poly: rect(1155, 45, 1330, 150), height: 2.6 },
  { id: 'banos', kind: 'wc', label: 'Baños', poly: capRoom('right', 1345, 60, 198), height: 2.4 },
];

export const ELEVATORS = [
  [1165, 1213],
  [1218, 1266],
  [1271, 1319],
].map(([x1, x2]) => ({ x1, x2, y: 150 }));

// Plantas decorativas en el hall.
export const PLANTS = [[1160, 200], [1330, 200], [1335, 255], [445, 200], [165, 225]];
