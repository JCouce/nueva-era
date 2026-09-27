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
//    Filtra por familia si quieres auditar solo un trozo (jq, o edita el
//    script para acotar `EQUIPO` antes de recorrerlo).
// 2. Lanza este workflow con Workflow({ name: 'auditoria-motor-metadata',
//    args: <el JSON del paso 1, como valor, NO como string> }).
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

const items = args

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
    claims.push(`condicion "${c.etiqueta ?? c.id}": activo=${c.valorActivo} inactivo=${c.valorInactivo}${c.alcance ? ' alcance=' + JSON.stringify(c.alcance) : ''}`)
  }
  if (item.notaTirada) claims.push(`notaTirada: ${item.notaTirada}`)
  return claims
}

const results = await pipeline(
  items,
  item => agent(
    `Traduce esta descripción en prosa de una pieza de equipo de rol a una lista de efectos prometidos, uno por claim. Una frase puede contener más de un efecto -- sepáralos. No interpretes de más, no añadas nada que la prosa no diga.
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
