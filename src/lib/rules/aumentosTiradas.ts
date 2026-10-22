// Lo que ponen los aumentos en las tiradas y en el blindaje (tanda A2a de
// docs/propuesta-aumentos.md, docs/sistema.md §11.3):
//   - casillas con alcance (Alerta activa: Ojo Biónico, Vestíbulo-Auditiva, Introgresión),
//     al mismo índice que las de equipo, especie y dotes (resolverFicha);
//   - el selector "Contra…" de las salvaciones de Fortaleza y Voluntad (decisión del
//     usuario): una opción por amenaza que cubre algún aumento, que suma todo lo que le
//     aplica, con la ventaja y su coste;
//   - textos en tiradas (Matriz de Red en la salvación de Voluntad) y notas de la Alerta
//     pasiva (Detección Química);
//   - la armadura natural contra Cinético (Osteotendinosa y Matriz Ósea, R6).
// Tanda A2b:
//   - casillas por aplicado (alcance "aplicado": Prefrontal, Sincronización, Mielinización) y
//     de cualquier tirada (Conectividad Callosa), con ventaja y su fatiga, o con ahorro de
//     fatiga (Mielinización); la de Prefrontal no sale con Callosa activa (`casillasOcultasCon`);
//   - ventaja fija sin casilla (Red Frontoparietal en Iniciativa: `ventajasFijas`), que pone
//     conExtrasDeFicha en `Accion.ventaja`;
//   - textos por grupo o por aplicado (Asa, Consciencia, Automatismo, Red Frontoparietal).
// Respeta operacionesActivas (una operación con requisito roto no da nada) y el nivel del
// implante (los niveles se acumulan; el que repite clave sustituye al anterior).
import type { DestinoTexto } from "../catalog/especies";
import type { Implante, OperacionGenetica, OpcionAumento } from "../catalog/aumentos";
import { aumentoPorId, operacionesActivas } from "./aumentos";
import type { TipoDanio } from "./blindaje";
import type { AlcanceModificador } from "./modificadores";
import type { CondicionTirada, OpcionCondicion } from "./condiciones";
import { acumulaPorClave, nivelesHasta } from "./equipo";
import type { TextoEnTirada } from "./especie";
import type { Sheet } from "./sheet";

// ── Amenazas de las salvaciones ─────────────────────────────────────────

export type SalvacionConSelector = "salv_fortaleza" | "salv_voluntad";

// Contra qué se salva (§11.3, segunda y tercera ronda: ceguera, asfixia, toxinas, venenos,
// enfermedad y aturdimiento con Fortaleza; confusión con Voluntad). `incluye`: una amenaza
// que es a la vez otra, y suma también lo de esa (la ceguera por detonación es ceguera).
export const AMENAZAS = [
  { id: "ceguera", label: "Ceguera", salvacion: "salv_fortaleza" },
  { id: "ceguera_detonacion", label: "Ceguera por detonación", salvacion: "salv_fortaleza", incluye: ["ceguera"] },
  { id: "sordera", label: "Sordera", salvacion: "salv_fortaleza" },
  { id: "aturdimiento", label: "Aturdimiento", salvacion: "salv_fortaleza" },
  // El shock va con Fortaleza: la nota de la propia salvación lo lista (acciones.ts).
  { id: "shock", label: "Shock", salvacion: "salv_fortaleza" },
  { id: "asfixia", label: "Asfixia", salvacion: "salv_fortaleza" },
  { id: "toxinas", label: "Toxinas", salvacion: "salv_fortaleza" },
  { id: "venenos", label: "Venenos", salvacion: "salv_fortaleza" },
  { id: "enfermedad", label: "Enfermedad", salvacion: "salv_fortaleza" },
  { id: "radiacion", label: "Radiación", salvacion: "salv_fortaleza" },
  // Solo frío y calor del ambiente, no el fuego de las armas (Resiliencia, tercera ronda).
  { id: "termicos", label: "Frío o calor extremos", salvacion: "salv_fortaleza" },
  { id: "confusion", label: "Confusión", salvacion: "salv_voluntad" },
  { id: "miedo", label: "Miedo", salvacion: "salv_voluntad" },
  { id: "coercion", label: "Coerción", salvacion: "salv_voluntad" },
  { id: "intimidacion", label: "Intimidación", salvacion: "salv_voluntad" },
  { id: "manipulacion_mental", label: "Manipulación mental", salvacion: "salv_voluntad" },
  // Las tres de Matriz de Red cuentan también como manipulación mental, para que
  // Regulación (+1) y Matriz (+2) se sumen (+3) (§11.3; usuario, 2026-10-22).
  { id: "dominacion_mental", label: "Dominación mental", salvacion: "salv_voluntad", incluye: ["manipulacion_mental"] },
  { id: "sugestion_coercitiva", label: "Sugestión coercitiva", salvacion: "salv_voluntad", incluye: ["manipulacion_mental"] },
  { id: "alteracion_voluntad", label: "Alteración de la voluntad", salvacion: "salv_voluntad", incluye: ["manipulacion_mental"] },
] as const satisfies readonly { id: string; label: string; salvacion: SalvacionConSelector; incluye?: readonly string[] }[];

export type AmenazaId = (typeof AMENAZAS)[number]["id"];

// Un efecto de aumento contra unas amenazas: un bono, una ventaja (gratis o pagando 1 de
// fatiga) o las dos cosas. La ventaja no se acumula, y si alguna fuente la da gratis para
// esa amenaza, no se cobra la de pago.
export type EfectoSalvacion = { contra: AmenazaId[]; bono?: number; ventaja?: "gratis" | "fatiga" };

// Lo que puede traer una operación, una opción de Introgresión o un nivel de implante para
// las tiradas. Las casillas llevan `alcance` (si no, no llegan a ninguna tirada).
export type EfectosTiradaAumento = {
  salvaciones?: EfectoSalvacion[];
  casillas?: CondicionTirada[];
  textos?: { en: DestinoTexto; texto: string }[];
  // Nota junto a la Alerta pasiva, sin sumar (Detección Química: +2 a 4 m o menos).
  notaAlertaPasiva?: string;
  armaduraNatural?: ArmaduraNaturalAumento;
  // Ventaja sin casilla en las tiradas de ese alcance (Red Frontoparietal: Iniciativa).
  ventajasFijas?: { alcance: AlcanceModificador }[];
  // Las casillas de esta pieza no salen si esta otra operación funciona (Prefrontal con
  // Conectividad Callosa, que es su progresión: usuario, 2026-10-22).
  casillasOcultasCon?: string;
};

// +1 de blindaje contra unos tipos (R6: Cinético), con a qué golpes vale.
export type ArmaduraNaturalAumento = { valor: number; tipos: TipoDanio[]; nota: string };

// ── Lo que aporta cada aumento que funciona ─────────────────────────────

type Aporte = { fuente: string; efectos: EfectosTiradaAumento };

function deOperacion(op: OperacionGenetica, eleccion: string | undefined, activas: ReadonlySet<string>): Aporte[] {
  const oculta = op.casillasOcultasCon !== undefined && activas.has(op.casillasOcultasCon);
  const aportes: Aporte[] = [{ fuente: op.label, efectos: oculta ? { ...op, casillas: [] } : op }];
  const opcion: OpcionAumento | undefined = op.eleccion?.opciones.find((o) => o.id === eleccion);
  if (opcion) aportes.push({ fuente: `${op.label} (${opcion.label})`, efectos: opcion });
  return aportes;
}

// Niveles acumulados: casillas por id y salvaciones por amenazas, el nivel alto sustituye.
function deImplante(imp: Implante, nivel: number): Aporte {
  const niveles = nivelesHasta(imp.niveles, nivel);
  return {
    fuente: `${imp.label} ${nivel}`,
    efectos: {
      casillas: acumulaPorClave(niveles.map((n) => n.condiciones ?? []), (c) => c.id),
      salvaciones: acumulaPorClave(niveles.map((n) => n.salvaciones ?? []), (e) => e.contra.join("+")),
    },
  };
}

function aportesDeAumentos(sheet: Pick<Sheet, "equipo">): Aporte[] {
  const activas = operacionesActivas(sheet);
  return sheet.equipo.flatMap((pieza): Aporte[] => {
    const cat = aumentoPorId(pieza.catalogoId);
    if (!cat) return [];
    if (cat.familia === "operacionGenetica") return activas.has(cat.id) ? deOperacion(cat, pieza.eleccion, activas) : [];
    return pieza.nivel === undefined ? [] : [deImplante(cat, pieza.nivel)];
  });
}

// ── Selector "Contra…" ───────────────────────────────────────────────

export const ID_SELECTOR_CONTRA = "aum_contra";
const NADA_EN_ESPECIAL = "nada";

type EfectoConFuente = EfectoSalvacion & { fuente: string };

const amenazasQueCuenta = (a: (typeof AMENAZAS)[number]): readonly string[] => [a.id, ...("incluye" in a ? a.incluye : [])];

// Las opciones de una amenaza con lo que le aplica. Con una ventaja de pago y ninguna
// gratis, dos opciones: sin pagar (solo los bonos, si hay alguno) y pagando, porque el
// texto lo deja a elección ("permite emplear un punto de fatiga").
function opcionesDeAmenaza(a: (typeof AMENAZAS)[number], efectos: EfectoConFuente[]): OpcionCondicion[] {
  const cuenta = amenazasQueCuenta(a);
  const aplican = efectos.filter((e) => e.contra.some((c) => cuenta.includes(c)));
  const partes = aplican.filter((e) => e.bono).map((e) => ({ fuente: e.fuente, valor: e.bono! }));
  const valor = partes.reduce((t, p) => t + p.valor, 0);
  const gratis = aplican.filter((e) => e.ventaja === "gratis").map((e) => e.fuente);
  const pago = aplican.filter((e) => e.ventaja === "fatiga").map((e) => e.fuente);
  const lineas = [
    ...partes.map((p) => `${p.fuente} +${p.valor}`),
    ...gratis.map((f) => `${f}: ventaja`),
    ...pago.map((f) => (gratis.length ? `${f}: ventaja (no se paga, ya la da ${gratis.join(" y ")})` : `${f}: ventaja pagando 1 de fatiga`)),
  ];
  const base: OpcionCondicion = { id: a.id, etiqueta: a.label, valor, partes, nota: lineas.join(" · ") };
  if (gratis.length) return [{ ...base, ventaja: true, fuenteVentaja: gratis.join(" y ") }];
  if (!pago.length) return [base];
  const pagando: OpcionCondicion = {
    ...base,
    id: `${a.id}_fatiga`,
    etiqueta: `${a.label}, pagando fatiga`,
    ventaja: true,
    fuenteVentaja: pago.join(" y "),
    costeFatiga: 1,
  };
  return valor > 0 ? [{ ...base, nota: partes.map((p) => `${p.fuente} +${p.valor}`).join(" · ") }, pagando] : [pagando];
}

// Una condición "Contra…" por salvación que tenga alguna amenaza cubierta: "Nada en
// especial" por defecto y una opción por amenaza (en el orden de AMENAZAS).
function selectoresContra(aportes: Aporte[]): CondicionTirada[] {
  const efectos: EfectoConFuente[] = aportes.flatMap((a) => (a.efectos.salvaciones ?? []).map((e) => ({ ...e, fuente: a.fuente })));
  if (efectos.length === 0) return [];
  const salvaciones: SalvacionConSelector[] = ["salv_fortaleza", "salv_voluntad"];
  return salvaciones.flatMap((salvacion): CondicionTirada[] => {
    const directas = new Set(efectos.flatMap((e) => e.contra));
    const opciones = AMENAZAS.filter((a) => a.salvacion === salvacion && directas.has(a.id)).flatMap((a) =>
      opcionesDeAmenaza(a, efectos),
    );
    if (opciones.length === 0) return [];
    return [
      {
        id: `${ID_SELECTOR_CONTRA}_${salvacion}`,
        tipo: "opcion",
        etiqueta: "Contra…",
        alcance: { tipo: "tiradaId", id: salvacion },
        opciones: [{ id: NADA_EN_ESPECIAL, etiqueta: "Nada en especial", valor: 0 }, ...opciones],
        porDefecto: NADA_EN_ESPECIAL,
      },
    ];
  });
}

// ── Lo que lee resolverFicha ───────────────────────────────────────────

// Casillas con alcance de los aumentos que funcionan (las de cada pieza, con la fuente en
// la etiqueta) y los selectores "Contra…". Van al índice de condiciones con las de equipo,
// especie y dotes: conExtrasDeFicha las pega a su tirada y montarTirada las suma.
export function casillasDeAumentos(sheet: Pick<Sheet, "equipo">): CondicionTirada[] {
  const aportes = aportesDeAumentos(sheet);
  const casillas = aportes.flatMap((a) =>
    (a.efectos.casillas ?? []).map((c): CondicionTirada => ({ ...c, etiqueta: `${c.etiqueta} · ${a.fuente}` })),
  );
  return [...casillas, ...selectoresContra(aportes)];
}

export function textosDeAumentos(sheet: Pick<Sheet, "equipo">): TextoEnTirada[] {
  return aportesDeAumentos(sheet).flatMap((a) =>
    (a.efectos.textos ?? []).map((t) => ({ en: t.en, texto: t.texto, fuente: a.fuente, soloEnCritico: false })),
  );
}

// Ventajas sin casilla de los aumentos que funcionan, con su alcance y su fuente
// (conExtrasDeFicha las pone en `Accion.ventaja` si la tirada no trae otra).
export type VentajaFija = { alcance: AlcanceModificador; fuente: string };

export function ventajasFijasDeAumentos(sheet: Pick<Sheet, "equipo">): VentajaFija[] {
  return aportesDeAumentos(sheet).flatMap((a) => (a.efectos.ventajasFijas ?? []).map((v) => ({ alcance: v.alcance, fuente: a.fuente })));
}

// Notas de la Alerta pasiva que no suman (Detección Química), con su fuente.
export function notasAlertaPasivaDeAumentos(sheet: Pick<Sheet, "equipo">): string[] {
  return aportesDeAumentos(sheet).flatMap((a) => (a.efectos.notaAlertaPasiva ? [`${a.efectos.notaAlertaPasiva} · ${a.fuente}`] : []));
}

// Armadura natural de los aumentos contra `tipo`, una línea por pieza (R6: con las dos, +2).
export function armaduraNaturalDeAumentos(
  sheet: Pick<Sheet, "equipo">,
  tipo: TipoDanio,
): { fuente: string; valor: number; nota: string }[] {
  return aportesDeAumentos(sheet).flatMap((a) => {
    const an = a.efectos.armaduraNatural;
    return an && an.tipos.includes(tipo) ? [{ fuente: a.fuente, valor: an.valor, nota: an.nota }] : [];
  });
}
