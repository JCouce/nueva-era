import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Las reglas de usar un poder viven en src/lib/rules/usoPoder.ts: las pantallas
  // solo pintan y aplican lo que devuelve (prepararPoder, usarPoder,
  // efectosDelResultado). Si una de estas vuelve a importarse aquí, la regla
  // se está duplicando en la UI.
  //
  // Igual con la ficha (propuesta-especies §3.1): modificadores y derivados se
  // resuelven una vez (resolverFicha, vía useFichaResuelta) y las pantallas leen la
  // FichaResuelta. Ámbito: todo .tsx de src/app y src/components (componentes
  // cliente y páginas RSC; una RSC que necesite un derivado usa resolverFicha) y los
  // hooks. Quedan fuera los .ts de servidor (actions.ts), que calculan con la ficha
  // recién leída de la base y no tienen pantalla que desincronizar.
  //
  // Y la especie (sistema.md §14.3): elegirEspecie aplica el reset y solo la llaman
  // las server actions. La pantalla decide con las funciones del borrador
  // (eleccionCompleta, eleccionesIguales, hayQueAvisar, bloqueoDeEspecie) y lee lo
  // resuelto en ficha.especie; especieDeFicha ya está vetada arriba. Los costes de
  // especie (§14.6) también: la pantalla lee ficha.ajusteCoste / ficha.bolsaAumentos
  // y el coste del siguiente nivel sale de costeSiguienteNivel. Los niveles de
  // disciplina (comprado/efectivo/paraEfectos, requisitos rotos) y las excepciones de
  // rareza, de ficha.psionica / ficha.excepcionesRareza.
  //
  // Y las tiradas (M1, docs/modificadores-tiradas.md "Montaje"): total, desglose y
  // márgenes de crítico salen de montarTirada / tirarMontada (rules/montaje.ts). La
  // pantalla no suma aplicado, habilidad, casillas, tramos ni alcance por su cuenta.
  {
    files: ["src/app/**/*.tsx", "src/components/**/*.tsx", "src/hooks/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/rules",
              importNames: [
                "resolverPoder",
                "costeFatiga",
                "pagoConCargas",
                "maxPuntosConCargas",
                "derivacionDeFicha",
                "efectosDeCasillas",
                "togglesDeFatiga",
                "bloqueoPorFatiga",
                "cruzaSobrecarga",
                "tiradaDePoder",
                "enEspecialidadDePoder",
              ],
              message: "Usa prepararPoder / usarPoder / efectosDelResultado (src/lib/rules/usoPoder.ts).",
            },
            {
              name: "@/lib/rules",
              importNames: [
                "modificadoresActivos",
                "modificadoresDeEquipo",
                "modificadoresDeEstados",
                "especieDeFicha",
                "indiceDeCondiciones",
                "atributoEfectivo",
                "atributosEfectivos",
                "desgloseAtributo",
                "desgloseAplicado",
                "aplicado",
                "aplicados",
                "salud",
                "alerta",
                "movimiento",
                "cargaMaxima",
                "valorEfectivo",
                "tieneEscudoMelee",
                "ajustesDeCoste",
                "bolsaDeAumentos",
                "excepcionesRareza",
                "formulaMovimientoDeEspecie",
                "multiplicadorCargaDeEspecie",
                "armaduraNaturalDeEspecie",
                "bonosDeDisciplina",
                "nivelesDePsionica",
                "nivelEfectivo",
                "requisitosRotos",
                "vuelo",
                "levitacion",
              ],
              message: "Usa resolverFicha / useFichaResuelta (src/lib/rules/fichaResuelta.ts): lee la FichaResuelta.",
            },
            {
              name: "@/lib/rules",
              importNames: [
                "modificadorAccion",
                "bonoAlcance",
                "desgloseAlcance",
                "resolverTirada",
                "valorCondiciones",
                "valorBonosTramo",
                "desgloseCondiciones",
                "desgloseBonosTramo",
              ],
              message: "Usa montarTirada / tirarMontada (src/lib/rules/montaje.ts).",
            },
            {
              name: "@/lib/rules",
              importNames: ["elegirEspecie"],
              message:
                "La especie solo cambia en el servidor (setEspecieAction / setEspecieNpcAction): la pantalla usa eleccionCompleta / hayQueAvisar / bloqueoDeEspecie.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
