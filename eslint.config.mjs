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
              ],
              message: "Usa resolverFicha / useFichaResuelta (src/lib/rules/fichaResuelta.ts): lee la FichaResuelta.",
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
