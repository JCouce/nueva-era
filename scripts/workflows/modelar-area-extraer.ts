// Prepara el `args` del Workflow modelar-area (.claude/workflows/modelar-area.js,
// que trae su propio comentario con el cómo-se-usa). Solo lectura, no muta nada.
//
// Dos modos:
//   <area>.md        trocea la transcripción literal de un área (docs/psionica.md)
//                    en lotes (uno por `###`) de items (uno por acción).
//   --calibracion    vuelca unas piezas de equipo ya auditadas con su MotorMetadata
//                    real como `referencia`, para medir si el workflow lo reproduce.
//
// Uso:
//   node --import ./scripts/test-resolver.mjs scripts/workflows/modelar-area-extraer.ts \
//     docs/psionica.md salida.json
//   node --import ./scripts/test-resolver.mjs scripts/workflows/modelar-area-extraer.ts \
//     --calibracion salida.json
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { ACCIONES } from "../../src/lib/rules/acciones";
import { MECANISMOS_MOTOR, TIPOS_MODIFICADOR, type MecanismoMotor, type TipoModificador } from "../../src/lib/rules/motor";
import { equipoPorId, type Equipo } from "../../src/lib/catalog/equipo";

// motor.ts solo documenta cada valor en comentarios; aquí va la versión que leen
// los agentes. Record<> exhaustivo: si se añade un tipo/mecanismo a motor.ts sin
// describirlo aquí, tsc falla en vez de mandar a los agentes una lista incompleta.
const DESCRIPCION_TIPO: Record<TipoModificador, string> = {
  accion: "1 · Modificador de acción: añade una o varias acciones nuevas a la capa 2",
  numerico: "2 · Modificador numérico: condición ? +N : +0 sobre una acción que ya existe",
  texto: "3 · Modificador de texto: condición ? nota informativa : nada, sin sumar número",
  narrativo: "4 · Modificador narrativo: no modifica nada, solo queda apuntado",
  habilitador: "5 · Habilitador/deshabilitador: habilita o deshabilita una acción entera (exige arbitraje duro/blando/pendiente)",
};

const DESCRIPCION_MECANISMO: Record<MecanismoMotor, string> = {
  eleccion_jugador: "CondicionTirada (toggle/opción/contador) que el jugador elige al tirar; valorActivo es un número fijo del catálogo",
  siempre_activo: "Modificador tipo 'tirada' con alcance (tiradaId/grupo/habilidad/modo), activo solo por llevar la pieza",
  ajuste_fijo: "ajustesFijos: número que se suma solo a una acción, sin elección",
  bono_tramo: "bonosTramo: número que depende de otra elección ya hecha (tramo de distancia...)",
  accion_sin_equipo: "genera su propia acción SIN ser equipo (poderes, dotes) — NO CONSTRUIDO, es el hueco natural de un poder",
  gate_instalacion: "bloquea/atenúa/avisa sobre una acción entera (tipo 5)",
  accion_equipo: "genera su propia acción SIENDO equipo, vía generador por familia (combate.ts, herramientas.ts) — no aplica a poderes",
  nota_fija: "texto siempre presente volcado a Accion.nota, sin CondicionTirada",
  sustitucion_aplicado: "el jugador elige al tirar QUÉ aplicado alimenta una acción existente (Sutil); un solo caso real",
  suma_derivado: "un valor se suma a un derivado propio (blindajeContra()) que lee una acción fija",
};

const FAMILIAS_GENERADAS = [
  "ataque_fuego_<instancia> · ataque_melee_<instancia> · bloquear_melee_<instancia> · lanzar_melee_<instancia> · ataque_pesado_<instancia> · lanzar_granada_<id> (combate.ts, desde el equipo)",
  "herramienta_<instancia> · radar_marcar_<instancia> (herramientas.ts) · levantar_escudo_<instancia> (combate.ts, AccionDirecta sin dado)",
  "volar_<instancia> (movimiento.ts) · farmaco_<id> (farmacos.ts, AccionDirecta 'Usar')",
];

const OTRAS_PIEZAS_MOTOR = [
  "Fatiga: recurso persistente de personaje (sheet.fatigaActual, ajustarFatiga en vitalidad.ts), hoy se ajusta a mano en Recursos. Máx = 8 + Voluntad. Umbrales fatigado <25% (-1 a todo) y exhausto <10% (-2, media velocidad) en estados.ts",
  "Estados (confusión, miedo, aturdido, inconsciencia...): EstadoActivo con duración en la consola de combate del máster (estados.ts: modificadoresDeEstados, descontarDuracion)",
  "Recursos de instancia (munición, batería) en recursos.ts; Sheet.recursos",
  "Resolución: 1d12 + aplicado + habilidad vs dificultad; crítico por 6; enfrentadas, empate al defensor (acciones.ts resolverTirada, sistema.md §6)",
  "Daño por éxitos (resolverDanio), blindaje por tipo (blindaje.ts)",
  "AccionDirecta: acción sin dado con botón 'Usar' (acciones.ts, UsarModal.tsx)",
  "Presupuesto de psiónica en creación: PUNTOS_PSIONICA_POR_LETRA y COSTE_FACTOR_PSIONICA = 3 (prioridad.ts); coste del nivel N = N×3",
];

// Modelo objetivo por área: la forma de la entrada de catálogo que el workflow
// tiene que rellenar para cada elemento. Es la especificación de lo que la
// tubería leerá después — si un efecto de la prosa no cabe aquí, el workflow
// propone un campo nuevo en vez de dejarlo como hueco suelto. Vive aquí (y no
// como tipo en src/) hasta que el usuario lo apruebe con el resultado delante.
const MODELO_PSIONICA = `// v2, 2026-09-29: forma aprobada por el usuario + campos decididos en los cuestionarios
// (docs/sistema.md §10.6). Principio: la app calcula lo que sale de la ficha de quien usa
// el poder; lo que hace el objetivo es texto tras tirar; lo que se cuenta en mesa es mensaje.
Valor = number
      | { base: number; porNivel?: number; porNivelPoseido?: number; porAplicado?: { aplicado: string; valor: number } }
        // porNivel = × nivel. OJO: "nivel de poder" a secas = nivel POSEÍDO; empleado solo si la prosa dice "empleado" o lo fija una fila de tabla
      | { opciones: { label: string; valor: number }[]; ajusteMaster: true }   // referencias; la dificultad la escribe el jugador
      | { manual: string }                                                      // solo texto
Economia = "gratuita" | "simple" | "estandar" | "compleja" | "reaccion" | { tiempo: string }
Grado = "critico" | "exito" | "fracaso" | "fracasoCritico"

CatalogoPsionica {                      // raíz del borrador JSON
  sobrecarga: {                         // regla ÚNICA de toda la psiónica, la aplica la app
    umbral: "exhausto"; inconsciencia: "automatica";
    salvacion: { aplicado: "fortaleza"; dificultad: Valor };   // 5 + nivel empleado
    danio: { valor: Valor; categoria: "letal"; absorbible: false };
    multiplicadorPorGrado: Record<Grado, number>               // 0 / 0.5 / 1 / 2
  }
  disciplinas: Disciplina[]
}

Disciplina {
  id; label; rama: "metasensoria" | "metrica"
  requisito: { disciplina: string; nivel: number } | null
  porNivel: { nivel; fatiga?: Valor; economia?: Economia; alcance?: Valor; carga?: Valor; duracion?: Valor }[]  // tabla común; [] si no hay
  reglas: { id; texto; aplica: "todas" | string[] }[]
  modificadoresFatiga: ModificadorFatiga[]      // descuentos/incrementos por TENER nivel N en la disciplina
  modificadoresEconomia: { fuente; desdeNivelPoseido: number; alcance: { accion?: string; nivelEmpleado?: number }; op: "baja_un_paso" | "sustituye"; valor?: Economia }[]
  bonosEnOtrasTiradas: BonoToggle[]             // p.ej. "+2 por Resonancia 4" en las dos alertas
  ventajas: { desdeNivelPoseido: number; acciones: string[] }[]   // 2d12 automáticos en esas acciones (incl. acciones fijas como alerta_activa)
  acciones: AccionPoder[]
}

AccionPoder {
  id                                   // "psi_<disciplina>_<accion>"
  label; desdeNivel                    // nivel POSEÍDO mínimo
  economia: Economia | "tabla"
  fatiga: Valor | "tabla"              // coste BASE; descuentos solo como ModificadorFatiga
  permiteFatigaTemporal: boolean       // solo Proeza: puede gastar más de la que tiene (se devuelve al terminar la escena)
  alcance: Valor | "tabla" | null
  duracion: Valor | null
  objetivo: { tipo: "unico" | "casilla" | "varios" | "propio" | "aliado"; area?: Valor } | null
  desplazamiento: Valor | null         // metros que mueve (Trasladar, Impulso...)
  resolucion: { tipo: "sin_dado" }
            | { tipo: "tirada"; aplicado; habilidad: string | string[]; especialidad?: string; dificultad?: Valor; modificador?: number }
            | { tipo: "enfrentada"; aplicado; habilidad: string | string[]; especialidad?: string; modificador?: number }
            | { tipo: "ataque"; aplicado; habilidad: string | string[]; especialidad?: string; modificador?: number; danio: Valor; categoria: string }
            // habilidad como array = el jugador elige (selector con la más alta preseleccionada); modificador = penalizador fijo propio (Puntería −2)
  porObjetivo?: { organico?: Partial<AccionPoder>; sintetico?: Partial<AccionPoder> }
  objetivoTira: { que: string; dificultad?: Valor; grados?: Partial<Record<Grado, string>> }[]
            // SOLO TEXTO tras tirar: resistencia, esquiva, empuje, salvaciones del objetivo (con sus cuatro grados si los hay)
  ejes: { id; label; tipo: "nivel_empleado" | "opcion"; opciones: Opcion[] }[]
  resultados: Partial<Record<Grado, Resultado>>   // SIEMPRE desde el punto de vista de quien tira (traduce los grados escritos desde el objetivo)
  danioPropio: { valor: Valor; categoria: string } | null   // lo que se hace el propio psiónico al usarlo; la app lo resta al confirmar
  multiplesObjetivos: { texto: string; fatigaPorObjetivo: Valor } | null   // MENSAJE; el jugador se descuenta la fatiga a mano
  notas: { texto: string; lugar: "tirada" | "danio" }[]   // "tirada" = antes de tirar; "danio" = junto al daño
  togglesPropios: BonoToggle[]          // penalizadores/bonos que marca el jugador en ESTA acción (−4 fuera de alcance local...)
  bonosEnOtrasTiradas: BonoToggle[]     // lo que esta acción da en OTRAS tiradas propias (Estabilización +3/+4 en salvaciones)
  movimientoOtorgado: { tipo: "levitar"; velocidad: Valor } | null
  ajustesPorNivelPoseido: { desdeNivel; sobre: string; op: "sustituye" | "suma" | "multiplica"; valor: Valor | Economia | string }[]
  manual: string[]                      // a mano POR DECISIÓN (efectos activos propios, concentración, área de Contención ampliada)
  motor: MotorMetadata[]
}
Opcion = { id; label; desdeNivel?: number
  cambia: Partial<Pick<AccionPoder, "economia" | "fatiga" | "alcance" | "duracion" | "resolucion" | "resultados" | "objetivoTira" | "notas" | "danioPropio" | "desplazamiento" | "objetivo">>  // SUSTITUYE
  suma?: Record<string, number> }   // SUMA sobre lo ya resuelto por los otros ejes (ruta → +N), p.ej. versiones Poderosas
Resultado = { texto: string; estados: { estado: string; duracion: Valor; sobre: "objetivo" | "propio" }[]; danio?: { valor: Valor; categoria: string; sobre: "objetivo" | "propio" } }
BonoToggle = { etiqueta: string; alcance: string /* id de acción, grupo ("Salvaciones") o "alerta" */; valor: number; desdeNivelPoseido?: number }

// Gasto de fatiga SEMI-GLOBAL: coste final = base → cadena de ModificadorFatiga de TODAS las fuentes,
// en este orden: descuentos por nivel → ×2 Munición Supresora → Xovromium −1 → mínimo (0 salvo que la prosa diga 1) → pago con cargas.
ModificadorFatiga = {
  fuente: string
  alcance: { rama?: string; disciplina?: string; accion?: string; opcion?: { eje: string; opcion: string }; nivelEmpleadoMax?: number; nivelEmpleadoMin?: number }
  desdeNivelPoseido?: number
  condicion?: { toggle: string }        // lo declara el jugador con un toggle ("soy 2 niveles superior", "carga < 10 kg")
  op: "suma" | "multiplica" | "minimo" | "ignora_primero" | "paga_con_recurso"
  valor: number | { recurso: string; porPunto: number }
}
// Grupo de acciones "Psiónica" con subgrupos rama/disciplina: alcance al que apuntan los modificadores externos.`;

const DECISIONES_POR_AREA: Record<string, { seccion: string }> = {
  psionica: { seccion: "### 10.6" },
};

const CONSUMIDORES_POR_AREA: Record<string, string[]> = {
  psionica: [
    "Xovromium (medicina.ts, equipamiento.md:1338): toggle +1 en toda tirada que resuelva un poder si el personaje lo tiene en recursos; 'ignora el primer nivel de fatiga por uso de poderes' → ModificadorFatiga ignora_primero",
    "Munición Supresora (municion.ts, equipamiento.md:796): el psiónico afectado gasta el DOBLE de fatiga (ModificadorFatiga multiplica ×2) y −2 a toda tirada de poder 1 minuto; con fracaso crítico, 1 nivel de daño letal por punto de fatiga empleado",
    "Derivación Psiónica (subsistemas.ts): conversión de cargas de batería en fatiga, 4/3/2/1 cargas por punto según nivel (ModificadorFatiga paga_con_recurso); +1 a resistir retroceso/desorientación psiónica; +10% de alcance de los poderes; +1 a resistir poderes de metasensoria; −1 a penalizadores por fatiga en tiradas de poder",
  ],
};

// Trozo de docs/sistema.md desde el encabezado dado hasta el siguiente de igual
// o mayor nivel: las decisiones del usuario viajan leídas de la fuente de verdad,
// no copiadas aquí.
function seccion(md: string, encabezado: string): string[] {
  const lineas = md.split("\n");
  const i = lineas.findIndex((l) => l.startsWith(encabezado));
  if (i < 0) throw new Error(`No encuentro "${encabezado}" en docs/sistema.md`);
  const nivel = encabezado.split(" ")[0].length;
  const fin = lineas.findIndex((l, j) => j > i && /^#+ /.test(l) && l.split(" ")[0].length <= nivel);
  return bloques(lineas.slice(i + 1, fin < 0 ? undefined : fin)).flatMap((b) => b.split(/\n(?=- )/));
}

function contexto(area: string) {
  const decisiones = DECISIONES_POR_AREA[area];
  return {
    modelo: area === "psionica" ? MODELO_PSIONICA : null,
    decisiones: decisiones ? seccion(readFileSync("docs/sistema.md", "utf8"), decisiones.seccion) : [],
    consumidoresExternos: CONSUMIDORES_POR_AREA[area] ?? [],
    tipos: TIPOS_MODIFICADOR.map((t) => ({ id: t, descripcion: DESCRIPCION_TIPO[t] })),
    mecanismos: MECANISMOS_MOTOR.map((m) => ({ id: m, descripcion: DESCRIPCION_MECANISMO[m] })),
    accionesFijas: ACCIONES.map((a) => ({ id: a.id, label: a.label, grupo: a.grupo, aplicado: a.aplicado, habilidad: a.habilidad })),
    familiasGeneradas: FAMILIAS_GENERADAS,
    otrasPiezasMotor: OTRAS_PIEZAS_MOTOR,
  };
}

type Item = {
  id: string;
  label: string;
  rama: string;
  disciplina: string;
  prosa: string[];
  referencia?: unknown;
};

type Lote = {
  id: string;
  label: string;
  rama: string;
  reglasComunes: string[];
  items: Item[];
};

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

// Bloques = párrafos o listas enteras (separados por línea en blanco).
function bloques(lineas: string[]): string[] {
  return lineas
    .join("\n")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
}

// Estructura de docs/psionica.md (ver su cabecera): `##` rama, `###` disciplina,
// `####` acción. Dos excepciones que se resuelven aquí para que cada item sea UNA
// acción con todos sus niveles juntos:
// - `#### Nivel N` + `##### Acción` (Inducción): la acción se reúne desde todos
//   los niveles, cada bloque prefijado con "[Nivel N]".
// - `#### Nivel N` sin `#####` (Contención): la disciplina entera es un item.
// `#### Niveles de ...` (tablas) y el texto suelto de una disciplina o de un
// `#### Nivel N` van a reglasComunes del lote; el de la rama, a todos sus lotes.
function trocearArea(md: string): Lote[] {
  type Seccion = { h: number; titulo: string; lineas: string[] };
  const secciones: Seccion[] = [];
  let actual: Seccion = { h: 1, titulo: "", lineas: [] };
  for (const linea of md.split("\n")) {
    const m = /^(#{1,5}) (.+)$/.exec(linea);
    if (m) {
      secciones.push(actual);
      actual = { h: m[1].length, titulo: m[2].trim(), lineas: [] };
    } else {
      actual.lineas.push(linea);
    }
  }
  secciones.push(actual);

  const lotes: Lote[] = [];
  const reglasDeRama = new Map<string, string[]>();
  let rama = "";
  let lote: Lote | null = null;
  let nivel: string | null = null;
  const itemsPorId = new Map<string, Item>();
  const nivelesSinAccion: { lote: Lote; nivel: string; bloques: string[] }[] = [];

  const item = (label: string): Item => {
    const id = `${lote!.id}.${slug(label)}`;
    let it = itemsPorId.get(id);
    if (!it) {
      it = { id, label, rama, disciplina: lote!.label, prosa: [] };
      itemsPorId.set(id, it);
      lote!.items.push(it);
    }
    return it;
  };

  for (const s of secciones) {
    const texto = bloques(s.lineas);
    if (s.h === 1) continue; // intro general: sabor, sin reglas
    if (s.h === 2) {
      rama = s.titulo;
      reglasDeRama.set(rama, texto);
      lote = null;
      continue;
    }
    if (s.h === 3) {
      lote = { id: slug(s.titulo), label: s.titulo, rama, reglasComunes: [...texto], items: [] };
      lotes.push(lote);
      nivel = null;
      continue;
    }
    if (!lote) throw new Error(`Sección "${s.titulo}" fuera de una disciplina (###)`);
    if (s.h === 4) {
      const esNivel = /^Nivel \d+$/.exec(s.titulo);
      if (esNivel) {
        nivel = s.titulo;
        if (texto.length) nivelesSinAccion.push({ lote, nivel, bloques: texto });
      } else if (/^Niveles de /.test(s.titulo)) {
        nivel = null;
        lote.reglasComunes.push(`[${s.titulo}]`, ...texto);
      } else {
        nivel = null;
        item(s.titulo).prosa.push(...texto);
      }
      continue;
    }
    // h5: acción dentro de un `#### Nivel N`
    if (!nivel) throw new Error(`"##### ${s.titulo}" sin "#### Nivel N" padre`);
    item(s.titulo).prosa.push(...texto.map((b) => `[${nivel}] ${b}`));
  }

  // Texto suelto bajo "#### Nivel N": si la disciplina no tiene acciones con
  // nombre (Contención) es la disciplina misma; si las tiene (Inducción) es una
  // regla común de ese nivel.
  for (const { lote: l, nivel: n, bloques: bs } of nivelesSinAccion) {
    const prefijados = bs.map((b) => `[${n}] ${b}`);
    if (l.items.length === 0 || l.items.every((i) => i.id === l.id + "." + l.id)) {
      lote = l;
      item(l.label).prosa.push(...prefijados);
    } else {
      l.reglasComunes.push(...prefijados);
    }
  }

  for (const l of lotes) {
    const deRama = reglasDeRama.get(l.rama) ?? [];
    if (deRama.length) l.reglasComunes.unshift(`[Rama ${l.rama}]`, ...deRama);
  }
  return lotes;
}

// Piezas ya auditadas (2026-09-24/25) que cubren mecanismos variados y, sobre
// todo, piezas con niveles — el mismo eje "qué cambia al subir de nivel" que
// tienen los poderes.
const CALIBRACION = [
  "mira_telescopica",
  "puntero_laser",
  "silenciador",
  "sistema_retroceso",
  "visor_nocturno",
  "derivacion_psionica",
  "escudo_deflector",
  "malla_plasmatica",
];

function loteCalibracion(): Lote {
  const items: Item[] = CALIBRACION.map((id) => {
    const pieza = equipoPorId(id);
    if (!pieza) throw new Error(`Pieza de calibración inexistente: ${id}`);
    const p = pieza as Equipo & {
      descripcion?: string;
      especial?: string | null;
      motor?: unknown[];
      niveles?: { nivel: number; detalle?: string[]; motor?: unknown[] }[];
    };
    const prosa = [
      ...(p.descripcion ? [p.descripcion] : []),
      ...(typeof p.especial === "string" ? [p.especial] : []),
      ...(p.niveles ?? []).flatMap((n) => (n.detalle ?? []).map((d) => `[Nivel ${n.nivel}] ${d}`)),
    ];
    const referencia = p.niveles
      ? p.niveles.map((n) => ({ nivel: n.nivel, motor: n.motor ?? [] }))
      : [{ nivel: null, motor: p.motor ?? [] }];
    return { id, label: p.label, rama: "equipo", disciplina: p.familia, prosa, referencia };
  });
  return { id: "calibracion", label: "Calibración (equipo auditado)", rama: "equipo", reglasComunes: [], items };
}

const [entrada, salida] = process.argv.slice(2);
if (!entrada || !salida) {
  console.error("Uso: modelar-area-extraer.ts <docs/area.md | --calibracion> <salida.json>");
  process.exit(1);
}

const calibracion = entrada === "--calibracion";
const area = calibracion ? "calibracion" : basename(entrada, ".md");
const lotes = calibracion ? [loteCalibracion()] : trocearArea(readFileSync(entrada, "utf8"));
const args = {
  area,
  fuente: calibracion ? "catálogo de equipo (src/lib/catalog)" : entrada,
  salida: calibracion ? null : `docs/modelado-${area}.md`,
  salidaJson: calibracion ? null : `docs/modelado-${area}.json`,
  contexto: contexto(area),
  lotes,
};
writeFileSync(salida, JSON.stringify(args, null, 2));

for (const l of lotes) {
  console.log(`${l.id}: ${l.items.length} items, ${l.reglasComunes.length} bloques comunes`);
  for (const i of l.items) console.log(`  - ${i.id} (${i.prosa.length} bloques)`);
}
console.log(`Escrito en ${salida}`);
