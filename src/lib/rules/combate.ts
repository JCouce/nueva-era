// Convierte el equipo de la ficha en tiradas concretas — "Disparar con Fusil
// Plaga (Compleja)" en vez del genérico "Ataque a distancia" de antes. Es la
// pieza que faltaba para que el equipo alimente de verdad la chuleta de
// tiradas (ver docs/handoff.md §6, punto 4).
//
// Puños y patadas (PELEA) están siempre disponibles sin equipar nada — el
// documento es explícito en eso — así que se generan igual que un arma
// equipada, con una instancia estable (su propio id de catálogo).
import type { Sheet } from "./sheet";
import type { PiezaEquipada } from "./equipo";
import {
  equipoPorId,
  type ArmaFuego,
  type TipoArma,
} from "../catalog/equipo";
import { PELEA, type ArmaMelee } from "../catalog/armasMelee";
import { MUNICION_GRANADA } from "../catalog/municion";
import type { CondicionTirada, TramoDistancia } from "./condiciones";
import type { Tirada } from "./tiradas";

const TRAMOS: TramoDistancia[] = ["bocajarro", "corta", "media", "larga"];

// Modificador de distancia base, igual para toda arma de fuego (ver
// sistema-y-combate.md), con las dos excepciones de familia que documenta
// EQUIP: las escopetas suman +1 a corta y bocajarro; los fusiles de
// precisión cambian el +2 de corta por -2, "en vez del bonificador
// habitual". Es una regla de familia (todas las armas de ese tipo la
// comparten), no de una pieza concreta, así que vive en código y no como
// dato repetido en cada arma del catálogo.
function ajusteTramoBase(tipo: TipoArma): Record<TramoDistancia, number> {
  const base: Record<TramoDistancia, number> = { bocajarro: 4, corta: 2, media: 0, larga: -2 };
  if (tipo === "escopeta") {
    return { ...base, bocajarro: base.bocajarro + 1, corta: base.corta + 1 };
  }
  if (tipo === "fusil_precision") {
    return { ...base, corta: -2 };
  }
  return base;
}

function etiquetaTramo(tramo: TramoDistancia, alcance: ArmaFuego["alcance"]): string {
  switch (tramo) {
    case "bocajarro":
      return `Bocajarro (< ${alcance.corta} m)`;
    case "corta":
      return `Corta (${alcance.corta}-${alcance.media} m)`;
    case "media":
      return `Media (${alcance.media}-${alcance.larga} m)`;
    case "larga":
      return `Larga (${alcance.larga}+ m)`;
  }
}

// La opción de tramo de una tirada de ataque concreta: parte del ajuste base
// del tipo de arma y le suma el `ajusteTramo` de cada mejora instalada en
// ESA arma (mira telescópica y lo que llegue después) — mecanizar la
// siguiente pieza que module la distancia es un dato nuevo en el catálogo,
// no código nuevo aquí.
function condicionTramo(sheet: Sheet, arma: ArmaFuego, instanciaId: string): CondicionTirada {
  const ajuste = { ...ajusteTramoBase(arma.tipo) };
  for (const pieza of sheet.equipo) {
    if (pieza.instaladoEnId !== instanciaId) continue;
    const cat = equipoPorId(pieza.catalogoId);
    if (!cat || cat.familia !== "mejoraArma") continue;
    const nivel = cat.niveles.find((n) => n.nivel === pieza.nivel);
    if (!nivel) continue;
    for (const tramo of TRAMOS) {
      const delta = nivel.ajusteTramo?.[tramo];
      if (delta !== undefined) ajuste[tramo] += delta;
    }
    // Incondicional: se suma a los cuatro tramos por igual (el -1 del
    // Lanzagranadas Integrado por el peso, por ejemplo).
    if (nivel.ajusteAtaque) {
      for (const tramo of TRAMOS) ajuste[tramo] += nivel.ajusteAtaque;
    }
  }
  return {
    id: "tramo",
    tipo: "opcion",
    etiqueta: "Distancia",
    opciones: TRAMOS.map((tramo) => ({
      id: tramo,
      etiqueta: etiquetaTramo(tramo, arma.alcance),
      valor: ajuste[tramo],
    })),
    porDefecto: "media",
  };
}

// El resto de condiciones que traiga cualquier mejora instalada en esta
// arma en concreto (bípode apoyado, y lo que llegue después). `ajusteTramo`
// no se repite aquí: ya está fusionado en condicionTramo.
function condicionesDeMejoras(sheet: Sheet, instanciaId: string): CondicionTirada[] {
  const condiciones: CondicionTirada[] = [];
  for (const pieza of sheet.equipo) {
    if (pieza.instaladoEnId !== instanciaId) continue;
    const cat = equipoPorId(pieza.catalogoId);
    if (!cat || cat.familia !== "mejoraArma") continue;
    const nivel = cat.niveles.find((n) => n.nivel === pieza.nivel);
    if (nivel?.condiciones) condiciones.push(...nivel.condiciones);
  }
  return condiciones;
}

function condicionModo(modos: { id: string; etiqueta: string; dificultad: number }[]): CondicionTirada | null {
  if (modos.length <= 1) return null;
  return {
    id: "modo",
    tipo: "opcion",
    etiqueta: "Modo de disparo",
    opciones: modos.map((m) => ({ id: m.id, etiqueta: m.etiqueta, valor: m.dificultad })),
    porDefecto: modos[0].id,
  };
}

function tiradaDeArmaFuego(sheet: Sheet, arma: ArmaFuego, instanciaId: string): Tirada {
  const modosConId = arma.modos.map((m, i) => ({ ...m, id: `${i}` }));
  const condiciones = [condicionTramo(sheet, arma, instanciaId), condicionModo(modosConId)].filter(
    (c): c is CondicionTirada => c !== null,
  );
  condiciones.push(...condicionesDeMejoras(sheet, instanciaId));

  return {
    id: `ataque_fuego_${instanciaId}`,
    label: `Disparar con ${arma.label}`,
    grupo: "Ataques",
    aplicado: "reflejos",
    habilidad: "combate_distancia",
    nota: arma.especial ?? undefined,
    condiciones,
    ataque: {
      modos: modosConId.map((m) => ({
        id: m.id,
        danio: m.danio,
        formulaDanio: null,
        categoriaDanio: m.categoriaDanio,
      })),
    },
  };
}

// El Lanzagranadas Integrado no es una condición de la tirada del arma que
// lo lleva (ver ajusteAtaque): es un perfil de disparo propio, con su propia
// dificultad fija (-2, sea cual sea la granada) y su daño según la munición
// elegida — igual que un modo de disparo, salvo que aquí hay 13 en vez de 2.
function tiradaDeLanzagranadas(sheet: Sheet, arma: ArmaFuego, instanciaId: string): Tirada | null {
  const tieneLanzagranadas = sheet.equipo.some(
    (p) => p.instaladoEnId === instanciaId && p.catalogoId === "lanzagranadas_integrado",
  );
  if (!tieneLanzagranadas) return null;

  const modo = condicionModo(MUNICION_GRANADA.map((m) => ({ id: m.id, etiqueta: m.label, dificultad: 0 })));

  return {
    id: `lanzagranadas_${instanciaId}`,
    label: `Lanzagranadas (${arma.label})`,
    grupo: "Ataques",
    aplicado: "reflejos",
    habilidad: "combate_distancia",
    nota: "Acción estándar · cargador 1 · alcance 200 m. Área y efecto según la granada elegida (docs/equipamiento.md).",
    ajusteFijo: -2,
    condiciones: modo ? [modo] : [],
    ataque: {
      modos: MUNICION_GRANADA.map((m) => ({
        id: m.id,
        danio: m.danio,
        formulaDanio: null,
        categoriaDanio: m.categoriaDanio ?? "Efecto (sin daño directo)",
      })),
    },
  };
}

function tiradaDeArmaMelee(arma: ArmaMelee, instanciaId: string): Tirada {
  const modosConId = arma.modos.map((m, i) => ({ ...m, id: `${i}` }));
  const modo = condicionModo(modosConId);

  return {
    id: `ataque_melee_${instanciaId}`,
    label: arma.uso.includes("Sutil") ? `Golpear con ${arma.label} (o Sutil)` : `Golpear con ${arma.label}`,
    grupo: "Ataques",
    aplicado: "potencia",
    habilidad: "combate_melee",
    nota: arma.uso.includes("Sutil")
      ? "Con estilo Sutil se tira Reflejos en lugar de Potencia, y el daño usa Potencia en lugar de Fuerza"
      : undefined,
    condiciones: modo ? [modo] : [],
    ataque: {
      modos: modosConId.map((m) => ({
        id: m.id,
        danio: null,
        formulaDanio: m.formulaDanio,
        categoriaDanio: m.categoriaDanio,
      })),
    },
  };
}

// Todas las filas de la categoría "Ataques": una por arma de fuego
// equipada, una por arma melee equipada, y las tres de pelea (siempre
// disponibles). El orden es estable: fuego primero, luego melee equipado,
// luego pelea — así lo más probable que se vaya a tirar queda arriba.
export function tiradasDeAtaque(sheet: Sheet): Tirada[] {
  const tiradas: Tirada[] = [];

  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia !== "arma") continue;
    tiradas.push(tiradaDeArmaFuego(sheet, cat, pieza.instanciaId));
    const lanzagranadas = tiradaDeLanzagranadas(sheet, cat, pieza.instanciaId);
    if (lanzagranadas) tiradas.push(lanzagranadas);
  }

  const meleeEquipada: { pieza: PiezaEquipada; cat: ArmaMelee }[] = [];
  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia === "armaMelee") meleeEquipada.push({ pieza, cat });
  }
  for (const { pieza, cat } of meleeEquipada) {
    tiradas.push(tiradaDeArmaMelee(cat, pieza.instanciaId));
  }

  for (const cat of PELEA) {
    tiradas.push(tiradaDeArmaMelee(cat, cat.id));
  }

  return tiradas;
}
