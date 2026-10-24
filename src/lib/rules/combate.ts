// Convierte el equipo de la ficha en tiradas concretas — "Disparar con Fusil
// Plaga (Compleja)" en vez del genérico "Ataque a distancia" de antes. Es la
// pieza que faltaba para que el equipo alimente de verdad la chuleta de
// tiradas (ver docs/traspaso.md §6, punto 4).
//
import type { Sheet } from "./sheet";
import type { ModificadorConFuente } from "./modificadores";
import {
  equipoPorId,
  textoDanioModo,
  type ArmaFuego,
  type Equipo,
  type TipoArma,
} from "../catalog/equipo";
import { ESPADAS_Y_DAGAS, NOTA_ESCUDO_SUBSISTEMAS, PELEA, type ArmaMelee } from "../catalog/armasMelee";
import type { ArmaPesada } from "../catalog/armamentoPesado";
import type { Subsistema } from "../catalog/subsistemas";
import {
  MUNICION_GRANADA,
  ALCANCE_ARROJADA,
  MUNICION_ESPECIAL,
  municionEspecialPorId,
  type MunicionGranada,
} from "../catalog/municion";
import { PREFIJO_MEJORA_MUNICION } from "../catalog/mejorasArma";
import type { CondicionTirada, TramoDistancia, BonoPorTramo } from "./condiciones";
import { nivelesHasta, acumulaPorClave, ultimoQueDefine, sustituyeMiraIntegrada, type PiezaEquipada } from "./equipo";
import { bonoFormulaFuerza, etiquetaTipoDanio, formulaConSuma, nombreArmaModificada, perfilGolpe, type PerfilGolpe } from "./armasModificadas";
import type { ModificacionArmaId } from "../catalog/armasModificadas";
import type { MotorMetadata } from "./motor";
import { escudoRoto, gastoDelModo, MOTIVO_ESCUDO_ROTO, recursoDe } from "./recursos";
import { CONDICION_ATACANTES_ADICIONALES, condicionApuntado, type Accion, type AccionDirecta } from "./acciones";
import { atributoEfectivo, aplicado } from "./derivados";
import { criticoDesarmado, golpeDesarmadoConArmadura } from "./golpeDesarmado";
import { ESPECIALIDAD_ARMA, ESPECIALIDAD_ATAQUE_ESPECIAL, ESPECIALIDAD_LANZAR } from "../catalog/especialidadesArma";
import { FAMILIAS_SOLO_CON_DOTE } from "../catalog/dotesDestinos";
import type { PermisosDeDotes } from "./dotesEfectos";
import {
  brazoBionico,
  casillaBrazo,
  extremidadDeBloqueo,
  extremidadIncorporada,
  ID_BLOQUEAR_BRAZO,
  NOTA_ARMA_INCORPORADA,
  type BrazoBionico,
} from "./brazoBionico";

const TRAMOS: TramoDistancia[] = ["bocajarro", "corta", "media", "larga"];

// El daño de las armas que salen de Fuerza (melee, bayoneta, lanzar, Aguijón) y el
// del estilo Sutil (Potencia) usan los modificadores de la FichaResuelta, con
// especie y estados de combate (M1b): un estado que baje Fuerza baja también el daño.

// Modificador de distancia base, igual para toda arma de fuego (ver
// sistema-y-combate.md), con las dos excepciones de familia que documenta
// EQUIP: las escopetas suman +1 a corta y bocajarro; los fusiles de
// precisión cambian el +2 de corta por -2, "en vez del bonificador
// habitual". Es una regla de familia (todas las armas de ese tipo la
// comparten), no de una pieza concreta, así que vive en código y no como
// dato repetido en cada arma del catálogo.
const AJUSTE_TRAMO_GENERAL: Record<TramoDistancia, number> = { bocajarro: 4, corta: 2, media: 0, larga: -2 };

function ajusteTramoBase(tipo: TipoArma): Record<TramoDistancia, number> {
  const base = AJUSTE_TRAMO_GENERAL;
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
// Derribo a Corta Distancia y a Bocajarro (docs/equipo-efectos-especiales.md
// §Armas de fuego): objetivo_tercero, el motor no lo resuelve, solo avisa —
// mismo "texto informativo condicionado" que ya usa la opción de tramo para
// otros casos (Visor Nocturno/Térmico sobre alerta_activa,
// docs/modificadores-tiradas.md §8), no `arma.especial` (que se vería
// siempre, sea cual sea el tramo elegido — el bug que reportó el barrido
// motorMetadata-vs-prosa 2026-09-24).
function notaDerribo(arma: ArmaFuego, tramo: TramoDistancia): string | undefined {
  if (!arma.efectoDerribo) return undefined;
  if (tramo !== "corta" && tramo !== "bocajarro") return undefined;
  return `Derribo — el objetivo tira su propia salvación, dificultad ${arma.efectoDerribo}.`;
}

// "En fuego automático aumenta en 3 la dificultad de esquiva cuando se realiza a
// bocajarro" (docs/fuente/equipamiento.md, A Bocajarro): la esquiva es del objetivo, así
// que es aviso en la opción, como el Derribo (2026-10-24).
const NOTA_FAUTO_BOCAJARRO = "En F. Auto, +3 a la dificultad de esquiva del objetivo.";

function notaTramo(arma: ArmaFuego, tramo: TramoDistancia): string | undefined {
  const fAuto = tramo === "bocajarro" && arma.modos.some((m) => m.etiqueta.includes("F. Auto")) ? NOTA_FAUTO_BOCAJARRO : undefined;
  const notas = [notaDerribo(arma, tramo), fAuto].filter((n): n is string => n !== undefined);
  return notas.length > 0 ? notas.join(" ") : undefined;
}

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
      nota: notaTramo(arma, tramo),
    })),
    porDefecto: "media",
  };
}

// El resto de condiciones que traiga cualquier mejora instalada en esta
// arma en concreto (bípode apoyado, y lo que llegue después).
//
// Excluye las que declaran `alcance`: esas viajan exclusivamente por
// condicionesActivas() (equipo.ts) hacia la tirada fija a la que apuntan
// (docs/modificadores-tiradas.md §8). Sin este filtro, una condición como
// "activo_sigilo" del Puntero Láser (alcance: sigilo) se colaba también en
// el modal de SU PROPIA arma de fuego — el jugador podía activarla ahí por
// error y restar el -2 de sigilo al ataque, un efecto que la pieza nunca
// prometió para esa tirada (hallazgo del barrido motorMetadata-vs-prosa,
// 2026-09-24).
function condicionesDeMejoras(sheet: Sheet, instanciaId: string): CondicionTirada[] {
  const condiciones: CondicionTirada[] = [];
  for (const pieza of sheet.equipo) {
    if (pieza.instaladoEnId !== instanciaId || pieza.nivel === undefined) continue;
    const cat = equipoPorId(pieza.catalogoId);
    if (!cat || cat.familia !== "mejoraArma") continue;
    const niveles = nivelesHasta(cat.niveles, pieza.nivel);
    condiciones.push(
      ...acumulaPorClave(niveles.map((n) => n.condiciones ?? []), (c) => c.id).filter((c) => !c.alcance),
    );
  }
  return condiciones;
}

// Efectos (mecanismo nota_fija, docs/motor.md) de cualquier mejora instalada
// en esta arma — el sitio donde "cuelga" un efecto que en realidad toca OTRA
// tirada (objetivo_tercero: la Esquiva o la Alerta Activa de quien recibe el
// disparo) o una tirada propia distinta (Sigilo): el motor no automatiza esa
// otra tirada, así que se lista aquí, con la pieza que lo produce, para que
// el jugador/máster lo aplique a mano (docs/sistema.md, pregunta 25b,
// decisión revisada 2026-09-24; ver Accion.efectos, acciones.ts). Mismo
// patrón que `notaTerceroDeArma` (línea de abajo), pero por nivel de mejora
// en vez de por arma.
// Puntero Láser 2: "si el usuario posee un ojo biónico o su arma lleva una mejora de mira
// telescópica de nivel 3, esta mejora permite usar el puntero sin penalizador visual al
// sigilo" (docs/fuente/equipamiento.md). Antes bloqueado por "Fase 5" (el Ojo Biónico ya
// existe): cumplido, el aviso del -2 al Sigilo del nivel 1 no sale (2026-10-24).
function punteroSinPenalizacion(sheet: Sheet, instanciaId: string): boolean {
  return sheet.equipo.some(
    (p) =>
      (p.catalogoId === "aum_ojo_bionico" && p.nivel !== undefined) ||
      (p.catalogoId === "mira_telescopica" && p.instaladoEnId === instanciaId && (p.nivel ?? 0) >= 3),
  );
}

function efectosDeMejoras(sheet: Sheet, instanciaId: string): { fuente: string; texto: string }[] {
  const efectos: { fuente: string; texto: string }[] = [];
  for (const pieza of sheet.equipo) {
    if (pieza.instaladoEnId !== instanciaId || pieza.nivel === undefined) continue;
    const cat = equipoPorId(pieza.catalogoId);
    if (!cat || cat.familia !== "mejoraArma") continue;
    if (cat.id === "puntero_laser" && pieza.nivel >= 2 && punteroSinPenalizacion(sheet, instanciaId)) continue;
    const niveles = nivelesHasta(cat.niveles, pieza.nivel);
    for (const n of niveles) {
      if (n.notaTirada) efectos.push({ fuente: cat.label, texto: n.notaTirada });
    }
  }
  return efectos;
}

// Bonos que dependen del tramo YA elegido (la mira telescópica solo ayuda a
// media y larga), uno por mejora instalada que traiga `ajusteTramo`. Cada
// uno con la etiqueta de la pieza, para que el desglose diga "Mira
// Telescópica +1" en vez de subir el número de Distancia sin explicarlo.
// `ajusteTramo` es un total por nivel (S9), no acumulable entre niveles: se
// usa el del nivel más alto que lo define, no la suma de todos.
//
// Sobre un arma con Mira Telescópica integrada (fusiles de precisión), el
// bono de la integrada ya está en la dificultad del arma: la mira instalada
// solo aporta lo que supera a ese nivel (nivel 3 → +1, nivel 2 → nada).
function bonosTramoDeMejoras(sheet: Sheet, arma: ArmaFuego, instanciaId: string): BonoPorTramo[] {
  const bonos: BonoPorTramo[] = [];
  for (const pieza of sheet.equipo) {
    if (pieza.instaladoEnId !== instanciaId || pieza.nivel === undefined) continue;
    const cat = equipoPorId(pieza.catalogoId);
    if (!cat || cat.familia !== "mejoraArma") continue;
    const define = ultimoQueDefine(nivelesHasta(cat.niveles, pieza.nivel), "ajusteTramo");
    const ajuste = define?.ajusteTramo;
    if (!ajuste) continue;
    const yaIncluido = sustituyeMiraIntegrada(cat.id, arma)
      ? ultimoQueDefine(nivelesHasta(cat.niveles, arma.miraIntegrada ?? 0), "ajusteTramo")?.ajusteTramo
      : undefined;
    const porTramo = restarAjusteTramo(ajuste, yaIncluido ?? {});
    // Sobre la integrada el desglose dice por qué la mira de nivel 3 suma solo +1 (2026-10-24).
    const fuente = yaIncluido ? `${cat.label} ${pieza.nivel} (la integrada ya va en la dificultad)` : cat.label;
    // TODO(revisar): la mira integrada de los fusiles de precisión va dentro de los números
    // del arma, sin bono propio, así que el Ojo Biónico se le suma (no hay con qué compararlo).
    if (Object.keys(porTramo).length > 0) bonos.push({ fuente, porTramo, ...(define?.noApila && { noApila: define.noApila }) });
  }
  return bonos;
}

function restarAjusteTramo(
  a: Partial<Record<TramoDistancia, number>>,
  b: Partial<Record<TramoDistancia, number>>,
): Partial<Record<TramoDistancia, number>> {
  const out: Partial<Record<TramoDistancia, number>> = {};
  for (const tramo of Object.keys(a) as TramoDistancia[]) {
    const v = (a[tramo] ?? 0) - (b[tramo] ?? 0);
    if (v !== 0) out[tramo] = v;
  }
  return out;
}

// Ajustes incondicionales de las mejoras instaladas en esta arma en
// concreto (el -1 del Lanzagranadas Integrado por el peso, y lo que llegue
// después): cada uno con la etiqueta de la pieza que lo trae, para que el
// desglose del modal no tenga ningún número sin firmar. Mismo criterio que
// ajusteTramo: total por nivel, no acumulable (S9).
function ajustesFijosDeMejoras(sheet: Sheet, instanciaId: string): { valor: number; fuente: string }[] {
  const ajustes: { valor: number; fuente: string }[] = [];
  for (const pieza of sheet.equipo) {
    if (pieza.instaladoEnId !== instanciaId || pieza.nivel === undefined) continue;
    const cat = equipoPorId(pieza.catalogoId);
    if (!cat || cat.familia !== "mejoraArma") continue;
    const niveles = nivelesHasta(cat.niveles, pieza.nivel);
    const nivelConAjuste = ultimoQueDefine(niveles, "ajusteAtaque");
    if (nivelConAjuste?.ajusteAtaque) ajustes.push({ valor: nivelConAjuste.ajusteAtaque, fuente: cat.label });
  }
  return ajustes;
}

// `ajusteModo` de las mejoras de ESTA arma (Sistema de Retroceso): un bono que mira la
// opción elegida en la condición "modo", con la fuente de la pieza. Sin selector de modo
// (arma de un único modo), si ese modo cuenta, va como ajuste fijo.
function bonosModoDeMejoras(
  sheet: Sheet,
  arma: ArmaFuego,
  modos: { id: string; etiqueta: string }[],
  instanciaId: string,
): { bonos: BonoPorTramo[]; fijos: { valor: number; fuente: string }[] } {
  const bonos: BonoPorTramo[] = [];
  const fijos: { valor: number; fuente: string }[] = [];
  for (const pieza of sheet.equipo) {
    if (pieza.instaladoEnId !== instanciaId || pieza.nivel === undefined) continue;
    const cat = equipoPorId(pieza.catalogoId);
    if (!cat || cat.familia !== "mejoraArma") continue;
    const ajuste = ultimoQueDefine(nivelesHasta(cat.niveles, pieza.nivel), "ajusteModo")?.ajusteModo;
    if (!ajuste) continue;
    const todos = ajuste.enCualquierModo?.includes(arma.tipo) ?? false;
    const cuenta = modos.filter((m) => todos || m.etiqueta.includes(ajuste.contieneEtiqueta));
    if (cuenta.length === 0) continue;
    if (modos.length <= 1) fijos.push({ valor: ajuste.valor, fuente: cat.label });
    else bonos.push({ fuente: cat.label, condicion: "modo", porTramo: Object.fromEntries(cuenta.map((m) => [m.id, ajuste.valor])) });
  }
  return { bonos, fijos };
}

// `etiqueta`: "Modo de disparo" en armas de fuego; los golpes melee pasan "Modo de ataque".
function condicionModo(
  modos: { id: string; etiqueta: string; dificultad: number; nota?: string }[],
  etiqueta = "Modo de disparo",
): CondicionTirada | null {
  if (modos.length <= 1) return null;
  return {
    id: "modo",
    tipo: "opcion",
    etiqueta,
    opciones: modos.map((m) => ({ id: m.id, etiqueta: m.etiqueta, valor: m.dificultad, nota: m.nota })),
    porDefecto: modos[0].id,
  };
}

// Munición especial (docs/tareas.md, "Munición Especial — fase 2"): los
// tipos cuyo adaptador lleva ESTA arma, con el stock del momento. El
// selector solo existe si hay al menos uno; "Normal" es siempre la opción
// por defecto. Sin valor numérico en la tirada de ataque: la munición cambia
// el daño y el gasto, no la dificultad.
//
// Armas impulsoras (Arco, Ballesta): "su munición puede llevar mejoras de munición especial
// sin que el arma necesite estar adaptada" (docs/fuente/equipamiento.md) → sin adaptador,
// los tipos de los que la ficha tenga stock.
function municionesDeArma(sheet: Sheet, arma: ArmaFuego, instanciaId: string): NonNullable<Accion["municionesEspeciales"]> {
  const tipos =
    arma.tipo === "arma_impulsora"
      ? MUNICION_ESPECIAL.filter((m) => (sheet.municionEspecial[m.id] ?? 0) > 0)
      : sheet.equipo.flatMap((p) => {
          if (p.instaladoEnId !== instanciaId || !p.catalogoId.startsWith(PREFIJO_MEJORA_MUNICION)) return [];
          const m = municionEspecialPorId(p.catalogoId.slice(PREFIJO_MEJORA_MUNICION.length));
          return m ? [m] : [];
        });
  return tipos.map((m) => ({
    id: m.id,
    label: m.label,
    stock: sheet.municionEspecial[m.id] ?? 0,
    ajusteDanio: m.ajusteDanio,
    ...(m.tipoDanio && { tipoDanio: m.tipoDanio }),
    ignoraBlindaje: m.ignoraBlindaje,
    efecto: m.efecto,
    ...(m.efectoCritico && { efectoCritico: m.efectoCritico }),
    ...(m.sustituyeCritico && { sustituyeCritico: true }),
  }));
}

function condicionMunicion(municiones: NonNullable<Accion["municionesEspeciales"]>): CondicionTirada {
  const signo = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  return {
    id: "municion",
    tipo: "opcion",
    etiqueta: "Munición",
    opciones: [
      { id: "normal", etiqueta: "Normal", valor: 0 },
      ...municiones.map((m) => ({
        id: m.id,
        etiqueta: `${m.label.replace(/^Munición /, "")} (${m.stock})`,
        valor: 0,
        nota: `${m.ajusteDanio !== 0 ? `${signo(m.ajusteDanio)} daño${m.tipoDanio ? ` ${etiquetaTipoDanio(m.tipoDanio)}` : ""}. ` : ""}${m.efecto}`,
      })),
    ],
    porDefecto: "normal",
  };
}

// `mods`: para el daño que sale de Fuerza (Arco Táctico, `danioFuerza`).
// El crítico de un arma de fuego vive en su texto `especial` ("Crítico de Aturdimiento (10) ·
// F. Auto (Esquiva 8)"): se saca de ahí para el "Efecto crítico" del resultado, como el
// `efectoCritico` de las armas melee.
export function criticoDeEspecial(especial: string | null | undefined): string | undefined {
  const criticos = (especial ?? "")
    .split(" · ")
    .flatMap((t) => (t.startsWith("Crítico de ") ? [t.slice("Crítico de ".length)] : []));
  return criticos.length > 0 ? criticos.join(" · ") : undefined;
}

function tiradaDeArmaFuego(sheet: Sheet, mods: ModificadorConFuente[], arma: ArmaFuego, instanciaId: string): Accion {
  const modosConId = arma.modos.map((m, i) => ({ ...m, id: `${i}` }));
  const modo = condicionModo(modosConId);
  const fuerza = arma.modos.some((m) => m.danioFuerza) ? atributoEfectivo(sheet, "fuerza", mods) : 0;

  const municiones = municionesDeArma(sheet, arma, instanciaId);
  const condiciones = [condicionTramo(arma), modo, municiones.length > 0 ? condicionMunicion(municiones) : null].filter(
    (c): c is CondicionTirada => c !== null,
  );
  condiciones.push(...condicionesDeMejoras(sheet, instanciaId));

  const efectos = [
    arma.notaTercero ? { fuente: arma.label, texto: arma.notaTercero } : null,
    ...efectosDeMejoras(sheet, instanciaId),
  ].filter((e): e is { fuente: string; texto: string } => e !== null);

  // Sin selector de modo (un único modo, ver condicionModo): su `dificultad`
  // no se pierde, solo cambia de mecanismo — pasa de condición elegible a
  // ajuste fijo, mismo patrón que arma.dificultad en armamento pesado.
  const ajusteModoUnico =
    !modo && modosConId[0].dificultad !== 0 ? [{ valor: modosConId[0].dificultad, fuente: arma.label }] : [];
  const porModo = bonosModoDeMejoras(sheet, arma, modosConId, instanciaId);

  return {
    id: `ataque_fuego_${instanciaId}`,
    label: `Disparar con ${arma.label}`,
    grupo: "Ataques",
    aplicado: "reflejos",
    habilidad: "combate_distancia",
    especialidadArma: ESPECIALIDAD_ARMA[arma.id],
    familiaArma: "ataque_fuego",
    empleoArma: arma.empleo,
    nota: arma.especial ?? undefined,
    efectoCritico: criticoDeEspecial(arma.especial),
    efectos: efectos.length > 0 ? efectos : undefined,
    recursoInstanciaId: instanciaId,
    recursoUnidad: arma.tipoMunicion === "energia" ? "cargas" : undefined,
    municionesEspeciales: municiones.length > 0 ? municiones : undefined,
    condiciones,
    ajustesFijos: [...ajusteModoUnico, ...ajustesFijosDeMejoras(sheet, instanciaId), ...porModo.fijos],
    bonosTramo: [...bonosTramoDeMejoras(sheet, arma, instanciaId), ...porModo.bonos],
    ataque: {
      modos: modosConId.map((m) => ({
        id: m.id,
        etiqueta: m.etiqueta,
        // "1/2 Fue + N": la mitad hacia abajo (TODO(revisar) en catalog/armasImpulsoras.ts).
        danio: m.danioFuerza === "mitad" ? m.danio + Math.floor(fuerza / 2) : m.danio,
        formulaDanio: m.danioFuerza ? textoDanioModo(m) : null,
        categoriaDanio: m.categoriaDanio,
        gasto: gastoDelModo(m.etiqueta, arma.municion, arma.tipo, arma.gastoFAuto),
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

  // Solo lo que el personaje lleva en RECURSOS (docs/tareas.md, 2026-09-27),
  // no las 14 del catálogo — sin ninguna, no hay nada que disparar: se
  // oculta la fila entera (mismo criterio que "sin lanzagranadas instalado",
  // arriba). Necesario además porque ataque.modos vacío reventaría al pulsar
  // Tirar (AccionesTab.tsx hace modos[0].id sin guardia).
  const granadasDisponibles = MUNICION_GRANADA.filter((m) => (sheet.granadas[m.id] ?? 0) > 0);
  if (granadasDisponibles.length === 0) return null;

  const modo = condicionModo(
    granadasDisponibles.map((m) => ({ id: m.id, etiqueta: m.label, dificultad: 0, nota: m.areaEfecto })),
  );

  return {
    id: `lanzagranadas_${instanciaId}`,
    label: `Lanzagranadas (${arma.label})`,
    grupo: "Ataques",
    aplicado: "reflejos",
    habilidad: "combate_distancia",
    especialidadArma: ESPECIALIDAD_ATAQUE_ESPECIAL.lanzagranadas_integrado,
    // Familia del armamento pesado, como su especialidad (S44, confirmado por el usuario);
    // el empleo, el del arma que lo lleva.
    familiaArma: "ataque_pesado",
    empleoArma: arma.empleo,
    nota: "Acción estándar · cargador 1 · alcance 200 m.",
    ajustesFijos: [{ valor: -2, fuente: "Lanzagranadas acoplado" }],
    condiciones: modo ? [modo] : [],
    ataque: {
      modos: granadasDisponibles.map((m) => ({
        id: m.id,
        danio: m.danio,
        formulaDanio: null,
        categoriaDanio: m.categoriaDanio ?? "Efecto (sin daño directo)",
      })),
    },
  };
}

// Bayoneta (mejoraArma, docs/tareas.md ítem 6): perfil de cuchillo de combate
// propio cuando el fusil/escopeta que la lleva se usa cuerpo a cuerpo — mismo
// patrón que tiradaDeLanzagranadas (una segunda Accion generada solo si la
// mejora está instalada en ESTA instancia), no una condición de la tirada de
// disparo. "El arma pasa a considerarse arma a dos manos mientras se usa como
// bayoneta" (catálogo) pisa el Sutil/una mano del Cuchillo de Combate base
// (armasMelee.ts, espada_cuchillo_combate): aplicado Potencia siempre, sin
// aplicadoSutil ni arrojadiza. Mismo daño y mismo crítico que ese cuchillo («el daño
// será idéntico», EQUIP): se leen de su ficha de catálogo, no se copian a mano (antes
// decía Fue+2 con el cuchillo en Fue+3; arreglado 2026-10-24). Ataque+bloqueo van juntos como
// en cualquier arma melee del catálogo — decisión 2026-09-25, el usuario. El
// bloqueo, como todos, solo con la dote Bloqueo (D2b-2, lo filtra accionesDeAtaque).
function tieneBayonetaInstalada(sheet: Sheet, instanciaId: string): boolean {
  return sheet.equipo.some((p) => p.instaladoEnId === instanciaId && p.catalogoId === "bayoneta");
}

const CUCHILLO_DE_COMBATE = ESPADAS_Y_DAGAS.find((a) => a.id === "espada_cuchillo_combate")!;

function tiradaGolpeBayoneta(sheet: Sheet, mods: ModificadorConFuente[], arma: ArmaFuego, instanciaId: string): Accion | null {
  if (!tieneBayonetaInstalada(sheet, instanciaId)) return null;
  const fuerza = atributoEfectivo(sheet, "fuerza", mods);
  const modoCuchillo = CUCHILLO_DE_COMBATE.modos[0];
  const bono = bonoFormulaFuerza(modoCuchillo.formulaDanio) ?? 0;
  return {
    id: `golpear_bayoneta_${instanciaId}`,
    label: `Bayoneta (${arma.label})`,
    grupo: "Ataques",
    aplicado: "potencia",
    habilidad: "combate_melee",
    especialidadArma: ESPECIALIDAD_ATAQUE_ESPECIAL.bayoneta,
    familiaArma: "ataque_melee",
    empleoArma: "dos manos", // "el arma pasa a considerarse arma a dos manos" (catálogo)
    efectoCritico: CUCHILLO_DE_COMBATE.efectoCritico,
    ajustesFijos: [{ valor: -1, fuente: "Bayoneta" }],
    ataque: {
      modos: [{ id: "0", danio: fuerza + bono, formulaDanio: modoCuchillo.formulaDanio, categoriaDanio: modoCuchillo.categoriaDanio }],
    },
  };
}

function tiradaBloqueoBayoneta(sheet: Sheet, arma: ArmaFuego, instanciaId: string): Accion | null {
  if (!tieneBayonetaInstalada(sheet, instanciaId)) return null;
  return {
    id: `bloquear_bayoneta_${instanciaId}`,
    label: `Bloquear con Bayoneta (${arma.label})`,
    grupo: "Defensa",
    aplicado: "potencia",
    habilidad: "combate_melee",
    // Como el golpe: la especialidad del arma, sin selector (S40, cambiado en D2b-1).
    especialidadArma: ESPECIALIDAD_ATAQUE_ESPECIAL.bayoneta,
    familiaArma: "bloquear_melee",
    empleoArma: "dos manos",
    nota: "Reacción gratuita e ilimitada, como Esquivar — activa mientras se lleva el arma.",
    condiciones: [CONDICION_ATACANTES_ADICIONALES],
  };
}

// Armamento pesado: una dificultad fija por arma (columna "Dif." de EQIP),
// no varios modos entre los que elegir como en ArmaFuego/ArmaMelee — se
// mecaniza como ajustesFijos (automático, sin condición) en vez de
// condicionModo (que es para cuando el jugador elige entre opciones). El
// alcance no tiene tramos (un único número, o ninguno en el Lanzallamas): se
// queda como texto informativo en `nota`, igual que el resto de "Otras
// Armas a Distancia" — mismo criterio que Radar/Escáner (ver herramientas.ts).
function tiradaDeArmamentoPesado(sheet: Sheet, arma: ArmaPesada, instanciaId: string): Accion | null {
  const notaAlcance = arma.alcanceM !== null ? `Alcance ${arma.alcanceM} m. · ` : "";

  // Lanzagranadas (pesado): el daño depende de la granada cargada, igual
  // que el Lanzagranadas Integrado (mejora de arma) — aquí como arma
  // independiente con su propio cargador.
  if (arma.danio === null) {
    // Solo lo que hay en RECURSOS (docs/tareas.md, 2026-09-27) — sin
    // ninguna, no hay nada que disparar: se oculta la fila entera, mismo
    // criterio y mismo motivo técnico que tiradaDeLanzagranadas (arriba).
    const granadasDisponibles = MUNICION_GRANADA.filter((m) => (sheet.granadas[m.id] ?? 0) > 0);
    if (granadasDisponibles.length === 0) return null;

    const modo = condicionModo(
      granadasDisponibles.map((m) => ({ id: m.id, etiqueta: m.label, dificultad: 0, nota: m.areaEfecto })),
    );
    return {
      id: `ataque_pesado_${instanciaId}`,
      label: `Disparar con ${arma.label}`,
      grupo: "Ataques",
      aplicado: "reflejos",
      habilidad: "combate_distancia",
      especialidadArma: ESPECIALIDAD_ARMA[arma.id],
      familiaArma: "ataque_pesado",
      empleoArma: "dos manos", // "Empleo a dos manos" (características generales del catálogo)
      nota: `${notaAlcance}Cargador ${arma.cargador}.`,
      ajustesFijos: [{ valor: arma.dificultad, fuente: arma.label }],
      condiciones: modo ? [modo] : [],
      ataque: {
        modos: granadasDisponibles.map((m) => ({
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
    especialidadArma: ESPECIALIDAD_ARMA[arma.id],
    familiaArma: "ataque_pesado",
    empleoArma: "dos manos",
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
//
// Una fila por TIPO que el personaje lleva en RECURSOS (docs/tareas.md,
// 2026-09-27), no por instancia comprada — por eso no lleva instanciaId ni
// pasa por REGISTRO_DE_ATAQUE (ese registro recorre sheet.equipo, y una
// granada ya no vive ahí). accionesDeGranadas() es su único punto de
// entrada, llamado aparte al final de accionesDeAtaque().
function tiradaDeGranada(granada: MunicionGranada): Accion {
  return {
    id: `lanzar_granada_${granada.id}`,
    label: `Lanzar ${granada.label}`,
    grupo: "Ataques",
    aplicado: "potencia",
    habilidad: "atletismo",
    especialidadArma: ESPECIALIDAD_LANZAR,
    familiaArma: "lanzar_granada",
    empleoArma: "una mano", // se lanza con una mano
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

// El daño melee es una fórmula sobre Fuerza ("Fue+3"): bonoFormulaFuerza
// (armasModificadas.ts) la lee, y la Fuerza efectiva la pone el propio personaje.

// Malla Plasmática instalada, si la hay — helper compartido por el
// sacrificio de colchón (melee) y la detonación de pulso térmico.
function mallaPlasmaticaEquipada(sheet: Sheet): { instanciaId: string; nivel: number } | null {
  for (const pieza of sheet.equipo) {
    if (pieza.catalogoId === "malla_plasmatica" && pieza.nivel) {
      return { instanciaId: pieza.instanciaId, nivel: pieza.nivel };
    }
  }
  return null;
}

// Malla Plasmática — sacrificar colchón por daño de plasma en un "golpe
// melee desarmado" (docs/tareas.md, 2026-09-28): toda la PELEA (armasMelee.ts)
// cuenta como desarmada, Codazo o Rodillazo incluido (2026-10-13) — el resto de
// armas melee no, aunque también generen ataque_melee. Toggles
// puramente informativos (valorActivo/valorInactivo 0), mismo patrón que
// Máxima Potencia (movimiento.ts): el motor no descuenta el colchón solo,
// se ajusta a mano en Recursos, igual que el resto de gasto de RECURSOS en
// toda la app. El sacrificio mayor (nivel 3+) es una ALTERNATIVA al menor,
// no algo que se sume encima — declarar solo uno de los dos, el motor no
// arbitra si se combinan ambos, mismo criterio de confianza en el jugador
// que el resto de toggles independientes.
// Efectos del plasma liberado (R7, 2026-10-24, docs/fuente/equipamiento.md): en los niveles 1-2,
// solo en crítico uno de los habituales (dificultad 6 + nivel); desde el 3, "causan efecto de
// shock y de llamarada (dificultad 5 + nivel), en caso de crítico efecto de fusión (dificultad
// 7 + nivel)". Vale para los dos sacrificios.
function efectosPlasmaLiberado(nivel: number): string {
  return nivel >= 3
    ? `Causa shock y llamarada (dificultad ${5 + nivel}); en crítico, fusión (dificultad ${7 + nivel}).`
    : `Sin sus efectos salvo en crítico: shock, llamarada o fusión — dificultad de absorción ${6 + nivel}.`;
}

function condicionesSacrificioColchon(nivel: number): CondicionTirada[] {
  const condiciones: CondicionTirada[] = [
    {
      id: "sacrificio_colchon_menor",
      tipo: "toggle",
      etiqueta: "Sacrificar 2 del colchón (+1 nivel de plasma)",
      valorActivo: 0,
      valorInactivo: 0,
      nota:
        `Suma 1 nivel de daño de plasma al golpe, aparte del daño normal. ${efectosPlasmaLiberado(nivel)} ` +
        "Descuenta 2 puntos del colchón a mano en Recursos.",
    },
  ];
  if (nivel >= 3) {
    condiciones.push({
      id: "sacrificio_colchon_mayor",
      tipo: "toggle",
      etiqueta: "Sacrificar 4 del colchón (+2 nivel de plasma)",
      valorActivo: 0,
      valorInactivo: 0,
      nota:
        `Alternativa al sacrificio menor: +2 nivel de daño de plasma por 4 puntos del colchón. ${efectosPlasmaLiberado(nivel)} ` +
        "Descuéntalos a mano en Recursos.",
    });
  }
  return condiciones;
}

// Armas Modificadas (S87): lo que el perfil del golpe pone en la Accion de golpear o
// lanzar. Sin modificaciones, todo queda como estaba.
function notaConPerfil(textos: (string | null | undefined)[], perfil: PerfilGolpe | null): string | undefined {
  const todos = [...textos, ...(perfil?.efectos ?? [])].filter((t): t is string => !!t);
  return todos.length > 0 ? todos.join(" · ") : undefined;
}

// "Impacto Estructural: … reduce de forma permanente el valor de blindaje del objetivo en
// 1 punto. En armas a dos manos la reducción del blindaje es de 2 puntos" (docs/fuente/
// equipamiento.md, Kerzul): el crítico lleva su efecto, no solo el nombre (2026-10-24).
function textoCriticoArma(arma: ArmaMelee): string | undefined {
  const critico = arma.efectoCritico;
  if (!critico?.startsWith("Impacto Estructural")) return critico;
  const puntos = arma.empleo === "dos manos" ? 2 : 1;
  return `${critico}: reduce de forma permanente el blindaje del objetivo en ${puntos} punto${puntos > 1 ? "s" : ""}`;
}

function criticoConPerfil(arma: ArmaMelee, perfil: PerfilGolpe | null): string | undefined {
  const todos = [textoCriticoArma(arma), ...(perfil?.efectosCritico ?? [])].filter((t): t is string => !!t);
  return todos.length > 0 ? todos.join(" · ") : undefined;
}

// Kerzul no se modifica, así que nunca coinciden las dos fuentes de "ignora blindaje".
function ignoraBlindajeDe(arma: ArmaMelee, perfil: PerfilGolpe | null, nombre: string): Accion["ignoraBlindaje"] {
  if (arma.ignoraBlindaje) return { valor: arma.ignoraBlindaje, fuente: arma.label };
  if (perfil?.ignoraBlindaje) return { valor: perfil.ignoraBlindaje, fuente: nombre };
  return undefined;
}

// El daño de un modo con las modificaciones: lo del mismo tipo, sumado al básico; lo de
// otro tipo, aparte; Nanofilamento cambia la categoría de todo el golpe.
function modoConPerfil<
  T extends { danio: number | null; danioSutil?: number | null; formulaDanio: string | null; categoriaDanio: string },
>(
  modo: T,
  perfil: PerfilGolpe | null,
): T & { tipoDanio?: PerfilGolpe["tipoBase"]; danioExtra?: PerfilGolpe["extras"] } {
  if (!perfil) return modo;
  const suma = (d: number | null | undefined) => (d === null || d === undefined ? d : d + perfil.sumaBase);
  return {
    ...modo,
    danio: suma(modo.danio) ?? null,
    // El origen del desglose ("Simple, Fue+5") tiene que cuadrar con la base ya sumada.
    formulaDanio: modo.formulaDanio === null ? null : formulaConSuma(modo.formulaDanio, perfil.sumaBase),
    ...(modo.danioSutil !== undefined && { danioSutil: suma(modo.danioSutil) }),
    categoriaDanio: perfil.categoria ?? modo.categoriaDanio,
    tipoDanio: perfil.tipoBase,
    ...(perfil.extras.length > 0 && { danioExtra: perfil.extras }),
  };
}

// `sutilPermitido`: la ficha tiene Combate Sutil (D2b-2, §9.5). Sin la dote, un arma Sutil
// se usa como cualquier otra: Potencia al tirar y Fuerza al daño, sin interruptor.
// `modificaciones`: las del arma equipada (Armas Modificadas, S87).
function tiradaDeArmaMelee(
  sheet: Sheet,
  mods: ModificadorConFuente[],
  arma: ArmaMelee,
  instanciaId: string,
  sutilPermitido: boolean,
  modificaciones?: ModificacionArmaId[],
): Accion {
  const perfil = perfilGolpe(arma, modificaciones);
  const nombre = nombreArmaModificada(arma, modificaciones ?? []);
  const modosConId = arma.modos.map((m, i) => ({ ...m, id: `${i}` }));
  const modo = condicionModo(modosConId, "Modo de ataque");
  const fuerza = atributoEfectivo(sheet, "fuerza", mods);
  const esSutil = arma.sutil === true && sutilPermitido;
  // Solo se calcula si hace falta: el resto de armas (no Sutil) no necesita
  // el aplicado de Potencia para nada aquí.
  const potencia = esSutil ? aplicado(sheet, "potencia", mods) : null;
  // Toda la Pelea es golpe a mano vacía (Puñetazo, Patada, Codazo o Rodillazo): el
  // "ataque desarmado" del PDF no hace excepciones (usuario, 2026-10-13).
  const esDesarmado = PELEA.some((p) => p.id === arma.id);
  const malla = esDesarmado ? mallaPlasmaticaEquipada(sheet) : null;
  // Con armadura (Ligera/Intermedia/Pesada) y Refuerzo de Combate: +N al daño, letal y
  // aturdimiento del crítico (golpeDesarmado.ts). La Pelea no se modifica (S87): sin perfil.
  const conArmadura = esDesarmado ? golpeDesarmadoConArmadura(sheet) : null;
  const bonoArmadura = conArmadura?.bonoDanio ?? 0;

  // `arma.efectos` (Crítico de X, Ignora N de blindaje...) es hoy puramente
  // decorativo en el catálogo, pero al menos debe llegar como texto a la
  // tirada — mismo criterio que `arma.especial` en tiradaDeArmaFuego. Antes de
  // este fix no llegaba ni como texto (ver docs/equipo-efectos-especiales.md
  // §Kerzul, "fix barato" 2026-09-23).
  const nota = notaConPerfil(
    [
      arma.efectos,
      conArmadura && bonoArmadura > 0 ? `Daño desarmado con la armadura: ${conArmadura.fuentes.join(" · ")}` : null,
      conArmadura?.letal ? `Daño letal (${conArmadura.letal})` : null,
    ],
    perfil,
  );

  // Sin selector de modo (un único modo): su `dificultad` va como ajuste fijo,
  // mismo patrón que ajusteModoUnico en tiradaDeArmaFuego. El bloqueo lleva la
  // suya aparte (tiradaBloqueoDeArmaMelee).
  const ajusteModoUnico =
    !modo && modosConId[0].dificultad !== 0 ? [{ valor: modosConId[0].dificultad, fuente: arma.label }] : [];

  return {
    id: `ataque_melee_${instanciaId}`,
    label: `Golpear con ${nombre}`,
    grupo: "Ataques",
    aplicado: "potencia",
    // Sutil (docs/equipamiento.md:848-850): elección del jugador al tirar,
    // resuelta con un toggle en FilaTirada (AccionesTab.tsx) — ya no una nota
    // de texto que solo avisaba de que existía. La habilidad (Combate Melee)
    // no cambia en ningún caso, solo el aplicado.
    aplicadoSutil: esSutil ? "reflejos" : undefined,
    habilidad: "combate_melee",
    especialidadArma: ESPECIALIDAD_ARMA[arma.id],
    familiaArma: "ataque_melee",
    empleoArma: arma.empleo,
    nota,
    efectoCritico: criticoDesarmado(criticoConPerfil(arma, perfil), conArmadura),
    ...(esDesarmado && { desarmado: true as const }),
    ...(arma.contundente && { contundente: true as const }),
    ignoraBlindaje: ignoraBlindajeDe(arma, perfil, nombre),
    condiciones: [...(modo ? [modo] : []), ...(malla ? condicionesSacrificioColchon(malla.nivel) : [])],
    ajustesFijos: ajusteModoUnico,
    ataque: {
      modos: modosConId.map((m) => {
        const bono = bonoFormulaFuerza(m.formulaDanio);
        return modoConPerfil(
          {
            id: m.id,
            etiqueta: m.etiqueta,
            danio: bono === null ? null : fuerza + bono + bonoArmadura,
            danioSutil: esSutil && bono !== null && potencia !== null ? potencia + bono + bonoArmadura : undefined,
            formulaDanio: m.formulaDanio === null ? null : formulaConSuma(m.formulaDanio, bonoArmadura),
            categoriaDanio: conArmadura?.letal ? "Letal" : m.categoriaDanio,
          },
          perfil,
        );
      }),
    },
  };
}

// Bloqueo (pregunta 31, resuelta 2026-09-24): "otra forma de defensa" además
// de Esquivar (defensa/atletismo en ACCIONES), activa con cualquier arma
// melee equipada si la ficha tiene la dote Bloqueo (D2b-2, §9.2) — mismo par que su propio ataque (Potencia + Combate Melee,
// o Reflejos + Combate Melee si el arma es Sutil) y mismo penalizador por
// atacante adicional que Esquivar. Lleva la dificultad del arma, como su ataque ("la
// tirada empleada para el bloqueo es la misma de ataque", dotes.md), salvo los escudos
// (decisión del usuario, 2026-10-23); los dos modos de cada arma comparten dificultad.
// `arma.bloqueoAjuste` es el ajuste propio de una pieza concreta sobre ESTE bloqueo, que
// se suma a lo anterior (hoy solo el Mangual: −2 de dificultad y −2 de bloqueo, −4).
//
// Sutil aquí ya no se asume en automático (era un bug: el jugador no podía
// elegir bloquear "a lo bruto" con un arma Sutil) — mismo toggle que el
// ataque, `aplicado: "potencia"` por defecto y `aplicadoSutil: "reflejos"`
// como opción si el arma lo admite.
//
// Especialidad: la del arma, como el ataque, sin selector en la fila (S40, cambiado por el
// usuario: los bloqueos también usan la especialidad del arma; construido en D2b-1).
//
// D2b-2 (§9.2): la fila solo existe con la dote Bloqueo (lo filtra accionesDeAtaque, por
// familia) y el Sutil solo con Combate Sutil (`sutilPermitido`).
// `sinPenalizadorDesarmado`: la armadura (o el Refuerzo de Combate) que deja bloquear desarmado
// contra armas melee sin el −3 (golpeDesarmado.ts): la fila no cuenta como desarmada.
function tiradaBloqueoDeArmaMelee(
  arma: ArmaMelee,
  instanciaId: string,
  sutilPermitido: boolean,
  modificaciones?: ModificacionArmaId[],
  sinPenalizadorDesarmado?: string | null,
): Accion {
  const desarmado = PELEA.some((p) => p.id === arma.id);
  return {
    id: `bloquear_melee_${instanciaId}`,
    label: `Bloquear con ${nombreArmaModificada(arma, modificaciones ?? [])}`,
    grupo: "Defensa",
    aplicado: "potencia",
    aplicadoSutil: arma.sutil && sutilPermitido ? "reflejos" : undefined,
    habilidad: "combate_melee",
    especialidadArma: ESPECIALIDAD_ARMA[arma.id],
    familiaArma: "bloquear_melee",
    empleoArma: arma.empleo,
    nota:
      desarmado && sinPenalizadorDesarmado
        ? `Reacción gratuita e ilimitada, como Esquivar — activa mientras se lleva el arma. · Bloqueas desarmado contra armas melee sin el −3 (${sinPenalizadorDesarmado}).`
        : "Reacción gratuita e ilimitada, como Esquivar — activa mientras se lleva el arma.",
    // Bloquear con Pelea es bloquear desarmado (casilla de Bloqueo "desarmado frente a armado").
    ...(desarmado && !sinPenalizadorDesarmado && { desarmado: true as const }),
    condiciones: [CONDICION_ATACANTES_ADICIONALES],
    ajustesFijos: [
      ...(!arma.defensa && arma.modos[0].dificultad !== 0 ? [{ valor: arma.modos[0].dificultad, fuente: arma.label }] : []),
      ...(arma.bloqueoAjuste ? [{ valor: arma.bloqueoAjuste, fuente: `${arma.label} (bloqueo)` }] : []),
    ],
  };
}

// Arma melee arrojadiza (Lanza Corta, Cuchillo de Combate, Puñal y Lanza
// Corta de Kerzul): mismo par que lanzar una granada (Potencia + Atletismo) — INFERIDO,
// decisión 2026-09-28, el usuario. El alcance es el suyo ("Arrojadiza: Potencia x 12",
// EQUIP; `arrojadiza` lleva el multiplicador), no el de la granada (S20, 2026-10-24). Se lanza con el perfil del primer modo (el
// Simple): su dificultad como ajuste fijo y su daño. Sin Sutil ni colchón de
// Malla — un lanzamiento no es un golpe. Arrojadiza modificada: el mismo daño extra y
// efectos que al golpear (usuario, 2026-10-23).
function tiradaLanzarArmaMelee(
  sheet: Sheet,
  mods: ModificadorConFuente[],
  arma: ArmaMelee,
  instanciaId: string,
  modificaciones?: ModificacionArmaId[],
): Accion | null {
  if (!arma.arrojadiza) return null;
  const modo = arma.modos[0];
  const bono = bonoFormulaFuerza(modo.formulaDanio);
  const perfil = perfilGolpe(arma, modificaciones);
  const nombre = nombreArmaModificada(arma, modificaciones ?? []);
  return {
    id: `lanzar_melee_${instanciaId}`,
    label: `Lanzar ${nombre}`,
    grupo: "Ataques",
    aplicado: "potencia",
    habilidad: "atletismo",
    especialidadArma: ESPECIALIDAD_LANZAR,
    familiaArma: "lanzar_melee",
    empleoArma: arma.empleo,
    nota: notaConPerfil([`Alcance Potencia × ${arma.arrojadiza} m.`, arma.efectos], perfil),
    efectoCritico: criticoConPerfil(arma, perfil),
    ignoraBlindaje: ignoraBlindajeDe(arma, perfil, nombre),
    ajustesFijos: modo.dificultad !== 0 ? [{ valor: modo.dificultad, fuente: arma.label }] : [],
    ataque: {
      modos: [
        modoConPerfil(
          {
            id: "0",
            danio: bono === null ? null : atributoEfectivo(sheet, "fuerza", mods) + bono,
            formulaDanio: modo.formulaDanio,
            categoriaDanio: modo.categoriaDanio,
          },
          perfil,
        ),
      ],
    },
  };
}

// Proyector de Pulso (Subsistema, catalogoId "proyector_pulso"): el único
// subsistema del catálogo que es, de hecho, un arma — Hallazgo #1 de
// docs/equipo-efectos-especiales.md, construido 2026-09-23 tras la respuesta
// de Murillo a la pregunta 13 (los "modo adicional" de nivel 2-4 son
// alternativas que el jugador elige libremente, no niveles que se sustituyen).
// Sus números escalan con el Nivel instalado de la pieza (daño, alcance,
// dificultad de los efectos) — algo que ningún arma normal hace — por eso
// vive en su propia función en vez de encajar en tiradaDeArmaFuego.
//
// Aguijón (2026-09-24, corregido tras confirmar con Murillo): NO comparte
// aplicado/habilidad con los otros 3 modos. Es Combate Melee — no la elección
// Combate a Distancia/Tecnociencia de los modos a distancia — así que genera
// sus propias dos Acciones (Golpear/Bloquear), mismo patrón que cualquier
// arma melee (tiradaDeArmaMelee/tiradaBloqueoDeArmaMelee), no una opción más
// dentro del selector de modo a distancia. Es Sutil (aplicado Reflejos, no
// Potencia) — coincide con la lectura original ("aplicado Reflejos en ambos
// casos") solo por coincidencia con la regla general de Sutil, no porque siga
// perteneciendo al par Combate a Distancia/Tecnociencia.
//
// Los 3 "modo adicional" (envenenamiento/ceguera+fuego/disrupción de campo) y
// el -5 al sigilo se quedan como texto informativo o sin construir — ver
// docs/sistema.md pregunta 13 y el MotorMetadata de cada nivel en
// catalog/subsistemas.ts.
const GASTO_MODO_PULSO: Record<string, number> = {
  pulso: 1,
  pulso_cargado: 4,
  barrido: 5,
  aguijon: 1,
};

// Sabor, no regla — texto libre nuestro (2026-09-24, a petición del usuario)
// para que el selector de modo no sea solo un nombre suelto. Se muestra
// debajo del selector cuando ese modo está elegido (AccionModal.tsx, mismo
// mecanismo que ya usa `notaInsuficiente`).
const DESCRIPCION_MODO_PULSO: Record<string, string> = {
  pulso: "Un único disparo de energía concentrada, como el fogonazo corto de un bláster — rápido y barato en cargas.",
  pulso_cargado:
    "El emisor retiene la descarga un instante antes de soltarla entera de golpe: más lento, mucho más contundente.",
  barrido: "El haz se abre en abanico y arrasa un área entera de un plumazo, a costa de perder precisión.",
};

// Las 3 variantes de crítico de los "modo adicional" (nivel 2-4) son del
// SUBSISTEMA entero, no solo de los 3 modos a distancia — Aguijón también
// las desbloquea (2026-09-24: se quedó fuera al partir Aguijón en su propia
// función, mismo texto duplicado en dos sitios habría vuelto a desincronizarse).
function variantesCriticoDesbloqueadas(nivel: number): string[] {
  return [
    nivel >= 2
      ? `Nivel 2: crítico alternativo Envenenamiento por Radiación (dificultad ${8 + nivel}), a elección en vez de Hemorragia.`
      : null,
    nivel >= 3
      ? `Nivel 3: crítico alternativo Ceguera (dificultad ${8 + nivel}) y el daño pasa a Fuego con Llamarada, a elección.`
      : null,
    nivel >= 4
      ? `Nivel 4: el Shock sube +1 de dificultad; en crítico destruye 1 punto de blindaje del objetivo (sin blindaje, Hemorragia normal), a elección.`
      : null,
  ].filter((v): v is string => v !== null);
}

// Alcances de la tabla "Modo de Ataque" (docs/fuente/equipamiento.md, Proyector de Pulso):
// Pulso y Barrido comparten tramos; Pulso Cargado lleva los suyos (30/100/200 + nivel).
function alcancePulso(modo: "pulso" | "pulso_cargado" | "barrido", nivel: number): ArmaFuego["alcance"] {
  if (modo === "pulso_cargado") return { corta: 30 + 10 * nivel, media: 100 + 20 * nivel, larga: 200 + 20 * nivel };
  return { corta: 20 + 10 * nivel, media: 80 + 20 * nivel, larga: 160 + 20 * nivel };
}

// El modificador general de distancia de las armas a distancia (+4/+2/0/-2), como cualquier
// arma de fuego (2026-10-24). Un solo selector para los tres modos: la etiqueta trae los
// metros de Pulso/Barrido y, aparte, los del Pulso Cargado.
function condicionTramoPulso(nivel: number): CondicionTirada {
  const comun = alcancePulso("pulso", nivel);
  const cargado = alcancePulso("pulso_cargado", nivel);
  const NOMBRE: Record<TramoDistancia, string> = { bocajarro: "Bocajarro", corta: "Corta", media: "Media", larga: "Larga" };
  const metros = (tramo: TramoDistancia, a: ArmaFuego["alcance"]) =>
    ({ bocajarro: `< ${a.corta} m`, corta: `${a.corta}-${a.media} m`, media: `${a.media}-${a.larga} m`, larga: `${a.larga}+ m` })[tramo];
  return {
    id: "tramo",
    tipo: "opcion",
    etiqueta: "Distancia",
    opciones: TRAMOS.map((tramo) => ({
      id: tramo,
      etiqueta: `${NOMBRE[tramo]} (${metros(tramo, comun)}; Cargado ${metros(tramo, cargado)})`,
      valor: AJUSTE_TRAMO_GENERAL[tramo],
    })),
    porDefecto: "media",
  };
}

function tiradaDeProyectorPulso(
  sheet: Sheet,
  pieza: PiezaEquipada,
  habilidad: Extract<Accion["habilidad"], "combate_distancia" | "tecnociencia">,
): Accion {
  const nivel = pieza.nivel ?? 1;
  const modo: CondicionTirada = {
    id: "modo",
    tipo: "opcion",
    etiqueta: "Modo de disparo",
    opciones: [
      { id: "pulso", etiqueta: "Pulso", valor: -2 },
      { id: "pulso_cargado", etiqueta: "Pulso Cargado", valor: -2 },
      { id: "barrido", etiqueta: "Barrido", valor: -3 },
    ].map((o) => ({ ...o, nota: DESCRIPCION_MODO_PULSO[o.id] })),
    porDefecto: "pulso",
  };

  const variantesDesbloqueadas = variantesCriticoDesbloqueadas(nivel);
  const tramos = (a: ArmaFuego["alcance"]) => `corto ${a.corta} m, medio ${a.media} m, largo ${a.larga} m`;

  const nota = [
    "Daño grave.",
    `Pulso: alcance ${tramos(alcancePulso("pulso", nivel))} · Efecto Shock (${4 + nivel}) · Crítico Hemorragia.`,
    `Pulso Cargado: alcance ${tramos(alcancePulso("pulso_cargado", nivel))} · Efecto Shock (${6 + nivel}) · Crítico Hemorragia.`,
    `Barrido: área 6x6, alcance ${tramos(alcancePulso("barrido", nivel))} · Efecto Esquiva (${7 + nivel}) y Shock (${7 + nivel}).`,
    ...variantesDesbloqueadas,
  ].join(" · ");

  const etiquetaHabilidad = habilidad === "combate_distancia" ? "Combate a Distancia" : "Tecnociencia";

  return {
    id: `ataque_proyector_pulso_${habilidad}_${pieza.instanciaId}`,
    label: `Disparar Proyector de Pulso (${etiquetaHabilidad})`,
    grupo: "Ataques",
    aplicado: "reflejos",
    habilidad,
    // Con Tecnociencia el disparo no nombra especialidad (ninguna de Tecnociencia encaja):
    // entera (docs/sistema.md §3, usuario 2026-10-23).
    especialidadArma: habilidad === "combate_distancia" ? ESPECIALIDAD_ATAQUE_ESPECIAL.proyector_pulso_disparo : undefined,
    // Disparo, con las dos habilidades. Sin empleo: el emisor va en la armadura, no se
    // empuña ("permite disparar sin desenfundar", docs/equipamiento.md), así que un filtro de
    // empleo de dote (Desenfundado Rápido) no lo alcanza. Confirmado por el usuario.
    familiaArma: "ataque_fuego",
    nota,
    recursoInstanciaId: pieza.instanciaId,
    recursoUnidad: "cargas",
    condiciones: [condicionTramoPulso(nivel), modo],
    ataque: {
      modos: [
        { id: "pulso", danio: 7 + nivel, formulaDanio: null, categoriaDanio: "Grave", gasto: GASTO_MODO_PULSO.pulso },
        {
          id: "pulso_cargado",
          danio: 10 + nivel,
          formulaDanio: null,
          categoriaDanio: "Grave",
          gasto: GASTO_MODO_PULSO.pulso_cargado,
        },
        {
          id: "barrido",
          danio: 9 + nivel,
          formulaDanio: null,
          categoriaDanio: "Grave",
          gasto: GASTO_MODO_PULSO.barrido,
        },
      ],
    },
  };
}

// Aguijón, separado del resto de modos (ver comentario de arriba): Combate
// Melee, Sutil, mismo patrón Golpear+Bloquear que cualquier arma melee.
//
// D2b-2 (§9.5: "sin Combate Sutil no hay modo sutil, también el Aguijón"): con la dote, como
// siempre, Reflejos fijo; sin ella, Potencia. El daño sale de Fuerza en los dos casos:
// «4 + Fuerza + Nivel» (tabla del documento; hasta 2026-10-24 era Fue+2+nivel, errata nuestra).
// TODO(revisar): con la dote el Aguijón sigue siendo Reflejos fijo, sin interruptor y con el
// daño de Fuerza; las armas Sutil normales ofrecen elegir y sacan el daño Sutil de Potencia.
// Se dejó como estaba (decisión del usuario: "con la dote, como hoy").
function tiradaGolpeAguijon(sheet: Sheet, mods: ModificadorConFuente[], pieza: PiezaEquipada, sutil: boolean): Accion {
  const nivel = pieza.nivel ?? 1;
  return {
    id: `ataque_proyector_pulso_aguijon_${pieza.instanciaId}`,
    label: "Golpear con Proyector de Pulso (Aguijón)",
    grupo: "Ataques",
    aplicado: sutil ? "reflejos" : "potencia",
    habilidad: "combate_melee",
    especialidadArma: ESPECIALIDAD_ATAQUE_ESPECIAL.proyector_pulso_aguijon,
    familiaArma: "ataque_melee", // sin empleo, como el disparo
    nota: [
      "Repliega el emisor a un pincho corto de energía y lo descarga a bocajarro, casi sin gesto — Sutil.",
      `Duración ${nivel} turno(s) · Efecto Shock (${4 + nivel}) · Crítico Hemorragia.`,
      ...variantesCriticoDesbloqueadas(nivel),
    ].join(" · "),
    recursoInstanciaId: pieza.instanciaId,
    recursoUnidad: "cargas",
    ataque: {
      modos: [
        {
          id: "0",
          danio: atributoEfectivo(sheet, "fuerza", mods) + 4 + nivel,
          formulaDanio: `Fue+${4 + nivel}`,
          categoriaDanio: "Grave",
          gasto: GASTO_MODO_PULSO.aguijon,
        },
      ],
    },
  };
}

// Solo con Bloqueo (lo filtra accionesDeAtaque); Reflejos solo con Combate Sutil, como el golpe.
function tiradaBloqueoAguijon(pieza: PiezaEquipada, sutil: boolean): Accion {
  return {
    id: `bloquear_proyector_pulso_aguijon_${pieza.instanciaId}`,
    label: "Bloquear con Proyector de Pulso (Aguijón)",
    grupo: "Defensa",
    aplicado: sutil ? "reflejos" : "potencia",
    habilidad: "combate_melee",
    especialidadArma: ESPECIALIDAD_ATAQUE_ESPECIAL.proyector_pulso_aguijon,
    familiaArma: "bloquear_melee",
    nota: "Reacción gratuita e ilimitada, como Esquivar — activa mientras se lleva el arma.",
    condiciones: [CONDICION_ATACANTES_ADICIONALES],
  };
}

// Brazo Biónico (A6a, rules/brazoBionico.ts): la casilla "Con el brazo biónico" en las filas
// que la admiten (Puñetazo, codazo, cuerpo a cuerpo y fuego de una mano, y su "Bloquear con X"),
// detrás de las suyas. Las del arma incorporada (A6b) van siempre con el brazo, sin casilla
// (`Accion.extremidad`), y con su nota.
function conBrazo(t: Accion, pieza: PiezaEquipada, brazo: BrazoBionico): Accion {
  const danioDeFuerza = t.ataque?.modos.some((m) => m.formulaDanio !== null && bonoFormulaFuerza(m.formulaDanio) !== null) ?? false;
  const ataque = { catalogoId: pieza.catalogoId, familiaArma: t.familiaArma, empleoArma: t.empleoArma, danioDeFuerza };
  const incorporada = extremidadIncorporada(brazo, pieza.instanciaId, ataque);
  if (incorporada) {
    const nota = `${NOTA_ARMA_INCORPORADA} Con la Fuerza ${brazo.fuerza} y la Agilidad ${brazo.agilidad} del brazo (${brazo.fuente}).`;
    return { ...t, extremidad: incorporada, nota: t.nota ? `${t.nota} · ${nota}` : nota };
  }
  const casilla = casillaBrazo(brazo, ataque);
  return casilla ? { ...t, condiciones: [...(t.condiciones ?? []), casilla] } : t;
}

// "Bloquear con el brazo biónico" (A6a): nivel 2+ y, como todo "Bloquear con X", solo con la
// dote Bloqueo (familia bloquear_melee, la filtra accionesDeAtaque). Siempre con la Fuerza y la
// Agilidad del brazo, sin casilla. Su blindaje se marca en "Bloquear daño" (R12).
// TODO(revisar): especialidad Pelea (la del Puñetazo), sin Sutil y sin `desarmado` (el brazo "se
// puede utilizar como arma para bloquear").
function tiradaBloqueoBrazo(brazo: BrazoBionico): Accion | null {
  const extremidad = extremidadDeBloqueo(brazo);
  if (!extremidad) return null;
  return {
    id: ID_BLOQUEAR_BRAZO,
    label: "Bloquear con el brazo biónico",
    grupo: "Defensa",
    aplicado: "potencia",
    habilidad: "combate_melee",
    especialidadArma: ESPECIALIDAD_ARMA.pelea_punetazo,
    familiaArma: "bloquear_melee",
    empleoArma: "una mano",
    nota:
      `Reacción gratuita e ilimitada, como Esquivar. Con la Fuerza ${brazo.fuerza} y la Agilidad ${brazo.agilidad} del brazo (${brazo.fuente}). ` +
      `Su blindaje (${brazo.blindaje ?? 0}) solo para este golpe: marca "Bloqueado con el brazo biónico" en Bloquear daño.`,
    condiciones: [CONDICION_ATACANTES_ADICIONALES],
    extremidad,
  };
}

// Registro familia -> generador de acción (T5, docs/motor.md §Escalabilidad):
// una función por familia con firma uniforme, en vez de un bucle hardcodeado
// por familia repetido varias veces sobre sheet.equipo. Dar de alta una
// familia nueva en esta lista (armas de fuego/melee/pesadas) es añadir una
// entrada aquí, no tocar accionesDeAtaque(). "granada" NO vive aquí desde
// 2026-09-27: dejó de ser sheet.equipo, ver accionesDeGranadas() más abajo.
// Cada wrapper es una cáscara fina
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
type GeneradorDeAtaque = (
  sheet: Sheet,
  pieza: PiezaEquipada,
  cat: Equipo,
  mods: ModificadorConFuente[],
  permisos: PermisosDeDotes,
) => Accion[];

const REGISTRO_DE_ATAQUE: Partial<Record<Equipo["familia"], GeneradorDeAtaque>> = {
  arma: (sheet, pieza, cat, mods) => {
    const arma = cat as ArmaFuego;
    const lanzagranadas = tiradaDeLanzagranadas(sheet, arma, pieza.instanciaId);
    const golpeBayoneta = tiradaGolpeBayoneta(sheet, mods, arma, pieza.instanciaId);
    const bloqueoBayoneta = tiradaBloqueoBayoneta(sheet, arma, pieza.instanciaId);
    return [
      tiradaDeArmaFuego(sheet, mods, arma, pieza.instanciaId),
      ...(lanzagranadas ? [lanzagranadas] : []),
      ...(golpeBayoneta ? [golpeBayoneta] : []),
      ...(bloqueoBayoneta ? [bloqueoBayoneta] : []),
    ];
  },
  armaMelee: (sheet, pieza, cat, mods, permisos) => {
    const arma = cat as ArmaMelee;
    const lanzar = tiradaLanzarArmaMelee(sheet, mods, arma, pieza.instanciaId, pieza.modificaciones);
    const filas = [
      tiradaDeArmaMelee(sheet, mods, arma, pieza.instanciaId, permisos.sutil.includes("ataque_melee"), pieza.modificaciones),
      ...(lanzar ? [lanzar] : []),
      tiradaBloqueoDeArmaMelee(
        arma,
        pieza.instanciaId,
        permisos.sutil.includes("bloquear_melee"),
        pieza.modificaciones,
        golpeDesarmadoConArmadura(sheet)?.bloqueoSinPenalizador,
      ),
    ];
    // Escudo roto (S86): sus filas salen, apagadas con el motivo, hasta que se repare.
    return arma.defensa && escudoRoto(sheet, pieza.instanciaId) ? filas.map((t) => ({ ...t, bloqueada: MOTIVO_ESCUDO_ROTO })) : filas;
  },
  armaPesada: (sheet, pieza, cat) => {
    const tirada = tiradaDeArmamentoPesado(sheet, cat as ArmaPesada, pieza.instanciaId);
    return tirada ? [tirada] : [];
  },
  // Único caso hoy: Proyector de Pulso (ver tiradaDeProyectorPulso arriba).
  // El resto de subsistemas no llega aquí — generaAccionPropia() ya los
  // filtra por catalogoId+nivel antes de invocar este generador. Si en el
  // futuro otro subsistema construye su propia acción (la Malla Plasmática
  // es la siguiente candidata, ver Hallazgo #1 ampliado), este `if` necesita
  // una rama nueva, no una reescritura.
  subsistema: (sheet, pieza, _cat, mods, permisos) => {
    if (pieza.catalogoId !== "proyector_pulso") return [];
    return [
      tiradaDeProyectorPulso(sheet, pieza, "combate_distancia"),
      tiradaDeProyectorPulso(sheet, pieza, "tecnociencia"),
      tiradaGolpeAguijon(sheet, mods, pieza, permisos.sutil.includes("ataque_melee")),
      tiradaBloqueoAguijon(pieza, permisos.sutil.includes("bloquear_melee")),
    ];
  },
};

// T6 (docs/motor.md §Escalabilidad): el registro de arriba sigue siendo la
// autoridad de "sé renderizar esta familia" — esto es un filtro ADICIONAL,
// nunca lo sustituye. Sin él, una pieza cuya familia esté registrada pero
// cuyo MotorMetadata todavía no declare su acción como "construido" (una
// Bayoneta el día de mañana, por ejemplo) generaría igualmente su fila, solo
// porque su familia sabe generar tiradas en general. Las familias del
// registro (arma/armaMelee/armaPesada) tienen hoy el 100% de sus
// piezas con al menos una entrada { tipo: "accion", mecanismo:
// "accion_equipo", estado: "construido" } para su acción principal —
// confirmado tras el barrido y la auditoría del catálogo — así que este
// filtro no cambia el resultado de ninguna pieza real de hoy; varias piezas
// (Kerzul, Armas Mecánicas) tienen ADEMÁS una segunda entrada "accion"
// bloqueada/pendiente para un efecto distinto (Derribo, Retroceso Entrópico)
// que ningún generador construye todavía — un match "alguna entrada
// construida" basta, no hace falta que TODAS lo estén.
//
// "cat" es la unión Equipo; motor existe como campo directo en las familias
// sin niveles (arma/armaMelee/armaPesada, y granada vía accionesDeGranadas()
// más abajo, que consulta generaAccionPropia() a mano) — el cast a `{ motor?: ... }`
// es seguro aquí por el mismo motivo que el cast a la familia concreta dentro
// de cada wrapper. Las familias CON niveles (subsistema, hoy solo el
// Proyector de Pulso en este registro) llevan el `motor` colgado de cada
// `NivelModulo`, no de la pieza — de ahí el segundo parámetro `nivel`,
// obligatorio en ese caso: sin él, cat.motor siempre da `[]` y ninguna pieza
// con niveles podría generar su acción nunca, por muy "construido" que
// declare su MotorMetadata.
export function generaAccionPropia(cat: Equipo, nivel?: number): boolean {
  const motorDirecto = (cat as { motor?: MotorMetadata[] }).motor;
  // Acumulado, no exacto: por S9 (docs/sistema.md) el nivel N conserva lo
  // desbloqueado en 1..N-1, y la acción base de un módulo por niveles se
  // declara en el nivel donde nace (normalmente el 1) — un Proyector de
  // Pulso instalado en nivel 3 sigue teniendo la acción que se desbloqueó en
  // el 1, así que hay que mirar todos los niveles hasta el instalado, no
  // solo la entrada que coincide exacta.
  const motorPorNivel = (cat as { niveles?: { nivel: number; motor?: MotorMetadata[] }[] }).niveles
    ?.filter((n) => nivel !== undefined && n.nivel <= nivel)
    .flatMap((n) => n.motor ?? []);
  const motor = motorDirecto ?? motorPorNivel ?? [];
  return motor.some((m) => m.tipo === "accion" && m.mecanismo === "accion_equipo" && m.estado === "construido");
}

// Todas las filas de la categoría "Ataques": una por arma de fuego, arma
// melee o arma pesada equipada, más una por tipo de granada en RECURSOS —
// incluida Pelea (Puñetazo, Patada, Codazo o Rodillazo), que ya no se añade
// sola: si el jugador la quiere en Acciones, la equipa desde la Tienda como
// cualquier otra arma (aparece con "no se compra" en vez de precio, pero es
// el mismo flujo). Granada, a diferencia de las otras tres, no pasa por
// REGISTRO_DE_ATAQUE (ese recorre sheet.equipo, y una granada ya no vive
// ahí) — generaAccionPropia() se consulta aquí a mano, mismo gate de
// MotorMetadata que antes, con el mismo orden que el catálogo en vez del de
// inserción del Record.
function accionesDeGranadas(sheet: Sheet): Accion[] {
  return MUNICION_GRANADA.filter((g) => (sheet.granadas[g.id] ?? 0) > 0 && generaAccionPropia(g)).map((g) =>
    tiradaDeGranada(g),
  );
}

// `mods`: los de la FichaResuelta (especie, equipo, estados de combate), para el daño
// que sale de Fuerza o de Potencia. `permisos`: los de las dotes (FichaResuelta.extrasDotes,
// D2b-2): una familia de FAMILIAS_SOLO_CON_DOTE (Bloquear con X, también Bayoneta y Aguijón)
// solo sale si una dote activa la habilita (§9.2, arbitraje duro), y el estilo Sutil solo
// con Combate Sutil. Obligatorio a propósito: sin él no hay forma de saber qué se ve.
export function accionesDeAtaque(sheet: Sheet, mods: ModificadorConFuente[], permisos: PermisosDeDotes): Accion[] {
  const tiradas: Accion[] = [];
  const brazo = brazoBionico(sheet);
  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (!cat) continue;
    const generador = REGISTRO_DE_ATAQUE[cat.familia];
    if (!generador) continue;
    if (!generaAccionPropia(cat, pieza.nivel)) continue;
    const generadas = generador(sheet, pieza, cat, mods, permisos);
    tiradas.push(...(brazo ? generadas.map((t) => conBrazo(t, pieza, brazo)) : generadas));
  }
  const bloqueoBrazo = brazo ? tiradaBloqueoBrazo(brazo) : null;
  if (bloqueoBrazo) tiradas.push(bloqueoBrazo);
  tiradas.push(...accionesDeGranadas(sheet));
  return tiradas
    .filter((t) => !t.familiaArma || !FAMILIAS_SOLO_CON_DOTE.includes(t.familiaArma) || permisos.familias.includes(t.familiaArma))
    .map(conApuntado);
}

// Todo ataque a distancia (Combate a Distancia) lleva el selector "Apuntado": lo que salió en la
// acción Apuntar previa (acciones.ts). Lo ve todo el mundo; Gran Puntería lo cambia en
// conExtrasDeFicha.
function conApuntado(t: Accion): Accion {
  if (t.grupo !== "Ataques" || t.habilidad !== "combate_distancia") return t;
  return { ...t, condiciones: [...(t.condiciones ?? []), condicionApuntado()] };
}

// Malla Plasmática — detonación de pulso térmico (nivel 2+, docs/tareas.md
// 2026-09-28, cierra el Hallazgo #1 de esta pieza). Sin tirada propia:
// nadie rueda dado para esto — el colchón que el jugador decida sacrificar
// ES el daño (no hay fórmula que calcular), y quien esté en el área esquiva
// con su Esquivar de siempre. "Acción sin dado" en vez de una Accion nueva,
// mismo criterio que Radar nv4 "Marcar objetivo": informa, no muta la
// ficha — el jugador elige cuántos puntos sacrificar en el propio modal
// (SacrificioRecursoModal.tsx, docs/tareas.md 2026-09-28: antes se
// descontaban a mano en Recursos, ahora los gasta solo al confirmar, igual
// que el resto de RECURSOS de la app). Área y dificultades escalan con el
// nivel instalado; el área pasa a 10x10 solo en nivel 4 (S9: no se
// re-declara en nivel 3, sigue siendo 6x6 hasta que nivel 4 la sustituye).
function tiradaDetonacionPulsoTermico(pieza: PiezaEquipada): AccionDirecta | null {
  const nivel = pieza.nivel ?? 1;
  if (nivel < 2) return null;
  const area = nivel >= 4 ? "10x10" : "6x6";
  return {
    id: `detonacion_pulso_termico_${pieza.instanciaId}`,
    label: "Detonar pulso térmico (Malla Plasmática)",
    grupo: "Ataques",
    confirmarLabel: "Detonar",
    nota:
      `Libera el colchón, todo o en parte: esos puntos son el daño de plasma en área ${area} ` +
      `a tu alrededor. Esquiva dificultad ${5 + nivel} · Shock y Llamarada dificultad ${6 + nivel}` +
      " · con fracaso crítico en la esquiva, además Fusión (misma dificultad).",
    recursoInstanciaId: pieza.instanciaId,
    categoriaDanio: "Plasma",
  };
}

// "Activar camuflaje trifásico": acción gratuita que gasta 1 carga de su célula
// (subsistemas.ts). Sin dado: la cobertura la aplica quien busca o dispara al portador, así
// que la nota da los números del nivel instalado para aplicarlos a mano. El modo pasivo no
// se activa ni gasta (basta con que quede alguna carga): solo va en la nota.
export const MOTIVO_SIN_CARGAS = "Sin cargas: recarga o cambia la batería";
function accionActivarCamuflaje(sheet: Sheet, pieza: PiezaEquipada, cat: Subsistema): AccionDirecta {
  const nivel = cat.niveles.find((n) => n.nivel === pieza.nivel) ?? cat.niveles[0];
  const recurso = recursoDe(sheet, pieza.instanciaId);
  return {
    id: `activar_camuflaje_${pieza.instanciaId}`,
    label: `Activar ${cat.label}`,
    grupo: "Acciones",
    confirmarLabel: "Activar",
    nota: [
      `Acción gratuita, gasta 1 carga${recurso ? ` (quedan ${recurso.actual}/${recurso.max})` : ""}. Nivel ${nivel.nivel}.`,
      ...nivel.detalle,
      "La cobertura la aplica quien te busca o te dispara. Con otra cobertura, la menor suma solo la mitad.",
      "El modo pasivo no se activa ni gasta: dura mientras quede alguna carga.",
    ].join(" "),
    gastoRecurso: { instanciaId: pieza.instanciaId, cantidad: 1 },
    ...(recurso?.actual === 0 && { bloqueada: MOTIVO_SIN_CARGAS }),
  };
}

// "Levantar [escudo]" (docs/motor.md, "Acciones sin dado") — para LOS CINCO
// escudos (cualquier armaMelee con `defensa`), no solo uno. Sin estado que
// rastrear ni gasto de recurso: coste de acción y duración son comunicación
// de mesa, como ya decidió el usuario (docs/tareas.md, "Escudos — falta la
// acción de levantarlos") — esto no revierte esa decisión, solo le da un
// sitio donde vivir en vez de quedarse solo en `descripcion`, y ahora deja
// rastro en Acciones recientes (usarDirecta(), AccionesTab.tsx). Levantar es
// siempre Acción Simple ("Empleo: Acción Simple para levantar el escudo",
// cabecera de Escudos en docs/fuente/equipamiento.md, y "Escudo: … emplear una
// acción simple"): antes se leía de la columna Acción, que es la del golpe con el
// escudo, y salía Estándar en Escudo, Metamaterial y Kerzul (2026-10-24). Con el
// escudo roto sale bloqueada (S86).
//
// Malla Plasmática (2026-09-28) se suma al mismo bucle, ver
// tiradaDetonacionPulsoTermico() arriba.
export function accionesDirectasDeAtaque(sheet: Sheet): AccionDirecta[] {
  const acciones: AccionDirecta[] = [];
  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia === "armaMelee" && cat.defensa) {
      acciones.push({
        id: `levantar_escudo_${pieza.instanciaId}`,
        label: `Levantar ${nombreArmaModificada(cat, pieza.modificaciones ?? [])}`,
        grupo: "Defensa",
        familiaArma: "levantar_escudo",
        empleoArma: cat.empleo,
        nota:
          `Acción simple. Cobertura Nivel ${cat.defensa.cobertura} hasta tu próximo turno ` +
          `— no cuenta si te atacan por la espalda. Marca "Tengo cobertura" al esquivar; si el ataque ` +
          `supera tu defensa pero falla por la cobertura, en Bloquear daño elige "Al escudo". ` +
          NOTA_ESCUDO_SUBSISTEMAS,
        confirmarLabel: "Levantar",
        ...(escudoRoto(sheet, pieza.instanciaId) && { bloqueada: MOTIVO_ESCUDO_ROTO }),
      });
    } else if (cat?.familia === "subsistema" && pieza.catalogoId === "malla_plasmatica") {
      const detonacion = tiradaDetonacionPulsoTermico(pieza);
      if (detonacion) acciones.push(detonacion);
    } else if (cat?.familia === "subsistema" && pieza.catalogoId === "camuflaje_trifasico") {
      acciones.push(accionActivarCamuflaje(sheet, pieza, cat));
    }
  }
  return acciones;
}
