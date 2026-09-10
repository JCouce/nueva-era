import {
  equipoPorId,
  ranurasSubsistemaUsadas,
  mejorasArmaInstaladas,
  type Sheet,
  type Armadura,
  type ArmaFuego,
  type ArmaMelee,
  type Herramienta,
  type Consumible,
  type ArmaPesada,
  type MunicionGranada,
} from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { Acordeon } from "@/components/Acordeon";
import {
  BadgeRareza,
  DetalleArmadura,
  DetalleArma,
  DetalleArmaMelee,
  DetalleModulo,
  DetalleConsumible,
  DetalleArmaPesada,
  DetalleGranada,
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

function Fondos({ creditos }: { creditos: number }) {
  return (
    <p className="font-mono text-sm tabular-nums text-accent">
      {creditos.toLocaleString("es-ES")} <span className="text-[10px] text-muted">cr.</span>
    </p>
  );
}

export function EquipoTab({
  sheet,
  creditos,
  onDesequipar,
}: {
  sheet: Sheet;
  creditos: number;
  onDesequipar: (instanciaId: string) => void;
}) {
  if (sheet.equipo.length === 0) {
    return (
      <HudCard className="border-dashed p-5">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            {"//SYSTEM · equipo"}
          </p>
          <Fondos creditos={creditos} />
        </div>
        <p className="mt-2 font-sans text-sm leading-relaxed text-muted">
          No llevas nada equipado. Ve a la Tienda para coger algo.
        </p>
      </HudCard>
    );
  }

  const armaduras = sheet.equipo.filter((p) => equipoPorId(p.catalogoId)?.familia === "armadura");
  const armas = sheet.equipo.filter((p) => equipoPorId(p.catalogoId)?.familia === "arma");
  const armasMelee = sheet.equipo.filter((p) => equipoPorId(p.catalogoId)?.familia === "armaMelee");
  const herramientas = sheet.equipo.filter(
    (p) => equipoPorId(p.catalogoId)?.familia === "herramienta",
  );
  const consumibles = sheet.equipo.filter(
    (p) => equipoPorId(p.catalogoId)?.familia === "consumible",
  );
  const armamentoPesado = sheet.equipo.filter(
    (p) => equipoPorId(p.catalogoId)?.familia === "armaPesada",
  );
  const granadas = sheet.equipo.filter((p) => equipoPorId(p.catalogoId)?.familia === "granada");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {"//SYSTEM · equipo"}
        </p>
        <Fondos creditos={creditos} />
      </div>
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

      {herramientas.map((a) => {
        const cat = equipoPorId(a.catalogoId) as Herramienta | null;
        if (!cat || cat.familia !== "herramienta") return null;
        return (
          <Acordeon
            key={a.instanciaId}
            titulo={cat.label}
            resumen={`Nivel ${a.nivel} · ${cat.resumen}`}
            etiqueta={<BotonQuitar onClick={() => onDesequipar(a.instanciaId)} />}
          >
            <DetalleModulo p={cat} nivelActual={a.nivel} />
          </Acordeon>
        );
      })}

      {consumibles.map((a) => {
        const cat = equipoPorId(a.catalogoId) as Consumible | null;
        if (!cat || cat.familia !== "consumible") return null;
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
          >
            <DetalleConsumible p={cat} />
          </Acordeon>
        );
      })}

      {armamentoPesado.map((a) => {
        const cat = equipoPorId(a.catalogoId) as ArmaPesada | null;
        if (!cat || cat.familia !== "armaPesada") return null;
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
          >
            <DetalleArmaPesada p={cat} />
          </Acordeon>
        );
      })}

      {granadas.map((a) => {
        const cat = equipoPorId(a.catalogoId) as MunicionGranada | null;
        if (!cat || cat.familia !== "granada") return null;
        return (
          <Acordeon
            key={a.instanciaId}
            titulo={cat.label}
            resumen={cat.areaEfecto}
            etiqueta={
              <div className="flex flex-col items-end gap-1">
                <BadgeRareza rareza={cat.rareza} />
                <BotonQuitar onClick={() => onDesequipar(a.instanciaId)} />
              </div>
            }
          >
            <DetalleGranada p={cat} />
          </Acordeon>
        );
      })}
    </div>
  );
}
