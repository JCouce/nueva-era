// Convierte el equipo de la ficha en tiradas concretas — "Disparar con Fusil
// Plaga (Compleja)" en vez del genérico "Ataque a distancia" de antes. Es la
// pieza que faltaba para que el equipo alimente de verdad la chuleta de
// tiradas (ver docs/traspaso.md §6, punto 4).
//
import type { Sheet } from "./sheet";
import {
  equipoPorId,
  type ArmaFuego,
  type TipoArma,
} from "../catalog/equipo";
import type { ArmaMelee } from "../catalog/armasMelee";
import type { ArmaPesada } from "../catalog/armamentoPesado";
import { MUNICION_GRANADA, ALCANCE_ARROJADA, type MunicionGranada } from "../catalog/municion";
import type { CondicionTirada, TramoDistancia, BonoPorTramo } from "./condiciones";
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

function tiradaDeArmaFuego(sheet: Sheet, arma: ArmaFuego, instanciaId: string): Tirada {
  const modosConId = arma.modos.map((m, i) => ({ ...m, id: `${i}` }));
  const condiciones = [condicionTramo(arma), condicionModo(modosConId)].filter(
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
function tiradaDeArmamentoPesado(arma: ArmaPesada, instanciaId: string): Tirada {
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
function tiradaDeGranada(granada: MunicionGranada, instanciaId: string): Tirada {
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

function tiradaDeArmaMelee(arma: ArmaMelee, instanciaId: string): Tirada {
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

// Todas las filas de la categoría "Ataques": una por arma de fuego, arma
// melee, arma pesada o granada equipada — incluida Pelea (Puñetazo, Patada,
// Codazo o Rodillazo), que ya no se añade sola: si el jugador la quiere en
// Tiradas, la equipa desde la Tienda como cualquier otra arma (aparece con
// "no se compra" en vez de precio, pero es el mismo flujo).
export function tiradasDeAtaque(sheet: Sheet): Tirada[] {
  const tiradas: Tirada[] = [];

  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia !== "arma") continue;
    tiradas.push(tiradaDeArmaFuego(sheet, cat, pieza.instanciaId));
    const lanzagranadas = tiradaDeLanzagranadas(sheet, cat, pieza.instanciaId);
    if (lanzagranadas) tiradas.push(lanzagranadas);
  }

  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia === "armaMelee") tiradas.push(tiradaDeArmaMelee(cat, pieza.instanciaId));
  }

  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia === "armaPesada") tiradas.push(tiradaDeArmamentoPesado(cat, pieza.instanciaId));
  }

  for (const pieza of sheet.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (cat?.familia === "granada") tiradas.push(tiradaDeGranada(cat, pieza.instanciaId));
  }

  return tiradas;
}
