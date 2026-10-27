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

// "Usted está aquí": pegado a la pared de la Escalera N°1, junto a su puerta,
// mirando hacia los 3 ascensores.
export const TOTEM = { x: 1212, y: 241 };

// Funciones que comparten todas las oficinas de Adquisiciones (cada una
// agrega además su especialidad, marcada con star).
const ADQ_COMMON = [
  { i: '📑', t: 'Revisar el estado de tu licitación', d: 'Consultas sobre licitaciones en curso' },
  { i: '⚡', t: 'Gestionar una compra ágil', d: 'Orientación y gestión de compras ágiles' },
  { i: '🔎', t: 'Revisar el estado de tu compra', d: 'Saber en qué etapa va su proceso' },
  { i: '🧭', t: 'Aprender cómo comprar', d: 'Orientación paso a paso' },
  { i: '🏛️', t: 'Resolver dudas de Mercado Público', d: 'Uso de la plataforma' },
  { i: '📍', t: 'Hacer seguimiento a tu proceso', d: 'Revisar el avance de su compra' },
  { i: '💬', t: 'Resolver dudas de tu proyecto', d: 'Resolver dudas sobre su proyecto de compra' },
  { i: '📘', t: 'Pedir la guía de requerimientos', d: 'Cómo preparar un requerimiento de compra' },
];

// Cada trámite: i = ícono, t = qué puede hacer, d = detalle breve, star = especialidad.
// desks: puestos de trabajo [x, y, orientación del usuario: 'n' | 's' | 'e' | 'w', 'L' si es escritorio en L].
export const OFFICES = [
  // ---------- Departamento de Gestión de Sistemas y TICs (fila norte) ----------
  {
    id: 'jefe-tic',
    dept: 'tic',
    name: 'Jefatura Depto. de Gestión de Sistemas y TICs',
    short: 'Jefatura TICs',
    icon: '👔',
    tagline: 'Dirección del departamento',
    poly: capRoom('left', 168, 55, 190),
    door: [168, 90],
    // Se llega por el hall norte, junto al ascensor de la Escalera N°2.
    via: [[435, 230], [435, 90]],
    inside: [115, 90],
    where: 'Al final del pasillo, sube por el hall de la derecha',
    desks: [[125, 115, 'w', 'L']],
    roundTable: [72, 145],
    services: [
      { i: '👔', t: 'Reunirte con la jefatura del departamento', d: 'Dirección del Depto. de Gestión de Sistemas y TICs', star: true },
      { i: '📝', t: 'Presentar un proyecto tecnológico', d: 'Presentar nuevas necesidades tecnológicas' },
      { i: '📊', t: 'Conocer la planificación tecnológica', d: 'Prioridades y proyectos informáticos municipales' },
      { i: '🤝', t: 'Coordinar el trabajo con tu unidad', d: 'Reuniones y acuerdos con otras direcciones' },
    ],
  },
  {
    id: 'ccosto',
    dept: 'tic',
    name: 'Centro de Costos de Informática',
    short: 'Centro de Costos',
    icon: '🧾',
    tagline: 'Documentos y compras de Informática',
    poly: rect(445, 40, 540, 213),
    door: [522, 213],
    desks: [[485, 105, 'e', 'L']],
    services: [
      { i: '📥', t: 'Entregar documentación del departamento', d: 'Recepción de documentos dirigidos al departamento', star: true },
      { i: '🧾', t: 'Consultar por compras de Informática', d: 'Compras del Depto. de Gestión de Sistemas y TICs', star: true },
      { i: '💰', t: 'Consultar el presupuesto de Informática', d: 'Consultas sobre el presupuesto del departamento' },
      { i: '📄', t: 'Hacer seguimiento a facturas TI', d: 'Seguimiento de facturas y pagos del área' },
      { i: '📦', t: 'Coordinar la entrega de equipos comprados', d: 'Coordinación de entregas de equipamiento' },
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
      { i: '⚙️', t: 'Solicitar una solución informática', d: 'Desarrollo de soluciones informáticas', star: true },
      { i: '📐', t: 'Plantear lo que tu unidad necesita', d: 'Analizamos lo que tu unidad necesita' },
      { i: '🔗', t: 'Conectar sistemas entre áreas', d: 'Conectar plataformas y datos entre áreas' },
      { i: '🧪', t: 'Pedir mejoras a un sistema', d: 'Nuevas funciones y correcciones' },
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
    desks: [[745, 95, 'w', 'L'], [745, 145, 'w', 'L']],
    services: [
      { i: '🧩', t: 'Resolver problemas con plataformas municipales', d: 'Consultas y problemas con las plataformas', star: true },
      { i: '🗄️', t: 'Consultar por servidores e infraestructura', d: 'Infraestructura tecnológica municipal', star: true },
      { i: '👤', t: 'Crear o desbloquear tu usuario', d: 'Creación y desbloqueo de usuarios en sistemas' },
      { i: '📧', t: 'Resolver problemas de correo institucional', d: 'Cuentas y problemas de correo' },
      { i: '💾', t: 'Recuperar o respaldar información', d: 'Recuperación y resguardo de datos' },
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
      { i: '🔧', t: 'Reparar tu computador o notebook', d: 'Computadores y notebooks con fallas' },
      { i: '🖨️', t: 'Solucionar problemas de impresora', d: 'Instalación, atascos y fallas de impresión' },
      { i: '🛒', t: 'Consultar antes de comprar equipos', d: 'Consultas sobre compra de equipamiento' },
      { i: '📽️', t: 'Pedir data show y periféricos', d: 'Proyectores, mouse, teclados y otros' },
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
    desks: [[1030, 85, 'e', 'L'], [1030, 140, 'e', 'L'], [975, 140, 'w', 'L']],
    services: [
      { i: '🌐', t: 'Resolver problemas de internet o Wi-Fi', d: 'Internet, red cableada y Wi-Fi', star: true },
      { i: '🔒', t: 'Solicitar bloqueo de accesos', d: 'Bloqueo de accesos a sitios y servicios', star: true },
      { i: '🔌', t: 'Pedir un nuevo punto de red', d: 'Instalación de puntos de red y cableado' },
      { i: '📶', t: 'Pedir Wi-Fi para un evento', d: 'Conectividad para actividades municipales' },
      { i: '🛡️', t: 'Consultar por seguridad de la red y VPN', d: 'Firewall, VPN y accesos remotos' },
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
    desks: [[1100, 90, 'n', 'L'], [1100, 150, 'n', 'L']],
    services: [
      { i: '💡', t: 'Proponer un desarrollo digital', d: 'Nuevas soluciones y proyectos digitales', star: true },
      { i: '🏛️', t: 'Consultar sobre la Ley 21.180', d: 'Transformación Digital del Estado', star: true },
      { i: '📄', t: 'Digitalizar procesos (cero papel)', d: 'Digitalización de procesos y documentos' },
      { i: '🖥️', t: 'Llevar un trámite a internet', d: 'Llevar trámites municipales a internet' },
      { i: '✍️', t: 'Recibir ayuda con firma electrónica', d: 'Uso de firma electrónica avanzada y simple' },
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
    poly: capRoom('left', 168, 195, 395),
    door: [168, 372],
    // Se llega pasando Secretaría por el hall sur.
    via: [[440, 230], [440, 372]],
    inside: [115, 372],
    where: 'Al final del pasillo, pasa Secretaría y sigue por el hall de la izquierda',
    desks: [[118, 245, 'w', 'L']],
    roundTable: [75, 320],
    services: [
      { i: '👔', t: 'Reunirte con la jefatura de Adquisiciones', d: 'Dirección del área de compras', star: true },
      { i: '✅', t: 'Obtener el visto bueno de un proceso', d: 'Visto bueno de procesos de compra' },
      { i: '📅', t: 'Consultar la supervisión del PAC', d: 'Seguimiento del Plan Anual de Compras' },
      { i: '🤝', t: 'Coordinar el trabajo con tu unidad', d: 'Reuniones con unidades requirentes' },
    ],
  },
  {
    id: 'secretaria',
    dept: 'adq',
    name: 'Secretaría de Adquisiciones',
    short: 'Secretaría',
    icon: '📥',
    tagline: 'Consultas, guías y recepción de documentos',
    poly: rect(340, 315, 455, 410),
    door: [440, 315],
    open: true, // mesón de atención, sin muros
    via: [[440, 230]],
    inside: [440, 345],
    where: 'Al final del pasillo a la izquierda, frente a los baños',
    desks: [[405, 345, 's', 'L']],
    services: [
      { i: '📥', t: 'Entregar documentos', d: 'Recepción de documentos de Adquisiciones' },
      { i: '💬', t: 'Hacer consultas generales', d: 'Orientación sobre trámites de compra' },
      { i: '📘', t: 'Pedir guías de compra', d: 'Material de apoyo para sus trámites' },
      { i: '📑', t: 'Informarte sobre trámites de licitación', d: 'Información sobre licitaciones' },
      { i: '⚡', t: 'Gestionar una compra ágil', d: 'Orientación sobre compra ágil' },
      { i: '📜', t: 'Consultar por decretos', d: 'Consultas sobre decretos' },
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
    desks: [[530, 290, 'w', 'L'], [505, 365, 's', 'L'], [550, 365, 's', 'L']],
    services: [
      { i: '⚖️', t: 'Revisar la legalidad de una contratación', d: 'Antecedentes de contrataciones públicas', star: true },
      { i: '🧑‍⚖️', t: 'Recibir asesoría jurídica', d: 'Orientación legal en compras públicas', star: true },
      { i: '📝', t: 'Revisar bases de licitación', d: 'Bases administrativas y técnicas de licitación' },
      { i: '📃', t: 'Revisar contratos con proveedores', d: 'Revisión y redacción de contratos' },
      { i: '🚫', t: 'Responder reclamos e impugnaciones', d: 'Respuesta legal a reclamos de proveedores' },
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
    desks: [[655, 290, 'e', 'L'], [655, 365, 'e', 'L']],
    services: [
      { i: '📋', t: 'Consultar por procesos a cargo', d: 'Consultar los procesos asignados', star: true },
      { i: '💬', t: 'Resolver dudas de tu proyecto', d: 'Resolver dudas sobre su proyecto de compra', star: true },
      ...ADQ_COMMON.filter((c) => !['Consultar por procesos a cargo', 'Resolver dudas de tu proyecto'].includes(c.t)),
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
    desks: [[760, 320, 'w', 'L'], [810, 320, 'e', 'L'], [810, 370, 'e', 'L']],
    services: [
      { i: '📘', t: 'Pedir la guía de requerimientos', d: 'Cómo preparar un requerimiento de compra', star: true },
      { i: '📅', t: 'Revisar el PAC (Plan Anual de Compras)', d: 'Plan Anual de Compras', star: true },
      { i: '🔎', t: 'Revisar el estado de tu compra', d: 'Saber en qué etapa va su proceso', star: true },
      ...ADQ_COMMON.filter((c) => !['Pedir la guía de requerimientos', 'Revisar el PAC (Plan Anual de Compras)', 'Revisar el estado de tu compra'].includes(c.t)),
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
    desks: [[905, 310, 'e', 'L'], [905, 365, 'e', 'L']],
    services: [
      { i: '📦', t: 'Entregar documentos de licitación', d: 'Documentación de licitaciones públicas', star: true },
      { i: '🧭', t: 'Aprender cómo comprar', d: 'Orientación paso a paso', star: true },
      { i: '📍', t: 'Hacer seguimiento a tu proceso', d: 'Revisar el avance de su compra', star: true },
      ...ADQ_COMMON.filter((c) => !['Entregar documentos de licitación', 'Aprender cómo comprar', 'Hacer seguimiento a tu proceso'].includes(c.t)),
    ],
  },
  {
    id: 'adq-4',
    dept: 'adq',
    name: 'Adquisiciones · Operador de Compras Públicas',
    short: 'Operador de Compras',
    icon: '💼',
    tagline: 'Aquí hay operadores de compras públicas',
    poly: rect(960, 247, 1060, 410),
    door: [1048, 247],
    desks: [[1000, 305, 'w', 'L'], [1000, 360, 'w', 'L']],
    services: [
      { i: '💼', t: 'Hablar con un operador de compras públicas', d: 'Gestión de compras en Mercado Público', star: true },
      { i: '🧾', t: 'Consultar órdenes de compra', d: 'Emisión y consulta de órdenes de compra', star: true },
      ...ADQ_COMMON.filter((c) => !['Hablar con un operador de compras públicas', 'Consultar órdenes de compra'].includes(c.t)),
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
    desks: [[1110, 305, 'e', 'L'], [1110, 360, 'e', 'L']],
    services: [
      { i: '📜', t: 'Tramitar decretos que aprueban llamados', d: 'Elaboración de decretos de llamado', star: true },
      { i: '✉️', t: 'Recibir respuestas sobre decretos', d: 'Respuestas a consultas sobre decretos', star: true },
      ...ADQ_COMMON.filter((c) => !['Tramitar decretos que aprueban llamados', 'Recibir respuestas sobre decretos'].includes(c.t)),
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
    open: true, // espacio libre como el hall, sin muros
    meetingTable: [1405, 325],
    services: [
      { i: '🤝', t: 'Reunirte en la sala', d: 'Espacio para reuniones' },
    ],
  },
];

// Personas que trabajan en cada oficina. Formato: { name: 'Nombre Apellido', role: 'Cargo' }.
// Si una oficina no tiene personas cargadas, la ficha simplemente no muestra el apartado.
export const PEOPLE = {
  'jefe-tic': [
    { name: 'Felipe Alegre', role: 'Jefatura' },
  ],
  ccosto: [
    { name: 'Camila Barahona' },
  ],
  ingenieria: [
    { name: 'Claudia Cubillos' },
    { name: 'Carlos Castillo' },
  ],
  sistemas: [
    { name: 'Tomas Ovando' },
    { name: 'Rodrigo Navarro' },
  ],
  soporte: [
    { name: 'Jonathan Chandia' },
    { name: 'Magdiel Vallejos' },
    { name: 'Sebastian Feminis' },
  ],
  redes: [
    { name: 'Manuel Mora' },
    { name: 'Ignacio Rosales' },
  ],
  transformacion: [
    { name: 'Camila Herrera' },
  ],
  'jefe-adq': [
    { name: 'Berta Abarca', role: 'Jefatura' },
  ],
  secretaria: [
    { name: 'Yubitza' },
  ],
  abogados: [
    { name: 'Maria Jose' },
    { name: 'Javiera' },
    { name: 'Francisco' },
    { name: 'Felipe' },
  ],
  'adq-1': [
    { name: 'Diego' },
    { name: 'Adriana' },
  ],
  'adq-2': [
    { name: 'Javier' },
    { name: 'Paula' },
    { name: 'Elizabeth' },
    { name: 'Jorge' },
  ],
  'adq-3': [
    { name: 'Diego De La Torre' },
  ],
  'adq-4': [
    { name: 'Olenka' },
    { name: 'Pedro' },
    { name: 'Cristofer' },
  ],
  'adq-5': [
    { name: 'Marcela' },
  ],
  reuniones: [],
};

// Zonas no seleccionables (núcleos, escaleras, baños). kind 'open' = solo piso.
export const LANDMARKS = [
  // Núcleo de la Escalera N°2 (según croquis): ascensor con la puerta a la
  // escalera al lado, cocina y baño accesible; baños 1 y 2 frente a Secretaría.
  { id: 'hall-norte', kind: 'open', label: 'Hall', poly: rect(170, 45, 445, 130) },
  { id: 'paso-norte', kind: 'open', poly: rect(425, 130, 445, 213) },
  { id: 'hall-sur', kind: 'open', poly: rect(175, 330, 340, 410) },
  { id: 'paso-sur', kind: 'open', poly: rect(425, 247, 455, 315) },
  { id: 'ascensor-2', minor: true, kind: 'elevators', label: 'Ascensor', poly: rect(175, 135, 268, 185) },
  { id: 'puerta-esc-2', minor: true, kind: 'open', label: 'Puerta a escalera', poly: rect(270, 135, 335, 188) },
  { id: 'cocina', minor: true, kind: 'wc', label: 'Cocina', poly: rect(340, 135, 425, 180) },
  { id: 'bano-acc', minor: true, kind: 'wc', label: 'Baño accesible', poly: rect(340, 180, 425, 208) },
  { id: 'escalera-2', kind: 'stairs', label: 'Escalera N°2', poly: rect(175, 190, 335, 328), door: [300, 190] },
  { id: 'bano-2', minor: true, kind: 'wc', label: 'Baño 2', poly: rect(340, 210, 425, 258) },
  { id: 'bano-1', minor: true, kind: 'wc', label: 'Baño 1', poly: rect(340, 260, 425, 310) },
  // Extremo de los ascensores
  { id: 'escalera-1', kind: 'stairs', label: 'Escalera N°1', labelAt: [1260, 360], poly: rect(1150, 247, 1310, 410), door: [1180, 247] },
  { id: 'ascensores', kind: 'elevators', label: 'Ascensores', labelAt: [1290, 80], poly: rect(1155, 45, 1330, 150) },
  { id: 'banos', kind: 'wc', label: 'Baños', poly: capRoom('right', 1345, 60, 198) },
];

export const ELEVATORS = [
  [1165, 1213],
  [1218, 1266],
  [1271, 1319],
].map(([x1, x2]) => ({ x1, x2, y: 150, side: 's' }))
  .concat([{ x1: 180, x2: 263, y: 135, side: 'n' }]); // ascensor de la Escalera N°2, abre al hall



// Calabazas de Halloween decorativas en los halls.
export const PUMPKINS = [[1160, 200], [1330, 200], [1335, 255], [1290, 236], [300, 95], [210, 95], [260, 375]];
