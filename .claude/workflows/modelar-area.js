// ─────────────────────────────────────────────────────────────────────────
// MODELAR ÁREA — de prosa del diseñador a propuesta de MotorMetadata + capas
// ─────────────────────────────────────────────────────────────────────────
//
// QUÉ HACE
// Hermano de auditoria-motor-metadata.js: aquél AUDITA algo ya construido,
// éste MODELA un área nueva (psiónica, razas, ciberimplantes, dotes) ANTES de
// escribir código. Dada la prosa troceada en acciones, dice:
//   - qué efectos encajan ya en el motor (y con qué mecanismo de MECANISMOS_MOTOR),
//   - qué capas nuevas hacen falta y a cuántos elementos desbloquea cada una,
//   - qué variantes elige el jugador al usar cada acción (nivel empleado,
//     opción...) y qué cambia por el nivel que POSEE,
//   - qué preguntas hay que hacerle al diseñador.
// Solo analiza: el único archivo que escribe es el documento de salida.
//
// EL EJE NIVEL (por qué el esquema lo trata aparte)
// Un poder a nivel 4 no es "la versión de nivel 4": puede usarse a cualquier
// nivel empleado ≤ 4 (coste/alcance/daño de ese nivel), y además el nivel
// POSEÍDO altera usos de nivel inferior ("reduce en 1 la fatiga de acciones de
// nivel inferior a 3", "Contención nv6 puede usar el nivel 1 una hora gratis").
// Por eso la propuesta de cada item lleva `ejes` (lo que el jugador elige al
// usar: nivel empleado, estado inducido, tipo de objetivo...) y
// `ajustesPorNivelPoseido`, no una lista plana de efectos.
//
// EL MODELO OBJETIVO (v2, 2026-09-28)
// Si args.contexto.modelo existe (lo pone el extractor por área), clasificar no
// solo etiqueta MotorMetadata: RELLENA la entrada de catálogo con esa forma y da
// a cada efecto de la prosa un `destino` (parametro + ruta en el modelo,
// resultado_texto, manual, pregunta, narrativo). La métrica es la COBERTURA: %
// de efectos con destino que no es "pregunta". Un efecto que no cabe en el
// modelo sale como `campoNuevo` — el hueco es del esquema, se arregla
// ampliándolo, no se descubre al construir. Las decisiones del usuario
// (docs/sistema.md, sección del área) y las piezas externas que tocan el área
// (consumidoresExternos) llegan en args para que nadie las re-pregunte.
//
// CÓMO SE USA
// 1. Prepara el args (import real de motor.ts/acciones.ts, no transcripción):
//      node --import ./scripts/test-resolver.mjs \
//        scripts/workflows/modelar-area-extraer.ts docs/psionica.md /ruta/args.json
//    o, para calibrar contra equipo ya auditado (MotorMetadata real como
//    `referencia`; no escribe documento, devuelve el informe de aciertos):
//      ... modelar-area-extraer.ts --calibracion /ruta/args.json
// 2. Workflow({ name: 'modelar-area', args: <el JSON, como valor, NO string> }).
//    En una sesión abierta antes de crear este archivo el nombre no resuelve
//    (el registro se carga al arrancar): usa { scriptPath: '.claude/workflows/modelar-area.js' }.
// 3. Salida: docs/modelado-<area>.md (args.salida), el borrador de catálogo
//    docs/modelado-<area>.json (args.salidaJson) y el JSON completo como valor
//    de retorno.
//
// AGENTES: 1 extraer + 1 clasificar por lote, hasta 3 verificadores (por lotes), 1 agrupar,
// 1 redactar. Psiónica (6 lotes) = 17. Calibración (1 lote) = 5-6.
//
// MEJORES PRÁCTICAS (heredadas de auditoria-motor-metadata.js)
// - A diferencia de lo que dice auditoria-motor-metadata.js, un subagente
//   (Agent) NO tiene la tool Workflow: el lanzamiento lo hace el agente
//   principal pasando el JSON como args. Psiónica son ~70 KB, asumible; si un
//   área pasa de ~150 KB, parte los lotes en varias ejecuciones.
// - Calibración 2026-09-28 (8 piezas de equipo auditadas, 2 pasadas): en la
//   segunda, 0 fallos de tipo/afecta y 3 de mecanismo (el verificador pasaba a
//   "hueco" lo no construido) sobre 24 ternas; varias discrepancias eran
//   errores de la referencia (ids inexistentes, toggles 0/0 marcados
//   construido). REGLAS_CONVENCION recoge lo aprendido en ambas.
// - Extraer y clasificar son agentes distintos a propósito: el que parte la
//   prosa no sabe qué mecanismos hay, así no recorta la prosa para que encaje.
// - La verificación ataca dos cosas: las clasificaciones "ya cubierto por X"
//   (las de mayor coste si están mal, ver memoria auditoria-tras-forks-paralelos)
//   y la FIDELIDAD de la propuesta a la prosa (números, niveles, qué sustituye
//   a qué). Los huecos no se verifican: un hueco falso sale barato al construir.
// - Calibra antes de fiarte: si la calibración no reproduce razonablemente el
//   MotorMetadata real del equipo, ajusta los prompts antes de modelar un área.
// ─────────────────────────────────────────────────────────────────────────

export const meta = {
  name: 'modelar-area',
  description: 'Modela un área nueva (poderes, dotes...) contra el motor: efectos, variantes por nivel, capas nuevas y preguntas',
  whenToUse: 'Antes de escribir código de un área nueva del sistema; args de scripts/workflows/modelar-area-extraer.ts',
  phases: [
    { title: 'Extraer', detail: 'efectos atómicos por acción, sin interpretar' },
    { title: 'Clasificar', detail: 'propuesta de catálogo + destino y MotorMetadata por efecto' },
    { title: 'Verificar', detail: 'fidelidad a la prosa y cada "ya cubierto por X" contra el código' },
    { title: 'Agrupar', detail: 'campos que leerá la tubería, campos nuevos y capas de motor' },
    { title: 'Redactar', detail: 'documento + borrador de catálogo JSON' },
  ],
}

const { area, fuente, salida, salidaJson, contexto, lotes } = args
const modelo = contexto.modelo ?? null
const DESTINOS = ['parametro', 'resultado_texto', 'manual', 'pregunta', 'narrativo']
const CONTEXTO_AREA = modelo ? `MODELO OBJETIVO (la entrada de catálogo que debes rellenar; es la especificación de lo que la app leerá después):
${modelo}

DECISIONES YA TOMADAS POR EL USUARIO (reglas firmes; NO las preguntes de nuevo, aplícalas):
${(contexto.decisiones ?? []).map(d => `- ${d.replace(/^- /, '')}`).join('\n')}

PIEZAS EXTERNAS QUE MODIFICAN ESTA ÁREA (el modelo tiene que exponer dónde engancharse — grupo de acciones, ModificadorFatiga...):
${(contexto.consumidoresExternos ?? []).map(c => `- ${c}`).join('\n')}` : ''
const calibracion = lotes.some(l => l.items.some(i => i.referencia))

const TIPOS = contexto.tipos.map(t => t.id)
const MECANISMOS = contexto.mecanismos.map(m => m.id)
const EJES_NIVEL = ['nivel_empleado', 'nivel_poseido', 'sin_nivel', 'dudoso']
const MODOS_AFECTA = ['accion_existente', 'accion_nueva', 'objetivo_tercero', 'ninguna']

const CONTEXTO_MOTOR = `TIPOS DE MODIFICADOR (lista cerrada, ni uno más):
${contexto.tipos.map(t => `- ${t.id}: ${t.descripcion}`).join('\n')}

MECANISMOS DE ENTREGA (lista cerrada; si ninguno sirve, es "hueco"):
${contexto.mecanismos.map(m => `- ${m.id}: ${m.descripcion}`).join('\n')}

ACCIONES FIJAS QUE EXISTEN HOY (acciones.ts):
${contexto.accionesFijas.map(a => `- ${a.id} "${a.label}" [${a.grupo}] ${a.aplicado}+${a.habilidad ?? '—'}`).join('\n')}

ACCIONES GENERADAS DESDE EL EQUIPO (por familia):
${contexto.familiasGeneradas.map(f => `- ${f}`).join('\n')}

OTRAS PIEZAS DEL MOTOR:
${contexto.otrasPiezasMotor.map(f => `- ${f}`).join('\n')}`

const NIVELES_EXPLICADOS = `Dos ejes de nivel que NO hay que confundir:
- nivel_empleado: el nivel al que el usuario decide usar el efecto esta vez (≤ el que posee). Fija coste, alcance, daño, duración ("1 punto de fatiga por nivel de poder empleado", "daño 9 + nivel empleado"). Poseer nivel 4 permite usarlo a 1, 2, 3 o 4.
- nivel_poseido: lo desbloquea o cambia el hecho de TENER ese nivel ("a partir de nivel 4...", "reduce la fatiga de acciones de nivel inferior a 3", "Anclaje pasa a ser acción simple").
- sin_nivel: no depende del nivel.
- dudoso: la prosa no deja claro cuál de los dos es (anótalo, es una pregunta para el diseñador).
Los bloques prefijados "[Nivel N]" vienen de una sección de nivel N de la fuente.`

const REGLAS_CONVENCION = `CONVENCIONES (fijadas tras calibrar contra el catálogo de equipo auditado):
- Compatibilidad, requisitos de instalación o de compra ("solo compatible con...", "requiere X nivel N para aprenderlo") son estructura del catálogo, NO MotorMetadata: clasifícalos narrativo. Solo es habilitador si la prosa bloquea o habilita una ACCIÓN o TIRADA concreta durante el juego.
- estado: "construido" solo si el mecanismo entrega HOY ese efecto con ese valor; "pendiente" si el mecanismo existe pero falta dato/código puntual; "bloqueado" (+ bloqueoPor) si falta una regla o contenido del diseñador o una capa que no existe (Fase 5, "Acciones sin dado", "pregunta N"); "ad_hoc" si hoy se resuelve a mano en mesa. hueco = al motor le falta una pieza; bloqueado = además no se puede construir aún.
- Tirada que el sistema aún no tiene (resistir retroceso psiónico, resistir metasensoria, manifestación de un poder): afectaModo accion_existente con un id marcador descriptivo (p.ej. "resistir_metasensoria"), mecanismo el que la entregaría, estado bloqueado. No la fuerces sobre una salv_* existente salvo que la prosa nombre esa salvación.
- Una acción propia nace accion_nueva en el nivel/opción donde aparece; lo que la modifica en niveles u opciones posteriores es accion_existente con ESE mismo id.
- Efecto sobre la tirada de otro personaje (su salvación, su esquiva, su dificultad): afectaModo objetivo_tercero con el id de la tirada DEL TERCERO, tipo siempre "texto"; se entrega como nota colgada de la tirada del portador (mecanismo nota_fija) si el portador tira algo.
- mecanismo = la pieza del motor que lo ENTREGARÍA, esté o no implementada para este elemento; que hoy no funcione o esté bloqueado va en estado, NO cambiando a "hueco". "hueco" solo cuando ningún valor de la lista cerrada lo expresaría aunque se tuvieran todos los datos.
- Bloqueado vs pendiente: si depende de una regla sin definir (pregunta abierta al diseñador), estado "bloqueado" con bloqueoPor esa pregunta; "pendiente" solo cuando la regla está clara y falta dato o código.
- Lo que viaja dentro de una acción propia (su daño, área, estados que inflige, defensa del objetivo, coste) es parte del efecto tipo "accion" de esa acción; no lo emitas aparte salvo que lo reciba OTRA tirada distinta (del portador o de un tercero).
- Capacidad o regeneración de un recurso de instancia (colchón, cargas) es estructura del catálogo: narrativo. Su consumo automático es una capa, no un efecto por nivel.
- tipo narrativo ⇒ afectaModo ninguna, mecanismo null, hueco null. mecanismo "hueco" ⇒ hueco con frase; cualquier otro mecanismo ⇒ hueco null.`

const nivelSchema = { type: ['integer', 'null'] }

const CLAIM = {
  type: 'object',
  properties: {
    n: { type: 'integer' },
    texto: { type: 'string' },
    nivel: nivelSchema,
    eje: { type: 'string', enum: EJES_NIVEL },
  },
  required: ['n', 'texto', 'nivel', 'eje'],
}

const EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, claims: { type: 'array', items: CLAIM } },
        required: ['id', 'claims'],
      },
    },
    comunes: { type: 'array', items: CLAIM },
  },
  required: ['items', 'comunes'],
}

const EFECTO = {
  type: 'object',
  properties: {
    claim: { type: 'string' },
    opcion: { type: ['string', 'null'] },
    tipo: { type: 'string', enum: TIPOS },
    afectaModo: { type: 'string', enum: MODOS_AFECTA },
    afectaId: { type: ['string', 'null'] },
    mecanismo: { type: ['string', 'null'], enum: [...MECANISMOS, 'hueco', null] },
    hueco: { type: ['string', 'null'] },
    arbitraje: { type: ['string', 'null'], enum: ['duro', 'blando', 'pendiente', null] },
    estado: { type: 'string', enum: ['construido', 'pendiente', 'bloqueado', 'ad_hoc'] },
    bloqueoPor: { type: ['string', 'null'] },
    destino: { type: 'string', enum: DESTINOS },
    ruta: { type: ['string', 'null'] },
    campoNuevo: { type: ['string', 'null'] },
    confianza: { type: 'string', enum: ['alta', 'media', 'baja'] },
    justificacion: { type: 'string' },
  },
  required: ['claim', 'tipo', 'afectaModo', 'afectaId', 'mecanismo', 'hueco', 'arbitraje', 'estado', 'bloqueoPor', 'destino', 'ruta', 'campoNuevo', 'confianza', 'justificacion'],
}

const CLASSIFY_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          propuesta: { type: ['object', 'null'] },
          efectos: { type: 'array', items: EFECTO },
          preguntas: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'propuesta', 'efectos', 'preguntas'],
      },
    },
    disciplina: { type: ['object', 'null'] },
    comunes: { type: 'array', items: EFECTO },
    preguntasComunes: { type: 'array', items: { type: 'string' } },
  },
  required: ['items', 'disciplina', 'comunes', 'preguntasComunes'],
}

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    veredictos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          claim: { type: 'string' },
          veredicto: { type: 'string', enum: ['confirmado', 'corregido'] },
          tipo: { type: 'string', enum: TIPOS },
          afectaModo: { type: 'string', enum: MODOS_AFECTA },
          afectaId: { type: ['string', 'null'] },
          mecanismo: { type: ['string', 'null'], enum: [...MECANISMOS, 'hueco', null] },
          hueco: { type: ['string', 'null'] },
          estado: { type: 'string', enum: ['construido', 'pendiente', 'bloqueado', 'ad_hoc'] },
          bloqueoPor: { type: ['string', 'null'] },
          razon: { type: 'string' },
        },
        required: ['claim', 'veredicto', 'tipo', 'afectaModo', 'afectaId', 'mecanismo', 'hueco', 'estado', 'bloqueoPor', 'razon'],
      },
    },
    erroresFidelidad: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item: { type: 'string' },
          ruta: { type: 'string' },
          problema: { type: 'string' },
          correccion: { type: 'string' },
        },
        required: ['item', 'ruta', 'problema', 'correccion'],
      },
    },
  },
  required: ['veredictos', 'erroresFidelidad'],
}

const AGRUPAR_SCHEMA = {
  type: 'object',
  properties: {
    capas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          nombre: { type: 'string' },
          descripcion: { type: 'string' },
          items: { type: 'array', items: { type: 'string' } },
          claims: { type: 'array', items: { type: 'string' } },
          ampliaA: { type: 'string' },
          dependeDe: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'nombre', 'descripcion', 'items', 'claims', 'ampliaA', 'dependeDe'],
      },
    },
    camposModelo: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          campo: { type: 'string' },
          items: { type: 'array', items: { type: 'string' } },
          queHaceLaTuberia: { type: 'string' },
        },
        required: ['campo', 'items', 'queHaceLaTuberia'],
      },
    },
    camposNuevos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          campo: { type: 'string' },
          forma: { type: 'string' },
          motivo: { type: 'string' },
          claims: { type: 'array', items: { type: 'string' } },
        },
        required: ['campo', 'forma', 'motivo', 'claims'],
      },
    },
    preguntasTransversales: { type: 'array', items: { type: 'string' } },
  },
  required: ['capas', 'camposModelo', 'camposNuevos', 'preguntasTransversales'],
}

const prosaDeItem = it => it.prosa.map((b, i) => `  ${i + 1}. ${b}`).join('\n')
const comunesDeLote = l => l.reglasComunes.map((b, i) => `  ${i + 1}. ${b}`).join('\n') || '  (ninguna)'

// ── Fases 1-2: por lote, sin barrera entre lotes ─────────────────────────
const porLote = await pipeline(
  lotes,
  lote => agent(
    `Parte en efectos atómicos la prosa de un área de un juego de rol ("${area}", fuente ${fuente}), lote "${lote.label}" (${lote.rama}).
Un efecto = una afirmación con consecuencia de juego (coste, tipo de acción, tirada, dificultad, alcance, duración, bono/penalizador, estado infligido, resultado por grado, requisito, restricción). Una frase puede tener varios: sepáralos. Cada resultado de un grado (éxito crítico / éxito / fracaso / fracaso crítico) con número o estado es su propio efecto. Frases de sabor sin consecuencia también van, marcadas tal cual (luego se clasificarán narrativas).
NO interpretes, NO resumas números, NO añadas lo que la prosa no dice, NO decidas cómo se construiría. Cita cifras literales. Pero no trocees de más: dificultad + estado + condición que forman UNA misma consecuencia ("en crítico causa shock y llamarada (dificultad 6 + nivel)") son un solo efecto; y la misma regla repetida en dos frases es un solo efecto. Al revés, si una frase afecta a dos tiradas distintas (ataque Y percepción), son dos efectos, uno por tirada.

${NIVELES_EXPLICADOS}
Para cada efecto rellena: nivel (el N al que aparece o desde el que rige; null si ninguno) y eje.

REGLAS COMUNES DEL LOTE (van en "comunes", no en ningún item):
${comunesDeLote(lote)}

ITEMS (devuelve uno por id, en este orden):
${lote.items.map(it => `### ${it.id} — ${it.label}\n${prosaDeItem(it)}`).join('\n\n')}

Numera "n" desde 1 dentro de cada item y dentro de comunes.`,
    { phase: 'Extraer', label: `extraer:${lote.id}`, schema: EXTRACT_SCHEMA }
  ),
  (ext, lote) => {
    const comunes = (ext?.comunes ?? []).map(c => ({ ...c, id: `${lote.id}._comunes#${c.n}` }))
    const items = lote.items.map(it => {
      const e = (ext?.items ?? []).find(x => x.id === it.id)
      return { ...it, claims: (e?.claims ?? []).map(c => ({ ...c, id: `${it.id}#${c.n}` })) }
    })
    const sinClaims = items.filter(i => !i.claims.length).map(i => i.id)
    if (sinClaims.length) log(`AVISO ${lote.id}: sin efectos extraídos en ${sinClaims.join(', ')}`)
    const fmt = c => `  [${c.id}] (nivel ${c.nivel ?? '—'}, ${c.eje}) ${c.texto}`
    return agent(
      `Clasifica contra el motor de la app los efectos de un área nueva ("${area}"), lote "${lote.label}" (${lote.rama}). No escribes código: propones el modelo.

Antes de clasificar LEE: docs/motor.md (entero: los cinco tipos, mecanismos, MotorMetadata, "Acciones sin dado", recursos, checklist), docs/modificadores-tiradas.md, src/lib/rules/motor.ts y src/lib/rules/acciones.ts. Consulta docs/sistema.md §6, §7 y §10 para reglas de resolución, fatiga, estados y psiónica. Si dudas de si algo existe, búscalo en src/lib/rules — no lo supongas.

${CONTEXTO_MOTOR}

${NIVELES_EXPLICADOS}

${CONTEXTO_AREA}

PARA CADA ITEM devuelve:
1. propuesta: ${modelo ? `la entrada AccionPoder del MODELO OBJETIVO, rellena con los valores literales de la prosa (Valor con porNivel cuando escala con el nivel empleado; "tabla" cuando lo fija la tabla común; ejes con una opción por variante elegible — nivel empleado, modo de uso, estado inducido, forma personal/ampliada... declarados por separado, sin multiplicarlos; ajustesPorNivelPoseido para lo que cambia por TENER nivel N; descuentos/incrementos de fatiga como ModificadorFatiga en la disciplina, nunca horneados en la acción). Si algo no cabe en ningún campo, NO lo fuerces: déjalo fuera de la propuesta y márcalo en su efecto con campoNuevo.` : 'null (esta ejecución no tiene modelo objetivo).'}
2. efectos: CADA claim del item clasificado. "claim" = su id EXACTO tal como aparece entre corchetes abajo, SIN los corchetes (p.ej. "${lote.items[0]?.id}#1"). opcion = id de la opción a la que pertenece, o null. Responde las dos preguntas de motor.md: a qué acción afecta (afectaModo/afectaId: accion_existente con un id REAL de la lista o de un patrón de familia; accion_nueva con un id propuesto "${area}_<accion>"; objetivo_tercero cuando toca la tirada de otro — SIEMPRE tipo "texto"; ninguna con mecanismo null) y cuál de los cinco tipos es. mecanismo: uno de la lista cerrada SOLO si hoy entrega ese efecto tal cual (accion_sin_equipo no está construido: si lo usas, es porque ese es el mecanismo previsto — dilo en justificacion); si no hay ninguno, "hueco" y una frase en "hueco" de QUÉ falta (genérica, reutilizable: "gasto de fatiga al confirmar una acción", "estado con duración infligido a un objetivo"...). Tipo habilitador exige arbitraje (duro/blando/pendiente, nunca asumido: si la prosa no lo decide, "pendiente"). estado y bloqueoPor según las convenciones. destino: ${modelo ? `"parametro" (+ ruta en la propuesta, p.ej. "resultados.fracaso.estados", "ejes.nivel.opciones.3.fatiga", "disciplina.porNivel.2.alcance") si la tubería lo leerá de un campo; "resultado_texto" si solo se muestra como texto al resolver ("aplica miedo"); "manual" si una DECISIÓN del usuario lo deja a mano (efectos activos sobre uno mismo, concentración); "pregunta" solo si falta una regla (y va también en preguntas); "narrativo" si es sabor. Si no cabe en ningún campo del modelo: destino "parametro", ruta null y campoNuevo con el campo que propondrías ("nombre: forma — por qué").` : '"narrativo" o "parametro", sin ruta (no hay modelo).'}

${REGLAS_CONVENCION}
3. preguntas: ambigüedades o huecos de la prosa para el diseñador (erratas que cambian una regla, grados de resultado ausentes, contradicciones con sistema.md).
Clasifica también cada claim de comunes en "comunes" y sus preguntas en preguntasComunes.${modelo ? ` Y devuelve en "disciplina" la entrada Disciplina del modelo SIN el array acciones (requisito, porNivel, reglas, modificadoresFatiga) — las rutas de sus efectos empiezan por "disciplina.".` : ' "disciplina": null.'}

REGLAS COMUNES DEL LOTE:
${comunes.map(fmt).join('\n') || '  (ninguna)'}

ITEMS:
${items.map(it => `### ${it.id} — ${it.label}\nProsa original:\n${prosaDeItem(it)}\nEfectos extraídos:\n${it.claims.map(fmt).join('\n')}`).join('\n\n')}`,
      { phase: 'Clasificar', label: `clasificar:${lote.id}`, schema: CLASSIFY_SCHEMA }
    ).then(cl => ({ lote, items, comunes, clasificacion: cl }))
  }
)

const lotesOk = porLote.filter(r => r && r.clasificacion)
const caidos = lotes.filter(l => !lotesOk.some(r => r.lote.id === l.id)).map(l => l.id)
if (caidos.length) log(`AVISO: lotes sin clasificar (se omiten del resto): ${caidos.join(', ')}`)

// Todos los efectos, aplanados, con su item y la prosa de su claim.
const normId = s => String(s ?? '').replace(/[\[\]\s]/g, '')
const incoherencias = []
// Reglas cruzadas de esquema que un JSON Schema no expresa: se corrigen aquí y
// se cuentan, en vez de fiarse del prompt.
function normalizar(e) {
  const out = { ...e, claim: normId(e.claim) }
  if (out.tipo === 'narrativo' && (out.afectaModo !== 'ninguna' || out.mecanismo !== null || out.hueco)) {
    incoherencias.push(`${out.claim}: narrativo con afecta/mecanismo/hueco → limpiado`)
    Object.assign(out, { afectaModo: 'ninguna', afectaId: null, mecanismo: null, hueco: null })
  }
  if (out.afectaModo === 'ninguna' && out.mecanismo !== null) {
    incoherencias.push(`${out.claim}: afecta ninguna con mecanismo ${out.mecanismo} → mecanismo null`)
    out.mecanismo = null
  }
  if (out.mecanismo === 'hueco' && !out.hueco) incoherencias.push(`${out.claim}: mecanismo hueco sin frase`)
  if (out.mecanismo !== 'hueco' && out.hueco) {
    incoherencias.push(`${out.claim}: hueco "${out.hueco}" con mecanismo ${out.mecanismo} → pasa a hueco`)
    out.mecanismo = 'hueco'
  }
  if (out.estado === 'bloqueado' && !out.bloqueoPor) incoherencias.push(`${out.claim}: bloqueado sin bloqueoPor`)
  return out
}

const efectos = lotesOk.flatMap(r => {
  const textos = new Map([...r.comunes, ...r.items.flatMap(i => i.claims)].map(c => [c.id, c]))
  const deItems = r.clasificacion.items.flatMap(ci => ci.efectos.map(e => ({ ...normalizar(e), item: ci.id })))
  const deComunes = r.clasificacion.comunes.map(e => ({ ...normalizar(e), item: `${r.lote.id}._comunes` }))
  const clasificados = new Set([...deItems, ...deComunes].map(e => e.claim))
  const sinClasificar = [...textos.keys()].filter(id => !clasificados.has(id))
  const desconocidos = [...clasificados].filter(id => !textos.has(id))
  if (sinClasificar.length) log(`AVISO ${r.lote.id}: ${sinClasificar.length} claims extraídos sin clasificar: ${sinClasificar.join(', ')}`)
  if (desconocidos.length) throw new Error(`${r.lote.id}: el clasificador devolvió ids que no existen (${desconocidos.slice(0, 5).join(', ')}...) — revisa el join`)
  return [...deItems, ...deComunes].map(e => ({ ...e, lote: r.lote.id, texto: textos.get(e.claim)?.texto ?? '(claim no encontrado)' }))
})

// ── Fase 3: verificar los "ya cubierto por X" ────────────────────────────
const cubiertos = efectos.filter(e => e.mecanismo && e.mecanismo !== 'hueco')
// Reparto por LOTE (no por efecto): cada verificador ve la prosa y la propuesta
// entera de sus disciplinas, que es lo que necesita para juzgar la fidelidad.
const nVerif = Math.min(3, lotesOk.length)
const tandas = Array.from({ length: nVerif }, () => [])
;[...lotesOk].sort((a, b) => b.items.length - a.items.length).forEach(r => {
  tandas.reduce((min, t) => (t.reduce((n, x) => n + x.items.length, 0) < min.reduce((n, x) => n + x.items.length, 0) ? t : min), tandas[0]).push(r)
})
log(`${efectos.length} efectos clasificados; ${cubiertos.length} "ya cubiertos" a verificar; ${nVerif} verificadores por lote`)

const verificaciones = (await parallel(tandas.filter(t => t.length).map(tanda => () => agent(
  `Eres el verificador adversarial de una propuesta de modelado del área "${area}". Dos trabajos, sobre los lotes de abajo:

A) FIDELIDAD${modelo ? '' : ' (esta ejecución no tiene modelo: devuelve erroresFidelidad vacío)'}: compara cada propuesta (disciplina y acciones) contra la prosa ORIGINAL, línea a línea. Busca números distintos, niveles mal asignados, "sustituye" leído como "suma" o al revés, porNivel que debería ser "tabla", opciones inventadas u omitidas, resultados por grado que falten, requisitos, costes de fatiga horneados en la acción en vez de ModificadorFatiga. Aplica las DECISIONES DEL USUARIO del contexto (son firmes). Por cada fallo: item, ruta, problema, corrección concreta. No reportes estilo ni preferencias.

B) YA CUBIERTOS: intenta REFUTAR cada clasificación "lo entrega un mecanismo existente". Lee docs/motor.md y docs/modificadores-tiradas.md, y verifica en src/lib/rules (motor.ts, acciones.ts, condiciones.ts, modificadores.ts, equipo.ts, combate.ts, estados.ts, vitalidad.ts...) que:
- el afectaId existe de verdad (id fijo de acciones.ts o patrón de familia real) si es accion_existente;
- el mecanismo puede entregar ESE efecto (p.ej. eleccion_jugador exige un número fijo de catálogo, no calculado desde la ficha ni desde el nivel; siempre_activo exige que el efecto rija siempre, no solo mientras dura un poder activado);
- el tipo es el correcto de los cinco (objetivo_tercero es siempre texto);
- si el estado es "construido", LOCALIZA en el código el valor concreto que entrega. Un toggle que vale 0/0 o una nota que no menciona el efecto NO lo entrega;
- que la justificación no contradiga el estado.
Si falla cualquiera, "corregido" con la clasificación buena; si aguanta, "confirmado" repitiendo sus valores. En "claim" devuelve el id tal cual, sin corchetes. "No está construido para este elemento" NO es motivo para cambiar el mecanismo a hueco — se corrige el ESTADO. Cambia a hueco solo si ningún mecanismo de la lista lo entregaría ni con todos los datos. Tras cualquier corrección recalcula el estado.

${REGLAS_CONVENCION}

${CONTEXTO_MOTOR}

${CONTEXTO_AREA}

LOTES:
${tanda.map(r => {
  const cub = cubiertos.filter(e => e.lote === r.lote.id)
  return `## Lote ${r.lote.id}
Reglas comunes (prosa):
${comunesDeLote(r.lote)}
Propuesta de disciplina: ${JSON.stringify(r.clasificacion.disciplina)}
${r.items.map(it => `### ${it.id}
Prosa original:
${prosaDeItem(it)}
Propuesta: ${JSON.stringify(r.clasificacion.items.find(ci => ci.id === it.id)?.propuesta ?? null)}`).join('\n\n')}
"Ya cubiertos" a refutar (${cub.length}):
${cub.map(e => `  [${e.claim}] "${e.texto}" → tipo ${e.tipo}, afecta ${e.afectaModo}${e.afectaId ? ':' + e.afectaId : ''}, mecanismo ${e.mecanismo}, estado ${e.estado}. Justificación: ${e.justificacion}`).join('\n') || '  (ninguno)'}`
}).join('\n\n')}`,
  { phase: 'Verificar', label: `verificar:${tanda.map(r => r.lote.id).join('+')}`, schema: VERIFY_SCHEMA }
)))).filter(Boolean)
const veredictos = verificaciones.flatMap(v => v.veredictos)
const erroresFidelidad = verificaciones.flatMap(v => v.erroresFidelidad)
log(`Fidelidad: ${erroresFidelidad.length} errores en las propuestas`)

const veredictoDe = new Map(veredictos.map(v => [normId(v.claim), v]))
if (incoherencias.length) log(`${incoherencias.length} incoherencias de esquema normalizadas`)
const sinVeredicto = cubiertos.filter(e => !veredictoDe.has(e.claim)).map(e => e.claim)
if (sinVeredicto.length) log(`AVISO: ${sinVeredicto.length} "ya cubiertos" sin veredicto (quedan como no verificados): ${sinVeredicto.join(', ')}`)

const efectosFinales = efectos.map(e => {
  const v = veredictoDe.get(e.claim)
  if (!v) return { ...e, verificacion: e.mecanismo && e.mecanismo !== 'hueco' ? 'sin_verificar' : 'no_aplica' }
  if (v.veredicto === 'confirmado') return { ...e, estado: v.estado, bloqueoPor: v.bloqueoPor, verificacion: 'confirmado' }
  return {
    ...e,
    tipo: v.tipo, afectaModo: v.afectaModo, afectaId: v.afectaId, mecanismo: v.mecanismo, hueco: v.hueco,
    estado: v.estado,
    bloqueoPor: v.bloqueoPor,
    verificacion: 'corregido',
    original: { tipo: e.tipo, afectaModo: e.afectaModo, afectaId: e.afectaId, mecanismo: e.mecanismo },
    razonCorreccion: v.razon,
  }
})
log(`Verificación: ${veredictos.filter(v => v.veredicto === 'confirmado').length} confirmados, ${veredictos.filter(v => v.veredicto === 'corregido').length} corregidos`)

// ── Cobertura: % de efectos con destino que no es "pregunta" ─────────────
const cuenta = es => Object.fromEntries(DESTINOS.map(d => [d, es.filter(e => e.destino === d).length]))
const pct = es => es.length ? Math.round(100 * es.filter(e => e.destino !== 'pregunta' && !(e.destino === 'parametro' && !e.ruta)).length / es.length) : 100
const cobertura = {
  global: { efectos: efectosFinales.length, pct: pct(efectosFinales), ...cuenta(efectosFinales), camposNuevos: efectosFinales.filter(e => e.campoNuevo).length },
  porItem: [...new Set(efectosFinales.map(e => e.item))].map(id => {
    const es = efectosFinales.filter(e => e.item === id)
    return { item: id, efectos: es.length, pct: pct(es), ...cuenta(es) }
  }),
}
log(`Cobertura: ${cobertura.global.pct}% (${cobertura.global.pregunta} a pregunta, ${cobertura.global.camposNuevos} piden campo nuevo)`)
// Ruta genérica ("ejes.nivel.opciones.3.fatiga" → "ejes.*.opciones.*.fatiga") para contar qué campos del modelo se usan.
const rutaGenerica = r => r.split('.').map(p => (/^\d+$/.test(p) ? '*' : p)).join('.').replace(/^ejes\.[^.]+/, 'ejes.*')
const usoCampos = {}
for (const e of efectosFinales) if (e.destino === 'parametro' && e.ruta) (usoCampos[rutaGenerica(e.ruta)] ??= new Set()).add(e.item)

// ── Fase 4: agrupar huecos en capas (barrera: necesita todos) ────────────
const huecos = efectosFinales.filter(e => e.mecanismo === 'hueco' || (e.mecanismo === 'accion_sin_equipo'))
const agrupado = await agent(
  `Agrupa en CAPAS NUEVAS del motor los huecos detectados al modelar el área "${area}". Una capa = una pieza de motor que habría que construir una vez y que desbloquea muchos efectos (p.ej. "tirada de manifestación de un poder", "gasto de fatiga al confirmar", "selector de nivel empleado que cambia coste/alcance", "estado con duración infligido a un objetivo", "concentración/mantenimiento de un efecto activo"). Junta huecos que piden LO MISMO aunque estén redactados distinto; separa los que solo se parecen de nombre. Incluye los efectos con mecanismo accion_sin_equipo (mecanismo previsto pero no construido).

Lee docs/motor.md y src/lib/rules para decidir, en "ampliaA", si la capa es la ampliación de algo que ya existe (CondicionTirada, AccionDirecta, EstadoActivo, fatiga en vitalidad.ts...) o algo "nuevo". dependeDe = ids de otras capas que necesita antes. Cada capa lista los items (ids) y los claims que desbloquea. No inventes capas sin huecos que las respalden. Si varias capas dependen de una decisión del diseñador, ponla en preguntasTransversales.

${modelo ? `Además, dos listas sobre el MODELO OBJETIVO:
- camposModelo: por cada campo del modelo que usan los efectos (lista de abajo, con los items que lo usan), qué tiene que hacer la tubería de la app con él (p.ej. "ejes.*.opciones.*.fatiga → selector de nivel empleado en el modal que fija el coste antes de la cadena de ModificadorFatiga"). Agrupa rutas que son el mismo campo.
- camposNuevos: consolida los campoNuevo propuestos (juntando los que piden lo mismo), con la forma que tendría el campo y los claims que lo necesitan.

MODELO OBJETIVO:
${modelo}

CAMPOS USADOS (ruta genérica → items):
${Object.entries(usoCampos).sort((a, b) => b[1].size - a[1].size).map(([r, its]) => `- ${r}: ${[...its].join(', ')}`).join('\n')}

CAMPOS NUEVOS PROPUESTOS:
${efectosFinales.filter(e => e.campoNuevo).map(e => `- [${e.claim}] "${e.texto}" → ${e.campoNuevo}`).join('\n') || '(ninguno)'}` : 'Esta ejecución no tiene modelo objetivo: devuelve camposModelo y camposNuevos vacíos.'}

HUECOS (${huecos.length}):
${huecos.map(e => `- [${e.claim}] item ${e.item}: "${e.texto}" → ${e.mecanismo === 'hueco' ? 'falta: ' + e.hueco : 'accion_sin_equipo'}${e.verificacion === 'corregido' ? ' (tras verificación)' : ''}`).join('\n')}`,
  { phase: 'Agrupar', label: 'agrupar-capas', schema: AGRUPAR_SCHEMA }
)

// ── Fase 5: redactar ─────────────────────────────────────────────────────
const resultado = {
  area,
  fuente,
  items: lotesOk.flatMap(r => r.clasificacion.items.map(ci => ({
    ...ci,
    lote: r.lote.id,
    label: r.lote.items.find(i => i.id === ci.id)?.label ?? ci.id,
    referencia: r.lote.items.find(i => i.id === ci.id)?.referencia,
    efectos: efectosFinales.filter(e => e.item === ci.id),
  }))),
  comunes: lotesOk.map(r => ({
    lote: r.lote.id,
    efectos: efectosFinales.filter(e => e.item === `${r.lote.id}._comunes`),
    preguntas: r.clasificacion.preguntasComunes,
  })),
  disciplinas: lotesOk.map(r => ({ lote: r.lote.id, propuesta: r.clasificacion.disciplina })),
  erroresFidelidad,
  cobertura,
  camposModelo: agrupado?.camposModelo ?? [],
  camposNuevos: agrupado?.camposNuevos ?? [],
  capas: agrupado?.capas ?? [],
  preguntasTransversales: agrupado?.preguntasTransversales ?? [],
  avisos: { lotesCaidos: caidos, sinVeredicto, incoherencias },
}

const instruccionesDoc = calibracion
  ? `Esto es una CALIBRACIÓN: cada item trae en "referencia" su MotorMetadata real (auditado, por nivel). NO escribas ningún archivo. Devuelve como texto un informe markdown breve y esquemático:
- Antes de puntuar, agrega los efectos propuestos por (item, nivel, tipo, afecta, mecanismo): varios claims con la misma terna cuentan como uno.
- Separa "fallo de la propuesta" de "corrección justificada" (la referencia usa un id que no existe o un mecanismo que no entrega el valor): puntúa las dos tasas.
- Por item: qué efectos de la referencia reprodujo la propuesta (tipo + afecta + mecanismo), cuáles falló o se inventó, y si el estado construido/pendiente encaja con mecanismo vs hueco.
- Tasa global de acierto en tipo, en afecta y en mecanismo.
- Patrones de error y qué cambiarías en los prompts de extraer/clasificar/verificar para corregirlos.`
  : `Escribe el documento ${salida} (créalo con Write; si existe, sobrescríbelo) en español, esquemático (subtítulos, tablas, bullets; nada de párrafos largos). Estructura:
1. Cabecera: qué es (salida del workflow modelar-area sobre ${fuente}), que es propuesta sin construir y que docs/sistema.md manda.
2. COBERTURA (lo primero que mira el usuario): % global y tabla por item (efectos, % cubierto, nº por destino). Lista de lo que impide el 100%: efectos a "pregunta" y efectos con campoNuevo sin consolidar.
3. Checklist del modelo: por cada disciplina y acción, ✓/✗ de cada campo del MODELO OBJETIVO (relleno / no aplica / falta), para que el usuario compruebe que no falta nada.
4. Campos del modelo que leerá la tubería (camposModelo) ordenados por nº de items, con qué hace la app con cada uno; y campos nuevos propuestos (camposNuevos).
5. Capas de motor ordenadas por nº de items que desbloquean: tabla (capa, amplía a, items, nº efectos, depende de).
6. Por disciplina y acción: ejes de uso con sus opciones (nivel empleado → economía/fatiga/alcance/tirada), ajustes por nivel poseído, y una MATRIZ "nivel poseído × qué opciones puede usar y con qué coste efectivo" cuando haya eje de nivel empleado (aplicando ajustes por nivel poseído y ModificadorFatiga de la disciplina). Después, tabla de efectos (agregando claims con la misma terna en una fila) con destino/ruta y MotorMetadata propuesto; marca los corregidos en verificación.
7. Errores de fidelidad encontrados por el verificador y cómo se han aplicado.
8. Preguntas para el diseñador, deduplicadas y agrupadas por disciplina, más las transversales.
9. Avisos del proceso (lotes caídos, efectos sin verificar, incoherencias normalizadas), si los hay.
ADEMÁS escribe ${salidaJson}: el borrador de catálogo, un array de Disciplina del MODELO OBJETIVO con sus acciones (propuesta de cada item, con cada MotorMetadata en "motor"), APLICANDO las correcciones de erroresFidelidad. JSON válido, sin comentarios.
Al terminar devuelve solo 5-8 líneas: rutas escritas, cobertura, nº de preguntas, las 3 capas y los 3 campos más usados.`

const informe = await agent(
  `Redacta el resultado del workflow modelar-area para el área "${area}".
${instruccionesDoc}

RESULTADO (JSON):
${JSON.stringify(resultado)}`,
  { phase: 'Redactar', label: calibracion ? 'informe-calibracion' : `redactar:${salida}` }
)

return { informe, resultado }
