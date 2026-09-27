// Generación de NPC al azar (panel de máster, catálogo de NPCs): un botón,
// una ficha completa lista para jugar. Pedido del usuario, 2026-09-25 —
// topes deliberadamente más estrechos que el sistema, no reglas nuevas:
//   - atributos: máx 3 (el point-buy normal llega a ATRIBUTO_MAX_CREACION=4).
//   - habilidades: máx 4, coincide con HABILIDAD_MAX_CREACION, no hace falta
//     tocar nada ahí.
//   - exactamente un arma de fuego con una mejora de arma, y una armadura con
//     una mejora estándar — nunca más de una de cada.
//
// Un NPC se edita "libre" (docs/fase-6b.md): nada de point-buy ni pool de
// prioridad, así que esto NO reutiliza setAtributoValue/setHabilidadValue de
// creacion.ts (dependen de un pool que en un NpcTemplate siempre es 0 y no
// mueven nada, ver el hallazgo documentado en master/npcs/actions.ts) — los
// valores se asignan directos, mismo criterio que setAtributoNpcAction.
//
// El azar vive en dos funciones separadas de la que arma la ficha, mismo
// patrón que tirarD12()/resolverTirada() (acciones.ts) y nuevaInstanciaId()
// (equipo.ts): elegirBuildNpcAleatorio() hace todos los sorteos y devuelve
// datos planos; aplicarBuildNpcAleatorio() sólo consume esos datos —
// testeable con un build fijo, sin azar de por medio.
import { ATRIBUTOS, ATRIBUTO_MIN, type AtributoId } from "./atributos";
import {
  HABILIDADES,
  HABILIDAD_NO_ENTRENADA,
  HABILIDAD_MIN_ENTRENADA,
  HABILIDAD_MAX_CREACION,
  type HabilidadId,
} from "./habilidades";
import { defaultSheet, type Sheet } from "./sheet";
import { equipar, nuevaInstanciaId } from "./equipo";
import { ARMAS, ARMADURAS, MEJORAS_ARMA, MEJORAS_ESTANDAR } from "../catalog/equipo";

// Tope pedido por el usuario — más bajo que ATRIBUTO_MAX_CREACION (4), que es
// el tope normal del point-buy. No es una regla del sistema, solo de esta
// generación.
export const ATRIBUTO_MAX_NPC_ALEATORIO = 3;

// Dominio real de una habilidad: sin entrenar (-1) o entrenada de
// HABILIDAD_MIN_ENTRENADA a HABILIDAD_MAX_CREACION. No existe el 0.
const HABILIDAD_VALORES_NPC_ALEATORIO: number[] = [
  HABILIDAD_NO_ENTRENADA,
  ...Array.from(
    { length: HABILIDAD_MAX_CREACION - HABILIDAD_MIN_ENTRENADA + 1 },
    (_, i) => HABILIDAD_MIN_ENTRENADA + i,
  ),
];

// Nombres soviéticos de la 2GM, sabor de época sin usar a nadie real
// (ninguna figura histórica concreta, solo nombres y apellidos comunes).
export const NOMBRES_NPC_ALEATORIO: string[] = [
  "Ivan Sokolov",
  "Alexei Volkov",
  "Dmitri Morozov",
  "Nikolai Kuznetsov",
  "Pyotr Novikov",
  "Sergei Popov",
  "Viktor Lebedev",
  "Mikhail Kozlov",
  "Andrei Solovyov",
  "Fyodor Vasiliev",
  "Boris Zaitsev",
  "Grigori Pavlov",
  "Leonid Semyonov",
  "Stepan Golubev",
  "Yuri Vinogradov",
  "Anatoly Bogdanov",
  "Vladimir Voronin",
  "Konstantin Orlov",
  "Semyon Belov",
  "Igor Gromov",
  "Nadezhda Ivanova",
  "Yelena Petrova",
  "Irina Sidorova",
  "Tatiana Sokolova",
  "Anna Volkova",
  "Galina Morozova",
  "Olga Kuznetsova",
  "Ekaterina Novikova",
  "Zoya Lebedeva",
  "Valentina Kozlova",
];

// Dado honesto, mismo criterio que tirarD12() (acciones.ts): getRandomValues
// con descarte del resto, no Math.random ni el módulo a secas (sesga las
// caras bajas cuando el rango no divide 2^32 exacto).
function enteroAleatorio(min: number, max: number): number {
  const rango = max - min + 1;
  const limite = Math.floor(0xffffffff / rango) * rango;
  const buf = new Uint32Array(1);
  let n: number;
  do {
    crypto.getRandomValues(buf);
    n = buf[0];
  } while (n >= limite);
  return min + (n % rango);
}

function elegir<T>(lista: readonly T[]): T {
  return lista[enteroAleatorio(0, lista.length - 1)];
}

function ordenAleatorio<T>(lista: readonly T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = enteroAleatorio(0, i);
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export type BuildNpcAleatorio = {
  nombre: string;
  atributos: Record<AtributoId, number>;
  habilidades: Record<HabilidadId, number>;
  armaId: string;
  armaduraId: string;
  // Órdenes ya barajados: aplicarBuildNpcAleatorio prueba uno a uno con
  // equipar() y se queda con el primero que encaje (equipar() ya sabe
  // rechazar en silencio lo incompatible), así el azar no necesita conocer
  // las reglas de compatibilidad del catálogo.
  mejoraArmaCandidatos: string[];
  mejoraEstandarCandidatos: string[];
};

// Solo armas de fuego: las armas melee no admiten mejoras en el motor actual
// (validarInstalacion exige host familia "arma"), así que si el encargo es
// "arma con mejora" tiene que salir de aquí. mejorasAdmitidas === 0 se
// descarta directo — no tiene sentido barajar mejoras para un arma que no
// las admite.
function elegirArmaConMejora() {
  const candidatas = ARMAS.filter((a) => a.mejorasAdmitidas >= 1);
  return elegir(candidatas).id;
}

export function elegirBuildNpcAleatorio(): BuildNpcAleatorio {
  return {
    nombre: elegir(NOMBRES_NPC_ALEATORIO),
    atributos: Object.fromEntries(
      ATRIBUTOS.map((a) => [a.id, enteroAleatorio(ATRIBUTO_MIN, ATRIBUTO_MAX_NPC_ALEATORIO)]),
    ) as Record<AtributoId, number>,
    habilidades: Object.fromEntries(
      HABILIDADES.map((h) => [h.id, elegir(HABILIDAD_VALORES_NPC_ALEATORIO)]),
    ) as Record<HabilidadId, number>,
    armaId: elegirArmaConMejora(),
    armaduraId: elegir(ARMADURAS).id,
    mejoraArmaCandidatos: ordenAleatorio(MEJORAS_ARMA).map((m) => m.id),
    mejoraEstandarCandidatos: ordenAleatorio(MEJORAS_ESTANDAR).map((m) => m.id),
  };
}

// Instala el primer candidato de `candidatos` que equipar() acepte en
// `instaladoEnId`, a nivel 1. Nivel fijo a propósito: el encargo pide "con
// mejoras", no una de rareza/nivel al azar — menos casos raros.
function instalarPrimeraCompatible(sheet: Sheet, candidatos: string[], instaladoEnId: string): Sheet {
  for (const catalogoId of candidatos) {
    const conMejora = equipar(sheet, {
      instanciaId: nuevaInstanciaId(),
      catalogoId,
      nivel: 1,
      instaladoEnId,
    });
    if (conMejora !== sheet) return conMejora;
  }
  return sheet;
}

export function aplicarBuildNpcAleatorio(build: BuildNpcAleatorio): Sheet {
  let sheet: Sheet = {
    ...defaultSheet(),
    atributos: { ...build.atributos },
    habilidades: Object.fromEntries(
      HABILIDADES.map((h) => [h.id, { valor: build.habilidades[h.id], especialidades: [] as string[] }]),
    ) as Sheet["habilidades"],
  };

  const armaInstanciaId = nuevaInstanciaId();
  sheet = equipar(sheet, { instanciaId: armaInstanciaId, catalogoId: build.armaId });
  sheet = instalarPrimeraCompatible(sheet, build.mejoraArmaCandidatos, armaInstanciaId);

  const armaduraInstanciaId = nuevaInstanciaId();
  sheet = equipar(sheet, { instanciaId: armaduraInstanciaId, catalogoId: build.armaduraId });
  sheet = instalarPrimeraCompatible(sheet, build.mejoraEstandarCandidatos, armaduraInstanciaId);

  return sheet;
}

export function generarNpcAleatorio(): { nombre: string; sheet: Sheet } {
  const build = elegirBuildNpcAleatorio();
  return { nombre: build.nombre, sheet: aplicarBuildNpcAleatorio(build) };
}
