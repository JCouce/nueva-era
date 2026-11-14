// «Resistir daño» (antes «Bloquear daño»; T2 del barrido del cuestionario de cierre, usuario
// 2026-11-13): la puerta del daño. La app nunca recibe el daño de los enemigos: el máster lo
// dice de viva voz y el jugador lo mete aquí eligiendo el tipo. Lo que dependa de recibir daño
// se dispara desde aquí:
//   - el blindaje que lo para (desgloseBlindaje, blindaje.ts) y la categoría con la que entra
//     (categoriaDelGolpe);
//   - lo que suma o avisa al recibirlo, declarado en el catálogo (`EfectoAlRecibir`): la Tensión
//     ósea del Zimethroni (es-03/es-04), la Malla Plasmática que devuelve el golpe (eq-24) y la
//     Falla metabólica del Ílkrem (es-02), una salvación tras recibir;
//   - el blindaje que se pierde para siempre (eq-20): casilla «Este golpe rompe blindaje»;
//   - las notas de texto con destino en esta acción (Saber Caer y Caer Parado, do-02).
// Y aplicarlo: recibirGolpe resta lo que entra de la vida (la de la ficha o, con combate en
// curso, la de la foto del combatiente) y apunta el blindaje perdido en la armadura.
//
// El id interno sigue siendo "bloquear_danio" (MotorMetadata del catálogo, favorita guardada
// `fija:bloquear_danio` en las fichas): renombrarlo exigiría migrar las favoritas sin ganar nada.
import { ACCIONES, type Resultado } from "./acciones";
import { blindajeReactivoDeAumentos, ID_SELECTOR_CONTRA, type AmenazaId } from "./aumentosTiradas";
import {
  blindajeDeArmadura,
  cambiaEnCritico,
  casillaBlindajeBrazo,
  categoriaDelGolpe,
  desgloseBlindaje,
  romperBlindaje,
  type LineaBlindaje,
} from "./blindaje";
import { estadoInicial } from "./condiciones";
import { ajustarDanioVital, categoriaDanioDeTexto, ETIQUETA_DANIO, type CategoriaDanio, type DanioVida } from "./danio";
import { nivelesHasta, ultimoQueDefine } from "./equipo";
import type { EspecieResuelta } from "./especie";
import type { EstadoActivo } from "./estados";
import { conExtrasDeFicha, type FichaResuelta } from "./fichaResuelta";
import { montarTirada, SIN_ELECCION, tirarMontada } from "./montaje";
import type { Sheet } from "./sheet";
import { bloqueoDeReaccion, conShockEnLineas } from "./shock";
import { blindajeDelBrazo } from "./brazoBionico";
import { textosSinDado } from "./textosTirada";
import { ajustarDanioCategoria } from "./vitalidad";
import { equipoPorId } from "../catalog/equipo";
import type { TipoDanio } from "../catalog/tiposDanio";

export const ID_RESISTIR_DANIO = "bloquear_danio";

// ── El dato: lo que declara el catálogo ────────────────────────────────

// Lo que pasa al recibir un golpe, declarado en un rasgo de especie (`Rasgo.alRecibirDanio`) o en
// un nivel de módulo (`NivelModulo.alRecibirDanio`, el del nivel más alto que lo defina). Solo
// sale en Resistir daño si la ficha tiene lo que lo provoca. `tipos`: los tipos de daño con los
// que cuenta.
//   salvacion → tras recibir un golpe que entra (> 0) de esos tipos, un panel con la salvación a
//               tirar (Falla metabólica: Fortaleza, dificultad 9, contra aturdimiento). `contra`:
//               la opción del selector «Contra…» con la que se monta, si la ficha la tiene.
//   danioExtra → casilla que suma +1 por cada `cada` puntos que entran tras el blindaje (Tensión
//               ósea). Si el blindaje lo para todo, nada.
//   aviso     → casilla que, marcada, solo avisa (Malla Plasmática: devuelves el golpe). No
//               calcula nada sobre el atacante.
export type EfectoAlRecibir =
  | {
      tipo: "salvacion";
      id: string;
      etiqueta: string;
      tipos: readonly TipoDanio[];
      salvacion: "salv_fortaleza";
      dificultad: number;
      contra: AmenazaId;
      fracaso: string;
    }
  | { tipo: "danioExtra"; id: string; etiqueta: string; nota: string; tipos: readonly TipoDanio[]; cada: number }
  | { tipo: "aviso"; id: string; etiqueta: string; aviso: string };

export type EfectoAlRecibirConFuente = EfectoAlRecibir & { fuente: string };

// Los de la especie (rasgos de especie, casta y linaje) y los del equipo con niveles.
export function efectosAlRecibir(
  sheet: Pick<Sheet, "equipo">,
  especie: Pick<EspecieResuelta, "rasgos"> | null,
): EfectoAlRecibirConFuente[] {
  const deEspecie = (especie?.rasgos ?? []).flatMap((r) => (r.alRecibirDanio ?? []).map((e) => ({ ...e, fuente: r.label })));
  const deEquipo = sheet.equipo.flatMap((pieza) => {
    const cat = equipoPorId(pieza.catalogoId);
    if (!cat || pieza.nivel === undefined || !("niveles" in cat)) return [];
    const niveles = nivelesHasta(cat.niveles as { nivel: number; alRecibirDanio?: EfectoAlRecibir[] }[], pieza.nivel);
    const define = ultimoQueDefine(niveles, "alRecibirDanio");
    return (define?.alRecibirDanio ?? []).map((e) => ({ ...e, fuente: `${cat.label} ${pieza.nivel}` }));
  });
  return [...deEspecie, ...deEquipo];
}

// ── El selector de tipo (usuario, 2026-11-13) ───────────────────────────

// Lo elegido en el selector de tipo de daño: siempre hay un tipo.
export type TipoElegido = { tipo: TipoDanio; critico: boolean };

// Pulsar otro tipo lo elige en normal; volver a pulsar el elegido alterna normal ↔ crítico, solo
// en los tipos que cambian de categoría en crítico (Eléctrico, Frío, Sónico). En los demás no
// cambia nada.
export function pulsarTipoDanio(actual: TipoElegido, pulsado: TipoDanio): TipoElegido {
  if (actual.tipo !== pulsado) return { tipo: pulsado, critico: false };
  return cambiaEnCritico(pulsado) ? { tipo: pulsado, critico: !actual.critico } : actual;
}

// ── Resolver el golpe (lo que pinta el modal) ───────────────────────────

// Lo que elige el jugador en el modal. `marcadas`: ids de las casillas de `EfectoAlRecibir`
// marcadas. `categoria`: la que elige para un daño sin categoría propia (Cinético: la pone el
// arma); se ignora si el tipo trae la suya.
export type EntradaResistir = {
  tipo: TipoDanio;
  // El golpe fue crítico: solo cuenta en los tipos que cambian de categoría (cambiaEnCritico).
  critico: boolean;
  danio: number;
  reactivo: boolean;
  conBrazo: boolean;
  marcadas: readonly string[];
  rompeBlindaje: number;
  categoria: CategoriaDanio | null;
};

export type CasillaResistir = { id: string; etiqueta: string; nota: string; fuente: string; bloqueada: string | null };

export type SalvacionAlRecibir = Extract<EfectoAlRecibirConFuente, { tipo: "salvacion" }>;

export type GolpeRecibido = { categoria: CategoriaDanio; cantidad: number; rompeBlindaje: number };

export type GolpeResuelto = {
  desglose: LineaBlindaje[];
  blindaje: number;
  // Lo que pasa del blindaje, lo que suman las casillas (con su fuente) y el total que entra.
  pasa: number;
  extras: { etiqueta: string; valor: number }[];
  entra: number;
  categoria: CategoriaDanio;
  // De dónde sale la categoría si no es la del tipo (Ignífuga 2), o null.
  fuenteCategoria: string | null;
  // El tipo no trae categoría (Cinético): la elige el jugador.
  eligeCategoria: boolean;
  casillas: CasillaResistir[];
  // Notas de texto (Saber Caer, Caer Parado) y avisos de las casillas marcadas (Malla).
  notas: string[];
  avisos: string[];
  // Las salvaciones que dispara este golpe al recibirlo (Falla metabólica).
  salvaciones: SalvacionAlRecibir[];
  // La casilla «Este golpe rompe blindaje»: hasta cuánto (1 o 2, sin pasar del que le queda a la
  // armadura) y lo elegido ya recortado, o null sin armadura o con su blindaje ya a 0.
  rompeBlindaje: { max: number; elegido: number; armadura: string } | null;
  // Lo que se aplica al pulsar «Recibir»; null si no hay nada (no entra daño ni se rompe blindaje).
  golpe: GolpeRecibido | null;
};

type FichaParaResistir = Pick<FichaResuelta, "ficha" | "especie" | "blindaje" | "textosTirada"> &
  Partial<Pick<FichaResuelta, "fichaSinApagadas" | "piezasInutilizadas" | "piezasPenalizadas">>;

const MOTIVO_FUERA_DE_TIPO = "No cuenta con este tipo de daño.";

export function resolverGolpe(ficha: FichaParaResistir, e: EntradaResistir): GolpeResuelto {
  // Sin las piezas apagadas por el Shock (S73): una Malla apagada no devuelve nada, y sin el brazo
  // no hay casilla de bloquear con él. El blindaje perdido de la armadura vive en la ficha y va igual.
  const sheet = ficha.fichaSinApagadas ?? ficha.ficha;
  // Las dos casillas son reacciones con una pieza: con ella en fracaso del Shock no cuentan
  // aunque vinieran marcadas (bloqueoDeReaccion).
  const reactivo = blindajeReactivoDeAumentos(sheet);
  const conReactivo = e.reactivo && Boolean(reactivo) && !bloqueoDeReaccion(ficha.piezasPenalizadas, reactivo?.origen);
  const conBrazo =
    e.conBrazo && Boolean(casillaBlindajeBrazo(sheet, e.tipo)) && !bloqueoDeReaccion(ficha.piezasPenalizadas, blindajeDelBrazo(sheet)?.origen);
  // El desglose, con la ficha entera y lo que aporta de verdad cada pieza tocada (pl-02): un
  // Escudo Deflector apagado sale «Escudo Deflector (shock)» a 0; penalizado, con su −N.
  const desglose = conShockEnLineas(
    desgloseBlindaje(ficha.ficha, e.tipo, ficha.blindaje.armaduraNatural, conReactivo, conBrazo, ficha.blindaje.contencion),
    { inutilizadas: ficha.piezasInutilizadas, penalizadas: ficha.piezasPenalizadas },
  );
  const blindaje = desglose.reduce((t, l) => t + l.valor, 0);
  const danio = Math.max(0, Math.round(e.danio));
  const pasa = Math.max(0, danio - blindaje);

  const efectos = efectosAlRecibir(sheet, ficha.especie);
  const marcada = (ef: EfectoAlRecibirConFuente) => e.marcadas.includes(ef.id) && (ef.tipo !== "danioExtra" || ef.tipos.includes(e.tipo));
  const casillas: CasillaResistir[] = efectos.flatMap((ef) =>
    ef.tipo === "salvacion"
      ? []
      : [
          {
            id: ef.id,
            etiqueta: ef.etiqueta,
            nota: ef.tipo === "danioExtra" ? ef.nota : ef.aviso,
            fuente: ef.fuente,
            bloqueada: ef.tipo === "danioExtra" && !ef.tipos.includes(e.tipo) ? MOTIVO_FUERA_DE_TIPO : null,
          },
        ],
  );
  const extras = efectos.flatMap((ef) =>
    ef.tipo === "danioExtra" && marcada(ef) && Math.floor(pasa / ef.cada) > 0
      ? [{ etiqueta: `${ef.etiqueta} · ${ef.fuente}`, valor: Math.floor(pasa / ef.cada) }]
      : [],
  );
  const entra = pasa + extras.reduce((t, x) => t + x.valor, 0);

  const delGolpe = categoriaDelGolpe(sheet, e.tipo, e.critico);
  const propia = categoriaDanioDeTexto(delGolpe.categoria);
  const categoria = propia ?? e.categoria ?? "letal";

  const armadura = blindajeDeArmadura(sheet);
  const max = armadura ? Math.min(2, armadura.actual) : 0;
  const rompeBlindaje = Math.max(0, Math.min(max, Math.round(e.rompeBlindaje)));
  const rompe = armadura && max > 0 ? { max, elegido: rompeBlindaje, armadura: armadura.etiqueta } : null;

  const notas = textosSinDado(ficha.textosTirada.filter((t) => t.en.tipo === "tiradaId" && t.en.id === ID_RESISTIR_DANIO));
  const avisos = efectos.flatMap((ef) => (ef.tipo === "aviso" && marcada(ef) ? [`${ef.aviso} (${ef.fuente})`] : []));
  const salvaciones = efectos.filter((ef): ef is SalvacionAlRecibir => ef.tipo === "salvacion" && entra > 0 && ef.tipos.includes(e.tipo));

  return {
    desglose,
    blindaje,
    pasa,
    extras,
    entra,
    categoria,
    fuenteCategoria: delGolpe.fuente,
    eligeCategoria: propia === null,
    casillas,
    notas,
    avisos,
    salvaciones,
    rompeBlindaje: rompe,
    golpe: entra > 0 || rompeBlindaje > 0 ? { categoria, cantidad: entra, rompeBlindaje } : null,
  };
}

// «Recibir 5 de daño letal» (y «, rompe 1 de blindaje»).
export function textoDelGolpe(g: GolpeRecibido): string {
  const vida = g.cantidad > 0 ? `Recibir ${g.cantidad} de daño ${ETIQUETA_DANIO[g.categoria].toLowerCase()}` : "Recibir el golpe";
  return g.rompeBlindaje > 0 ? `${vida} · rompe ${g.rompeBlindaje} de blindaje` : vida;
}

// ── Aplicar el golpe ─────────────────────────────────────────────────

// La vida de la foto de un combate en curso (Combatiente: pgActual, pgMax, desglose).
export type VidaDeFoto = { pgActual: number; pgMax: number; danio: DanioVida };

// Lo que se aplicó de verdad (lo que se devuelve al deshacer): la vida que bajó (sin pasar de 0)
// y el blindaje que se perdió (sin pasar del que quedaba).
export type GolpeAplicado = { categoria: CategoriaDanio; vida: number; blindaje: number };

// Aplica `golpe`: el daño, a la vida de la foto si hay combate en curso (la que vale en combate,
// y vuelve a la ficha al terminarlo, td-13) o a la de la ficha; el blindaje perdido, a la
// armadura de la ficha (es del objeto, dura más que el combate). Con `deshacer`, al revés: cura
// esa categoría y devuelve el blindaje (`golpe` es entonces lo aplicado). La cuenta de la vida es
// la de siempre (ajustarDanioCategoria / ajustarDanioVital, danio.ts).
export function recibirGolpe(
  sheet: Sheet,
  golpe: GolpeRecibido,
  estados: readonly EstadoActivo[],
  foto: VidaDeFoto | null,
  deshacer = false,
): { sheet: Sheet; foto: { pgActual: number; danio: DanioVida } | null; aplicado: GolpeAplicado } {
  const signo = deshacer ? -1 : 1;
  const cantidad = Math.max(0, Math.round(golpe.cantidad));
  const conBlindaje = romperBlindaje(sheet, signo * Math.max(0, Math.round(golpe.rompeBlindaje)));
  const perdidoAntes = blindajeDeArmadura(sheet)?.perdido ?? 0;
  const perdidoDespues = blindajeDeArmadura(conBlindaje)?.perdido ?? 0;
  const blindaje = Math.abs(perdidoDespues - perdidoAntes);
  if (foto) {
    const r = ajustarDanioVital({ actual: foto.pgActual, tope: foto.pgMax, danio: foto.danio }, golpe.categoria, signo * cantidad);
    return {
      sheet: conBlindaje,
      foto: cantidad > 0 ? { pgActual: r.actual, danio: r.danio } : null,
      aplicado: { categoria: golpe.categoria, vida: Math.abs(foto.pgActual - r.actual), blindaje },
    };
  }
  const tras = ajustarDanioCategoria(conBlindaje, golpe.categoria, signo * cantidad, estados);
  return {
    sheet: tras,
    foto: null,
    aplicado: { categoria: golpe.categoria, vida: Math.abs(conBlindaje.vidaActual - tras.vidaActual), blindaje },
  };
}

// ── La salvación tras recibir (Falla metabólica) ─────────────────────────

type FichaParaSalvacion = Pick<
  FichaResuelta,
  "ficha" | "modificadores" | "indiceCondiciones" | "textosTirada" | "extrasDotes" | "ventajasFijas" | "fallosCriticos"
>;

// Se tira la salvación de la ficha (con sus casillas y su selector «Contra…») contra la
// dificultad del efecto; si el selector tiene la amenaza (`contra`), con ella elegida, para que
// cuenten los bonos contra ella (aumentos, equipo). Sin cobrar fatiga: la opción de pago no se
// elige sola.
export function tirarSalvacionAlRecibir(ficha: FichaParaSalvacion, s: SalvacionAlRecibir, dado: number): Resultado {
  const base = ACCIONES.find((a) => a.id === s.salvacion)!;
  const tirada = conExtrasDeFicha(ficha, base);
  const selector = (tirada.condiciones ?? []).find((c) => c.id === `${ID_SELECTOR_CONTRA}_${s.salvacion}`);
  const elige = selector?.tipo === "opcion" && selector.opciones.some((o) => o.id === s.contra);
  const estado = estadoInicial(tirada.condiciones ?? []);
  const eleccion = { ...SIN_ELECCION, estadoCondiciones: elige ? { ...estado, [selector.id]: s.contra } : estado };
  return tirarMontada(montarTirada(ficha, tirada, eleccion), dado, s.dificultad);
}
