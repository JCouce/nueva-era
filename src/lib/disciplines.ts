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
  { id: "hackeo", label: "Hackeo", branch: "tronco", tier: 1, gift: true, desc: "El verbo: interfacear. Potencia de intrusión (seguridad + magnitud base)." },
  // Daño
  { id: "sobrecarga", label: "Sobrecarga", branch: "dano", tier: 2, desc: "Daño directo a un objetivo. Rango = dados de daño." },
  { id: "virus", label: "Virus", branch: "dano", tier: 3, desc: "Daño persistente (DoT). Rango = daño/turno." },
  { id: "cascada", label: "Cascada", branch: "dano", tier: 4, requires: { node: "sobrecarga", rank: 1 }, desc: "El daño salta a enemigos en red. Rango = nº de saltos." },
  { id: "suicidio", label: "Suicidio inducido", branch: "dano", tier: 5, exclusive: true, desc: "Execute: bajo umbral, el enemigo se dispara. Rango = umbral." },
  { id: "fuerza_bruta", label: "Fuerza bruta", branch: "dano", tier: 5, cross: "fuerza", requires: { node: "sobrecarga", rank: 1 }, desc: "El daño escala con Fuerza (no INT). Rango = tope de FUE." },
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

export type DisciplineInfo = { uso: string; targets: string; rango: string };

export const DISCIPLINE_INFO: Record<string, DisciplineInfo> = {
  hackeo: {
    uso: "La acción de hackeo base: tiras INT + Netrunning vs la seguridad del objetivo; los éxitos marcan la potencia. Toda disciplina parte de aquí.",
    targets: "Cualquier objetivo con electrónica en alcance o en red: personas con cyberware, cámaras, puertas, torretas, drones.",
    rango: "Sube el nivel de seguridad al que llegas y la magnitud base de tus hacks. Además tu Hackeo = a qué tier del árbol accedes (tier N pide Hackeo N).",
  },
  sobrecarga: {
    uso: "Hackeo ofensivo contra un objetivo. INT + Netrunning vs su seguridad; los éxitos aplican el daño.",
    targets: "Un enemigo con cyberware o electrónica (o cualquier sistema dañable).",
    rango: "Sube los dados de daño.",
  },
  virus: {
    uso: "Inyectas un programa malicioso: el daño se aplica al inicio de cada turno durante varios turnos. Es tu propia fuente de daño (no necesita Sobrecarga).",
    targets: "Un enemigo. Ataca por dentro, ignora coberturas físicas.",
    rango: "Sube el daño por turno y/o la duración.",
  },
  cascada: {
    uso: "Modificador: cuando dañas con un hack, el daño 'salta' a enemigos conectados a la misma red.",
    targets: "El objetivo principal + enemigos cercanos con cyberware en red. Necesita un hack de daño (Sobrecarga).",
    rango: "Sube el nº de saltos (objetivos secundarios).",
  },
  suicidio: {
    uso: "Execute: si el objetivo está por debajo de un umbral de vida, hackeas su sistema motor y se dispara con su propia arma. No usa tu daño.",
    targets: "Un enemigo por debajo del umbral de vida, con arma y cyberware motor.",
    rango: "Sube el umbral de vida al que funciona (ejecutas antes).",
  },
  fuerza_bruta: {
    uso: "Pasiva. Tu daño de hackeo escala con Fuerza en vez de Inteligencia. Ojo: sigues necesitando INT para ACERTAR el hackeo.",
    targets: "N/A — modifica tus propios hacks de daño.",
    rango: "Sube el tope de Fuerza que canalizas al daño (rango 3 = metes 3 de FUE).",
  },
  interferencia: {
    uso: "Hackeo de debuff. INT + Netrunning vs su seguridad; al impactar ciegas sus ópticas.",
    targets: "Un enemigo con ópticas cibernéticas o sensores. Penaliza su puntería/percepción.",
    rango: "Sube la penalización y/o la duración.",
  },
  bloqueo: {
    uso: "Hackeo que inutiliza un dispositivo del enemigo (arma inteligente, implante).",
    targets: "Un arma smart/tech o una pieza de cyberware enemiga.",
    rango: "Sube la duración del bloqueo.",
  },
  marioneta: {
    uso: "Tomas el control del sistema motor del enemigo y le haces gastar una acción a tu favor.",
    targets: "Un enemigo con cyberware suficiente. Resistido por su voluntad/seguridad.",
    rango: "Sube la resistencia que superas (objetivos más duros).",
  },
  colapso: {
    uso: "Pulso en área: apagas armas y cyberware de todos los enemigos de una zona un turno.",
    targets: "Todos los enemigos con electrónica en un área.",
    rango: "Sube el área y/o la duración.",
  },
  ganzua: {
    uso: "Hackeo de intrusión sobre tech del entorno. INT + Netrunning vs la seguridad del sistema.",
    targets: "Puertas, cámaras, torretas, cerraduras, terminales.",
    rango: "Sube el nivel de seguridad que puedes vencer.",
  },
  fantasma: {
    uso: "Te borras de los sistemas de vigilancia y/o extraes datos de un sistema.",
    targets: "Cámaras y sensores (para borrarte), o un terminal/base de datos (para extraer).",
    rango: "Sube el alcance: a cuántos sistemas afectas / cuánto extraes.",
  },
  golpe_sombra: {
    uso: "Rider: si hackeas a un objetivo que NO te ha detectado, el hackeo gana éxitos extra (alpha desde sigilo). Estar oculto se logra con la skill Sigilo.",
    targets: "Un objetivo que no te ha detectado. Aplica a cualquiera de tus hacks.",
    rango: "Sube los éxitos añadidos.",
  },
  puerta_trasera: {
    uso: "Hackeo de soporte: potencias el cyberware de un aliado.",
    targets: "Un aliado con cyberware.",
    rango: "Sube la magnitud del buff.",
  },
  firma_cero: {
    uso: "Pasiva. Al hackear no dejas rastro digital: sumas Destreza a la tirada opuesta contra el rastreo (solo netrunners/ICE rastrean lo digital). El sigilo físico sigue siendo la skill Sigilo.",
    targets: "N/A — modifica el acto de hackear.",
    rango: "Sube el tope de Destreza que aportas contra el rastreo.",
  },
  dios_maquina: {
    uso: "Tomas el control del entorno tecnológico de una zona durante el combate: torretas, puertas y cámaras a tu favor.",
    targets: "Todos los sistemas tech de una zona.",
    rango: "Sube el alcance / la cantidad de sistemas dominados.",
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
  if (node.cross) {
    const a = node.cross === "fuerza" ? "Fuerza" : "Destreza";
    reqs.push(`Cruce: mantienes INT para acertar; el rango es tu tope de ${a}.`);
  }
  return reqs;
}
