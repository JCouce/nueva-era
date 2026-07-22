// Catálogo de armas. Se compran con €$. Ligadas a atributo(s) (no a la clase).
// Ataque = atributo del arma + skill de entrega (Cuerpo a cuerpo / Armas a distancia).
import type { AttributeId } from "./rules";

export type Weapon = {
  id: string;
  label: string;
  attrs: AttributeId[]; // 1 = especialista, 2 = híbrida (usa el mayor)
  tipo: "melee" | "distancia";
  dano: number;
  alcance: string;
  cadencia: string;
  ocultable: boolean;
  precio: number;
  req?: { attr: AttributeId; min: number }[]; // en híbridas basta cumplir UNO
};

export const WEAPONS: Weapon[] = [
  { id: "mazo", label: "Mazo pesado", attrs: ["fuerza"], tipo: "melee", dano: 4, alcance: "—", cadencia: "—", ocultable: false, precio: 800, req: [{ attr: "fuerza", min: 2 }] },
  { id: "escopeta", label: "Escopeta", attrs: ["fuerza"], tipo: "distancia", dano: 4, alcance: "corto", cadencia: "normal", ocultable: false, precio: 1200, req: [{ attr: "fuerza", min: 2 }] },
  { id: "katana", label: "Katana", attrs: ["destreza"], tipo: "melee", dano: 3, alcance: "—", cadencia: "—", ocultable: false, precio: 900, req: [{ attr: "destreza", min: 2 }] },
  { id: "pistola", label: "Pistola", attrs: ["destreza"], tipo: "distancia", dano: 3, alcance: "medio", cadencia: "normal", ocultable: true, precio: 600 },
  { id: "sniper", label: "Fusil de francotirador", attrs: ["destreza"], tipo: "distancia", dano: 5, alcance: "largo", cadencia: "lenta", ocultable: false, precio: 2500, req: [{ attr: "destreza", min: 3 }] },
  { id: "daga_smart", label: "Daga smart", attrs: ["inteligencia"], tipo: "melee", dano: 2, alcance: "—", cadencia: "—", ocultable: true, precio: 500 },
  { id: "smartgun", label: "Smartgun", attrs: ["inteligencia"], tipo: "distancia", dano: 3, alcance: "medio", cadencia: "normal", ocultable: true, precio: 1500, req: [{ attr: "inteligencia", min: 2 }] },
  { id: "asalto", label: "Fusil de asalto", attrs: ["destreza", "fuerza"], tipo: "distancia", dano: 4, alcance: "medio", cadencia: "automática", ocultable: false, precio: 2000, req: [{ attr: "destreza", min: 2 }, { attr: "fuerza", min: 2 }] },
  { id: "smg", label: "Subfusil (SMG)", attrs: ["destreza", "inteligencia"], tipo: "distancia", dano: 3, alcance: "corto", cadencia: "automática", ocultable: true, precio: 1400, req: [{ attr: "destreza", min: 2 }, { attr: "inteligencia", min: 2 }] },
];

export function weaponById(id: string): Weapon | undefined {
  return WEAPONS.find((w) => w.id === id);
}

// Atributo con el que se maneja: el mayor de los suyos (híbridas).
export function weaponAttr(weapon: Weapon, attributes: Record<AttributeId, number>): AttributeId {
  return weapon.attrs.reduce((best, a) => (attributes[a] > attributes[best] ? a : best), weapon.attrs[0]);
}

// Requisito cumplido: sin req, o al menos una entrada satisfecha (híbridas = "o").
export function weaponReqMet(weapon: Weapon, attributes: Record<AttributeId, number>): boolean {
  if (!weapon.req || weapon.req.length === 0) return true;
  return weapon.req.some((r) => attributes[r.attr] >= r.min);
}
