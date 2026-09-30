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
  {
    files: ["src/app/**/*.tsx", "src/components/**/*.tsx"],
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
