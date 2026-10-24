// Equipo instalado en la ficha: qué se guarda, cómo se valida una
// instalación y qué modificadores aporta mientras se lleva puesto. Dos hosts
// distintos con la misma forma: subsistemas/mejoras estándar viven dentro de
// una ARMADURA (ranura), mejoras de arma viven dentro de un ARMA (ranura +
// compatibilidad por tipo o por categoría de daño). Fuente:
// docs/equipamiento.md + las decisiones de la fase 3 en docs/traspaso.md §6.
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
  piezaFabricablePorId,
  RAREZA_ORDEN,
  type ArmaFuego,
  type Armadura,
  type Equipo,
  type MaterialPieza,
  type MejoraDeArma,
  type Rareza,
} from "../catalog/equipo";
import type { ExcepcionRareza } from "../catalog/especies";
import type { EstadoFicha } from "./revision";
import { ID_BUSQUEDA_MIRA } from "../catalog/mejorasArma";
import { PELEA } from "../catalog/armasMelee";
import { alcanzaA, alcanzaAlgunAplicado, type ContextoAccion, type FamiliaArma, type GrupoAccion, type Modificador, type ModificadorConFuente } from "./modificadores";
import type { CondicionTirada } from "./condiciones";
import type { AmenazaId, EfectoSalvacion } from "./aumentosTiradas";
import type { HabilidadId } from "./habilidades";
import { reconciliarRecursos, precioMaterial, sumarGranada, type MaterialTier } from "./recursos";
import type { Sheet } from "./sheet";
import type { ModificacionArmaId } from "../catalog/armasModificadas";
import {
  conversionDeArma,
  convertirArma,
  nombreDePieza,
  listaModificacionesSchema,
  modificacionesValidas,
  normalizarModificaciones,
  precioArmaModificada,
  rarezaArmaModificada,
  pesoArmaModificada,
} from "./armasModificadas";

// Acumulación de niveles, supuesto S9 (docs/sistema.md): "un efecto que un
// nivel introduce y los superiores no repiten ni anulan se acumula — el
// nivel N conserva lo desbloqueado en 1..N-1. Cuando el documento da un total
// explícito para ese nivel, se usa ese total tal cual, sin sumarlo al de
// niveles inferiores." Antes de esto (2026-09-25), cada función que leía una
// pieza con niveles hacía `niveles.find(n => n.nivel === pieza.nivel)` — solo
// el bloque exacto, perdiendo todo lo de 1..N-1 que el nivel actual no
// repitiera (bug real: Mira Telescópica n2/Visor Nocturno n1 desaparecían al
// subir de nivel). El catálogo lo venía parcheando a mano, pieza por pieza
// (Soporte Vital, Sistema de Retroceso, Estabilizador Neuronal repetían el
// efecto de nivel 1 en los superiores) — ya no hace falta, y esos parches se
// han quitado.

// Los niveles 1..nivelActual de una pieza, en orden ascendente. Exportada:
// combate.ts la reutiliza para mejoraArma (condicionesDeMejoras,
// bonosTramoDeMejoras, ajustesFijosDeMejoras) en vez de duplicarla.
export function nivelesHasta<T extends { nivel: number }>(niveles: T[], nivelActual: number): T[] {
  return niveles.filter((n) => n.nivel <= nivelActual).sort((a, b) => a.nivel - b.nivel);
}

// Pliega un campo tipo array (condiciones, modificadores) de varios niveles:
// por cada entrada se indexa por `claveDe` — un nivel superior que declare la
// MISMA clave sustituye a la de un nivel inferior (no se suman: así un total
// explícito que sube de nivel en nivel, como el bono de Medicina de
// FÁRMACOS, no se duplica), una clave nueva se añade (así una ventaja no
// repetida por niveles superiores se conserva, S9). El orden de aparición se
// conserva vía Map (itera en orden de inserción).
export function acumulaPorClave<T>(porNivel: T[][], claveDe: (item: T) => string): T[] {
  const mapa = new Map<string, T>();
  for (const items of porNivel) {
    for (const item of items) mapa.set(claveDe(item), item);
  }
  return [...mapa.values()];
}

export function claveModificador(m: Modificador): string {
  if (m.tipo === "multiplicadorVida") return m.tipo;
  if (m.tipo === "anulaPenalizadores") return `${m.tipo}:${JSON.stringify(m.alcance)}`;
  return m.tipo === "tirada" ? `tirada:${JSON.stringify(m.alcance)}` : `${m.tipo}:${m.id}`;
}

// Para campos de valor único por nivel (ajusteTramo, ajusteAtaque): el nivel
// más alto de la lista que lo define gana — no se combinan entre sí, cada
// uno ya es el total de ESE nivel (S9).
export function ultimoQueDefine<T, K extends keyof T>(niveles: T[], campo: K): T | undefined {
  for (let i = niveles.length - 1; i >= 0; i--) {
    if (niveles[i][campo] !== undefined) return niveles[i];
  }
  return undefined;
}

export type PiezaEquipada = {
  instanciaId: string;
  catalogoId: string;
  // Mejoras estándar, subsistemas y mejoras de arma: el nivel instalado.
  nivel?: number;
  // Mejoras estándar y subsistemas: instanciaId de la armadura que los aloja.
  // Mejoras de arma: instanciaId del arma que las lleva.
  instaladoEnId?: string;
  // Comprada saltándose el tope de rareza por una excepción de especie (kerzul del
  // Arköru, §14.6). Solo la pone el servidor (puedeEquiparSinRareza en equiparAction).
  viaEspecie?: true;
  // Aumentos (§11.3): el sentido de Introgresión o el modelo del Brazo Biónico
  // (niveles 3 y 4). Lo valida compraAumento (rules/aumentos.ts) al comprar.
  eleccion?: string;
  // Aumentos: parte del precio pagada con la bolsa del humano (lo demás fueron créditos).
  // Hace falta para devolver cada cosa a su sitio al quitarlo en creación. Solo el servidor.
  pagoBolsa?: number;
  // Brazo Biónico (A6b): instanciaId del arma incorporada, un arma de una mano equipada (de
  // cuerpo a cuerpo o de fuego, no la Pelea). Solo en la pieza del brazo; lo fija
  // fijarArmaIncorporada y lo limpia conArmaIncorporadaValida.
  armaIncorporada?: string;
  // Armas Modificadas (S87): Electrificante, Térmica, Plasma, Nanofilamento sobre un arma
  // melee. Orden fijo (normalizarModificaciones); lo valida validarModificaciones.
  modificaciones?: ModificacionArmaId[];
};

export const piezaEquipadaSchema = z.object({
  instanciaId: z.string().min(1).max(60),
  catalogoId: z.string().min(1).max(60),
  nivel: z.number().int().min(1).max(4).optional(),
  instaladoEnId: z.string().min(1).max(60).optional(),
  viaEspecie: z.literal(true).optional(),
  eleccion: z.string().min(1).max(40).optional(),
  pagoBolsa: z.number().int().min(0).max(9_999_999).optional(),
  armaIncorporada: z.string().min(1).max(60).optional(),
  // Una lista que no se reconoce se pierde, no la pieza (lectura tolerante, parseSheet).
  modificaciones: listaModificacionesSchema.optional().catch(undefined),
});

// Lo que se acepta del cliente al equipar: `viaEspecie` no, lo decide el servidor
// (zod descarta la clave si llega). El arma incorporada va por su propia acción. Las
// modificaciones, estrictas: una lista mala se rechaza, no se ignora.
export const piezaEquipadaEntradaSchema = piezaEquipadaSchema
  .omit({ viaEspecie: true, pagoBolsa: true, armaIncorporada: true })
  .extend({ modificaciones: listaModificacionesSchema.optional() });

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

// Una mira instalada sobre un arma con `miraIntegrada` sustituye a la de
// serie, cuya ranura ya viene descontada de `mejorasAdmitidas` — no ocupa
// una segunda.
export function sustituyeMiraIntegrada(catalogoId: string, arma: ArmaFuego): boolean {
  return catalogoId === "mira_telescopica" && arma.miraIntegrada !== undefined;
}

export function mejorasArmaInstaladas(sheet: Sheet, armaInstanciaId: string): number {
  const host = sheet.equipo.find((p) => p.instanciaId === armaInstanciaId);
  const hostCat = host ? equipoPorId(host.catalogoId) : null;
  return sheet.equipo.reduce((total, p) => {
    if (p.instaladoEnId !== armaInstanciaId) return total;
    const cat = equipoPorId(p.catalogoId);
    if (cat?.familia !== "mejoraArma") return total;
    if (hostCat?.familia === "arma" && sustituyeMiraIntegrada(p.catalogoId, hostCat)) return total;
    return total + 1;
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
    if (sustituyeMiraIntegrada(catalogoId, hostCat)) {
      const integrada = hostCat.miraIntegrada ?? 0;
      if ((nivel ?? 1) <= integrada) {
        return {
          ok: false,
          motivo: `${hostCat.label} ya lleva integrada la ${pieza.label} de nivel ${integrada}.`,
        };
      }
      return { ok: true };
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
  // Los aumentos tienen su propia compra (requisitos, subir de nivel, elección y
  // bolsa del humano): compraAumento en rules/aumentos.ts.
  if (cat.familia === "operacionGenetica" || cat.familia === "implante") return sheet;
  // Armas Modificadas: solo sobre un arma melee que las admita, en orden fijo (S87).
  if (!modificacionesValidas(pieza)) return sheet;
  const nueva = pieza.modificaciones ? { ...pieza, modificaciones: normalizarModificaciones(pieza.modificaciones) } : pieza;

  // herramienta, consumible y armaPesada se equipan directo, como una
  // armadura — no están en esta lista a propósito, caen en la rama de abajo
  // sin host. Granada NO se equipa nunca por aquí desde 2026-09-27: es un
  // recurso con cantidad (comprarGranada()/fabricar(), recursos.ts), no una
  // PiezaEquipada — quien llama a equipar() con esa familia se equivoca de
  // función.
  const necesitaHost =
    cat.familia === "subsistema" ||
    cat.familia === "mejoraEstandar" ||
    cat.familia === "mejoraArma" ||
    cat.familia === "movimiento";
  if (necesitaHost) {
    if (!pieza.instaladoEnId) return sheet;
    if (!validarInstalacion(sheet, pieza.catalogoId, pieza.instaladoEnId, pieza.nivel).ok) return sheet;
  }

  return reconciliarRecursos({ ...sheet, equipo: [...sheet.equipo, nueva] });
}

// VTF equipada (cualquier nivel) — requisito de Fabricar (docs/tareas.md,
// tarea 8), no de Reparar. La VTF no gatea rareza (herramientas.ts), solo
// habilita el botón: por eso no hace falta mirar `nivel` aquí — sí hace
// falta para la dificultad, ver nivelVtf()/dificultadFabricacion() abajo.
export function tieneVtf(sheet: Sheet): boolean {
  return sheet.equipo.some((p) => p.catalogoId === "valija_tactica_fabricacion");
}

// Nivel de la VTF equipada, o null si no hay ninguna — 0 no es un nivel real
// (los niveles empiezan en 1), así que null no es ambiguo. Corrección
// 2026-09-25 (revisión del usuario, "¿estamos aplicando los niveles de la
// VTF?"): hasta ahora tieneVtf() era la ÚNICA consulta a la VTF en todo el
// flujo de Fabricar/Reparar — el nivel se ignoraba por completo, aunque el
// catálogo (herramientas.ts) sí liga la dificultad al nivel.
export function nivelVtf(sheet: Sheet): number | null {
  const pieza = sheet.equipo.find((p) => p.catalogoId === "valija_tactica_fabricacion");
  return pieza?.nivel ?? null;
}

// Dificultad de Fabricar (docs/equipamiento.md:1078-1081): base 7 para
// Común, +2 por cada rango de rareza superior. Desde la VTF nivel 2, "Fabrica
// objetos poco habituales con la dificultad de los comunes" — SOLO Poco
// Habitual (rango 1) baja a rango 0; el documento no dice nada de Extraño o
// Muy Extraño, así que esos rangos no bajan aunque la VTF sea nivel 3 o 4.
// Niveles 3/4 no vuelven a tocar esta dificultad (solo economía de acción y
// recuperación de materia prima, ninguna de las dos mecanizada). El
// beneficio de nivel 2 persiste en 3 y 4 por acumulación de niveles (S9,
// nivelesHasta() arriba) — no hace falta mirar más que "nivelVtf >= 2".
// Compartida con Reparar (ReparaFabricaModal.tsx): su dificultad es esta
// misma, -4.
export function dificultadFabricacion(rareza: Rareza, nivelVtf: number | null): number {
  const rango = RAREZA_ORDEN.indexOf(rareza);
  const rangoEfectivo = nivelVtf !== null && nivelVtf >= 2 && rango === 1 ? 0 : rango;
  return 7 + 2 * rangoEfectivo;
}

// Armas Modificadas en Fabricar (S87): un arma melee nueva ya modificada, o una
// modificación sobre un arma que ya se lleva (`sobreInstanciaId`, también sobre otra
// modificación salvo Plasma), pagando la diferencia de precio en materiales.
export const opcionesFabricarSchema = z.object({
  modificaciones: listaModificacionesSchema.optional(),
  sobreInstanciaId: z.string().min(1).max(60).optional(),
});
export type OpcionesFabricar = z.infer<typeof opcionesFabricarSchema>;

// Qué se fabrica y a qué precio y rareza: lo comparten fabricar(), fabricarAction (tope
// de rareza del material) y Fabricar en la UI (dificultad y unidades).
export type EncargoFabricacion =
  | { ok: true; coste: number; rareza: Rareza; nombre: string }
  | { ok: false; motivo: string };

export function encargoFabricacion(
  sheet: Pick<Sheet, "equipo">,
  catalogoId: string,
  opciones?: OpcionesFabricar,
): EncargoFabricacion {
  const cat = piezaFabricablePorId(catalogoId);
  if (!cat) return { ok: false, motivo: "Esa pieza no se puede fabricar." };
  const mods = opciones?.modificaciones;
  if (opciones?.sobreInstanciaId) {
    const pieza = sheet.equipo.find((p) => p.instanciaId === opciones.sobreInstanciaId);
    if (!pieza || pieza.catalogoId !== catalogoId) return { ok: false, motivo: "Esa arma ya no está equipada." };
    const conv = conversionDeArma(sheet, opciones.sobreInstanciaId, mods ?? []);
    if (!conv.ok) return conv;
    return { ok: true, coste: conv.coste, rareza: conv.rareza ?? cat.rareza, nombre: conv.nombre };
  }
  if (!mods) return { ok: true, coste: cat.coste, rareza: cat.rareza, nombre: cat.label };
  if (cat.familia !== "armaMelee" || !modificacionesValidas({ catalogoId, modificaciones: mods })) {
    return { ok: false, motivo: "Esa modificación no cabe en esa pieza." };
  }
  return {
    ok: true,
    coste: precioArmaModificada(cat, mods) ?? cat.coste,
    rareza: rarezaArmaModificada(cat, mods) ?? cat.rareza,
    nombre: nombreDePieza({ catalogoId, modificaciones: mods }),
  };
}

// Fabricar: "comprar" pagando en Materiales en vez de en créditos — mismo
// golpe que equipar(), salvo que la pieza no llega entera del cliente (solo
// el catalogoId, decisión del usuario), así que el instanciaId se genera
// aquí en vez de en la UI. El coste en unidades es créditos-equivalentes
// (docs/equipamiento.md: "material suficiente para igualar el precio del
// objeto"): la SUMA del valor de catálogo de las unidades gastadas cubre el
// precio del objeto, no "1 unidad = 1 crédito". Redondeo al alza, mismo
// criterio que el resto del sistema (+2 dificultad por rango de rareza).
// Silencioso si no hay stock suficiente o la pieza no es fabricable — quien
// llama (la action) ya valida VTF equipada y rareza con rarezaPermitida()
// ANTES de esto, mismo criterio que repararPieza().
//
// `exito` (corrección 2026-09-25, decisión del usuario): el intento de
// fabricar SÍ exige una tirada (docs/equipamiento.md:1078-1081), a diferencia
// del propio gasto, que sigue sin dado — quien llama ya resolvió esa tirada
// en el cliente (mismo AccionModal que cualquier otra) y pasa el resultado
// aquí. El material se gasta SIEMPRE, salga lo que salga: fabricar es un
// intento arriesgado, no una compra con devolución. Solo con éxito se añade
// la pieza a `sheet.equipo`. NPCs (fabricarNpcAction) siguen editando libre,
// sin tirada — pasan `exito: true` siempre, ver esa action.
export function fabricar(
  sheet: Sheet,
  catalogoId: string,
  tier: MaterialTier,
  exito: boolean,
  opciones?: OpcionesFabricar,
): Sheet {
  const encargo = encargoFabricacion(sheet, catalogoId, opciones);
  if (!encargo.ok) return sheet;

  const precioUnidad = precioMaterial(tier);
  if (precioUnidad <= 0) return sheet;
  const unidades = Math.ceil(encargo.coste / precioUnidad);
  if (sheet.materiales[tier] < unidades) return sheet;

  const sinMaterial: Sheet = {
    ...sheet,
    materiales: { ...sheet.materiales, [tier]: sheet.materiales[tier] - unidades },
  };
  if (!exito) return sinMaterial;

  if (opciones?.sobreInstanciaId) return convertirArma(sinMaterial, opciones.sobreInstanciaId, opciones.modificaciones ?? []);

  // Granada: no es una pieza equipable (docs/tareas.md, 2026-09-27), es un
  // recurso con cantidad — fabricarla suma 1 unidad en vez de equipar().
  if (piezaFabricablePorId(catalogoId)?.familia === "granada") return sumarGranada(sinMaterial, catalogoId);

  return equipar(sinMaterial, {
    instanciaId: nuevaInstanciaId(),
    catalogoId,
    ...(opciones?.modificaciones && { modificaciones: opciones.modificaciones }),
  });
}

// Quitar una armadura o un arma se lleva también lo que tuviera instalado
// dentro: un subsistema o una mejora no puede quedar flotando sin dónde vivir.
// Si se va el arma incorporada en el Brazo Biónico, el vínculo cae con ella (A6b).
export function desequipar(sheet: Sheet, instanciaId: string): Sheet {
  return reconciliarRecursos({
    ...sheet,
    equipo: conArmaIncorporadaValida(
      sheet.equipo.filter((p) => p.instanciaId !== instanciaId && p.instaladoEnId !== instanciaId),
    ),
  });
}

// ── Arma incorporada del Brazo Biónico (A6b, docs/sistema.md §11) ─────────

export const ID_BRAZO_BIONICO = "aum_brazo_bionico";
const IDS_PELEA = new Set(PELEA.map((p) => p.id));

// Un arma de una mano, de cuerpo a cuerpo o de fuego; no la Pelea (es el propio brazo) ni los
// escudos, que no caben "en su interior" (usuario, 2026-10-22; al bloquear sí llevan la casilla).
export function esArmaIncorporable(pieza: Pick<PiezaEquipada, "catalogoId"> | undefined): boolean {
  if (!pieza) return false;
  const cat = equipoPorId(pieza.catalogoId);
  if (cat?.familia === "arma") return cat.empleo === "una mano";
  if (cat?.familia === "armaMelee") return cat.empleo === "una mano" && !IDS_PELEA.has(cat.id) && !cat.defensa;
  return false;
}

// Las armas equipadas que se pueden incorporar al brazo: las opciones del selector de Equipo.
export function armasIncorporables(sheet: Pick<Sheet, "equipo">): PiezaEquipada[] {
  return sheet.equipo.filter((p) => esArmaIncorporable(p));
}

// El vínculo solo vale en la pieza del brazo y apuntando a un arma incorporable que siga
// equipada; si no, se descarta (parseSheet y desequipar).
export function conArmaIncorporadaValida(equipo: PiezaEquipada[]): PiezaEquipada[] {
  return equipo.map((p) => {
    if (p.armaIncorporada === undefined) return p;
    const arma = equipo.find((q) => q.instanciaId === p.armaIncorporada);
    if (p.catalogoId === ID_BRAZO_BIONICO && esArmaIncorporable(arma)) return p;
    const sinVinculo = { ...p };
    delete sinVinculo.armaIncorporada;
    return sinVinculo;
  });
}

// Lo que llega del cliente al fijar el arma incorporada: el brazo y el arma (null, ninguna).
export const armaIncorporadaEntradaSchema = z.object({
  brazoInstanciaId: z.string().min(1).max(60),
  armaInstanciaId: z.string().min(1).max(60).nullable(),
});

// Fija (o quita, con null) el arma incorporada del brazo. Sin exigir la tirada de "Incorporar
// arma" (usuario, 2026-10-22): la tirada se hace aparte, en Acciones.
export function fijarArmaIncorporada(
  sheet: Sheet,
  brazoInstanciaId: string,
  armaInstanciaId: string | null,
): { ok: true; sheet: Sheet } | { ok: false; error: string } {
  const brazo = sheet.equipo.find((p) => p.instanciaId === brazoInstanciaId);
  if (!brazo || brazo.catalogoId !== ID_BRAZO_BIONICO) return { ok: false, error: "No llevas ese Brazo Biónico" };
  if (armaInstanciaId !== null && !esArmaIncorporable(sheet.equipo.find((p) => p.instanciaId === armaInstanciaId))) {
    return { ok: false, error: "Esa arma no está equipada o no es de una mano" };
  }
  const equipo = sheet.equipo.map((p) => {
    if (p !== brazo) return p;
    const sinVinculo = { ...p };
    delete sinVinculo.armaIncorporada;
    return armaInstanciaId === null ? sinVinculo : { ...sinVinculo, armaIncorporada: armaInstanciaId };
  });
  return { ok: true, sheet: { ...sheet, equipo } };
}

// Precio de una pieza equipada, para la Tienda con créditos (docs/traspaso.md
// §6). Armas/armaduras/melee/consumibles cotizan por el catálogo tal cual —
// no tienen niveles, herramienta incluida (VTM, y lo que llegue después)
// cotiza por el nivel elegido, igual que las instalables — el nivel N ya
// incluye lo del N-1 (S9), así que el coste de la tabla para ese nivel es
// el precio final, no se suma con niveles inferiores. Sin entrada en el
// catálogo o sin coste (Pelea, a mano vacía) cuesta 0. "granada" se queda en
// esta rama por completitud de tipos (MunicionGranada sí tiene `coste`
// plano), aunque en la práctica ninguna PiezaEquipada la lleva ya — el
// precio real de una granada vive en comprarGranada() (recursos.ts).
export function costeDePieza(pieza: PiezaEquipada): number {
  const cat = equipoPorId(pieza.catalogoId);
  if (!cat) return 0;
  if (
    cat.familia === "armadura" ||
    cat.familia === "arma" ||
    cat.familia === "armaMelee" ||
    cat.familia === "consumible" ||
    cat.familia === "armaPesada" ||
    cat.familia === "granada" ||
    cat.familia === "operacionGenetica"
  ) {
    if (cat.familia === "armaMelee") return precioArmaModificada(cat, pieza.modificaciones ?? []) ?? 0;
    return cat.coste ?? 0;
  }
  return cat.niveles.find((n) => n.nivel === pieza.nivel)?.coste ?? 0;
}

// Cuánto se devuelve al desequipar `instanciaId`: la pieza en sí, más todo
// lo que llevara instalado dentro, porque desequipar() se lo lleva por
// delante en el mismo golpe. Decisión del usuario (2026-09-10): desequipar
// devuelve el coste íntegro, no hay medias tintas ni penalización.
// Los aumentos no entran aquí: con la ficha aprobada no se revenden, y en creación
// los devuelve devolucionAumento (aumentos.ts), que separa bolsa y créditos.
export function costeDeRetirar(sheet: Sheet, instanciaId: string): number {
  return sheet.equipo
    .filter((p) => p.instanciaId === instanciaId || p.instaladoEnId === instanciaId)
    .filter((p) => {
      const familia = equipoPorId(p.catalogoId)?.familia;
      return familia !== "operacionGenetica" && familia !== "implante";
    })
    .reduce((total, p) => total + costeDePieza(p), 0);
}

// Rareza de una pieza equipada, con el mismo criterio de nivel que
// costeDePieza (las instalables cotizan por el nivel elegido). null si no
// existe en el catálogo o no tiene rareza asignada (Pelea, a mano vacía):
// sin rareza no hay tope que aplicarle.
export function rarezaDePieza(pieza: PiezaEquipada): Rareza | null {
  const cat = equipoPorId(pieza.catalogoId);
  if (!cat) return null;
  if (
    cat.familia === "armadura" ||
    cat.familia === "arma" ||
    cat.familia === "armaMelee" ||
    cat.familia === "consumible" ||
    cat.familia === "armaPesada" ||
    cat.familia === "granada" ||
    cat.familia === "operacionGenetica"
  ) {
    if (cat.familia === "armaMelee") return rarezaArmaModificada(cat, pieza.modificaciones ?? []);
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

// Material especial de la pieza según el catálogo (hoy solo el kerzul), o null.
export function materialDePieza(catalogoId: string): MaterialPieza | null {
  const cat = equipoPorId(catalogoId);
  return cat?.familia === "armaMelee" ? (cat.material ?? null) : null;
}

// ¿Esta compra se salta el tope de rareza por una excepción de especie (Acceso al
// Kerzul, §14.6)? Solo se consulta cuando el tope bloquearía; si sale `permitida`,
// el servidor marca la pieza con `viaEspecie`. `agotada`: todo encaja salvo que el
// hueco ya está ocupado (la Tienda enseña el motivo en vez del de rareza).
export type ContextoExcepcionRareza = {
  estado: EstadoFicha;
  // Quien compra, no el dueño: el máster no tiene tope, así que nunca gasta el hueco.
  esMaster: boolean;
  // De la especie (excepcionesRareza en especie.ts; FichaResuelta.excepcionesRareza).
  excepciones: ExcepcionRareza[];
};

export type ResultadoExcepcionRareza =
  | { permitida: true; material: MaterialPieza }
  | { permitida: false; agotada: boolean; motivo: string };

export function puedeEquiparSinRareza(
  sheet: Pick<Sheet, "equipo">,
  catalogoId: string,
  ctx: ContextoExcepcionRareza,
): ResultadoExcepcionRareza {
  const no = (motivo: string, agotada = false): ResultadoExcepcionRareza => ({ permitida: false, agotada, motivo });
  if (ctx.esMaster) return no("El máster no tiene tope de rareza");
  if (ctx.estado !== "DRAFT") return no("Solo en creación");
  const material = materialDePieza(catalogoId);
  const excepcion = material ? ctx.excepciones.find((e) => e.material === material) : undefined;
  if (!material || !excepcion) return no("Tu especie no tiene acceso a esta pieza sin rareza");
  const usadas = sheet.equipo.filter((p) => p.viaEspecie && materialDePieza(p.catalogoId) === material).length;
  if (usadas >= excepcion.maxPiezas) {
    return no(
      excepcion.maxPiezas === 1
        ? `Ya tienes tu pieza de ${material} vía especie`
        : `Ya tienes tus ${excepcion.maxPiezas} piezas de ${material} vía especie`,
      true,
    );
  }
  return { permitida: true, material };
}

// El tope de rareza de una compra, con la excepción de especie ya aplicada: lo usan
// equiparAction (que marca `viaEspecie`) y la Tienda (que pinta "vía especie" o el
// motivo). `tope` null = no hay tope (aprobada, máster, sin letra, NPC); `ctx` null =
// sin excepción posible.
export type TopeRarezaCompra =
  | { tipo: "permitida" }
  | { tipo: "viaEspecie" }
  | { tipo: "bloqueada"; motivo: string };

export function topeRarezaDeCompra(
  sheet: Pick<Sheet, "equipo">,
  catalogoId: string,
  rareza: Rareza | null,
  tope: Rareza | null,
  ctx: ContextoExcepcionRareza | null,
): TopeRarezaCompra {
  if (!tope || rarezaPermitida(rareza, tope)) return { tipo: "permitida" };
  const excepcion = ctx ? puedeEquiparSinRareza(sheet, catalogoId, ctx) : null;
  if (excepcion?.permitida) return { tipo: "viaEspecie" };
  return {
    tipo: "bloqueada",
    motivo: excepcion?.agotada ? excepcion.motivo : `Tu letra de Recursos no llega a ${rareza}: tope ${tope}.`,
  };
}

// Peso de una pieza equipada, para Carga Transportable (docs/sistema.md
// §5.5). Arma, armaMelee, consumible y armaPesada tienen `pesoKg` en el
// catálogo — armaduras, herramienta y las familias instalables no traen
// columna de Peso en EQUIP, así que devuelven 0: no es que pesen cero, es
// que el documento no lo dice. "granada" se queda en esta rama por
// completitud de tipos, aunque en la práctica ninguna PiezaEquipada la lleva
// ya (docs/tareas.md, 2026-09-27).
export function pesoDePieza(pieza: PiezaEquipada): number {
  const cat = equipoPorId(pieza.catalogoId);
  if (!cat) return 0;
  if (
    cat.familia === "arma" ||
    cat.familia === "armaMelee" ||
    cat.familia === "consumible" ||
    cat.familia === "armaPesada" ||
    cat.familia === "granada"
  ) {
    if (cat.familia === "armaMelee") return pesoArmaModificada(cat, pieza.modificaciones ?? []) ?? 0;
    return cat.pesoKg ?? 0;
  }
  return 0;
}

// Suma de lo que SÍ se sabe pesar (ver pesoDePieza) de todo lo equipado. No
// es "el peso total real" — la interfaz avisa de qué falta (personaje/EstadoPanel).
export function pesoEquipado(sheet: Sheet): number {
  return sheet.equipo.reduce((total, p) => total + pesoDePieza(p), 0);
}

// Los modificadores que aporta lo que el jugador lleva puesto. Solo llegan
// aquí las piezas con `modificadores` numéricos sin condición (ver el
// comentario de cabecera de catalog/equipo.ts); el resto se queda en texto.
export function modificadoresDeEquipo(sheet: Sheet): ModificadorConFuente[] {
  return sheet.equipo.flatMap((pieza): ModificadorConFuente[] => {
    const cat = equipoPorId(pieza.catalogoId);
    // Los aumentos dan los suyos con origen "aumento" (modificadoresDeAumentos, aumentos.ts).
    if (!cat || cat.familia === "operacionGenetica" || cat.familia === "implante") return [];

    if (
      cat.familia === "armadura" ||
      cat.familia === "arma" ||
      cat.familia === "consumible" ||
      cat.familia === "armaPesada"
    ) {
      return cat.modificadores.map((m) => ({ ...m, origen: "equipo" as const, fuente: cat.label }));
    }

    // Las armas melee no tienen niveles ni modificadores mecanizados: el
    // daño es una fórmula ("Fue+2") que se calcula al golpear, no un bono
    // fijo del personaje (ver catalog/armasMelee.ts). "granada" se queda
    // aquí por completitud de tipos (MunicionGranada no tiene el campo
    // `modificadores` en absoluto), aunque en la práctica ninguna
    // PiezaEquipada la lleva ya (docs/tareas.md, 2026-09-27).
    if (cat.familia === "armaMelee" || cat.familia === "granada") return [];

    if (pieza.nivel === undefined) return [];
    const niveles = nivelesHasta(cat.niveles, pieza.nivel);
    if (niveles.length === 0) return [];
    const modificadores = acumulaPorClave(
      niveles.map((n) => n.modificadores),
      claveModificador,
    );
    return modificadores.map((m) => ({
      ...m,
      origen: "equipo" as const,
      fuente: `${cat.label} ${pieza.nivel}`,
    }));
  });
}

// Bonos a salvaciones del equipo contra unas amenazas (2026-10-24): los de la armadura que
// cuenta (la primera de la ficha, como el blindaje) y los de las mejoras estándar instaladas
// en ella. Van al selector «Contra…» de cada salvación (casillasDeAumentos), no a la salvación
// entera. Por niveles, el que repite amenazas sustituye al anterior.
export function salvacionesDeEquipo(sheet: Pick<Sheet, "equipo">): { fuente: string; efectos: EfectoSalvacion[] }[] {
  let armadura: { pieza: PiezaEquipada; cat: Armadura } | null = null;
  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia === "armadura") {
      armadura = { pieza, cat };
      break;
    }
  }
  if (!armadura) return [];
  const deArmadura = armadura.cat.salvaciones ?? [];
  const bonoArmadura = (contra: AmenazaId) =>
    deArmadura.filter((e) => e.contra.includes(contra)).reduce((t, e) => t + (e.bono ?? 0), 0);
  const aportes = deArmadura.length > 0 ? [{ fuente: armadura.cat.label, efectos: deArmadura }] : [];
  for (const pieza of sheet.equipo) {
    if (pieza.instaladoEnId !== armadura.pieza.instanciaId || pieza.nivel === undefined) continue;
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia !== "mejoraEstandar") continue;
    const efectos = acumulaPorClave(
      nivelesHasta(cat.niveles, pieza.nivel).map((n) => n.salvaciones ?? []),
      (e) => e.contra.join("+"),
    ).flatMap(({ subeLaDeLaArmadura, ...e }): EfectoSalvacion[] => {
      if (!subeLaDeLaArmadura) return [e];
      return e.contra.flatMap((c) => {
        const extra = (e.bono ?? 0) - bonoArmadura(c);
        return extra > 0 ? [{ contra: [c], bono: extra }] : [];
      });
    });
    if (efectos.length > 0) aportes.push({ fuente: `${cat.label} ${pieza.nivel}`, efectos });
  }
  return aportes;
}

// CondicionTirada (toggle/opción/contador) que el equipo aporta a CUALQUIER
// tirada por su `alcance` — simétrico a modificadoresDeEquipo, pero para
// condiciones en vez de modificadores numéricos (docs/modificadores-tiradas.md
// §8). Solo recoge condiciones que declaren `alcance`; las que no lo llevan
// siguen viviendo solo en su arma, vía condicionesDeMejoras (combate.ts).
//
// `mejoraArma` incluida desde 2026-09-25 (Puntero Láser -2 sigilo, Mira
// Telescópica bono a percepción — dos casos reales pidiendo lo mismo, ver
// docs/equipo-efectos-especiales.md). Antes se excluía por miedo a duplicar
// con condicionesDeMejoras (combate.ts), que vuelca TODAS las condiciones de
// una mejora en la tirada de su propia arma sin mirar `alcance`. El riesgo
// solo es real si una mejora de arma declarara `alcance: "grupo"/"todas"`
// sobre el propio grupo "Ataques" (o un `tiradaId` que coincida con el de su
// arma huésped) — nadie lo hace hoy, y no tiene sentido hacerlo: sería
// redundante con lo que condicionesDeMejoras ya aporta gratis. Convención, no
// código que lo impida: una condición de mejoraArma con `alcance` debe
// apuntar SIEMPRE a una tirada fija ajena a la del arma que la lleva.
// Toggle de búsqueda de la Mira Telescópica (Alerta Activa): uno solo aunque
// haya varias miras, del nivel más alto entre las instaladas y las integradas
// de los fusiles de precisión — si cada mira aportara el suyo, compartirían
// id en el modal y el bono se sumaría dos veces.
export function condicionBusquedaMiraDeFicha(sheet: Sheet): CondicionTirada | null {
  const mira = equipoPorId("mira_telescopica");
  if (!mira || mira.familia !== "mejoraArma") return null;
  let nivel = 0;
  for (const pieza of sheet.equipo) {
    if (pieza.catalogoId === "mira_telescopica" && pieza.instaladoEnId) nivel = Math.max(nivel, pieza.nivel ?? 0);
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia === "arma" && cat.miraIntegrada) nivel = Math.max(nivel, cat.miraIntegrada);
  }
  if (nivel === 0) return null;
  const condiciones = acumulaPorClave(
    nivelesHasta(mira.niveles, nivel).map((n) => n.condiciones ?? []),
    (c) => c.id,
  );
  return condiciones.find((c) => c.id === ID_BUSQUEDA_MIRA) ?? null;
}

export function condicionesActivas(sheet: Sheet, ctx: ContextoAccion): CondicionTirada[] {
  const porPieza = sheet.equipo.flatMap((pieza): CondicionTirada[] => {
    const cat = equipoPorId(pieza.catalogoId);
    if (!cat) return [];
    if (
      cat.familia !== "mejoraEstandar" &&
      cat.familia !== "subsistema" &&
      cat.familia !== "herramienta" &&
      cat.familia !== "mejoraArma"
    ) {
      return [];
    }
    if (pieza.nivel === undefined) return [];
    const niveles = nivelesHasta(cat.niveles, pieza.nivel);
    const condiciones = acumulaPorClave(
      niveles.map((n) => n.condiciones ?? []),
      (c) => c.id,
    );
    return condiciones.filter((c) => c.id !== ID_BUSQUEDA_MIRA && c.alcance && alcanzaA(c.alcance, ctx));
  });
  const busqueda = condicionBusquedaMiraDeFicha(sheet);
  return busqueda?.alcance && alcanzaA(busqueda.alcance, ctx) ? [...porPieza, busqueda] : porPieza;
}

// Versión indexada de condicionesActivas(): construye UNA VEZ, con una sola
// pasada de sheet.equipo, un índice por cada alcance que sí se puede indexar
// (tiradaId exacto, o las listas — pequeñas en la práctica — de grupo/
// habilidad/todas), en vez de repetir la pasada completa por cada tirada
// mostrada (AccionesTab.tsx la llamaba una vez por fila). Alcance "modo" queda
// fuera a propósito: en el único call site que consume esto hoy, ctx llega
// siempre con `modoElegido: null` (la tirada ni se ha abierto todavía), así
// que "modo" nunca hace match ahí — se resuelve aparte, dentro del modal.
//
// `orden` se guarda para poder devolver el resultado en el mismo orden que
// condicionesActivas() (orden de aparición en sheet.equipo): repartir en
// varios Map/arrays por tipo de alcance y luego concatenarlos por bucket
// perdería ese orden si dos piezas con alcances de tipo distinto se
// intercalan.
type CondicionIndexada = { condicion: CondicionTirada; orden: number };

export type IndiceCondiciones = {
  porTiradaId: Map<string, CondicionIndexada[]>;
  porGrupo: Map<GrupoAccion, CondicionIndexada[]>;
  porHabilidad: Map<HabilidadId, CondicionIndexada[]>;
  // Tiradas generadas por arma (dotes, D2b-1): por familia; el empleo lo filtra la consulta.
  porFamiliaArma: Map<FamiliaArma, CondicionIndexada[]>;
  // Por aplicado (A2b de aumentos): pocas, en una lista; la consulta mira los aplicados
  // posibles de la tirada y montarTirada, el de verdad.
  porAplicado: CondicionIndexada[];
  todas: CondicionIndexada[];
};

function agregaIndexada<K>(mapa: Map<K, CondicionIndexada[]>, clave: K, entrada: CondicionIndexada) {
  const lista = mapa.get(clave);
  if (lista) lista.push(entrada);
  else mapa.set(clave, [entrada]);
}

// `deOtrasFuentes`: casillas con alcance que no salen del equipo (las de la especie,
// casillasDeEspecie, §14.8, y las de dotes, §9.3), indexadas detrás de las del equipo.
// Las pasa resolverFicha.
export function indiceDeCondiciones(sheet: Sheet, deOtrasFuentes: CondicionTirada[]): IndiceCondiciones {
  const indice: IndiceCondiciones = {
    porTiradaId: new Map(),
    porGrupo: new Map(),
    porHabilidad: new Map(),
    porFamiliaArma: new Map(),
    porAplicado: [],
    todas: [],
  };

  let orden = 0;
  const indexar = (condicion: CondicionTirada) => {
    const alcance = condicion.alcance;
    if (!alcance) return;
    const entrada: CondicionIndexada = { condicion, orden: orden++ };
    if (alcance.tipo === "tiradaId") agregaIndexada(indice.porTiradaId, alcance.id, entrada);
    else if (alcance.tipo === "grupo") agregaIndexada(indice.porGrupo, alcance.grupo, entrada);
    else if (alcance.tipo === "habilidad" && alcance.habilidad) agregaIndexada(indice.porHabilidad, alcance.habilidad, entrada);
    // grupoHabilidad va con las de su habilidad; la consulta descarta las de otro grupo.
    else if (alcance.tipo === "grupoHabilidad") agregaIndexada(indice.porHabilidad, alcance.habilidad, entrada);
    else if (alcance.tipo === "familiaArma") agregaIndexada(indice.porFamiliaArma, alcance.familia, entrada);
    else if (alcance.tipo === "aplicado") indice.porAplicado.push(entrada);
    else if (alcance.tipo === "todas") indice.todas.push(entrada);
    // "modo" queda fuera del índice a propósito, ver comentario de arriba.
  };
  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (!cat) continue;
    if (
      cat.familia !== "mejoraEstandar" &&
      cat.familia !== "subsistema" &&
      cat.familia !== "herramienta" &&
      cat.familia !== "mejoraArma"
    ) {
      continue;
    }
    if (pieza.nivel === undefined) continue;
    const niveles = nivelesHasta(cat.niveles, pieza.nivel);
    const condiciones = acumulaPorClave(
      niveles.map((n) => n.condiciones ?? []),
      (c) => c.id,
    );

    for (const condicion of condiciones) {
      if (condicion.id !== ID_BUSQUEDA_MIRA) indexar(condicion);
    }
  }
  const busqueda = condicionBusquedaMiraDeFicha(sheet);
  if (busqueda) indexar(busqueda);
  for (const condicion of deOtrasFuentes) indexar(condicion);

  return indice;
}

export function consultaIndiceCondiciones(indice: IndiceCondiciones, ctx: ContextoAccion): CondicionTirada[] {
  const candidatas: CondicionIndexada[] = [
    ...(indice.porTiradaId.get(ctx.id) ?? []),
    ...(indice.porGrupo.get(ctx.grupo) ?? []),
    ...(ctx.habilidad ? (indice.porHabilidad.get(ctx.habilidad) ?? []) : []).filter(
      (c) => c.condicion.alcance?.tipo !== "grupoHabilidad" || c.condicion.alcance.grupo === ctx.grupo,
    ),
    ...(ctx.familiaArma ? (indice.porFamiliaArma.get(ctx.familiaArma) ?? []) : []).filter(
      (c) => c.condicion.alcance !== undefined && alcanzaA(c.condicion.alcance, ctx),
    ),
    ...indice.todas,
  ];
  // Las de aplicado, con los aplicados posibles de la tirada más los de las casillas de arriba
  // que lo cambian (Negociación Analítica llega por aquí, de las dotes).
  const cambiados = candidatas.flatMap((c) => (c.condicion.tipo === "toggle" && c.condicion.aplicado ? [c.condicion.aplicado] : []));
  const conPosibles: ContextoAccion = {
    ...ctx,
    aplicadosPosibles: [...(ctx.aplicadosPosibles ?? (ctx.aplicado ? [ctx.aplicado] : [])), ...cambiados],
  };
  const porAplicado = indice.porAplicado.filter(
    (c) => c.condicion.alcance?.tipo === "aplicado" && alcanzaAlgunAplicado(c.condicion.alcance, conPosibles),
  );
  return [...candidatas, ...porAplicado].sort((a, b) => a.orden - b.orden).map((c) => c.condicion);
}
