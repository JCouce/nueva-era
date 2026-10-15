// ─────────────────────────────────────────────────────────────────────────
// AUDITORÍA motorMetadata-vs-prosa — qué es y cómo se usa
// ─────────────────────────────────────────────────────────────────────────
//
// QUÉ HACE
// Para cada pieza (o nivel de pieza) del catálogo de equipo, compara lo que
// promete la prosa (`detalle`/`descripcion`) contra lo que de verdad entrega
// el código (`modificadores`/`ajusteTramo`/`ajusteAtaque`/`condiciones`),
// usando `motorMetadata` (docs/motor.md) como clasificación de referencia.
// El motor.test.ts existente ya valida que cada MotorMetadata tenga forma
// correcta (schema) — esto valida que el CONTENIDO coincida con la prosa,
// que es justo lo que un test de Zod no puede comprobar.
//
// Nace del barrido del 2026-09-24 (ver docs/sistema.md, pregunta 25b, y el
// historial de mejorasArma.ts/armasFuego.ts/combate.ts de esa fecha): validado
// primero en un piloto de 13 items (mejorasArma.ts) y después contra el
// catálogo completo (182 items, ~50 hallazgos reales confirmados, 204 gaps ya
// reconocidos correctamente filtrados).
//
// CÓMO SE USA
// 1. Extrae el catálogo a JSON (import real, no transcripción — ver el propio
//    script para el motivo):
//      node --import ./scripts/test-resolver.mjs \
//        scripts/workflows/auditoria-motor-metadata-extraer.ts /ruta/de/salida.json
//    Filtra con `--familia equipo|dote|todo` y, para dotes, `--estado` /
//    `--tanda D2a|D2b-1|D2b-2|D2c|D2d` (D2a = efectos construidos), y
//    `--en-tirada` para dejar fuera las de solo texto de tarjeta. Las dotes
//    llevan `familia: "dote"`, la prosa de docs/dotes.md en `detalle` y lo que
//    la app pone de verdad en las tiradas (casillas, bonos fijos, notas).
// 2. Lanza este workflow con Workflow({ name: 'auditoria-motor-metadata',
//    args: <el JSON del paso 1, como valor, NO como string> }).
//    MODO POR LOTES (dotes, 2026-10-16): args = { items: <el JSON>, lote: N }. Un
//    agente compara N items de una vez (prosa + código en la misma pasada) y otro
//    verifica todas las discrepancias del lote: ~2 agentes por lote en vez de
//    2 por item + 1 por discrepancia. Pensado para catálogos con poca prosa por
//    item (dotes, 4-5 por lote); el equipo sigue con la lista suelta (modo de
//    siempre). Para no meter el JSON en el contexto principal, genera con node un
//    envoltorio con los args incrustados que llame a
//    `workflow({ scriptPath: '<repo>/.claude/workflows/auditoria-motor-metadata.js' }, ARGS)`
//    y lánzalo con `scriptPath` (mismo truco que modelar-area).
// 3. El resultado trae dos listas: `confirmadas` (hallazgos reales, ya
//    verificados adversarialmente) y `gapsConocidos` (discrepancias que el
//    propio dato ya reconoce vía `estado: pendiente/bloqueado/ad_hoc` — no
//    son hallazgos nuevos, no hace falta re-arreglarlos).
//
// MEJORES PRÁCTICAS (aprendidas a base de tropezar)
//
// - **NUNCA leas el JSON extraído en tu propio contexto solo para copiarlo al
//   `args` de la llamada.** Un catálogo de tamaño medio son ~100K+ tokens
//   tokenizados — se comió el contexto la primera vez. Delega "extraer +
//   lanzar el Workflow" a un fork/subagente: que el JSON viva en SU contexto,
//   tú solo recibes el resultado ya resumido.
// - **Cuidado con el tamaño de `args` en una sola llamada.** El barrido
//   completo (182 items) se quedó corto de tokens a mitad de pegar el array
//   y hubo que partirlo en dos tandas, con solape que luego tocó deduplicar
//   a mano por `piezaId`+`nivel`. Si el catálogo crece mucho, parte `args`
//   en lotes de un tamaño conocido-que-funciona en vez de tirar 200+ items
//   de una vez.
// - **El bucket `gapsConocidos` puede quedarse obsoleto.** Si arreglas de
//   verdad una pieza (le añades el código/nota que faltaba) pero el JSON de
//   `args` que le diste al workflow es de ANTES del arreglo, el informe
//   seguirá diciendo "gap ya conocido" sobre algo que ya no lo es. Vuelve a
//   extraer el catálogo (paso 1) después de aplicar arreglos, antes de
//   confiar en un resultado viejo.
// - **Este workflow solo AUDITA, no arregla nada.** Aplicar los hallazgos es
//   un paso aparte, deliberado: algunos son bugs mecánicos (aplícalos
//   directo), otros son decisiones de diseño a medio resolver (Derribo,
//   umbral de crítico de la Valija Médica...) que necesitan hablarse antes
//   de tocar código — no asumas que "hallazgo confirmado" == "aplícalo ya".
// - **Al aplicar un hallazgo mecánico repetido en muchas piezas** (como el
//   patrón "objetivo_tercero sin tirada de portador", resuelto en bloque el
//   2026-09-24 con `notasDeMejoras()`/`notaTercero`/`Accion.efectos`),
//   agrupa el trabajo de edición **por archivo de catálogo**, no por pieza:
//   varios agentes tocando el mismo archivo en paralelo colisionan. Un
//   agente por archivo, que arregle todas sus piezas de una sentada, es más
//   seguro que 30 agentes sueltos.
// - **Las granadas (`familia: "granada"`) quedan fuera del alcance a
//   propósito** — no tienen campo de prosa que contrastar (sus campos SON la
//   regla, no una frase). El script de extracción ya las excluye y lo deja
//   anotado en su salida; no es un descuido si no aparecen en el JSON.
//
// ─────────────────────────────────────────────────────────────────────────

export const meta = {
  name: 'auditoria-motor-metadata',
  description: 'Verifica que motorMetadata/modificadores del catálogo coincidan con su prosa',
  phases: [
    { title: 'Extraer prosa' },
    { title: 'Comparar' },
    { title: 'Verificar discrepancias' },
  ],
}

const porLotes = args && !Array.isArray(args) && Array.isArray(args.items)
const items = porLotes ? args.items : args

const CLAIM_SCHEMA = {
  type: 'object',
  properties: {
    claims: {
      type: 'array',
      items: {
        type: 'object',
        properties: { efecto: { type: 'string' } },
        required: ['efecto'],
      },
    },
  },
  required: ['claims'],
}

const DIFF_SCHEMA = {
  type: 'object',
  properties: {
    discrepancias: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tipo: { type: 'string', enum: ['falta_en_codigo', 'sobra_en_codigo', 'valor_distinto', 'gap_conocido'] },
          efectoProsa: { type: 'string' },
          explicacion: { type: 'string' },
        },
        required: ['tipo', 'explicacion'],
      },
    },
  },
  required: ['discrepancias'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: { real: { type: 'boolean' }, razon: { type: 'string' } },
  required: ['real'],
}

function extraerClaimsDeCodigo(item) {
  const claims = []
  for (const m of item.modificadores ?? []) {
    claims.push(`modificadores: tipo=${m.tipo} alcance=${JSON.stringify(m.alcance)} valor=${m.valor}`)
  }
  if (item.ajusteTramo) claims.push(`ajusteTramo: ${JSON.stringify(item.ajusteTramo)}`)
  if (item.ajusteAtaque != null) claims.push(`ajusteAtaque: ${item.ajusteAtaque}`)
  for (const c of item.condiciones ?? []) {
    const valor = c.tipo === 'opcion'
      ? `opciones=${JSON.stringify((c.opciones ?? []).map(o => [o.etiqueta, o.valor]))}`
      : `activo=${c.valorActivo} inactivo=${c.valorInactivo}`
    claims.push(`condicion "${c.etiqueta ?? c.id}": ${valor}${c.alcance ? ' alcance=' + JSON.stringify(c.alcance) : ''}`)
  }
  if (item.notaTirada) claims.push(`notaTirada: ${item.notaTirada}`)
  return claims
}


if (porLotes) {
  const N = Math.max(1, args.lote | 0 || 4)
  const lotes = []
  for (let i = 0; i < items.length; i += N) lotes.push(items.slice(i, i + N))
  log(`${items.length} items en ${lotes.length} lotes de ${N}`)

  const LOTE_SCHEMA = {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: { piezaId: { type: 'string' }, discrepancias: DIFF_SCHEMA.properties.discrepancias },
          required: ['piezaId', 'discrepancias'],
        },
      },
    },
    required: ['items'],
  }
  const VEREDICTOS_SCHEMA = {
    type: 'object',
    properties: {
      veredictos: {
        type: 'array',
        items: {
          type: 'object',
          properties: { n: { type: 'integer' }, real: { type: 'boolean' }, razon: { type: 'string' } },
          required: ['n', 'real'],
        },
      },
    },
    required: ['veredictos'],
  }
  const ficha = item => `### ${item.piezaLabel} (${item.piezaId})
PROSA:
${item.detalle.map((d, i) => `${i + 1}. ${d}`).join('\n')}
CÓDIGO (lo que la app entrega de verdad; fuente de verdad):
${extraerClaimsDeCodigo(item).map((c, i) => `${i + 1}. ${c}`).join('\n') || '(nada)'}
motorMetadata (estado "construido" = se supone hecho; "pendiente"/"bloqueado"/"ad_hoc" = hueco ya reconocido):
${JSON.stringify(item.motor)}`
  const NO_REPO = 'Todo lo que necesitas está en este mensaje: NO leas archivos del repositorio ni lances búsquedas.'

  const porLote = await pipeline(
    lotes,
    (lote, _, i) => agent(
      `Auditoría prosa-vs-código de ${lote.length} elementos de un juego de rol. ${NO_REPO}
Para CADA elemento: saca de la prosa los efectos prometidos (sin interpretar de más) y compáralos con el CÓDIGO.
- Efecto de la prosa sin código correspondiente: "gap_conocido" si alguna entrada de motorMetadata con estado distinto de "construido" lo cubre razonablemente; si no, "falta_en_codigo".
- "sobra_en_codigo": el código hace algo que la prosa no dice. "valor_distinto": mismo efecto, número distinto.
- Lo que la prosa dice y es texto/narrativo (no suma números ni pone casillas) NO es discrepancia: esta auditoría solo mira números, casillas, críticos, tramos y requisitos por rama.
No inventes discrepancias: si un elemento cuadra, devuelve su array vacío. Devuelve una entrada por elemento, con su piezaId.

${lote.map(ficha).join('\n\n')}`,
      { phase: 'Comparar', label: `lote ${i + 1}/${lotes.length}`, schema: LOTE_SCHEMA }
    ).then(r => ({ lote, res: r?.items ?? [] })),
    ({ lote, res }, _, i) => {
      const cand = res.flatMap(r => (r.discrepancias ?? []).filter(d => d.tipo !== 'gap_conocido').map(d => ({ piezaId: r.piezaId, d })))
      const gaps = res.flatMap(r => (r.discrepancias ?? []).filter(d => d.tipo === 'gap_conocido').map(d => ({ piezaId: r.piezaId, d })))
      if (!cand.length) return { lote, confirmadas: [], gaps }
      return agent(
        `Intenta REFUTAR cada una de estas discrepancias entre prosa y código. ${NO_REPO}
Si tienes duda razonable, real=false (por defecto, no es un fallo real salvo evidencia clara). Devuelve un veredicto por número.

DISCREPANCIAS:
${cand.map((c, n) => `${n}. [${c.piezaId}] [${c.d.tipo}] ${c.d.explicacion}`).join('\n')}

ELEMENTOS:
${lote.filter(it => cand.some(c => c.piezaId === it.piezaId)).map(ficha).join('\n\n')}`,
        { phase: 'Verificar discrepancias', label: `verificar lote ${i + 1}/${lotes.length}`, schema: VEREDICTOS_SCHEMA }
      ).then(v => ({
        lote,
        gaps,
        confirmadas: cand.filter((_, n) => (v?.veredictos ?? []).some(x => x.n === n && x.real)),
      }))
    }
  )
  const ok = porLote.filter(Boolean)
  const porId = id => items.find(it => it.piezaId === id)
  const agrupa = lista => Object.values(lista.reduce((acc, { piezaId, d }) => {
    (acc[piezaId] ??= { item: porId(piezaId) ?? { piezaId }, discrepancias: [] }).discrepancias.push(d)
    return acc
  }, {}))
  const perdidos = lotes.length - ok.length
  if (perdidos) log(`${perdidos} lotes sin resultado (agente caído): no auditados`)
  return {
    confirmadas: agrupa(ok.flatMap(r => r.confirmadas)),
    gapsConocidos: ok.flatMap(r => r.gaps).map(({ piezaId, d }) => ({ item: { piezaId }, discrepancia: d })),
    lotesSinResultado: perdidos,
  }
}

const results = await pipeline(
  items,
  item => agent(
    `Traduce esta descripción en prosa de una pieza de equipo (o una dote) de un juego de rol a una lista de efectos prometidos, uno por claim. Una frase puede contener más de un efecto -- sepáralos. No interpretes de más, no añadas nada que la prosa no diga.
Pieza "${item.piezaLabel}" (${item.piezaId}) nivel ${item.nivel}:
${item.detalle.map((d, i) => `${i + 1}. ${d}`).join('\n')}`,
    { phase: 'Extraer prosa', label: `prosa:${item.piezaId}#${item.nivel}`, schema: CLAIM_SCHEMA }
  ),
  (prosaResult, item) => ({
    item,
    prosaClaims: (prosaResult?.claims ?? []).map(c => c.efecto),
    codigoClaims: extraerClaimsDeCodigo(item),
  }),
  ({ item, prosaClaims, codigoClaims }) => agent(
    `Compara lo que promete la prosa contra lo que hace el código, para "${item.piezaLabel}" nivel ${item.nivel}.

EFECTOS PROMETIDOS POR LA PROSA:
${prosaClaims.map((c, i) => `${i + 1}. ${c}`).join('\n') || '(ninguno)'}

EFECTOS QUE REALMENTE ENTREGA EL CÓDIGO (modificadores/ajustes/condiciones -- fuente de verdad):
${codigoClaims.map((c, i) => `${i + 1}. ${c}`).join('\n') || '(ninguno)'}

CLASIFICACIÓN DECLARADA EN motorMetadata (tipo/afecta/mecanismo/estado -- estado "construido" = se supone hecho; "pendiente"/"bloqueado"/"ad_hoc" = ya reconocido como incompleto en el propio dato):
${JSON.stringify(item.motor, null, 2)}

Para cada efecto prometido por la prosa que NO tenga un efecto de código correspondiente:
- si hay una entrada de motorMetadata con estado distinto de "construido" que razonablemente cubre ese hueco, clasifícalo como "gap_conocido" (ya admitido en el dato, no es un hallazgo nuevo).
- si no hay ninguna entrada de motorMetadata que lo cubra, o la que hay está en estado "construido" pero el efecto sigue sin aparecer en el código, clasifícalo "falta_en_codigo" (hallazgo real).
Señala también "sobra_en_codigo" (el código hace algo que la prosa no menciona) y "valor_distinto" (mismo efecto, número distinto) cuando los veas.
No inventes discrepancias -- si todo cuadra, devuelve un array vacío.`,
    { phase: 'Comparar', label: `diff:${item.piezaId}#${item.nivel}`, schema: DIFF_SCHEMA }
  ).then(diff => ({ item, discrepancias: diff?.discrepancias ?? [] }))
)

const gapsConocidos = results.flatMap(r => r.discrepancias.filter(d => d.tipo === 'gap_conocido').map(d => ({ item: r.item, discrepancia: d })))
const aVerificar = results
  .map(r => ({ item: r.item, discrepancias: r.discrepancias.filter(d => d.tipo !== 'gap_conocido') }))
  .filter(r => r.discrepancias.length)

log(`${aVerificar.reduce((n, r) => n + r.discrepancias.length, 0)} discrepancias candidatas a verificar (excluidos ${gapsConocidos.length} gaps ya conocidos en el dato)`)

const verificadas = await parallel(aVerificar.map(r => () =>
  parallel(r.discrepancias.map(d => () =>
    agent(
      `Intenta REFUTAR esta discrepancia entre prosa y motorMetadata para "${r.item.piezaLabel}" nivel ${r.item.nivel}.
Discrepancia a refutar: [${d.tipo}] ${d.explicacion}
Prosa completa: ${r.item.detalle.join(' | ')}
Código real (modificadores/ajustes/condiciones): ${JSON.stringify(extraerClaimsDeCodigo(r.item))}
motorMetadata: ${JSON.stringify(r.item.motor)}
Si tienes duda razonable, marca real=false (default a "no es un fallo real" salvo evidencia clara).`,
      { phase: 'Verificar discrepancias', schema: VERDICT_SCHEMA }
    )
  )).then(veredictos => ({
    item: r.item,
    discrepancias: r.discrepancias.filter((d, i) => veredictos[i]?.real),
  }))
))

const confirmadas = verificadas.filter(r => r.discrepancias.length)

return { confirmadas, gapsConocidos }
