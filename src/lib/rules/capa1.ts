// Punto de extensión para cuando lleguen más fuentes de capa 1 (Poderes,
// Dotes, Ciberware, Fase 5 — docs/motor.md, "Escalabilidad para las fases
// que vienen"). Hoy sheet.equipo es la única fuente real; esta función la
// envuelve en una forma agnóstica de familia sin cambiar nada de lo que ya
// existe. El día que exista una segunda fuente, se suma aquí — nada más
// debería necesitar tocarse fuera de este archivo.
//
// Forma mínima a propósito (YAGNI): solo los campos con un uso concreto hoy.
// No migres combate.ts/condicionesActivas/etc. a usar esto todavía — eso es
// trabajo aparte.
import { equipoPorId, type Equipo } from "../catalog/equipo";
import type { PiezaEquipada } from "./equipo";
import type { MotorMetadata } from "./motor";
import type { Sheet } from "./sheet";

export type FuenteCapa1 = {
  instanciaId: string;
  catalogoId: string;
  nivel?: number;
  familia: Equipo["familia"];
  motor: MotorMetadata[];
};

// Las mismas 5 familias que en catalog/motor.test.ts llevan su MotorMetadata
// por nivel (NivelModulo), no en la pieza contenedora — mismo criterio,
// duplicado aquí a propósito en vez de importado del test.
function tieneNiveles(
  pieza: Equipo,
): pieza is Equipo & { niveles: { nivel: number; motor?: MotorMetadata[] }[] } {
  return (
    pieza.familia === "mejoraEstandar" ||
    pieza.familia === "subsistema" ||
    pieza.familia === "movimiento" ||
    pieza.familia === "mejoraArma" ||
    pieza.familia === "herramienta"
  );
}

function motorDePieza(cat: Equipo, nivel: number | undefined): MotorMetadata[] {
  if (tieneNiveles(cat)) {
    return cat.niveles.find((n) => n.nivel === nivel)?.motor ?? [];
  }
  return cat.motor ?? [];
}

export function fuentesDeCapa1(sheet: Sheet): FuenteCapa1[] {
  return sheet.equipo.flatMap((pieza: PiezaEquipada): FuenteCapa1[] => {
    const cat = equipoPorId(pieza.catalogoId);
    if (!cat) return [];
    return [
      {
        instanciaId: pieza.instanciaId,
        catalogoId: pieza.catalogoId,
        nivel: pieza.nivel,
        familia: cat.familia,
        motor: motorDePieza(cat, pieza.nivel),
      },
    ];
  });
}
