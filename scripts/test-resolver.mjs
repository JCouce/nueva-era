// Resolver para `node --test`.
//
// El código de la app usa imports sin extensión ("./atributos"), que es lo que
// espera el bundler de Next. Node, en cambio, exige la extensión explícita. En
// lugar de ensuciar el código de producción con ".ts" por todas partes, se
// enseña al runner de tests a completarla.
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SIN_EXTENSION = /\.[cm]?[jt]sx?$|\.json$/;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !SIN_EXTENSION.test(specifier)) {
      for (const ext of [".ts", ".tsx", "/index.ts"]) {
        try {
          const candidato = new URL(specifier + ext, context.parentURL);
          if (existsSync(fileURLToPath(candidato))) {
            return nextResolve(specifier + ext, context);
          }
        } catch {
          // especificador no resoluble como URL: que decida Node
        }
      }
    }
    return nextResolve(specifier, context);
  },
});
