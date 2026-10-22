// Pestaña Vida del centro de mando: daño o curación de vida/fatiga a varios objetivos,
// con una entrada `vida` en el registro del máster, y su deshacer. No son server
// actions: quien llama ya ha comprobado que es el máster y validado la entrada. Las
// cuentas (topes, qué cambia, cuándo se puede deshacer) viven en lib/rules (registro.ts).
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import {
  fotoEnMesa,
  leerEstados,
  parseSheet,
  reconciliarVidaConEstados,
  planAjusteVida,
  planDeshacerVida,
  topesDeVida,
  type DatosVida,
  type ObjetivoVida,
  type ObjetivoVidaActual,
  type RecursoVital,
} from "@/lib/rules";
import { COMBATE_ABIERTO, registrar, revalidarEstados, type Autoria } from "@/lib/estadosPersonaje";

type Tx = Prisma.TransactionClient;
export type ResultadoVida = { ok: true; registroId: string | null } | { ok: false; error: string };

const CAMPO_FICHA = { vida: "vidaActual", fatiga: "fatigaActual" } as const;
const CAMPO_FOTO = { vida: "pgActual", fatiga: "fatigaActual" } as const;
const MAX_FOTO = { vida: "pgMax", fatiga: "fatigaMax" } as const;

type FotoLeida = {
  id: string;
  nombre: string;
  characterId: string | null;
  pgActual: number;
  pgMax: number;
  fatigaActual: number;
  fatigaMax: number;
};
const SELECT_FOTO = {
  id: true,
  nombre: true,
  characterId: true,
  pgActual: true,
  pgMax: true,
  fatigaActual: true,
  fatigaMax: true,
} as const;

const objetivoDeFoto = (f: FotoLeida, recurso: RecursoVital): ObjetivoVidaActual => ({
  objetivo: "combatiente",
  id: f.id,
  nombre: f.nombre,
  npc: f.characterId === null,
  actual: f[CAMPO_FOTO[recurso]],
  tope: f[MAX_FOTO[recurso]],
});

async function fichasComoObjetivos(tx: Tx, ids: string[], recurso: RecursoVital) {
  const filas = await tx.character.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, stats: true, estados: true } });
  return filas.map((f) => {
    // Tope y recorte con los activables puestos (A5b): parseSheet topa con el posible.
    const estados = leerEstados(f.estados);
    const sheet = reconciliarVidaConEstados(parseSheet(f.stats), estados);
    const objetivo: ObjetivoVidaActual = {
      objetivo: "ficha",
      id: f.id,
      nombre: f.name,
      npc: false,
      actual: sheet[CAMPO_FICHA[recurso]],
      tope: topesDeVida(sheet, estados)[recurso],
    };
    return { objetivo, sheet };
  });
}

// Escribe los valores nuevos (ajuste o deshacer). Las fichas se reescriben enteras desde
// la ya leída (parseSheet), como el resto de acciones sobre `stats`.
async function escribir(
  tx: Tx,
  recurso: RecursoVital,
  valores: { objetivo: ObjetivoVida; id: string; valor: number }[],
  fichas: Map<string, ReturnType<typeof parseSheet>>,
) {
  for (const v of valores) {
    if (v.objetivo === "combatiente") {
      await tx.combatiente.update({ where: { id: v.id }, data: { [CAMPO_FOTO[recurso]]: v.valor } });
      continue;
    }
    const sheet = fichas.get(v.id);
    if (sheet) await tx.character.update({ where: { id: v.id }, data: { stats: { ...sheet, [CAMPO_FICHA[recurso]]: v.valor } } });
  }
}

async function aplicar(
  tx: Tx,
  objetivos: ObjetivoVidaActual[],
  fichas: Map<string, ReturnType<typeof parseSheet>>,
  recurso: RecursoVital,
  delta: number,
  autoria: Autoria,
): Promise<string | null> {
  const cambios = planAjusteVida(objetivos, delta);
  if (cambios.length === 0) return null;
  await escribir(
    tx,
    recurso,
    cambios.map((c) => ({ objetivo: c.objetivo, id: c.id, valor: c.despues })),
    fichas,
  );
  return registrar(tx, autoria, { tipo: "vida", recurso, delta, cambios });
}

// Combate: la foto (pgActual/fatigaActual) de cada fila de la cola, jugador o NPC.
export async function ajustarVidaDeCombatientes(
  combatienteIds: string[],
  recurso: RecursoVital,
  delta: number,
  autoria: Autoria,
): Promise<ResultadoVida> {
  const ids = [...new Set(combatienteIds)];
  const res = await prisma.$transaction(async (tx) => {
    const fotos = await tx.combatiente.findMany({ where: { id: { in: ids } }, select: SELECT_FOTO });
    if (fotos.length !== ids.length) return { ok: false as const, error: "Alguno de esos combatientes ya no está en la cola." };
    const registroId = await aplicar(tx, fotos.map((f) => objetivoDeFoto(f, recurso)), new Map(), recurso, delta, autoria);
    return { ok: true as const, registroId, characterIds: fotos.flatMap((f) => (f.characterId ? [f.characterId] : [])) };
  });
  if (!res.ok) return res;
  revalidarEstados(res.characterIds);
  return { ok: true, registroId: res.registroId };
}

// Mesa: la vida de la ficha (stats). Si el jugador está en un combate en curso, la de su
// foto, que es la que enseña la Mesa (vidaEnMesa/fotoEnMesa).
// TODO(revisar): con combate en curso se ajusta la foto y no la ficha (coherente con
// E1d: la Mesa enseña la del combate); al terminar el combate la ficha no recibe ese
// daño, igual que cuando lo ajusta el jugador desde su fila de combate.
export async function ajustarVidaDePersonajes(
  characterIds: string[],
  recurso: RecursoVital,
  delta: number,
  autoria: Autoria,
): Promise<ResultadoVida> {
  const ids = [...new Set(characterIds)];
  const res = await prisma.$transaction(async (tx) => {
    const fichas = await fichasComoObjetivos(tx, ids, recurso);
    if (fichas.length !== ids.length) return { ok: false as const, error: "Alguno de esos personajes no existe." };
    const fotos = await tx.combatiente.findMany({
      where: { characterId: { in: ids }, combate: { estado: "EN_CURSO" } },
      select: { ...SELECT_FOTO, orden: true, derrotado: true },
    });
    const objetivos = fichas.map(({ objetivo }) => {
      const foto = fotoEnMesa(fotos.filter((f) => f.characterId === objetivo.id));
      // El nombre del personaje, no el copiado en la foto (es el mismo salvo renombrado).
      return foto ? { ...objetivoDeFoto(foto, recurso), nombre: objetivo.nombre } : objetivo;
    });
    const porId = new Map(fichas.map((f) => [f.objetivo.id, f.sheet]));
    return { ok: true as const, registroId: await aplicar(tx, objetivos, porId, recurso, delta, autoria) };
  });
  if (!res.ok) return res;
  revalidarEstados(ids);
  return { ok: true, registroId: res.registroId };
}

// Deshacer una entrada `vida` dentro de la transacción de deshacerRegistro. Lanza el
// error con `fallo` si no se puede; devuelve los personajes a revalidar.
export async function deshacerVidaEnTx(tx: Tx, datos: DatosVida, fallo: (error: string) => Error): Promise<string[]> {
  const idsDe = (o: ObjetivoVida) => datos.cambios.filter((c) => c.objetivo === o).map((c) => c.id);
  const fichas = await fichasComoObjetivos(tx, idsDe("ficha"), datos.recurso);
  // Una foto de un combate ya terminado cuenta como que ya no existe: se salta.
  const fotos = await tx.combatiente.findMany({
    where: { id: { in: idsDe("combatiente") }, combate: COMBATE_ABIERTO },
    select: SELECT_FOTO,
  });
  const plan = planDeshacerVida(datos, [
    ...fichas.map((f) => f.objetivo),
    ...fotos.map((f) => ({ ...objetivoDeFoto(f, datos.recurso), nombre: nombreGuardado(datos, f.id) ?? f.nombre })),
  ]);
  if (!plan.ok) throw fallo(plan.error);
  await escribir(tx, datos.recurso, plan.plan, new Map(fichas.map((f) => [f.objetivo.id, f.sheet])));
  return [...fichas.map((f) => f.objetivo.id), ...fotos.flatMap((f) => (f.characterId ? [f.characterId] : []))];
}

const nombreGuardado = (datos: DatosVida, combatienteId: string) =>
  datos.cambios.find((c) => c.objetivo === "combatiente" && c.id === combatienteId)?.nombre;
