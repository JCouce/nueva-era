// La línea de la fábrica: guion de Workflow que mueve UN contrato por las estaciones.
//
//   inspector → preparar worktree → [constructor → revisión por script → revisor → juez] × hasta 3 intentos
//
// Lo lanza el Jefe (skill /fabrica) con el ok del usuario y el contrato en "encolado":
//   Workflow({ scriptPath: 'fabrica/guion/linea.js', args: { contrato: '<ruta absoluta al contrato>' } })
//
// El orden, las puertas y las vueltas están aquí, en código. Lo determinista (estados, worktree, alcance, juez) lo
// hacen scripts de fabrica/guion y fabrica/juez, que ejecuta el agente fabrica-operario: un guion de Workflow no
// tiene disco ni shell. Las reglas de cada estación están en fabrica/estaciones/*.md; aquí solo va lo variable.
export const meta = {
  name: 'fabrica-linea',
  description: 'La línea de la fábrica: inspección, worktree, construcción, revisión y juez, con hasta 2 vueltas',
  whenToUse: 'Lo lanza el Jefe (skill /fabrica) con el ok del usuario a un contrato en estado encolado; args {contrato: ruta absoluta}',
  phases: [
    { title: 'Inspección', detail: 'el inspector revisa los criterios antes de construir' },
    { title: 'Preparar', detail: 'worktree fuera del repo con la rama del contrato' },
    { title: 'Construcción', detail: 'el constructor implementa en el worktree' },
    { title: 'Revisión', detail: 'script (tests, tsc, lint, push seguro, alcance) y revisor' },
    { title: 'Juicio', detail: 'reglas fijas: contigo, vuelve o escalado' },
  ],
}

const MAX_VUELTAS = 2

const CONTRATO = args && args.contrato
if (typeof CONTRATO !== 'string' || !/^\/.+\/fabrica\/trabajos\/T-\d{3,}[^/]*\.md$/.test(CONTRATO)) {
  return { fin: 'error', motivo: 'args.contrato tiene que ser la ruta absoluta a fabrica/trabajos/T-xxx-<slug>.md del árbol principal' }
}
const REPO = CONTRATO.replace(/\/fabrica\/trabajos\/[^/]+$/, '')
const GUION = `${REPO}/fabrica/guion`
const JUEZ = `${REPO}/fabrica/juez/juez.mjs`

// ---------- utilidades ----------

const q = s => `'${String(s).replace(/'/g, `'\\''`)}'`

// FNV-1a de 32 bits. Copia exacta de suma() en fabrica/juez/juez.mjs (un test de juez las compara).
function suma(texto) {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

// JSON en una línea en el que los strings llevan espacio, punto, igual y guion como \uXXXX: sigue siendo el mismo
// JSON, pero la evidencia del revisor ("git push", ".env", "DATABASE_URL=") ya no dispara el hook de bloqueos
// sobre el comando del operario. Copia exacta en el test de juez.
function jsonParaShell(obj) {
  return JSON.stringify(obj).replace(/"(?:[^"\\]|\\.)*"/g, lit =>
    lit.replace(/[ .=-]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')))
}

function ultimoJson(salida) {
  const lineas = String(salida ?? '').trim().split('\n').map(l => l.trim()).filter(l => l.startsWith('{')).reverse()
  for (const l of lineas) {
    try { return JSON.parse(l) } catch { /* sigue con la anterior */ }
  }
  return null
}

const OPERARIO_SCHEMA = {
  type: 'object',
  properties: {
    codigo: { type: 'integer', description: 'código de salida del comando' },
    salida: { type: 'string', description: 'stdout completo, tal cual' },
  },
  required: ['codigo', 'salida'],
}

// Ratio de fallos del operario: es un LLM transcribiendo, y se mide para decidir si merece la pena sustituirlo.
const OPERARIO = { llamadas: 0, sinRespuesta: 0, sinJson: 0, sumaMal: 0 }

async function operario(comando, etiqueta, fase) {
  OPERARIO.llamadas++
  const r = await agent(
    `Ejecuta este comando con Bash, una sola vez y tal cual, sin cambiar ni un carácter. Va entre las marcas, sin ellas:

>>>>>> COMANDO
${comando}
<<<<<< FIN DEL COMANDO

Devuelve en "codigo" su código de salida y en "salida" su stdout completo, sin tocarlo.`,
    { agentType: 'fabrica-operario', schema: OPERARIO_SCHEMA, label: `operario:${etiqueta}`, phase: fase, effort: 'low' },
  )
  if (!r) {
    OPERARIO.sinRespuesta++
    return { ok: false, error: `el operario (${etiqueta}) no devolvió nada` }
  }
  const json = ultimoJson(r.salida)
  if (!json) OPERARIO.sinJson++
  else if (json.ok === false && json.error === 'suma') OPERARIO.sumaMal++
  if (!json) return { ok: false, error: `${etiqueta}: la salida no trae JSON (código ${r.codigo}): ${String(r.salida).slice(-600)}` }
  return json
}

// "fallos/llamadas" para el frontmatter (lo lee el visor, fabrica/panel). Cuenta ya la llamada que lo lleva.
function marcaOperario() {
  return `${OPERARIO.sinRespuesta + OPERARIO.sinJson + OPERARIO.sumaMal}/${OPERARIO.llamadas + 1}`
}

class FalloLinea extends Error {}

async function ponerEstado(estado, fase, desde) {
  const r = await operario(
    `node ${q(`${GUION}/contrato.mjs`)} estado ${q(CONTRATO)} ${estado}${desde ? ` --desde ${desde}` : ''} --operario ${marcaOperario()}`,
    `estado→${estado}`, fase,
  )
  if (!r.ok) throw new FalloLinea(`no pude pasar el contrato a "${estado}": ${r.error}`)
  return r
}

// ---------- la línea ----------

async function linea() {
  // 1. Inspección
  phase('Inspección')
  const inicio = await ponerEstado('inspeccion', 'Inspección', 'encolado')
  const { id, rama } = inicio
  const BASE = inicio.base || 'main'
  // Repetir un trabajo pasado: el arreglo real ya está en main. Mirarlo sería copiar el examen.
  const SIN_CHULETA = BASE === 'main' ? '' : `
Este trabajo sale de ${BASE}, no de main: el código de referencia es el de ${BASE}. NO mires main, commits posteriores
a ${BASE} ni otras ramas (nada de git log/show/diff sobre ellos): es un ensayo y la solución ya existe.`
  const ids = inicio.criterios
  log(`${id}: ${ids.length} criterios (${ids.join(', ')}), rama ${rama}`)

  const inspeccion = await agent(
    `Contrato: ${CONTRATO}
Escribe tu sección Inspección en ese archivo (ruta absoluta). Si ya tiene una pasada anterior, añade la nueva debajo con
el título "Pasada N", sin borrar la anterior.${BASE === 'main' ? '' : `
El código de referencia es el de ${BASE}: léelo con \`git show ${BASE}:<ruta>\`, no del árbol principal.`}${SIN_CHULETA}
Devuelve tu veredicto y un resumen de 1-3 líneas (qué criterio tiene problema y por qué, o "ok").`,
    {
      agentType: 'fabrica-inspector', phase: 'Inspección', label: `inspector:${id}`,
      schema: {
        type: 'object',
        properties: {
          veredicto: { type: 'string', enum: ['pasa', 'vuelve al jefe'] },
          resumen: { type: 'string' },
        },
        required: ['veredicto', 'resumen'],
      },
    },
  )
  if (!inspeccion) throw new FalloLinea('el inspector no devolvió nada')
  if (inspeccion.veredicto !== 'pasa') {
    await ponerEstado('spec', 'Inspección')
    log(`${id}: la inspección devuelve el contrato al Jefe`)
    return { fin: 'vuelve al jefe', contrato: CONTRATO, id, inspeccion: inspeccion.resumen }
  }

  // 2. Worktree
  phase('Preparar')
  const prep = await operario(`node ${q(`${GUION}/preparar.mjs`)} ${q(CONTRATO)}`, 'preparar', 'Preparar')
  if (!prep.ok) throw new FalloLinea(`preparar.mjs: ${prep.error}`)
  const W = prep.worktree
  log(`worktree ${W} (${prep.creado ? 'nuevo' : 'reutilizado'}; node_modules: ${prep.nodeModules}; prisma: ${prep.prisma}; .env: ${prep.env})`)

  // 3. Construcción → revisión → juez, hasta 3 intentos
  const construccion = []
  let hallazgos = []
  let juicio = null
  for (let vuelta = 0; vuelta <= MAX_VUELTAS; vuelta++) {
    const intento = vuelta + 1
    const enVuelta = vuelta > 0
      ? `\nEs una vuelta: el juez te devolvió el trabajo. Falla: ${juicio.fallan.join(', ')}. Motivo: ${juicio.motivo}.
Lee el último bloque de la sección Juicio del contrato (tiene la evidencia). Añade tu bloque como "### Intento ${intento}"
debajo del anterior, sin borrarlo.`
      : ''

    phase('Construcción')
    await ponerEstado('construyendo', 'Construcción')
    const obra = await agent(
      `Contrato: ${CONTRATO} (árbol principal). Es el único que te toca.
Worktree del trabajo: ${W}, en la rama ${rama}. Trabaja SOLO ahí: cada comando de Bash empieza por \`cd ${q(W)} && \`,
y lees y editas el código con rutas absolutas bajo ${W}. En el árbol principal no tocas nada salvo tu sección del contrato.
Tu sección Construcción la escribes en el contrato del árbol principal, por su ruta absoluta (${CONTRATO}).
Intento ${intento} de ${MAX_VUELTAS + 1}.${enVuelta}${SIN_CHULETA}
Al terminar, deja todo commiteado en la rama (el worktree limpio). Devuelve un resumen de 2-4 líneas y, si paraste,
el motivo en "bloqueo" (si no, null).`,
      {
        agentType: 'fabrica-constructor', phase: 'Construcción', label: `constructor:${id}#${intento}`,
        schema: {
          type: 'object',
          properties: { resumen: { type: 'string' }, bloqueo: { type: ['string', 'null'] } },
          required: ['resumen'],
        },
      },
    )
    if (!obra) throw new FalloLinea(`el constructor no devolvió nada (intento ${intento})`)
    construccion.push(obra.resumen)
    const bloqueo = obra.bloqueo && String(obra.bloqueo).trim() ? String(obra.bloqueo).trim() : null

    let revisor = null
    if (!bloqueo) {
      phase('Revisión')
      await ponerEstado('revision', 'Revisión')
      const rev = await operario(
        `node ${q(`${GUION}/revision.mjs`)} ${q(CONTRATO)} ${q(W)} --vuelta ${vuelta}`, `revision#${intento}`, 'Revisión',
      )
      if (!rev.ok) throw new FalloLinea(`revision.mjs: ${rev.error}`)
      log(`script: ${rev.revisar} · alcance: ${rev.alcance}${rev.fuera.length ? ` (fuera: ${rev.fuera.join(', ')})` : ''}`)

      const suyos = ids.filter(c => c !== 'C1' && c !== 'C2')
      if (suyos.length) {
        revisor = await agent(
          `Contrato: ${CONTRATO} (árbol principal). Es el único que te toca.
Worktree del trabajo: ${W}, rama ${rama}. El diff es \`git -C ${q(W)} diff ${BASE}...${rama}\`. Lees el código con rutas
absolutas bajo ${W}; si necesitas la app, la levantas desde ahí (\`cd ${q(W)} && npx next dev -p <puerto libre>\`).
Tu bloque va en la sección Revisión del contrato del árbol principal, por su ruta absoluta (${CONTRATO}).
Intento ${intento}${vuelta > 0 ? `: añade tu bloque como "### Intento ${intento}" debajo del anterior, sin borrarlo` : ''}.
Ya votados por script, no los votes tú: C1 (tests y tsc), C2 (alcance) y push seguro. Resultado: ${rev.revisar}; alcance ${rev.alcance}. Detalle en ${rev.archivo}.${SIN_CHULETA}
Te tocan: ${suyos.join(', ')}. Devuelve por cada uno veredicto y evidencia; en "dudaDiseno", el motivo si el trabajo
plantea una decisión de diseño que no se puede resolver con los criterios (si no, null); los hallazgos, aparte.`,
          {
            agentType: 'fabrica-revisor', phase: 'Revisión', label: `revisor:${id}#${intento}`,
            schema: {
              type: 'object',
              properties: {
                criterios: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      veredicto: { type: 'string', enum: ['pasa', 'falla', 'no aplica'] },
                      evidencia: { type: 'string' },
                    },
                    required: ['id', 'veredicto', 'evidencia'],
                  },
                },
                dudaDiseno: { type: ['string', 'null'] },
                hallazgos: { type: 'array', items: { type: 'string' } },
              },
              required: ['criterios', 'dudaDiseno', 'hallazgos'],
            },
          },
        )
        if (!revisor) throw new FalloLinea(`el revisor no devolvió nada (intento ${intento})`)
        hallazgos = revisor.hallazgos ?? []
      } else {
        log('sin criterios para el revisor: solo votan el script y el alcance')
      }
    } else {
      log(`el constructor declara bloqueo: ${bloqueo}`)
    }

    phase('Juicio')
    const entrada = jsonParaShell({
      vuelta,
      bloqueo,
      dudaDiseno: revisor ? revisor.dudaDiseno : null,
      revisor: revisor ? { criterios: revisor.criterios } : null,
    })
    const comandoJuez = () =>
      `node ${q(JUEZ)} ${q(CONTRATO)} --suma ${suma(entrada)} --operario ${marcaOperario()} <<'FIN_JUEZ'\n${entrada}\nFIN_JUEZ`
    juicio = await operario(comandoJuez(), `juez#${intento}`, 'Juicio')
    if (!juicio.ok && juicio.error === 'suma') {
      log('la entrada del juez llegó mal copiada; repito una vez')
      juicio = await operario(comandoJuez(), `juez#${intento}-bis`, 'Juicio')
    }
    if (!juicio.ok) throw new FalloLinea(`juez: ${juicio.error}`)
    log(`juez, intento ${intento}: ${juicio.decision} (${juicio.motivo})`)
    if (juicio.decision !== 'vuelve') break
  }

  if (juicio.decision === 'vuelve') throw new FalloLinea('el juez pidió otra vuelta después del tercer intento')

  return {
    fin: juicio.decision,
    motivo: juicio.motivo,
    contrato: CONTRATO,
    id,
    rama,
    worktree: W,
    vueltas: juicio.vueltas,
    criterios: juicio.veredictos,
    inspeccion: inspeccion.resumen,
    construccion,
    hallazgos,
    operario: OPERARIO,
  }
}

try {
  return await linea()
} catch (error) {
  const motivo = error && error.message ? error.message : String(error)
  log(`ERROR de la línea: ${motivo}`)
  // Un fallo de la propia línea no es culpa del trabajo: se escala para que el Jefe lo mire con el usuario.
  if (error instanceof FalloLinea) {
    try { await ponerEstado('escalado', 'Juicio') } catch { /* el motivo ya va en la respuesta */ }
  }
  return { fin: 'error', motivo, contrato: CONTRATO, operario: OPERARIO }
}
