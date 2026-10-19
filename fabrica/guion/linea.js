// La línea de la fábrica: guion de Workflow que mueve UN contrato por las estaciones.
//
//   preparar worktree → inspector → [constructor → revisión por script → revisor → juez] × hasta 3 intentos
//
// Lo lanza el Jefe (skill /fabrica) con el ok del usuario y el contrato en "encolado":
//   Workflow({ scriptPath: 'fabrica/guion/linea.js', args: { contrato: '<ruta absoluta al contrato>' } })
//
// El orden, las puertas y las vueltas están aquí, en código. Lo determinista (estados, worktree, alcance, juez) lo
// hacen scripts de fabrica/guion y fabrica/juez, que ejecuta el agente fabrica-operario: un guion de Workflow no
// tiene disco ni shell. Las reglas de cada estación están en fabrica/estaciones/*.md; aquí solo va lo variable.
//
// Ningún LLM transporta datos entre pasos: lo que decide una estación (votos del revisor, bloqueo del constructor)
// lo escribe ella en un JSON junto al contrato (fabrica/guion/entregas.mjs) y el juez lo lee de ahí. Los comandos
// del operario son fijos y cortos: rutas, números y nada que un LLM tenga que copiar con cuidado.
export const meta = {
  name: 'fabrica-linea',
  description: 'La línea de la fábrica: inspección, worktree, construcción, revisión y juez, con hasta 2 vueltas',
  whenToUse: 'Lo lanza el Jefe (skill /fabrica) con el ok del usuario a un contrato en estado encolado; args {contrato: ruta absoluta}',
  phases: [
    { title: 'Preparar', detail: 'worktree fuera del repo con la rama del contrato' },
    { title: 'Inspección', detail: 'el inspector revisa los criterios antes de construir, leyendo el worktree' },
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
const TRABAJOS = `${REPO}/fabrica/trabajos`

// ---------- utilidades ----------

const q = s => `'${String(s).replace(/'/g, `'\\''`)}'`

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
const OPERARIO = { llamadas: 0, sinRespuesta: 0, sinJson: 0 }

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
  if (!json) return { ok: false, error: `${etiqueta}: la salida no trae JSON (código ${r.codigo}): ${String(r.salida).slice(-600)}` }
  return json
}

// "fallos/llamadas" para el frontmatter (lo lee el visor, fabrica/panel). Cuenta ya la llamada que lo lleva.
function marcaOperario() {
  return `${OPERARIO.sinRespuesta + OPERARIO.sinJson}/${OPERARIO.llamadas + 1}`
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
  // 1. Worktree. Va antes de la inspección para que el inspector, que no tiene shell, lea el código de la base con
  // Read. Si la inspección devuelve el contrato, el worktree se queda: preparar.mjs es idempotente.
  phase('Preparar')
  const inicio = await ponerEstado('inspeccion', 'Preparar', 'encolado')
  const { id, rama } = inicio
  const BASE = inicio.base || 'main'
  // Repetir un trabajo pasado: el arreglo real ya está en main. Mirarlo sería copiar el examen.
  const SIN_CHULETA = BASE === 'main' ? '' : `
Este trabajo sale de ${BASE}, no de main: el código de referencia es el de ${BASE}. NO mires main, commits posteriores
a ${BASE} ni otras ramas (nada de git log/show/diff sobre ellos): es un ensayo y la solución ya existe.`
  const ids = inicio.criterios
  log(`${id}: ${ids.length} criterios (${ids.join(', ')}), rama ${rama}`)
  const VOTOS = `${TRABAJOS}/.votos-${id}.json`
  const OBRA = `${TRABAJOS}/.obra-${id}.json`

  const prep = await operario(`node ${q(`${GUION}/preparar.mjs`)} ${q(CONTRATO)}`, 'preparar', 'Preparar')
  if (!prep.ok) throw new FalloLinea(`preparar.mjs: ${prep.error}`)
  const W = prep.worktree
  log(`worktree ${W} (${prep.creado ? 'nuevo' : 'reutilizado'}; node_modules: ${prep.nodeModules}; prisma: ${prep.prisma}; .env: ${prep.env})`)

  // 2. Inspección
  phase('Inspección')
  const inspeccion = await agent(
    `Contrato: ${CONTRATO}
Escribe tu sección Inspección en ese archivo (ruta absoluta). Si ya tiene una pasada anterior, añade la nueva debajo con
el título "Pasada N", sin borrar la anterior.
El código de referencia está en el worktree del trabajo, ${W} (rama ${rama}, sale de ${BASE}). Léelo ahí con Read, Grep
y Glob, con rutas absolutas bajo ${W}; no uses el código del árbol principal.${SIN_CHULETA}
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
    log(`${id}: la inspección devuelve el contrato al Jefe (el worktree se queda)`)
    return { fin: 'vuelve al jefe', contrato: CONTRATO, id, worktree: W, inspeccion: inspeccion.resumen }
  }

  // 3. Construcción → revisión → juez, hasta 3 intentos
  const construccion = []
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
y lees y editas el código con rutas absolutas bajo ${W}. En el árbol principal no tocas nada salvo tu sección del contrato (y, si paras, el archivo de bloqueo de abajo).
Tu sección Construcción la escribes en el contrato del árbol principal, por su ruta absoluta (${CONTRATO}).
Intento ${intento} de ${MAX_VUELTAS + 1}.${enVuelta}${SIN_CHULETA}
Al terminar, deja todo commiteado en la rama (el worktree limpio).
Si paras (bloqueo), además de explicarlo en Construcción, crea con Write el archivo ${OBRA} con exactamente este JSON:
{"id":"${id}","vuelta":${vuelta},"bloqueo":"<motivo en una frase>"}
Ese archivo es lo que lee el juez para escalar; si no paras, no lo crees.
Devuelve un resumen de 2-4 líneas.`,
      {
        agentType: 'fabrica-constructor', phase: 'Construcción', label: `constructor:${id}#${intento}`,
        schema: {
          type: 'object',
          properties: { resumen: { type: 'string' } },
          required: ['resumen'],
        },
      },
    )
    if (!obra) throw new FalloLinea(`el constructor no devolvió nada (intento ${intento})`)
    construccion.push(obra.resumen)

    // revision.mjs mira primero .obra: si el constructor paró, no revisa y lo dice; el juez escala leyendo el archivo.
    phase('Revisión')
    await ponerEstado('revision', 'Revisión')
    const rev = await operario(
      `node ${q(`${GUION}/revision.mjs`)} ${q(CONTRATO)} ${q(W)} --vuelta ${vuelta}`, `revision#${intento}`, 'Revisión',
    )
    if (!rev.ok) throw new FalloLinea(`revision.mjs: ${rev.error}`)
    if (rev.bloqueo) {
      log(`el constructor declara bloqueo (${OBRA}): sin revisión, al juez`)
    } else {
      log(`script: ${rev.revisar} · alcance: ${rev.alcance}${rev.fuera.length ? ` (fuera: ${rev.fuera.join(', ')})` : ''}`)

      const suyos = ids.filter(c => c !== 'C1' && c !== 'C2')
      if (suyos.length) {
        const revisor = await agent(
          `Contrato: ${CONTRATO} (árbol principal). Es el único que te toca.
Worktree del trabajo: ${W}, rama ${rama}. El diff es \`git -C ${q(W)} diff ${BASE}...${rama}\`. Lees el código con rutas
absolutas bajo ${W}; si necesitas la app, la levantas desde ahí (\`cd ${q(W)} && npx next dev -p <puerto libre>\`).
Tu bloque va en la sección Revisión del contrato del árbol principal, por su ruta absoluta (${CONTRATO}).
Intento ${intento}${vuelta > 0 ? `: añade tu bloque como "### Intento ${intento}" debajo del anterior, sin borrarlo` : ''}.
Ya votados por script, no los votes tú: C1 (tests y tsc), C2 (alcance) y push seguro. Resultado: ${rev.revisar}; alcance ${rev.alcance}. Detalle en ${rev.archivo}.${SIN_CHULETA}
Te tocan: ${suyos.join(', ')}.
Tus votos los lee el juez de un archivo, no de tu respuesta: créalo con Write en ${VOTOS} (ruta absoluta, árbol
principal), con "id" "${id}" y "vuelta" ${vuelta}, en la forma que dice tu estación (fabrica/estaciones/revisor.md).
Devuelve solo un resumen de 1-3 líneas y cuántos criterios has votado en el archivo.`,
          {
            agentType: 'fabrica-revisor', phase: 'Revisión', label: `revisor:${id}#${intento}`,
            schema: {
              type: 'object',
              properties: { resumen: { type: 'string' }, votados: { type: 'integer' } },
              required: ['resumen', 'votados'],
            },
          },
        )
        if (!revisor) throw new FalloLinea(`el revisor no devolvió nada (intento ${intento})`)
        log(`revisor: ${revisor.votados}/${suyos.length} votados en ${VOTOS} · ${revisor.resumen}`)
      } else {
        log('sin criterios para el revisor: solo votan el script y el alcance')
      }
    }

    // El comando del juez es fijo: lo que juzga lo lee de .revision, .votos y .obra.
    phase('Juicio')
    juicio = await operario(
      `node ${q(JUEZ)} ${q(CONTRATO)} --vuelta ${vuelta} --operario ${marcaOperario()}`, `juez#${intento}`, 'Juicio',
    )
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
    votos: VOTOS,
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
