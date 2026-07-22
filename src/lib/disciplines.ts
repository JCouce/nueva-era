// Árboles de disciplinas. Por ahora solo el Netrunner (prototipo). Los nodos van de
// 0 a 5; el tronco (regalo) arranca en 1 gratis. El gasto se deriva por fórmula.

export type Branch = "dano" | "control" | "intrusion";
export type CrossAttr = "fuerza" | "destreza";

export type DisciplineNode = {
  id: string;
  label: string;
  branch: Branch | "tronco";
  tier: number; // 1–5
  desc: string;
  gift?: boolean; // tronco: rango 1 gratis
  exclusive?: boolean; // ⚡ firma exclusiva
  cross?: CrossAttr; // ⇄ habilitadora de cruce
  requires?: { node: string; rank: number }; // prereq específico (solo donde hace falta)
};

export const BRANCHES: { id: Branch; label: string }[] = [
  { id: "dano", label: "Daño" },
  { id: "control", label: "Control" },
  { id: "intrusion", label: "Intrusión" },
];

export const DISC_MIN = 0;
export const DISC_MAX = 5;

// Gating global: puntos en el árbol (suma de rangos) desbloquean cada tier, en
// TODAS las ramas por igual. Los prerrequisitos específicos van por nodo (`requires`).
export const TIER_GATING: Record<number, number> = { 1: 0, 2: 1, 3: 4, 4: 8, 5: 13 };

export const NETRUNNER_TREE: DisciplineNode[] = [
  { id: "hackeo", label: "Hackeo", branch: "tronco", tier: 1, gift: true, desc: "El verbo del netrunner: escanea redes, accede a dispositivos y descarga info. Su rango marca la seguridad accesible y habilita el árbol." },
  // Daño
  { id: "sobrecarga", label: "Sobrecarga", branch: "dano", tier: 2, desc: "Daño directo a un objetivo. Rango = dados de daño." },
  { id: "virus", label: "Virus", branch: "dano", tier: 3, desc: "Daño persistente (DoT). Rango = daño/turno." },
  { id: "cascada", label: "Cascada", branch: "dano", tier: 4, requires: { node: "sobrecarga", rank: 1 }, desc: "El daño salta a enemigos en red. Rango = nº de saltos." },
  { id: "suicidio", label: "Suicidio inducido", branch: "dano", tier: 5, exclusive: true, desc: "Execute: bajo umbral, el enemigo se dispara. Rango = umbral." },
  { id: "fuerza_bruta", label: "Fuerza bruta", branch: "dano", tier: 5, cross: "fuerza", requires: { node: "sobrecarga", rank: 1 }, desc: "Suma tu Fuerza al daño de tus hacks (además de INT). Rango = tope de FUE que añades." },
  // Control
  { id: "interferencia", label: "Interferencia", branch: "control", tier: 2, desc: "Ciegas ópticas (penaliza puntería). Rango = penalización." },
  { id: "bloqueo", label: "Bloqueo", branch: "control", tier: 3, desc: "Atascas arma o cyberware enemigo. Rango = duración." },
  { id: "marioneta", label: "Marioneta", branch: "control", tier: 4, desc: "Controlas a un enemigo una acción. Rango = resistencia." },
  { id: "colapso", label: "Colapso", branch: "control", tier: 5, desc: "Apagas armas/cyberware de un área un turno." },
  // Intrusión
  { id: "ganzua", label: "Ganzúa", branch: "intrusion", tier: 2, desc: "Abres/desactivas tech (puertas, cámaras, torretas). Rango = seguridad." },
  { id: "fantasma", label: "Fantasma", branch: "intrusion", tier: 3, desc: "Te borras de vigilancia / extraes datos. Rango = alcance." },
  { id: "golpe_sombra", label: "Golpe de sombra", branch: "intrusion", tier: 4, desc: "Hackear a un objetivo que no te ha detectado = éxitos extra." },
  { id: "puerta_trasera", label: "Puerta trasera", branch: "intrusion", tier: 4, desc: "Buffeas el cyberware de un aliado. Rango = magnitud." },
  { id: "firma_cero", label: "Firma cero", branch: "intrusion", tier: 5, cross: "destreza", desc: "Hackeas sin rastro: sumas Destreza contra el rastreo. Rango = tope de DES." },
  { id: "dios_maquina", label: "Dios de la máquina", branch: "intrusion", tier: 5, desc: "Dominas el entorno tech de una zona en combate." },
];

export function treeFor(especialidad: string | null): DisciplineNode[] {
  return especialidad === "netrunner" ? NETRUNNER_TREE : [];
}

// Rango efectivo: el tronco (regalo) nunca baja de 1.
export function nodeRank(node: DisciplineNode, disciplinas: Record<string, number>): number {
  const stored = disciplinas[node.id];
  if (stored === undefined) return node.gift ? 1 : 0;
  return node.gift ? Math.max(1, stored) : stored;
}

// Coste XP del siguiente rango (null si maxeado). El rango 1 del regalo es gratis.
export function disciplineStepCost(node: DisciplineNode, rank: number): number | null {
  if (rank >= DISC_MAX) return null;
  if (node.gift && rank === 0) return 0;
  return rank === 0 ? 4 : rank * 4;
}

export function nodeSpent(node: DisciplineNode, rank: number): number {
  let total = 0;
  for (let r = 0; r < rank; r++) {
    total += node.gift && r === 0 ? 0 : r === 0 ? 4 : r * 4;
  }
  return total;
}

export function treeSpent(especialidad: string | null, disciplinas: Record<string, number>): number {
  return treeFor(especialidad).reduce((s, n) => s + nodeSpent(n, nodeRank(n, disciplinas)), 0);
}

export function pointsInTree(especialidad: string | null, disciplinas: Record<string, number>): number {
  return treeFor(especialidad).reduce((s, n) => s + nodeRank(n, disciplinas), 0);
}

// El prereq específico de un nodo (si lo tiene), y si está cumplido.
function requiresState(
  node: DisciplineNode,
  especialidad: string | null,
  disciplinas: Record<string, number>,
): { met: boolean; label: string; rank: number } | null {
  if (!node.requires) return null;
  const req = treeFor(especialidad).find((n) => n.id === node.requires!.node);
  return {
    met: !!req && nodeRank(req, disciplinas) >= node.requires.rank,
    label: req?.label ?? node.requires.node,
    rank: node.requires.rank,
  };
}

// Rango de la troncal (Hackeo) = profundidad de acceso: tier N exige Hackeo ≥ N.
export function troncoRank(
  especialidad: string | null,
  disciplinas: Record<string, number>,
): number {
  const t = treeFor(especialidad).find((n) => n.gift);
  return t ? nodeRank(t, disciplinas) : 0;
}

// ¿Desbloqueado? (para nodos de rama) Puntos del tier + Hackeo ≥ tier + prereq propio.
export function nodeUnlocked(
  node: DisciplineNode,
  especialidad: string | null,
  disciplinas: Record<string, number>,
): boolean {
  if (node.branch === "tronco") return true; // el tronco no se gatea a sí mismo
  if (pointsInTree(especialidad, disciplinas) < (TIER_GATING[node.tier] ?? 0)) return false;
  if (troncoRank(especialidad, disciplinas) < node.tier) return false;
  const req = requiresState(node, especialidad, disciplinas);
  return req ? req.met : true;
}

// Estado de compra para la UI: coste, si se puede, si está bloqueado y el motivo.
export function disciplineBuyState(
  node: DisciplineNode,
  especialidad: string | null,
  disciplinas: Record<string, number>,
  xpDisponible: number,
): {
  rank: number;
  cost: number | null;
  canBuy: boolean;
  locked: boolean;
  reason: string;
} {
  const rank = nodeRank(node, disciplinas);
  const cost = disciplineStepCost(node, rank);
  if (cost === null) return { rank, cost, canBuy: false, locked: false, reason: "MÁX" };
  if (node.branch !== "tronco") {
    const need = TIER_GATING[node.tier] ?? 0;
    if (pointsInTree(especialidad, disciplinas) < need) {
      return { rank, cost, canBuy: false, locked: true, reason: `${need} pts en árbol` };
    }
    if (troncoRank(especialidad, disciplinas) < node.tier) {
      return { rank, cost, canBuy: false, locked: true, reason: `Hackeo ≥${node.tier}` };
    }
    const req = requiresState(node, especialidad, disciplinas);
    if (req && !req.met) {
      return { rank, cost, canBuy: false, locked: true, reason: `${req.label} ≥${req.rank}` };
    }
  }
  if (xpDisponible < cost) return { rank, cost, canBuy: false, locked: false, reason: `${cost}xp` };
  return { rank, cost, canBuy: true, locked: false, reason: `${cost}xp` };
}

// ── Contenido para el modal de detalle ─────────────────────────────
export const BRANCH_LABELS: Record<string, string> = {
  tronco: "Tronco",
  dano: "Daño",
  control: "Control",
  intrusion: "Intrusión",
};

export type DisciplineInfo = {
  uso: string;
  targets: string;
  rango: string;
  ejemplo: string;
  acciones?: string[]; // usos concretos (para disciplinas versátiles como Hackeo)
  porRango?: string[]; // desglose opcional rango 1..5 (ej. qué seguridad alcanza Hackeo)
};

export const DISCIPLINE_INFO: Record<string, DisciplineInfo> = {
  hackeo: {
    uso: "Toda tirada es Inteligencia + Netrunning (skill) vs la seguridad del objetivo, contando éxitos. Hackeo no es solo la base de otros hacks: es una acción con usos propios (abajo). Y su rango marca el nivel de seguridad que puedes tocar y a qué tier del árbol accedes (tier N pide Hackeo N).",
    acciones: [
      "Escanear la red: detectas qué dispositivos hay en la zona o en red local — enemigos con cyberware, cámaras, drones, torretas, terminales. Reconocimiento antes de actuar.",
      "Acceder y descargar: te cuelas en un terminal o dispositivo y lees o descargas su información (datos, claves, planos, credenciales, registros).",
      "Base del árbol: potencia y habilita el resto de tus disciplinas; su rango marca el nivel de seguridad accesible.",
    ],
    targets: "Cualquier objetivo con electrónica en alcance o en red: personas con cyberware, cámaras, puertas, torretas, drones, terminales.",
    rango: "Cada rango sube un nivel de seguridad accesible. Solo puedes hackear (escanear, acceder o atacar) objetivos de nivel ≤ tu Hackeo.",
    ejemplo:
      "Entras a una oficina corpo. Escaneas la red (Hackeo) y ves 3 cámaras, 2 guardias con implantes y un terminal de nivel 3 — necesitas Hackeo 3 para tocarlo. Te conectas al terminal y descargas los turnos de guardia. Todo con INT + Netrunning vs la seguridad de cada cosa.",
    porRango: [
      "Cacharros civiles: móviles, cerraduras simples, cyberware de mercadillo.",
      "Nivel calle: matones con implantes, cámaras de tienda, coches, drones básicos.",
      "Corpo estándar: torretas, puertas de seguridad, cyberware militar de serie.",
      "Blindado: instalaciones corpo, ICE defensivo, netrunners enemigos.",
      "Black ICE: servidores corpo profundos, sistemas militares top, lo más letal.",
    ],
  },
  sobrecarga: {
    uso: "Tu hackeo de daño directo. Aciertas con INT + Netrunning y luego aplicas el daño según el rango.",
    targets: "Un enemigo con cyberware o electrónica.",
    rango: "Sube los dados de daño (rango 3 = 3 dados de daño).",
    ejemplo:
      "Sobrecarga rango 3 contra un mercenario: aciertas y tiras 3 dados de daño; 2 éxitos = 2 de daño que le queman los implantes por dentro.",
  },
  virus: {
    uso: "Inyectas un programa malicioso: el daño se aplica al INICIO de cada turno durante varios turnos. Es tu propia fuente de daño (no necesita Sobrecarga).",
    targets: "Un enemigo. Ataca por dentro: da igual que se cubra o huya, el daño sigue.",
    rango: "Sube el daño por turno y/o la duración.",
    ejemplo:
      "Virus rango 2 al jefe: cada turno, al empezar, sufre 2 de daño durante 3 turnos aunque se esconda. Perfecto para desgastar tanques o rematar a quien huye.",
  },
  cascada: {
    uso: "Modificador de área: cuando dañas con un hack, ese daño 'salta' a enemigos cercanos conectados a la misma red.",
    targets: "El objetivo principal + enemigos cercanos con cyberware. Necesita un hack de daño (Sobrecarga) para tener algo que propagar.",
    rango: "Sube el nº de saltos (objetivos secundarios alcanzados).",
    ejemplo:
      "Cuatro enemigos con implantes juntos. Lanzas Sobrecarga con Cascada rango 2: el daño golpea al primero y salta a 2 más. Sin Sobrecarga, Cascada no hace nada.",
  },
  suicidio: {
    uso: "Ejecución: si el objetivo está por debajo de un umbral de vida, hackeas su sistema motor y se dispara a sí mismo. NO usa tu daño — usa su propia arma.",
    targets: "Un enemigo por debajo del umbral de vida, con arma y cyberware motor.",
    rango: "Sube el umbral de vida al que funciona (más alto = ejecutas antes, sin tener que dejarlo casi muerto).",
    ejemplo:
      "Un enemigo baja del 10% de vida. Activas Suicidio: le hackeas el brazo y se pega un tiro en la cabeza. No gastas daño tuyo, lo remata su propia pistola.",
  },
  fuerza_bruta: {
    uso: "Pasiva. Tu daño de hackeo SUMA tu Fuerza además de tu Inteligencia (no la reemplaza). Sigues necesitando INT para acertar y para el daño base; la Fuerza es un extra encima.",
    targets: "N/A — modifica tus propios hacks de daño.",
    rango: "Sube el tope de Fuerza que añades al daño (rango 3 = +3 de FUE al daño).",
    ejemplo:
      "Netrunner con INT 4, FUE 3 y Fuerza bruta rango 3. Su Sobrecarga hace el daño normal de INT 4 y ADEMÁS le suma +3 de Fuerza encima → pega como hacker Y como un bruto. Sin la pasiva, tu Fuerza no cuenta para los hacks.",
  },
  interferencia: {
    uso: "Hackeo de estorbo: aciertas con INT + Netrunning y, al impactar, le ciegas las ópticas al enemigo.",
    targets: "Un enemigo con ópticas cibernéticas o sensores. Le penaliza puntería/percepción.",
    rango: "Sube la penalización y/o la duración.",
    ejemplo:
      "Interferencia rango 2 al francotirador enemigo: le ciegas las ópticas, −2 a su puntería durante 2 turnos. No le haces daño, pero deja de acertar.",
  },
  bloqueo: {
    uso: "Hackeo que inutiliza un dispositivo concreto del enemigo (arma inteligente o implante).",
    targets: "Un arma smart/tech o una pieza de cyberware enemiga.",
    rango: "Sube la duración del bloqueo.",
    ejemplo:
      "Bloqueo al brazo-cañón de un pesado: su arma smart se traba y no puede disparar mientras dure el bloqueo. Lo dejas vendido para que tu equipo entre.",
  },
  marioneta: {
    uso: "Tomas el control del sistema motor del enemigo y le haces gastar UNA acción a tu favor.",
    targets: "Un enemigo con cyberware suficiente. Lo resiste con su voluntad/seguridad.",
    rango: "Sube la resistencia que superas (objetivos más duros / control más fiable).",
    ejemplo:
      "Marioneta rango 3 a un guardia: le controlas un turno y le haces disparar a su propio compañero antes de soltar el control.",
  },
  colapso: {
    uso: "Pulso en área: apagas las armas y el cyberware de TODOS los enemigos de una zona durante un turno.",
    targets: "Todos los enemigos con electrónica en un área.",
    rango: "Sube el área y/o la duración.",
    ejemplo:
      "Cuatro enemigos en una sala. Colapso apaga todas sus armas y cyberware un turno: ventana perfecta para que tu equipo entre a saco sin que respondan.",
  },
  ganzua: {
    uso: "Hackeo sobre la tecnología del entorno: aciertas con INT + Netrunning vs la seguridad del sistema.",
    targets: "Puertas, cámaras, torretas, cerraduras, terminales.",
    rango: "Sube el nivel de seguridad que puedes vencer.",
    ejemplo:
      "Una puerta blindada de seguridad 4. Con Ganzúa rango 4 la abres sin llave ni ruido. También apaga cámaras o vuelve una torreta inofensiva.",
  },
  fantasma: {
    uso: "Te borras de los sistemas de vigilancia, o te cuelas en un sistema para extraer datos.",
    targets: "Cámaras y sensores (para borrarte), o un terminal/base de datos (para extraer info).",
    rango: "Sube el alcance: a cuántos sistemas afectas / cuánto extraes.",
    ejemplo:
      "Entras en una zona vigilada. Con Fantasma te borras de las cámaras un rato para moverte sin que salte la alarma; o te conectas a un terminal y sacas los planos del objetivo.",
  },
  golpe_sombra: {
    uso: "Bonus: si hackeas a un objetivo que NO te ha detectado, el hackeo gana éxitos extra (un golpe fuerte desde las sombras). Estar oculto se logra con la skill Sigilo.",
    targets: "Un objetivo que no te ha detectado. Aplica a cualquiera de tus hacks.",
    rango: "Sube los éxitos extra que añade.",
    ejemplo:
      "Estás oculto (skill Sigilo) y el enemigo no te ve. Abres con Sobrecarga: Golpe de sombra rango 2 le añade +2 éxitos a ese primer hackeo. Un alfa strike brutal por sorpresa.",
  },
  puerta_trasera: {
    uso: "Hackeo de apoyo: en vez de atacar, potencias el cyberware de un aliado.",
    targets: "Un aliado con cyberware.",
    rango: "Sube la magnitud del buff.",
    ejemplo:
      "Puerta trasera al Merc del equipo: le sobrecargas los reflejos cibernéticos y le das un buff a su próxima acción justo antes de que cargue.",
  },
  firma_cero: {
    uso: "Pasiva. Al hackear no dejas rastro digital: SUMAS tu Destreza a la tirada para que no te rastreen (solo netrunners/ICE enemigos rastrean lo digital). El sigilo físico sigue siendo la skill Sigilo.",
    targets: "N/A — protege el acto de hackear.",
    rango: "Sube el tope de Destreza que sumas contra el rastreo.",
    ejemplo:
      "Hackeas a un enemigo desde una furgoneta a una manzana. Su netrunner intenta rastrearte (tira INT+Netrunning vs tu defensa). Con Firma cero rango 3 sumas +3 de Destreza a tu defensa → no te encuentra. Sin ella, defiendes solo con lo justo.",
  },
  dios_maquina: {
    uso: "Tomas el control del entorno tecnológico de toda una zona durante el combate: torretas, puertas y cámaras pasan a tu bando.",
    targets: "Todos los sistemas tech de una zona.",
    rango: "Sube el alcance / la cantidad de sistemas que dominas a la vez.",
    ejemplo:
      "Combate en una sala llena de tech. Dios de la máquina pone las torretas a disparar a tus enemigos, cierra puertas para atraparlos y te enseña todo por las cámaras: la habitación entera lucha por ti.",
  },
};

// Requisitos legibles para el modal (derivados del gating).
export function disciplineRequirements(
  node: DisciplineNode,
  especialidad: string | null,
): string[] {
  if (node.branch === "tronco") {
    return ["Ninguno — disciplina de regalo, empieza en rango 1."];
  }
  const reqs = [
    `Hackeo ≥ ${node.tier} (profundidad de acceso)`,
    `${TIER_GATING[node.tier] ?? 0} puntos en el árbol`,
  ];
  if (node.requires) {
    const req = treeFor(especialidad).find((n) => n.id === node.requires!.node);
    reqs.push(`${req?.label ?? node.requires.node} ≥ ${node.requires.rank}`);
  }
  if (node.cross === "fuerza") {
    reqs.push("Cruce: suma tu Fuerza al daño además de INT; rango = tope de FUE.");
  } else if (node.cross === "destreza") {
    reqs.push("Cruce: suma tu Destreza contra el rastreo; rango = tope de DES.");
  }
  return reqs;
}
