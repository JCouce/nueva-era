# Archivo: workflows retirados

## `modelar-area` (retirado 2026-10-28)

`modelar-area.js` (workflow) y `modelar-area-extraer.ts` (su extractor) modelaban un **área
entera** del sistema desde su prosa: troceaban la transcripción por disciplina o bloque y
proponían, efecto a efecto, su `MotorMetadata` contra el contexto cerrado del motor. Se usaron
para psiónica, dotes y aumentos.

**Por qué se retira** (usuario, 2026-10-28): el grueso de las áreas ya está modelado; lo que
viene son cambios sueltos o lotes de 5-10 ítems, para los que basta el checklist de alta de
`docs/motor.md` y la auditoría por lote (`.claude/workflows/auditoria-motor-metadata.js`).
Mantenerlo costaba (cada tipo nuevo de `MotorMetadata` obligaba a tocar el extractor).

**Lo que produjo se queda donde está**: `docs/modelado-*.md` (decisiones) y
`docs/modelado-*.json`. Ojo: `docs/modelado-dotes.json` **no es histórico**, es la fuente de
`npm run gen-dotes`.

**Para recuperarlo** si llega un área entera nueva: `git mv` de vuelta a `.claude/workflows/` y
`scripts/workflows/`, y poner al día el extractor con los tipos y mecanismos actuales de
`src/lib/rules/motor.ts`. Cómo se lanzaba: `docs/prompt-modelar-psionica.md`.
