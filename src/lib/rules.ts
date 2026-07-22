// Reglas del sistema homebrew de Nueva Era (Vampiro d10 point-buy + Cyberpunk).
// Fuente única de verdad: edita aquí atributos, habilidades, especialidades y costes.
import type { BuildSheet, Acquisition } from "./validation";
import {
  treeFor,
  treeSpent,
  nodeRank,
  nodeUnlocked,
  DISC_MAX,
} from "./disciplines";

export const ATTRIBUTES = [
  { id: "fuerza", label: "Fuerza", abbr: "FUE" },
  { id: "destreza", label: "Destreza", abbr: "DES" },
  { id: "inteligencia", label: "Inteligencia", abbr: "INT" },
] as const;
export type AttributeId = (typeof ATTRIBUTES)[number]["id"];

// Lista cerrada, agrupada por el atributo que la gobierna (dice pool = atributo + habilidad).
export const SKILLS = [
  { id: "atletismo", label: "Atletismo", attr: "fuerza" },
  { id: "cuerpo_a_cuerpo", label: "Cuerpo a cuerpo", attr: "fuerza" },
  { id: "intimidacion", label: "Intimidación", attr: "fuerza" },
  { id: "aguante", label: "Aguante", attr: "fuerza" },
  { id: "armas_distancia", label: "Armas a distancia", attr: "destreza" },
  { id: "sigilo", label: "Sigilo", attr: "destreza" },
  { id: "conduccion", label: "Conducción", attr: "destreza" },
  { id: "latrocinio", label: "Latrocinio", attr: "destreza" },
  { id: "netrunning", label: "Netrunning", attr: "inteligencia" },
  { id: "tecnologia", label: "Tecnología", attr: "inteligencia" },
  { id: "medicina", label: "Medicina", attr: "inteligencia" },
  { id: "percepcion", label: "Percepción", attr: "inteligencia" },
] as const;
export type SkillId = (typeof SKILLS)[number]["id"];

// Especialidad (sustituye al "clan"): ligada a un atributo. Su acento marca el color en UI.
// El descuento de disciplinas por especialidad llega en la rebanada 2.
export const ESPECIALIDADES = [
  { id: "merc", label: "Merc", attr: "fuerza", accent: "danger" },
  { id: "cazatalentos", label: "Cazatalentos", attr: "destreza", accent: "glitch" },
  { id: "netrunner", label: "Netrunner", attr: "inteligencia", accent: "info" },
] as const;
export type EspecialidadId = (typeof ESPECIALIDADES)[number]["id"];

export const ATTR_MIN = 1;
export const ATTR_MAX = 5;
export const SKILL_MIN = 0;
export const SKILL_MAX = 5;

// Coste en XP para subir de `current` al siguiente punto (Vampiro clásico).
export function attrCost(current: number): number {
  return current * 4; // 1→2=4, 2→3=8, 3→4=12, 4→5=16
}
export function skillCost(current: number): number {
  return current === 0 ? 3 : current * 2; // nueva=3, luego 1→2=2, 2→3=4…
}

export function defaultSheet(): BuildSheet {
  return {
    especialidad: null,
    edad: null,
    trasfondo: "",
    xpGanado: 0,
    dineroGanado: 0,
    attributes: { fuerza: ATTR_MIN, destreza: ATTR_MIN, inteligencia: ATTR_MIN },
    skills: Object.fromEntries(SKILLS.map((s) => [s.id, SKILL_MIN])) as BuildSheet["skills"],
    disciplinas: {},
    weapons: [],
    cyberware: [],
  };
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

// Lectura tolerante desde la DB (el Json puede traer datos viejos o incompletos).
export function parseSheet(raw: unknown): BuildSheet {
  const base = defaultSheet();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const rAttrs = (r.attributes ?? {}) as Record<string, unknown>;
  const rSkills = (r.skills ?? {}) as Record<string, unknown>;

  const attributes = { ...base.attributes };
  for (const a of ATTRIBUTES) {
    attributes[a.id] = clampInt(rAttrs[a.id], ATTR_MIN, ATTR_MAX, base.attributes[a.id]);
  }
  const skills = { ...base.skills };
  for (const s of SKILLS) {
    skills[s.id] = clampInt(rSkills[s.id], SKILL_MIN, SKILL_MAX, SKILL_MIN);
  }
  const especialidad = ESPECIALIDADES.some((e) => e.id === r.especialidad)
    ? (r.especialidad as EspecialidadId)
    : null;

  return {
    especialidad,
    edad:
      r.edad === null || r.edad === undefined
        ? null
        : clampInt(r.edad, 0, 999, 0),
    trasfondo: typeof r.trasfondo === "string" ? r.trasfondo.slice(0, 2000) : "",
    xpGanado: clampInt(r.xpGanado, 0, 1_000_000, 0),
    dineroGanado: clampInt(r.dineroGanado, 0, 1_000_000_000, 0),
    attributes,
    skills,
    disciplinas: parseRanks(r.disciplinas),
    weapons: parseAcquisitions(r.weapons),
    cyberware: parseAcquisitions(r.cyberware),
  };
}

function parseRanks(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    out[k] = clampInt(v, 0, 5, 0);
  }
  return out;
}

function parseAcquisitions(raw: unknown): Acquisition[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return {
        id: typeof o.id === "string" ? o.id : "",
        costePagado: clampInt(o.costePagado, 0, 1_000_000_000, 0),
      };
    })
    .filter((a) => a.id !== "");
}

// ── Economía derivada ──────────────────────────────────────────────
// Solo se guarda lo GANADO. El disponible = ganado − gastado, y el gastado
// se recalcula siempre desde la ficha → imposible falsear el saldo.

// XP acumulado para alcanzar un valor (suma de la fórmula escalonada).
export function attrSpent(value: number): number {
  return 2 * value * (value - 1); // Σ_{i=1}^{value-1} attrCost(i)
}
export function skillSpent(value: number): number {
  return value <= 0 ? 0 : 3 + value * (value - 1); // nueva(3) + Σ i·2
}

export function xpSpent(sheet: BuildSheet): number {
  let total = 0;
  for (const a of ATTRIBUTES) total += attrSpent(sheet.attributes[a.id]);
  for (const s of SKILLS) total += skillSpent(sheet.skills[s.id]);
  total += treeSpent(sheet.especialidad, sheet.disciplinas);
  return total;
}
export function moneySpent(sheet: BuildSheet): number {
  const w = sheet.weapons.reduce((t, x) => t + x.costePagado, 0);
  const c = sheet.cyberware.reduce((t, x) => t + x.costePagado, 0);
  return w + c;
}
export function xpDisponible(sheet: BuildSheet): number {
  return sheet.xpGanado - xpSpent(sheet);
}
export function dineroDisponible(sheet: BuildSheet): number {
  return sheet.dineroGanado - moneySpent(sheet);
}

// ── Operaciones (puras, server-authoritative): fijan un valor objetivo y
// rechazan si el XP disponible se quedaría en negativo. ──
export function setAttributeValue(
  sheet: BuildSheet,
  id: AttributeId,
  value: number,
): BuildSheet {
  const v = clampInt(value, ATTR_MIN, ATTR_MAX, sheet.attributes[id]);
  const next = { ...sheet, attributes: { ...sheet.attributes, [id]: v } };
  return xpDisponible(next) < 0 ? sheet : next;
}
export function setSkillValue(
  sheet: BuildSheet,
  id: SkillId,
  value: number,
): BuildSheet {
  const v = clampInt(value, SKILL_MIN, SKILL_MAX, sheet.skills[id]);
  const next = { ...sheet, skills: { ...sheet.skills, [id]: v } };
  return xpDisponible(next) < 0 ? sheet : next;
}

// Fija el rango de un nodo de disciplina. Al subir valida gating/prerreq y XP;
// bajar siempre vale (respec). El tronco (regalo) no baja de 1.
export function setDisciplineValue(
  sheet: BuildSheet,
  nodeId: string,
  value: number,
): BuildSheet {
  const node = treeFor(sheet.especialidad).find((n) => n.id === nodeId);
  if (!node) return sheet;
  const floor = node.gift ? 1 : 0;
  const current = nodeRank(node, sheet.disciplinas);
  const target = clampInt(value, floor, DISC_MAX, current);
  if (target === current) return sheet;
  if (target > current && !nodeUnlocked(node, sheet.especialidad, sheet.disciplinas)) {
    return sheet;
  }
  const next = {
    ...sheet,
    disciplinas: { ...sheet.disciplinas, [nodeId]: target },
  };
  return xpDisponible(next) < 0 ? sheet : next;
}
