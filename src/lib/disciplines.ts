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
  { id: "cascada", label: "Cascada", branch: "dano", tier: 4, desc: "El daño salta a enemigos en red. Rango = nº de saltos." },
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

// ¿Desbloqueado? Gating global por puntos del tier + su prereq específico (si lo tiene).
export function nodeUnlocked(
  node: DisciplineNode,
  especialidad: string | null,
  disciplinas: Record<string, number>,
): boolean {
  if (pointsInTree(especialidad, disciplinas) < (TIER_GATING[node.tier] ?? 0)) return false;
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
  const need = TIER_GATING[node.tier] ?? 0;
  if (pointsInTree(especialidad, disciplinas) < need) {
    return { rank, cost, canBuy: false, locked: true, reason: `${need} pts en árbol` };
  }
  const req = requiresState(node, especialidad, disciplinas);
  if (req && !req.met) {
    return { rank, cost, canBuy: false, locked: true, reason: `${req.label} ≥${req.rank}` };
  }
  if (xpDisponible < cost) return { rank, cost, canBuy: false, locked: false, reason: `${cost}xp` };
  return { rank, cost, canBuy: true, locked: false, reason: `${cost}xp` };
}
