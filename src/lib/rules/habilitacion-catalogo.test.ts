// Red de seguridad de la habilitación por pieza (S73, habilitacionEnFicha): para cada pieza del
// catálogo de equipo y aumentos que genere hojas, con esa pieza en `piezasInutilizadas`, TODAS las
// hojas que aparecen por llevarla salen bloqueadas con «Apagada por …». Las hojas se sacan por los
// mismos caminos que la pantalla (AccionesTab.tsx): ataques y herramientas con conExtrasDeFicha,
// sus acciones sin dado con conExtrasDirectaDeFicha, Volar (accionesMovimiento) y las de aumento
// (FichaResuelta.accionesAumentos, que resolverFicha pasa por aumentosHabilitados).
//
// "Aparecen por llevarla": las hojas que hay con la pieza y no sin ella. Una mejora o un
// subsistema se prueba instalado en cada anfitrión de abajo, porque sus hojas cuelgan del arma o
// la armadura (Lanzagranadas, Bayoneta, Camuflaje…).
import { test } from "node:test";
import assert from "node:assert/strict";
import { EQUIPO, type Equipo } from "../catalog/equipo";
import { MUNICION_GRANADA } from "../catalog/municion";
import { accionesDeAtaque, accionesDirectasDeAtaque } from "./combate";
import { accionesDeHerramientas, accionesDirectasDeHerramientas } from "./herramientas";
import { aumentosHabilitados, conExtrasDeFicha, conExtrasDirectaDeFicha, resolverFicha, VITALIDAD_DE_FICHA, type FichaResuelta } from "./fichaResuelta";
import type { Habilitacion } from "./habilitacion";
import { esArmaIncorporable, ID_BRAZO_BIONICO, type PiezaEquipada } from "./equipo";
import { defaultSheet, type Sheet } from "./sheet";

const MOTIVO = "Prueba";
const APAGADA: Habilitacion = { estado: "bloqueada", motivo: `Apagada por ${MOTIVO}.`, arbitraje: "duro" };

// Anfitriones: un arma de fuego, un arma melee y una armadura (las que admiten mejoras y subsistemas).
const ANFITRIONES: PiezaEquipada[] = [
  { instanciaId: "h_fuego", catalogoId: "fusil_asalto_impetus" },
  { instanciaId: "h_melee", catalogoId: "espada_cuchillo_combate" },
  { instanciaId: "h_armadura", catalogoId: "armadura_pesada" },
];

// Con una granada, para que el Lanzagranadas Integrado tenga qué disparar.
const base = (): Sheet => ({ ...defaultSheet(), fatigaActual: 10, vidaActual: 10, granadas: { [MUNICION_GRANADA[0].id]: 1 } });

// El nivel más alto, para que salgan todas las hojas que da la pieza (S9: el nivel N conserva
// lo de los anteriores).
function nivelMaximo(cat: Equipo): number | undefined {
  const niveles = (cat as { niveles?: { nivel: number }[] }).niveles;
  return niveles && niveles.length > 0 ? Math.max(...niveles.map((n) => n.nivel)) : undefined;
}

// La pieza suelta y una copia instalada en cada anfitrión.
function instancias(cat: Equipo): PiezaEquipada[] {
  const nivel = nivelMaximo(cat);
  const con = (instanciaId: string, instaladoEnId?: string): PiezaEquipada => ({
    instanciaId,
    catalogoId: cat.id,
    ...(nivel !== undefined && { nivel }),
    ...(instaladoEnId && { instaladoEnId }),
  });
  return [con("p"), ...ANFITRIONES.map((h) => con(`p_${h.instanciaId}`, h.instanciaId))];
}

type Hoja = { lista: string; id: string; habilitacion?: Habilitacion };

// Todas las hojas de pieza, como las monta la pantalla.
function hojas(f: FichaResuelta): Hoja[] {
  const s = f.ficha;
  const con = (lista: string, xs: { id: string; habilitacion?: Habilitacion }[]) => xs.map((x) => ({ lista, id: x.id, habilitacion: x.habilitacion }));
  return [
    ...con("ataque", accionesDeAtaque(s, f.modificadores, f.extrasDotes.permisos).map((t) => conExtrasDeFicha(f, t))),
    ...con("ataque sin dado", accionesDirectasDeAtaque(s).map((d) => conExtrasDirectaDeFicha(f, d))),
    ...con("herramienta", accionesDeHerramientas(s).map((t) => conExtrasDeFicha(f, t))),
    ...con("herramienta sin dado", accionesDirectasDeHerramientas(s).map((d) => conExtrasDirectaDeFicha(f, d))),
    ...con("movimiento", f.accionesMovimiento.map((t) => conExtrasDeFicha(f, t))),
    ...con("aumento", f.accionesAumentos.filas.map((x) => x.accion)),
    ...con("aumento (servidor)", f.accionesAumentos.directas),
  ];
}

const resolver = (s: Sheet) => resolverFicha(s, { estados: [], vitalidad: VITALIDAD_DE_FICHA, libre: true });

// La ficha con estas piezas apagadas a la fuerza, por los mismos caminos (conExtras… leen
// piezasInutilizadas; accionesAumentos, como la deja resolverFicha).
function conApagadas(f: FichaResuelta, ids: string[]): FichaResuelta {
  const apagada: FichaResuelta = { ...f, piezasInutilizadas: new Map(ids.map((id) => [id, MOTIVO])) };
  return { ...apagada, accionesAumentos: aumentosHabilitados(apagada) };
}

test("ninguna hoja de una pieza apagada se salta la regla", () => {
  const sinPieza = resolver({ ...base(), equipo: ANFITRIONES });
  const deAnfitriones = new Set(hojas(sinPieza).map((h) => `${h.lista}:${h.id}`));
  const fallos: string[] = [];
  let probadas = 0;
  for (const cat of EQUIPO) {
    const piezas = instancias(cat);
    const f = resolver({ ...base(), equipo: [...ANFITRIONES, ...piezas] });
    const nuevas = hojas(conApagadas(f, piezas.map((p) => p.instanciaId))).filter((h) => !deAnfitriones.has(`${h.lista}:${h.id}`));
    for (const h of nuevas) {
      probadas++;
      if (JSON.stringify(h.habilitacion) !== JSON.stringify(APAGADA)) fallos.push(`${cat.id} → ${h.lista}:${h.id} ${JSON.stringify(h.habilitacion)}`);
    }
  }
  assert.ok(probadas > 50, `solo ${probadas} hojas: la red no está mirando`);
  assert.deepEqual(fallos, []);
});

// El arma incorporada en un Brazo Biónico apagado (usuario 2026-11-14): cada arma incorporable del
// catálogo, metida en el brazo, con SOLO el brazo apagado. Las filas que se hacen con el brazo
// (`extremidad` encendido) salen bloqueadas «Apagada por … (Brazo Biónico).», sin la extremidad ni
// los textos de él; las demás del arma (lanzarla) siguen activas.
test("ninguna fila de un arma incorporada en un brazo apagado se salta la regla", () => {
  const APAGADA_BRAZO: Habilitacion = { estado: "bloqueada", motivo: `Apagada por ${MOTIVO} (Brazo Biónico).`, arbitraje: "duro" };
  const fallos: string[] = [];
  let probadas = 0;
  for (const cat of EQUIPO) {
    if (!esArmaIncorporable({ catalogoId: cat.id })) continue;
    const s: Sheet = {
      ...base(),
      equipo: [
        { instanciaId: "brazo", catalogoId: ID_BRAZO_BIONICO, nivel: 4, eleccion: "fuerte", armaIncorporada: "arma" },
        { instanciaId: "arma", catalogoId: cat.id },
      ],
    };
    const f = resolver(s);
    const encendido = accionesDeAtaque(s, f.modificadores, f.extrasDotes.permisos).map((t) => conExtrasDeFicha(f, t));
    const conBrazo = new Set(encendido.filter((t) => t.origen?.instanciaId === "arma" && t.extremidad).map((t) => t.id));
    const apagada = conApagadas(f, ["brazo"]);
    for (const t of accionesDeAtaque(s, apagada.modificadores, apagada.extrasDotes.permisos).map((x) => conExtrasDeFicha(apagada, x))) {
      if (t.origen?.instanciaId !== "arma") continue;
      if (conBrazo.has(t.id)) {
        probadas++;
        if (JSON.stringify(t.habilitacion) !== JSON.stringify(APAGADA_BRAZO)) fallos.push(`${cat.id} → ${t.id} ${JSON.stringify(t.habilitacion)}`);
        if (t.extremidad || t.textosDeFicha?.some((x) => x.origen?.instanciaId === "brazo")) fallos.push(`${cat.id} → ${t.id} sigue con lo del brazo`);
      } else if (t.habilitacion?.estado === "bloqueada" && t.habilitacion.motivo === APAGADA_BRAZO.motivo) fallos.push(`${cat.id} → ${t.id} no iba con el brazo`);
    }
  }
  assert.ok(probadas > 20, `solo ${probadas} filas: la red no está mirando`);
  assert.deepEqual(fallos, []);
});
