// Los sobreesfuerzos de las fuentes psiónicas (rules/sobreesfuerzo.ts), transcritos de la foto
// de Drive del 14 de octubre: docs/fuente/especies.md (Arianyi, Casa de Maolher) y
// docs/fuente/aumentos.md (Implante de Resonancia Métrica, niveles 1–4). «Un nivel de daño» = 1.
// Aturdido va con el grado «fracaso» y Confusión con «fallo»: sin salvación, cuenta como
// fallarla (como el Aturdido de Retrocognición, S102).
import type { ResultadoSobreesfuerzo, SobreesfuerzoDeclarado } from "../rules/sobreesfuerzo";
import type { CategoriaDanio } from "../rules/danio";

const danio = (valor: number, categoria: CategoriaDanio) => ({ valor, categoria });
const ATURDIDO_1 = { estadoId: "aturdido", gradoId: "fracaso", turnos: 1 } as const;
const CONFUSO_NIVEL = { estadoId: "confusion", gradoId: "fallo", turnos: "nivelPoder" } as const;
const r = (d: ReturnType<typeof danio> | null, ...estados: ResultadoSobreesfuerzo["estados"]): ResultadoSobreesfuerzo => ({
  ...(d && { danio: d }),
  estados,
});
const MUERTE: ResultadoSobreesfuerzo = { estados: [], muerte: true };

// «Si el Maloher usa poderes estando exhausto el fracaso causa daño grave y aturdimiento un
// turno, en caso de fracaso crítico son dos niveles de daño es grave además de los efectos de
// aturdimiento y confusión.»
export const SOBREESFUERZO_MAOLHER: SobreesfuerzoDeclarado = {
  dificultadBase: 8,
  desdeNivel: 2,
  inmuneHastaNivel: 0,
  tabla: {
    base: {
      fracaso: [r(danio(1, "letal"), ATURDIDO_1)],
      fracasoCritico: [r(danio(1, "grave"), ATURDIDO_1, CONFUSO_NIVEL)],
    },
    exhausto: {
      fracaso: [r(danio(1, "grave"), ATURDIDO_1)],
      fracasoCritico: [r(danio(2, "grave"), ATURDIDO_1, CONFUSO_NIVEL)],
    },
  },
};

// La misma tabla que Maestría Psiónica (docs/fuente/dotes.md). «Estando exhausto el daño por
// fracaso pasa a ser letal y causa aturdimiento, en caso de fracaso crítico el daño es grave»:
// TODO(revisar): el aturdimiento sin duración, 1 turno como el del fracaso crítico; y el fracaso
// crítico exhausto conserva el aturdido (solo cambia el daño).
const TABLA_ARIANYI: SobreesfuerzoDeclarado["tabla"] = {
  base: {
    fracaso: [r(danio(1, "noLetal"))],
    fracasoCritico: [r(danio(1, "letal"), ATURDIDO_1)],
  },
  exhausto: {
    fracaso: [r(danio(1, "letal"), ATURDIDO_1)],
    fracasoCritico: [r(danio(1, "grave"), ATURDIDO_1)],
  },
};
export const TABLA_MAESTRIA_PSIONICA = TABLA_ARIANYI;

export const SOBREESFUERZO_ARIANYI: SobreesfuerzoDeclarado = {
  dificultadBase: 6,
  desdeNivel: 3,
  inmuneHastaNivel: 0,
  tabla: TABLA_ARIANYI,
};

// Implante de Resonancia Métrica: su daño es mental (sync Drive 2026-11-14: «daño letal
// (mental)», «el daño mental se mitiga»), en todas las casillas.
const mental = (valor: number, categoria: CategoriaDanio) => ({ ...danio(valor, categoria), tipo: "mental" as const });

// Implante de Resonancia Métrica. Dificultad 6 + nivel en los niveles 1–3 (au-05: solo el 4 la
// «baja» a 4 + nivel). TODO(revisar): el aturdimiento sin duración, 1 turno; el fracaso crítico
// exhausto del nivel 3 «escala a daño grave» y conserva el aturdido.
export const SOBREESFUERZO_IRM: Record<1 | 2 | 3 | 4, SobreesfuerzoDeclarado> = {
  1: {
    dificultadBase: 6,
    desdeNivel: 3,
    inmuneHastaNivel: 0,
    tabla: {
      base: { fracaso: [r(mental(1, "letal"))], fracasoCritico: [r(mental(1, "grave"), ATURDIDO_1)] },
      exhausto: { fracaso: [r(mental(1, "grave"))], fracasoCritico: [MUERTE] },
    },
  },
  2: {
    dificultadBase: 6,
    desdeNivel: 4,
    inmuneHastaNivel: 0,
    tabla: {
      base: { fracaso: [r(mental(1, "noLetal"))], fracasoCritico: [r(mental(1, "grave"), ATURDIDO_1)] },
      exhausto: { fracaso: [r(mental(1, "letal"))], fracasoCritico: [MUERTE] },
    },
  },
  3: {
    dificultadBase: 6,
    desdeNivel: 5,
    inmuneHastaNivel: 1,
    tabla: {
      base: { fracaso: [r(mental(1, "noLetal"))], fracasoCritico: [r(mental(1, "letal"), ATURDIDO_1)] },
      exhausto: { fracaso: [r(mental(1, "letal"))], fracasoCritico: [r(mental(1, "grave"), ATURDIDO_1)] },
    },
  },
  // «Si el personaje no está en fatiga ningún nivel genera sobreesfuerzo. Durante fatiga se
  // produce en poderes de nivel 3 o más con una dificultad baja a 4 + nivel.»
  4: {
    dificultadBase: 4,
    desdeNivel: null,
    inmuneHastaNivel: 2,
    tabla: {
      base: { fracaso: [r(mental(1, "noLetal"))], fracasoCritico: [r(null, ATURDIDO_1), r(mental(1, "letal"))] },
      exhausto: { fracaso: [r(mental(1, "letal"))], fracasoCritico: [r(mental(1, "grave"), ATURDIDO_1)] },
    },
  },
};
