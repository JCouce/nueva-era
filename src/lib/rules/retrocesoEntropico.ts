// Retroceso entrópico del Kerzul (docs/fuente/equipamiento.md, «Inercia Entrópica»; cuestionario
// eq-18 y eq-19, usuario 2026-11-13): «Siempre que un personaje ejecute una acción de ataque
// clasificada como Estándar o Compleja con un arma de Kerzul, debe superar una Tirada de Fortaleza
// (dificultad daño básico del arma por acción empleada) o recibe daño no letal igual a la mitad
// del daño básico de la acción empleada […] y su siguiente acción está entorpecido. Si la
// salvación resulta en fracaso crítico también cae al suelo derribado.»
//
// Lo declara la pieza con su MotorMetadata (`salvacion_retroceso_entropico`, construido); aquí
// la regla: qué modos, contra cuánto y qué pasa. Acierte o falle el golpe.
// TODO(revisar): el daño del retroceso no pasa por «Resistir daño» (es el propio golpe, sin
// blindaje ni armadura que lo frene); la fuente no lo dice.
import type { SalvacionPropia } from "./consecuenciasPropias";

export const ID_RETROCESO_ENTROPICO = "salvacion_retroceso_entropico";

const MODOS_CON_RETROCESO = new Set(["Estándar", "Compleja"]);
const AGUANTAS = { texto: "Aguantas el latigazo: nada.", estados: [] };

// Por modo del golpe: el daño básico de ese modo con la Fuerza del personaje (el «Fue+7» ya
// calculado). Sin daño calculable (fórmula que no se entiende), sin salvación.
export function retrocesoEntropico(
  arma: string,
  modos: readonly { id: string; etiqueta: string; danio: number | null }[],
): SalvacionPropia[] {
  return modos.flatMap((m) => {
    if (!MODOS_CON_RETROCESO.has(m.etiqueta) || m.danio === null) return [];
    const danio = { valor: Math.floor(m.danio / 2), categoria: "noLetal" as const };
    return [
      {
        fuente: `Retroceso entrópico (${arma}, ${m.etiqueta})`,
        etiqueta: "Salvar retroceso",
        tiradaId: "salv_fortaleza",
        tiradaLabel: "Fortaleza",
        dificultad: m.danio,
        soloModo: m.id,
        grados: {
          fracasoCritico: {
            texto: `${danio.valor} de daño no letal, entorpecido en tu siguiente acción (grado fracaso crítico) y derribado.`,
            danio,
            estados: [
              { estadoId: "entorpecido", gradoId: "fracaso_critico", turnos: 1 },
              { estadoId: "derribado", gradoId: "activo" },
            ],
          },
          fracaso: {
            texto: `${danio.valor} de daño no letal y entorpecido en tu siguiente acción.`,
            danio,
            estados: [{ estadoId: "entorpecido", gradoId: "fallo", turnos: 1 }],
          },
          exito: AGUANTAS,
          critico: AGUANTAS,
        },
      },
    ];
  });
}
