// Convierte el equipo de la ficha en tiradas concretas — "Disparar con Fusil
// Plaga (Compleja)" en vez del genérico "Ataque a distancia" de antes. Es la
// pieza que faltaba para que el equipo alimente de verdad la chuleta de
// tiradas (ver docs/traspaso.md §6, punto 4).
//
import type { Sheet } from "./sheet";
import {
  equipoPorId,
  type ArmaFuego,
  type Equipo,
  type TipoArma,
} from "../catalog/equipo";
import type { ArmaMelee } from "../catalog/armasMelee";
import type { ArmaPesada } from "../catalog/armamentoPesado";
import { MUNICION_GRANADA, ALCANCE_ARROJADA, type MunicionGranada } from "../catalog/municion";
import type { CondicionTirada, TramoDistancia, BonoPorTramo } from "./condiciones";
import type { PiezaEquipada } from "./equipo";
import type { MotorMetadata } from "./motor";
import { recursoDe, gastoDelModo } from "./recursos";
import type { Accion } from "./acciones";

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

// La opción de tramo de una tirada de ataque concreta: solo el ajuste base
// del tipo de arma (con las excepciones de familia). Lo que module una
// mejora instalada (mira telescópica y lo que llegue después) NO se funde
// aquí — sale aparte, con su fuente, en bonosTramoDeMejoras.
function condicionTramo(arma: ArmaFuego): CondicionTirada {
  const ajuste = ajusteTramoBase(arma.tipo);
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
// arma en concreto (bípode apoyado, y lo que llegue después).
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

// Bonos que dependen del tramo YA elegido (la mira telescópica solo ayuda a
// media y larga), uno por mejora instalada que traiga `ajusteTramo`. Cada
// uno con la etiqueta de la pieza, para que el desglose diga "Mira
// Telescópica +1" en vez de subir el número de Distancia sin explicarlo.
function bonosTramoDeMejoras(sheet: Sheet, instanciaId: string): BonoPorTramo[] {
  const bonos: BonoPorTramo[] = [];
  for (const pieza of sheet.equipo) {
    if (pieza.instaladoEnId !== instanciaId) continue;
    const cat = equipoPorId(pieza.catalogoId);
    if (!cat || cat.familia !== "mejoraArma") continue;
    const nivel = cat.niveles.find((n) => n.nivel === pieza.nivel);
    if (nivel?.ajusteTramo) bonos.push({ fuente: cat.label, porTramo: nivel.ajusteTramo });
  }
  return bonos;
}

// Ajustes incondicionales de las mejoras instaladas en esta arma en
// concreto (el -1 del Lanzagranadas Integrado por el peso, y lo que llegue
// después): cada uno con la etiqueta de la pieza que lo trae, para que el
// desglose del modal no tenga ningún número sin firmar.
function ajustesFijosDeMejoras(sheet: Sheet, instanciaId: string): { valor: number; fuente: string }[] {
  const ajustes: { valor: number; fuente: string }[] = [];
  for (const pieza of sheet.equipo) {
    if (pieza.instaladoEnId !== instanciaId) continue;
    const cat = equipoPorId(pieza.catalogoId);
    if (!cat || cat.familia !== "mejoraArma") continue;
    const nivel = cat.niveles.find((n) => n.nivel === pieza.nivel);
    if (nivel?.ajusteAtaque) ajustes.push({ valor: nivel.ajusteAtaque, fuente: cat.label });
  }
  return ajustes;
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

// Aviso de "no te llega" (docs/tareas.md, RECURSOS): solo se pinta cuando el
// modo pedido gasta más de lo que queda — informativo, no bloquea la
// tirada (§8 de docs/modificadores-tiradas.md, "la app avisa, no arbitra").
// Sin `recurso` rastreado (arma equipada antes de que existiera RECURSOS, o
// sin capacidadDePieza — no debería pasar con un arma, pero por si acaso) no
// hay nada que avisar.
function notaInsuficiente(gasto: number, recurso: { actual: number; max: number } | undefined): string | undefined {
  if (!recurso || recurso.actual >= gasto) return undefined;
  return `Solo quedan ${recurso.actual}/${recurso.max} balas — este modo gasta ${gasto}.`;
}

function tiradaDeArmaFuego(sheet: Sheet, arma: ArmaFuego, instanciaId: string): Accion {
  const modosConId = arma.modos.map((m, i) => ({ ...m, id: `${i}` }));
  const recurso = recursoDe(sheet, instanciaId);
  const modoBase = condicionModo(modosConId);
  // Con selector de modo (dos o más): el aviso va como `nota` de la opción
  // insuficiente, se ve en el modal en el momento de elegir. Con un único
  // modo (no hay selector que pintar) va al `nota` general de la tirada.
  const modo: CondicionTirada | null =
    modoBase && modoBase.tipo === "opcion"
      ? {
          ...modoBase,
          opciones: modoBase.opciones.map((o) => ({
            ...o,
            nota: notaInsuficiente(gastoDelModo(o.etiqueta, arma.municion), recurso),
          })),
        }
      : modoBase;
  const notaModoUnico = !modo
    ? notaInsuficiente(gastoDelModo(modosConId[0].etiqueta, arma.municion), recurso)
    : undefined;

  const condiciones = [condicionTramo(arma), modo].filter((c): c is CondicionTirada => c !== null);
  condiciones.push(...condicionesDeMejoras(sheet, instanciaId));

  return {
    id: `ataque_fuego_${instanciaId}`,
    label: `Disparar con ${arma.label}`,
    grupo: "Ataques",
    aplicado: "reflejos",
    habilidad: "combate_distancia",
    nota: [arma.especial, notaModoUnico].filter((n): n is string => !!n).join(" · ") || undefined,
    condiciones,
    ajustesFijos: ajustesFijosDeMejoras(sheet, instanciaId),
    bonosTramo: bonosTramoDeMejoras(sheet, instanciaId),
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
function tiradaDeLanzagranadas(sheet: Sheet, arma: ArmaFuego, instanciaId: string): Accion | null {
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
    ajustesFijos: [{ valor: -2, fuente: "Lanzagranadas acoplado" }],
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

// Armamento pesado: una dificultad fija por arma (columna "Dif." de EQIP),
// no varios modos entre los que elegir como en ArmaFuego/ArmaMelee — se
// mecaniza como ajustesFijos (automático, sin condición) en vez de
// condicionModo (que es para cuando el jugador elige entre opciones). El
// alcance no tiene tramos (un único número, o ninguno en el Lanzallamas): se
// queda como texto informativo en `nota`, igual que el resto de "Otras
// Armas a Distancia" — mismo criterio que Radar/Escáner (ver herramientas.ts).
function tiradaDeArmamentoPesado(arma: ArmaPesada, instanciaId: string): Accion {
  const notaAlcance = arma.alcanceM !== null ? `Alcance ${arma.alcanceM} m. · ` : "";

  // Lanzagranadas (pesado): el daño depende de la granada cargada, igual
  // que el Lanzagranadas Integrado (mejora de arma) — aquí como arma
  // independiente con su propio cargador.
  if (arma.danio === null) {
    const modo = condicionModo(MUNICION_GRANADA.map((m) => ({ id: m.id, etiqueta: m.label, dificultad: 0 })));
    return {
      id: `ataque_pesado_${instanciaId}`,
      label: `Disparar con ${arma.label}`,
      grupo: "Ataques",
      aplicado: "reflejos",
      habilidad: "combate_distancia",
      nota: `${notaAlcance}Cargador ${arma.cargador}. ${arma.efectos}`,
      ajustesFijos: [{ valor: arma.dificultad, fuente: arma.label }],
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

  return {
    id: `ataque_pesado_${instanciaId}`,
    label: `Disparar con ${arma.label}`,
    grupo: "Ataques",
    aplicado: "reflejos",
    habilidad: "combate_distancia",
    nota: `${notaAlcance}${arma.efectos}`,
    ajustesFijos: [{ valor: arma.dificultad, fuente: arma.label }],
    ataque: {
      modos: [
        {
          id: "0",
          danio: arma.danio,
          formulaDanio: null,
          categoriaDanio: arma.categoriaDanio ?? "Efecto (sin daño directo)",
        },
      ],
    },
  };
}

// Granadas lanzadas a mano: Potencia + Atletismo (no Combate a Distancia,
// es un lanzamiento, no un disparo), con la dificultad propia de lanzarla
// (`dificultadArrojada`) como único ajuste fijo — automática, no hay nada
// que el jugador elija al respecto.
function tiradaDeGranada(granada: MunicionGranada, instanciaId: string): Accion {
  return {
    id: `lanzar_granada_${instanciaId}`,
    label: `Lanzar ${granada.label}`,
    grupo: "Ataques",
    aplicado: "potencia",
    habilidad: "atletismo",
    nota: `${granada.areaEfecto} · Alcance ${ALCANCE_ARROJADA}.`,
    ajustesFijos: [{ valor: granada.dificultadArrojada, fuente: granada.label }],
    ataque: {
      modos: [
        {
          id: "0",
          danio: granada.danio,
          formulaDanio: null,
          categoriaDanio: granada.categoriaDanio ?? "Efecto (sin daño directo)",
        },
      ],
    },
  };
}

function tiradaDeArmaMelee(arma: ArmaMelee, instanciaId: string): Accion {
  const modosConId = arma.modos.map((m, i) => ({ ...m, id: `${i}` }));
  const modo = condicionModo(modosConId);

  // `arma.efectos` (Crítico de X, Ignora N de blindaje...) es hoy puramente
  // decorativo en el catálogo, pero al menos debe llegar como texto a la
  // tirada — mismo criterio que `arma.especial` en tiradaDeArmaFuego. Antes de
  // este fix no llegaba ni como texto (ver docs/equipo-efectos-especiales.md
  // §Kerzul, "fix barato" 2026-09-23).
  const notas = [
    arma.uso.includes("Sutil")
      ? "Con estilo Sutil se tira Reflejos en lugar de Potencia, y el daño usa Potencia en lugar de Fuerza"
      : null,
    arma.efectos,
  ].filter((n): n is string => n !== null);

  return {
    id: `ataque_melee_${instanciaId}`,
    label: arma.uso.includes("Sutil") ? `Golpear con ${arma.label} (o Sutil)` : `Golpear con ${arma.label}`,
    grupo: "Ataques",
    aplicado: "potencia",
    habilidad: "combate_melee",
    nota: notas.length > 0 ? notas.join(" · ") : undefined,
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

// Registro familia -> generador de acción (T5, docs/motor.md §Escalabilidad):
// una función por familia con firma uniforme, en vez de un bucle hardcodeado
// por familia repetido 4 veces sobre sheet.equipo. Dar de alta una familia
// nueva en esta lista (armas de fuego/melee/pesadas, granadas) es añadir una
// entrada aquí, no tocar accionesDeAtaque(). Cada wrapper es una cáscara fina
// sobre la función real (tiradaDeArmaFuego, tiradaDeArmaMelee...) — la lógica
// de cada una no cambia, solo el mecanismo de despacho.
//
// El cast a la familia concreta dentro de cada wrapper es seguro: el
// registro solo se consulta con REGISTRO_DE_ATAQUE[cat.familia], así que
// dentro de la entrada "arma" el `cat` que llega siempre es de verdad un
// ArmaFuego, etc. — TypeScript no puede inferir esa correlación por sí solo
// en un Record indexado por la propia familia.
//
// "herramienta" queda FUERA de este registro a propósito, aunque también
// genera su propia acción (accionesDeHerramientas, lib/rules/herramientas.ts):
// AccionesTab.tsx llama a accionesDeAtaque() y a accionesDeHerramientas() por
// separado, para pintarlas en secciones distintas ("Ataques" vs
// "Herramientas"). Meter "herramienta" en este mismo registro haría que
// accionesDeAtaque() empezara a devolver también filas de herramientas,
// duplicándolas en la pestaña. accionesDeHerramientas() se adaptó al mismo
// patrón de generador por pieza (ver herramientas.ts), pero vive en su
// propio registro/función, no en este.
type GeneradorDeAtaque = (sheet: Sheet, pieza: PiezaEquipada, cat: Equipo) => Accion[];

const REGISTRO_DE_ATAQUE: Partial<Record<Equipo["familia"], GeneradorDeAtaque>> = {
  arma: (sheet, pieza, cat) => {
    const arma = cat as ArmaFuego;
    const lanzagranadas = tiradaDeLanzagranadas(sheet, arma, pieza.instanciaId);
    return [tiradaDeArmaFuego(sheet, arma, pieza.instanciaId), ...(lanzagranadas ? [lanzagranadas] : [])];
  },
  armaMelee: (_sheet, pieza, cat) => [tiradaDeArmaMelee(cat as ArmaMelee, pieza.instanciaId)],
  armaPesada: (_sheet, pieza, cat) => [tiradaDeArmamentoPesado(cat as ArmaPesada, pieza.instanciaId)],
  granada: (_sheet, pieza, cat) => [tiradaDeGranada(cat as MunicionGranada, pieza.instanciaId)],
};

// T6 (docs/motor.md §Escalabilidad): el registro de arriba sigue siendo la
// autoridad de "sé renderizar esta familia" — esto es un filtro ADICIONAL,
// nunca lo sustituye. Sin él, una pieza cuya familia esté registrada pero
// cuyo MotorMetadata todavía no declare su acción como "construido" (una
// Bayoneta el día de mañana, por ejemplo) generaría igualmente su fila, solo
// porque su familia sabe generar tiradas en general. Las 4 familias del
// registro (arma/armaMelee/armaPesada/granada) tienen hoy el 100% de sus
// piezas con al menos una entrada { tipo: "accion", mecanismo:
// "accion_equipo", estado: "construido" } para su acción principal —
// confirmado tras el barrido y la auditoría del catálogo — así que este
// filtro no cambia el resultado de ninguna pieza real de hoy; varias piezas
// (Kerzul, Armas Mecánicas) tienen ADEMÁS una segunda entrada "accion"
// bloqueada/pendiente para un efecto distinto (Derribo, Retroceso Entrópico)
// que ningún generador construye todavía — un match "alguna entrada
// construida" basta, no hace falta que TODAS lo estén.
//
// "cat" es la unión Equipo; motor solo existe como campo directo en las
// familias sin niveles (arma/armaMelee/armaPesada/granada, exactamente las
// que vive este registro) — el cast a `{ motor?: ... }` es seguro aquí por
// el mismo motivo que el cast a la familia concreta dentro de cada wrapper.
export function generaAccionPropia(cat: Equipo): boolean {
  const motor = (cat as { motor?: MotorMetadata[] }).motor ?? [];
  return motor.some((m) => m.tipo === "accion" && m.mecanismo === "accion_equipo" && m.estado === "construido");
}

// Todas las filas de la categoría "Ataques": una por arma de fuego, arma
// melee, arma pesada o granada equipada — incluida Pelea (Puñetazo, Patada,
// Codazo o Rodillazo), que ya no se añade sola: si el jugador la quiere en
// Acciones, la equipa desde la Tienda como cualquier otra arma (aparece con
// "no se compra" en vez de precio, pero es el mismo flujo).
export function accionesDeAtaque(sheet: Sheet): Accion[] {
  const tiradas: Accion[] = [];
  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (!cat) continue;
    const generador = REGISTRO_DE_ATAQUE[cat.familia];
    if (!generador) continue;
    if (!generaAccionPropia(cat)) continue;
    tiradas.push(...generador(sheet, pieza, cat));
  }
  return tiradas;
}
