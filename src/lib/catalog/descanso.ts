// Cifras de descanso y comida de las reglas base (au-03, usuario 2026-11-14; fuente:
// docs/fuente/reglas-base.md, «Curación y Descanso»). Un solo sitio: cuando llegue un parche se
// cambia aquí y lo leen la línea de Recursos (textoDescanso, rules/vitalidad.ts) y quien venga.
// La app no lleva los descansos ni las comidas (au-01, au-02: narrativo, a mano): el jugador
// ajusta la fatiga con el −/+ de siempre.
// TODO(revisar): los rasgos que cambian estas cifras (Riux: 4 descansos breves al día y Descanso
// Largo de 4 horas; Siervo: de 6) siguen como texto de su rasgo, sin tocar la línea.
export const DESCANSO = {
  // «Se recuperan el total de puntos de fatiga empleados y se sanan dos niveles de daño no
  // letal»; las horas «suelen ser 8 pero depende del personaje».
  largo: { horas: 8, sanaNoLetal: 2 },
  breve: { minutos: 10, porDia: 2, fatiga: 3 },
  comida: { porDia: 5, fatiga: 2 },
} as const;
