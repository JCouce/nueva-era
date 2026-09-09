import {
  equipoPorId,
  ranurasSubsistemaUsadas,
  mejorasArmaInstaladas,
  type Sheet,
  type Armadura,
  type ArmaFuego,
  type ArmaMelee,
} from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { Acordeon } from "@/components/Acordeon";
import {
  BadgeRareza,
  DetalleArmadura,
  DetalleArma,
  DetalleArmaMelee,
  DetalleModulo,
} from "./equipo/PiezaDetalle";

function BotonQuitar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="clip-chamfer-sm border border-danger px-2 py-1 font-mono text-[10px] uppercase text-danger active:scale-95"
    >
      Quitar
    </button>
  );
}

// Lo instalado dentro de un host (armadura o arma): mismo bloque en los dos
// casos, solo cambia de qué cuelga.
function Instalado({
  sheet,
  hostInstanciaId,
  onDesequipar,
}: {
  sheet: Sheet;
  hostInstanciaId: string;
  onDesequipar: (instanciaId: string) => void;
}) {
  const instalados = sheet.equipo.filter((p) => p.instaladoEnId === hostInstanciaId);
  if (instalados.length === 0) return null;
  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{"// Instalado"}</p>
      {instalados.map((inst) => {
        const instCat = equipoPorId(inst.catalogoId);
        if (
          !instCat ||
          (instCat.familia !== "subsistema" &&
            instCat.familia !== "mejoraEstandar" &&
            instCat.familia !== "mejoraArma" &&
            instCat.familia !== "movimiento")
        ) {
          return null; // referencia a algo que ya no está en el catálogo
        }
        return (
          <Acordeon
            key={inst.instanciaId}
            titulo={instCat.label}
            resumen={`Nivel ${inst.nivel} · ${instCat.resumen}`}
            etiqueta={<BotonQuitar onClick={() => onDesequipar(inst.instanciaId)} />}
          >
            <DetalleModulo p={instCat} nivelActual={inst.nivel} />
          </Acordeon>
        );
      })}
    </div>
  );
}

export function EquipoTab({
  sheet,
  onDesequipar,
}: {
  sheet: Sheet;
  onDesequipar: (instanciaId: string) => void;
}) {
  if (sheet.equipo.length === 0) {
    return (
      <HudCard className="border-dashed p-5">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
          {"//SYSTEM · equipo"}
        </p>
        <p className="mt-2 font-sans text-sm leading-relaxed text-muted">
          No llevas nada equipado. Ve a la Tienda para coger algo.
        </p>
      </HudCard>
    );
  }

  const armaduras = sheet.equipo.filter((p) => equipoPorId(p.catalogoId)?.familia === "armadura");
  const armas = sheet.equipo.filter((p) => equipoPorId(p.catalogoId)?.familia === "arma");
  const armasMelee = sheet.equipo.filter((p) => equipoPorId(p.catalogoId)?.familia === "armaMelee");

  return (
    <div className="flex flex-col gap-3">
      {armaduras.map((a) => {
        const cat = equipoPorId(a.catalogoId) as Armadura;
        const usadas = ranurasSubsistemaUsadas(sheet, a.instanciaId);
        return (
          <Acordeon
            key={a.instanciaId}
            titulo={cat.label}
            resumen={cat.resumen}
            etiqueta={
              <div className="flex flex-col items-end gap-1">
                <BadgeRareza rareza={cat.rareza} />
                <BotonQuitar onClick={() => onDesequipar(a.instanciaId)} />
              </div>
            }
            defaultAbierto
          >
            <DetalleArmadura p={cat} />
            <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted">
              Ranuras de subsistema: {usadas}/{cat.ranurasSubsistema}
            </p>
            <Instalado sheet={sheet} hostInstanciaId={a.instanciaId} onDesequipar={onDesequipar} />
          </Acordeon>
        );
      })}

      {armas.map((a) => {
        const cat = equipoPorId(a.catalogoId) as ArmaFuego | null;
        if (!cat || cat.familia !== "arma") return null;
        const usadas = mejorasArmaInstaladas(sheet, a.instanciaId);
        return (
          <Acordeon
            key={a.instanciaId}
            titulo={cat.label}
            resumen={cat.resumen}
            etiqueta={<BotonQuitar onClick={() => onDesequipar(a.instanciaId)} />}
          >
            <DetalleArma p={cat} />
            <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted">
              Mejoras instaladas: {usadas}/{cat.mejorasAdmitidas}
            </p>
            <Instalado sheet={sheet} hostInstanciaId={a.instanciaId} onDesequipar={onDesequipar} />
          </Acordeon>
        );
      })}

      {armasMelee.map((a) => {
        const cat = equipoPorId(a.catalogoId) as ArmaMelee | null;
        if (!cat || cat.familia !== "armaMelee") return null;
        return (
          <Acordeon
            key={a.instanciaId}
            titulo={cat.label}
            resumen={cat.resumen}
            etiqueta={<BotonQuitar onClick={() => onDesequipar(a.instanciaId)} />}
          >
            <DetalleArmaMelee p={cat} />
          </Acordeon>
        );
      })}
    </div>
  );
}
