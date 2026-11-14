// Numerar los NPCs de catálogo al meterlos en un combate (usuario, 2026-11-15): «Goblin 1»,
// «Goblin 2»… para distinguirlos en la consola. Puro, sin Prisma, para testearlo con node --test.

export type CombatienteExistente = { nombre: string; npcTemplateId: string | null };
export type PlantillaNueva = { id: string; nombre: string };

const escaparRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Número de un nombre «<plantilla> N»; null si el máster lo renombró y ya no encaja.
function numeroEnNombre(nombre: string, plantilla: string): number | null {
  const m = new RegExp(`^${escaparRegex(plantilla)} ([1-9]\\d*)$`).exec(nombre);
  return m ? Number(m[1]) : null;
}

// Nombres para `nuevos`, en su orden. La cuenta es por plantilla dentro del combate y no
// reutiliza números (máximo existente + 1) aunque se haya quitado o derrotado alguno: así el
// «Goblin 2» del que se habló en mesa nunca pasa a ser otro bicho.
export function nombresNumerados(existentes: CombatienteExistente[], nuevos: PlantillaNueva[]): string[] {
  const ultimo = new Map<string, number>();
  const ultimoDe = (p: PlantillaNueva) => {
    const guardado = ultimo.get(p.id);
    if (guardado !== undefined) return guardado;
    let max = 0;
    for (const c of existentes) {
      if (c.npcTemplateId !== p.id) continue;
      const n = numeroEnNombre(c.nombre, p.nombre);
      if (n !== null && n > max) max = n;
    }
    return max;
  };
  return nuevos.map((p) => {
    const n = ultimoDe(p) + 1;
    ultimo.set(p.id, n);
    return `${p.nombre} ${n}`;
  });
}
