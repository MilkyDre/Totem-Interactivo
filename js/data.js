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

export const OFFICES = [
  // ---------- Departamento de Gestión de Sistemas y TICs (fila norte) ----------
  {
    id: 'jefe-tic',
    dept: 'tic',
    name: 'Jefatura Depto. de Gestión de Sistemas y TICs',
    short: 'Jefatura TICs',
    icon: '👔',
    poly: capRoom('left', 168, 55, 213),
    door: [130, 213],
    services: ['Jefatura del Departamento de Gestión de Sistemas y TICs'],
  },
  {
    id: 'ccosto',
    dept: 'tic',
    name: 'Centro de Costos de Informática',
    short: 'Centro de Costos',
    icon: '🧾',
    poly: rect(430, 40, 540, 213),
    door: [522, 213],
    services: [
      'Recepción de documentación del departamento',
      'Compras del Depto. de Gestión de Sistemas y TICs',
    ],
  },
  {
    id: 'ingenieria',
    dept: 'tic',
    name: 'Oficina de Ingeniería y Desarrollo',
    short: 'Ingeniería y Desarrollo',
    icon: '🛠️',
    poly: rect(540, 40, 705, 213),
    door: [680, 213],
    services: ['Ingeniería y desarrollo de soluciones informáticas'],
  },
  {
    id: 'sistemas',
    dept: 'tic',
    name: 'Oficina de Sistemas e Infraestructura',
    short: 'Sistemas e Infraestructura',
    icon: '🗄️',
    poly: rect(705, 40, 850, 213),
    door: [820, 213],
    services: ['Sistemas y plataformas municipales', 'Infraestructura y servidores'],
  },
  {
    id: 'soporte',
    dept: 'tic',
    name: 'Oficina de Soporte Informático',
    short: 'Soporte Informático',
    icon: '🖥️',
    poly: rect(850, 40, 945, 213),
    door: [930, 213],
    services: [
      'Reparación de equipos computacionales',
      'Impresoras',
      'Consultas sobre compra de equipamiento',
      'Data show y periféricos',
    ],
  },
  {
    id: 'redes',
    dept: 'tic',
    name: 'Oficina de Redes y Conectividad',
    short: 'Redes y Conectividad',
    icon: '📶',
    poly: rect(945, 40, 1060, 213),
    door: [995, 213],
    services: ['Conectividad (red e internet)', 'Bloqueo y desbloqueo de accesos'],
  },
  {
    id: 'transformacion',
    dept: 'tic',
    name: 'Oficina de Transformación Digital',
    short: 'Transformación Digital',
    icon: '🚀',
    poly: rect(1060, 40, 1150, 213),
    door: [1120, 213],
    services: ['Desarrollos digitales', 'Ley 21.180 de Transformación Digital del Estado'],
  },

  // ---------- Adquisiciones (fila sur) ----------
  {
    id: 'jefe-adq',
    dept: 'adq',
    name: 'Jefatura de Adquisiciones',
    short: 'Jefatura Adquisiciones',
    icon: '👔',
    poly: capRoom('left', 168, 247, 395),
    door: [130, 247],
    services: ['Jefatura de Adquisiciones'],
  },
  {
    id: 'secretaria',
    dept: 'adq',
    name: 'Secretaría de Adquisiciones',
    short: 'Secretaría',
    icon: '📥',
    poly: rect(360, 247, 455, 410),
    door: [430, 247],
    services: [
      'Guías y trámites de licitación',
      'Compra ágil',
      'Decretos',
      'Consultas generales',
      'Recepción de documentos',
    ],
  },
  {
    id: 'abogados',
    dept: 'adq',
    name: 'Abogados DAF',
    short: 'Abogados DAF',
    icon: '⚖️',
    poly: rect(455, 247, 600, 410),
    door: [570, 247],
    services: ['Revisión de legalidad de antecedentes de contrataciones públicas'],
  },
  {
    id: 'adq-1',
    dept: 'adq',
    name: 'Adquisiciones · Procesos y Licitaciones',
    short: 'Procesos y Licitaciones',
    icon: '📋',
    poly: rect(600, 247, 710, 410),
    door: [620, 247],
    services: ['Procesos a cargo', 'Dudas de proyectos', 'Licitaciones'],
  },
  {
    id: 'adq-2',
    dept: 'adq',
    name: 'Adquisiciones · Requerimientos y PAC',
    short: 'Requerimientos y PAC',
    icon: '🗂️',
    poly: rect(710, 247, 850, 410),
    door: [730, 247],
    services: [
      'Guía de requerimientos',
      'PAC (Plan Anual de Compras)',
      'Estado de procesos de compra',
      'Compra ágil',
      'Licitaciones',
    ],
  },
  {
    id: 'adq-3',
    dept: 'adq',
    name: 'Adquisiciones · Orientación Mercado Público',
    short: 'Mercado Público',
    icon: '🛒',
    poly: rect(850, 247, 960, 410),
    door: [880, 247],
    services: [
      'Entrega de documentación de licitaciones públicas',
      'Cómo comprar en Mercado Público',
      'Seguimiento de procesos',
    ],
  },
  {
    id: 'adq-4',
    dept: 'adq',
    name: 'Adquisiciones · Operador de Compras Públicas',
    short: 'Operador de Compras',
    icon: '💼',
    poly: rect(960, 247, 1060, 410),
    door: [1048, 247],
    services: ['Operador de compras públicas'],
  },
  {
    id: 'adq-5',
    dept: 'adq',
    name: 'Adquisiciones · Decretos',
    short: 'Decretos',
    icon: '📜',
    poly: rect(1060, 247, 1150, 410),
    door: [1085, 247],
    services: ['Decretos que aprueban llamados', 'Respuestas a decretos'],
  },

  // ---------- Espacios comunes ----------
  {
    id: 'reuniones',
    dept: null,
    name: 'Sala de Reuniones',
    short: 'Sala de Reuniones',
    icon: '🤝',
    poly: capRoom('right', 1345, 262, 395),
    door: [1400, 262],
    services: ['Sala de reuniones'],
  },
];

// Zonas no seleccionables (núcleos, escaleras, baños).
export const LANDMARKS = [
  { id: 'nucleo-2', label: 'Escalera N°2 · Baños', labelAt: [320, 110], poly: rect(175, 40, 430, 213), height: 2.4 },
  { id: 'escalera-2', label: 'Escalera N°2', poly: rect(175, 247, 360, 410), height: 2.4 },
  { id: 'escalera-1', label: 'Escalera N°1', labelAt: [1260, 360], poly: rect(1150, 247, 1310, 410), height: 2.4 },
  { id: 'ascensores', label: 'Ascensores', labelAt: [1290, 80], poly: rect(1155, 45, 1330, 150), height: 2.6 },
  { id: 'banos', label: 'Baños', poly: capRoom('right', 1345, 60, 198), height: 2.4 },
];

export const ELEVATORS = [
  [1165, 1213],
  [1218, 1266],
  [1271, 1319],
].map(([x1, x2]) => ({ x1, x2, y: 150 }));
