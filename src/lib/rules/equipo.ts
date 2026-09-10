// Equipo instalado en la ficha: qué se guarda, cómo se valida una
// instalación y qué modificadores aporta mientras se lleva puesto. Dos hosts
// distintos con la misma forma: subsistemas/mejoras estándar viven dentro de
// una ARMADURA (ranura), mejoras de arma viven dentro de un ARMA (ranura +
// compatibilidad por tipo o por categoría de daño). Fuente:
// docs/equipamiento.md + las decisiones de la fase 3 en docs/handoff.md §6.
//
// "Comprar" y "equipar" son la misma acción — sheet.equipo es lo que el
// personaje lleva puesto, no un inventario aparte. Si algún día hace falta
// poseer algo sin llevarlo encima, se añade un campo `equipado: boolean` sin
// romper esto. El precio se cobra en créditos reales (Character.creditos,
// characters/[id]/actions.ts) y la rareza tiene su propio tope, ligado a la
// letra de Recursos — ver rarezaPermitida() más abajo.
import { z } from "zod";
import {
  equipoPorId,
  RAREZA_ORDEN,
  type ArmaFuego,
  type Equipo,
  type MejoraDeArma,
  type Rareza,
} from "../catalog/equipo";
import type { ModificadorConFuente } from "./modificadores";
import type { Sheet } from "./sheet";

export type PiezaEquipada = {
  instanciaId: string;
  catalogoId: string;
  // Mejoras estándar, subsistemas y mejoras de arma: el nivel instalado.
  nivel?: number;
  // Mejoras estándar y subsistemas: instanciaId de la armadura que los aloja.
  // Mejoras de arma: instanciaId del arma que las lleva.
  instaladoEnId?: string;
};

export const piezaEquipadaSchema = z.object({
  instanciaId: z.string().min(1).max(60),
  catalogoId: z.string().min(1).max(60),
  nivel: z.number().int().min(1).max(4).optional(),
  instaladoEnId: z.string().min(1).max(60).optional(),
});

// Generador de ids, separado de las funciones puras de más abajo para que
// sigan siendo testeables sin azar de por medio — mismo criterio que
// tirarD12() / resolverTirada() en tiradas.ts.
export function nuevaInstanciaId(): string {
  return crypto.randomUUID();
}

export function ranurasSubsistemaUsadas(sheet: Sheet, armaduraInstanciaId: string): number {
  return sheet.equipo.reduce((total, p) => {
    if (p.instaladoEnId !== armaduraInstanciaId) return total;
    const cat = equipoPorId(p.catalogoId);
    return cat?.familia === "subsistema" ? total + cat.ranurasQueConsume : total;
  }, 0);
}

export function mejorasArmaInstaladas(sheet: Sheet, armaInstanciaId: string): number {
  return sheet.equipo.reduce((total, p) => {
    if (p.instaladoEnId !== armaInstanciaId) return total;
    const cat = equipoPorId(p.catalogoId);
    return cat?.familia === "mejoraArma" ? total + 1 : total;
  }, 0);
}

// La compatibilidad de una mejora de arma tiene dos formas en EQUIP: por
// tipo de arma ("solo fusiles de asalto") o por categoría de daño ("las
// armas de plasma no pueden instalarla").
function compatibleConArma(mejora: MejoraDeArma, arma: ArmaFuego): boolean {
  const c = mejora.compatibilidad;
  if (c.tipo === "todas") return true;
  if (c.tipo === "porTipoArma") return c.tiposPermitidos.includes(arma.tipo);
  return !arma.modos.some((m) => c.categoriasExcluidas.includes(m.categoriaDanio));
}

// Ya hay una pieza de este mismo catálogo instalada en ese host. No tiene
// sentido llevar dos Camuflajes en la misma armadura o dos Miras en la
// misma arma: para subir de nivel se quita la vieja y se pone la nueva.
function yaInstalado(sheet: Sheet, catalogoId: string, instaladoEnId: string): boolean {
  return sheet.equipo.some(
    (p) => p.instaladoEnId === instaladoEnId && p.catalogoId === catalogoId,
  );
}

// Explica por qué algo no se puede instalar, en vez de rechazarlo en
// silencio: es el hueco que pedía el encargo ("necesitas una X para
// equiparlo"). La UI la llama antes de mostrar el botón de instalar.
//
// `nivel` solo lo necesita movimiento: a ranuras y compatibilidad de arma
// les da igual qué nivel instalas, pero el tope de exoesqueleto/movilidad
// aérea depende exactamente de eso.
export function validarInstalacion(
  sheet: Sheet,
  catalogoId: string,
  instaladoEnId: string,
  nivel?: number,
): { ok: true } | { ok: false; motivo: string } {
  const pieza = equipoPorId(catalogoId);
  if (!pieza) return { ok: false, motivo: "No existe en el catálogo." };

  const host = sheet.equipo.find((p) => p.instanciaId === instaladoEnId);
  const hostCat: Equipo | null = host ? equipoPorId(host.catalogoId) : null;

  if (pieza.familia === "subsistema" || pieza.familia === "mejoraEstandar") {
    if (!hostCat || hostCat.familia !== "armadura") {
      return { ok: false, motivo: "Necesitas tener puesta una armadura para instalarlo." };
    }
    if (yaInstalado(sheet, catalogoId, instaladoEnId)) {
      return { ok: false, motivo: `${hostCat.label} ya lleva ${pieza.label} instalado.` };
    }
    if (pieza.familia === "mejoraEstandar") return { ok: true }; // no consume ranura

    if (hostCat.ranurasSubsistema === 0) {
      return { ok: false, motivo: `${hostCat.label} no tiene ranuras de subsistema.` };
    }
    const usadas = ranurasSubsistemaUsadas(sheet, instaladoEnId);
    if (usadas + pieza.ranurasQueConsume > hostCat.ranurasSubsistema) {
      return {
        ok: false,
        motivo: `${hostCat.label} ya tiene sus ${hostCat.ranurasSubsistema} ranura(s) de subsistema ocupadas.`,
      };
    }
    return { ok: true };
  }

  if (pieza.familia === "mejoraArma") {
    if (!hostCat || hostCat.familia !== "arma") {
      return { ok: false, motivo: "Necesitas tener un arma equipada para instalarlo." };
    }
    if (!compatibleConArma(pieza, hostCat)) {
      return { ok: false, motivo: `${pieza.label} no es compatible con ${hostCat.label}.` };
    }
    if (yaInstalado(sheet, catalogoId, instaladoEnId)) {
      return { ok: false, motivo: `${hostCat.label} ya lleva ${pieza.label} instalado.` };
    }
    if (hostCat.mejorasAdmitidas === 0) {
      return { ok: false, motivo: `${hostCat.label} no admite mejoras.` };
    }
    const usadas = mejorasArmaInstaladas(sheet, instaladoEnId);
    if (usadas >= hostCat.mejorasAdmitidas) {
      return {
        ok: false,
        motivo: `${hostCat.label} ya tiene sus ${hostCat.mejorasAdmitidas} mejora(s) ocupadas.`,
      };
    }
    return { ok: true };
  }

  if (pieza.familia === "movimiento") {
    if (!hostCat || hostCat.familia !== "armadura") {
      return { ok: false, motivo: "Necesitas tener puesta una armadura para instalarlo." };
    }
    const tope =
      pieza.tope === "exoesqueleto" ? hostCat.topeExoesqueleto : hostCat.topeMovilidadAerea;
    if (tope === null) {
      return { ok: false, motivo: `${hostCat.label} no admite ${pieza.label.toLowerCase()}.` };
    }
    if (yaInstalado(sheet, catalogoId, instaladoEnId)) {
      return { ok: false, motivo: `${hostCat.label} ya lleva ${pieza.label} instalado.` };
    }
    if (!nivel) {
      return { ok: false, motivo: "Elige un nivel para instalarlo." };
    }
    if (nivel > tope) {
      return {
        ok: false,
        motivo: `${hostCat.label} solo admite ${pieza.label} hasta nivel ${tope}.`,
      };
    }
    return { ok: true };
  }

  return { ok: false, motivo: `${pieza.label} no se instala en otra pieza.` };
}

// Añade una pieza. Se autoguarda igual que setAtributoValue/addEspecialidad:
// si no es válida, no cambia nada — la UI ya consultó validarInstalacion
// antes de dejar pulsar el botón, esto es el guardarraíl del motor.
export function equipar(sheet: Sheet, pieza: PiezaEquipada): Sheet {
  const cat = equipoPorId(pieza.catalogoId);
  if (!cat) return sheet;

  const necesitaHost =
    cat.familia === "subsistema" ||
    cat.familia === "mejoraEstandar" ||
    cat.familia === "mejoraArma" ||
    cat.familia === "movimiento";
  if (necesitaHost) {
    if (!pieza.instaladoEnId) return sheet;
    if (!validarInstalacion(sheet, pieza.catalogoId, pieza.instaladoEnId, pieza.nivel).ok) return sheet;
  }

  return { ...sheet, equipo: [...sheet.equipo, pieza] };
}

// Quitar una armadura o un arma se lleva también lo que tuviera instalado
// dentro: un subsistema o una mejora no puede quedar flotando sin dónde vivir.
export function desequipar(sheet: Sheet, instanciaId: string): Sheet {
  return {
    ...sheet,
    equipo: sheet.equipo.filter(
      (p) => p.instanciaId !== instanciaId && p.instaladoEnId !== instanciaId,
    ),
  };
}

// Precio de una pieza equipada, para la Tienda con créditos (docs/handoff.md
// §6). Armas/armaduras/melee cotizan por el catálogo tal cual; las
// instalables (mejora estándar, subsistema, mejora de arma, movimiento)
// cotizan por el nivel elegido — el nivel N ya incluye lo del N-1 (S9), así
// que el coste de la tabla para ese nivel es el precio final, no se suma con
// niveles inferiores. Sin entrada en el catálogo o sin coste (Pelea, a mano
// vacía) cuesta 0.
export function costeDePieza(pieza: PiezaEquipada): number {
  const cat = equipoPorId(pieza.catalogoId);
  if (!cat) return 0;
  if (cat.familia === "armadura" || cat.familia === "arma" || cat.familia === "armaMelee") {
    return cat.coste ?? 0;
  }
  return cat.niveles.find((n) => n.nivel === pieza.nivel)?.coste ?? 0;
}

// Cuánto se devuelve al desequipar `instanciaId`: la pieza en sí, más todo
// lo que llevara instalado dentro, porque desequipar() se lo lleva por
// delante en el mismo golpe. Decisión del usuario (2026-09-10): desequipar
// devuelve el coste íntegro, no hay medias tintas ni penalización.
export function costeDeRetirar(sheet: Sheet, instanciaId: string): number {
  return sheet.equipo
    .filter((p) => p.instanciaId === instanciaId || p.instaladoEnId === instanciaId)
    .reduce((total, p) => total + costeDePieza(p), 0);
}

// Rareza de una pieza equipada, con el mismo criterio de nivel que
// costeDePieza (las instalables cotizan por el nivel elegido). null si no
// existe en el catálogo o no tiene rareza asignada (Pelea, a mano vacía):
// sin rareza no hay tope que aplicarle.
export function rarezaDePieza(pieza: PiezaEquipada): Rareza | null {
  const cat = equipoPorId(pieza.catalogoId);
  if (!cat) return null;
  if (cat.familia === "armadura" || cat.familia === "arma" || cat.familia === "armaMelee") {
    return cat.rareza;
  }
  return cat.niveles.find((n) => n.nivel === pieza.nivel)?.rareza ?? null;
}

// ¿Cabe `rareza` dentro del `tope` de la letra de Recursos (docs/sistema.md
// §2, "Creación por prioridad")? Sin rareza asignada, siempre cabe — no hay
// nada que restringir. Decisión del usuario (2026-09-11): el tope solo rige
// en creación, nunca para el máster — quien llama decide cuándo consultarla,
// esta función no sabe de aprobación ni de roles.
export function rarezaPermitida(rareza: Rareza | null, tope: Rareza): boolean {
  if (rareza === null) return true;
  return RAREZA_ORDEN.indexOf(rareza) <= RAREZA_ORDEN.indexOf(tope);
}

// Los modificadores que aporta lo que el jugador lleva puesto. Solo llegan
// aquí las piezas con `modificadores` numéricos sin condición (ver el
// comentario de cabecera de catalog/equipo.ts); el resto se queda en texto.
export function modificadoresDeEquipo(sheet: Sheet): ModificadorConFuente[] {
  return sheet.equipo.flatMap((pieza): ModificadorConFuente[] => {
    const cat = equipoPorId(pieza.catalogoId);
    if (!cat) return [];

    if (cat.familia === "armadura" || cat.familia === "arma") {
      return cat.modificadores.map((m) => ({ ...m, origen: "equipo" as const, fuente: cat.label }));
    }

    // Las armas melee no tienen niveles ni modificadores mecanizados: el
    // daño es una fórmula ("Fue+2") que se calcula al golpear, no un bono
    // fijo del personaje (ver catalog/armasMelee.ts).
    if (cat.familia === "armaMelee") return [];

    const nivelInfo = cat.niveles.find((n) => n.nivel === pieza.nivel);
    if (!nivelInfo) return [];
    return nivelInfo.modificadores.map((m) => ({
      ...m,
      origen: "equipo" as const,
      fuente: `${cat.label} ${nivelInfo.nivel}`,
    }));
  });
}
