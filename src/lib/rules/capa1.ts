// Punto de extensión para las fuentes de capa 1 (Poderes, Dotes, Ciberware,
// Fase 5 — docs/motor.md, "Escalabilidad para las fases que vienen").
// sheet.equipo fue la primera fuente; esta función la
// envuelve en una forma agnóstica de familia sin cambiar nada de lo que ya
// existe. Segunda fuente: los poderes psiónicos (familia "poder").
//
// Forma mínima a propósito (YAGNI): solo los campos con un uso concreto hoy.
// No migres combate.ts/condicionesActivas/etc. a usar esto todavía — eso es
// trabajo aparte.
import { equipoPorId, type Equipo } from "../catalog/equipo";
import type { PiezaEquipada } from "./equipo";
import type { MotorMetadata } from "./motor";
import type { Sheet } from "./sheet";
import { accionesDePsionica } from "./poderes";

export type FuenteCapa1 = {
  instanciaId: string;
  catalogoId: string;
  nivel?: number;
  familia: Equipo["familia"] | "poder";
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
  return [...fuentesDeEquipo(sheet), ...fuentesDePoderes(sheet)];
}

// Un poder no tiene instancia: su id de acción hace de instanciaId y de
// catalogoId, y `nivel` es el poseído en la disciplina.
function fuentesDePoderes(sheet: Sheet): FuenteCapa1[] {
  return accionesDePsionica(sheet).map(({ accion, nivelPoseido }) => ({
    instanciaId: accion.id,
    catalogoId: accion.id,
    nivel: nivelPoseido,
    familia: "poder",
    motor: accion.motor,
  }));
}

function fuentesDeEquipo(sheet: Sheet): FuenteCapa1[] {
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
