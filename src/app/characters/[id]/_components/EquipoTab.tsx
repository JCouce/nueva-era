"use client";

import { useState } from "react";
import {
  equipoPorId,
  aumentoPorId,
  aumentosConRequisitoRoto,
  etiquetaEleccionAumento,
  esPiezaAumento,
  ranurasSubsistemaUsadas,
  mejorasArmaInstaladas,
  type Sheet,
  type Armadura,
  type ArmaFuego,
  type ArmaMelee,
  type Herramienta,
  type ArmaPesada,
} from "@/lib/rules";
import { HudCard } from "@/components/HudCard";
import { Acordeon } from "@/components/Acordeon";
import {
  BadgeRareza,
  DetalleArmadura,
  DetalleArma,
  DetalleArmaMelee,
  DetalleModulo,
  DetalleArmaPesada,
  DetalleOperacion,
  DetalleImplante,
  MarcasImplante,
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

// Aumentos (A0, docs/sistema.md §11.3): pieza, nivel, elección y textos. Una operación
// cuyo requisito se ha quitado queda marcada "requisito roto", como las dotes.
function SeccionAumentos({ sheet, onDesequipar }: { sheet: Sheet; onDesequipar: (instanciaId: string) => void }) {
  const aumentos = sheet.equipo.filter(esPiezaAumento);
  const rotos = aumentosConRequisitoRoto(sheet);
  if (aumentos.length === 0) {
    return <p className="font-sans text-[11px] leading-relaxed text-muted">Sin aumentos. Están en la Tienda.</p>;
  }
  return (
    <>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{`// Aumentos · ${aumentos.length}`}</p>
      <p className="font-sans text-[11px] leading-relaxed text-muted">
        De momento solo se aplican los atributos, la vida de Hipertrofia, las rebajas de coste de habilidad (con la ficha aprobada), los bonos a salvaciones (selector «Contra…»), las casillas de Buscar/percibir, la Alerta pasiva del Ojo, su bono a distancia y la armadura natural; el resto de sus efectos, todavía no. En creación, quitar un aumento devuelve lo pagado (bolsa y créditos); aprobada la ficha, no devuelve nada.
      </p>
      {aumentos.map((a) => {
        const cat = aumentoPorId(a.catalogoId);
        if (!cat) return null;
        const eleccion = etiquetaEleccionAumento(a);
        const roto = rotos.find((r) => r.instanciaId === a.instanciaId);
        const titulo = eleccion ? `${cat.label} · ${eleccion}` : cat.label;
        const resumen = cat.familia === "implante" ? `Nivel ${a.nivel} · ${cat.resumen}` : cat.resumen;
        return (
          <div key={a.instanciaId}>
            <Acordeon titulo={titulo} resumen={resumen} etiqueta={<BotonQuitar onClick={() => onDesequipar(a.instanciaId)} />}>
              {cat.familia === "operacionGenetica" ? (
                <DetalleOperacion p={cat} eleccion={a.eleccion} />
              ) : (
                <DetalleImplante p={cat} nivelActual={a.nivel} eleccion={a.eleccion} />
              )}
            </Acordeon>
            {(roto || cat.familia === "implante") && (
              <div className="mt-1 flex flex-wrap items-center gap-1.5 px-1">
                {roto && (
                  <span className="font-mono text-[10px] uppercase text-danger">
                    requisito roto: falta {roto.faltan.join(", ")}
                  </span>
                )}
                {cat.familia === "implante" && <MarcasImplante p={cat} />}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

export function EquipoTab({
  sheet,
  creditos,
  onDesequipar,
}: {
  sheet: Sheet;
  // Ausente para un NPC (fase 6b 5.1): no lleva cartera de créditos que
  // enseñar, así que el bloque de fondos se oculta entero en vez de
  // inventarse un número.
  creditos?: number;
  onDesequipar: (instanciaId: string) => void;
}) {
  const [filtro, setFiltro] = useState<"todo" | "aumentos">("todo");
  if (sheet.equipo.length === 0) {
    return (
      <HudCard className="border-dashed p-5">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            {"//SYSTEM · equipo"}
          </p>
          {creditos !== undefined && <Fondos creditos={creditos} />}
        </div>
        <p className="mt-2 font-sans text-sm leading-relaxed text-muted">
          No llevas nada equipado. Ve a la Tienda para coger algo.
        </p>
      </HudCard>
    );
  }

  const todo = filtro === "todo";
  const armaduras = sheet.equipo.filter((p) => equipoPorId(p.catalogoId)?.familia === "armadura");
  const armas = sheet.equipo.filter((p) => equipoPorId(p.catalogoId)?.familia === "arma");
  const armasMelee = sheet.equipo.filter((p) => equipoPorId(p.catalogoId)?.familia === "armaMelee");
  const herramientas = sheet.equipo.filter(
    (p) => equipoPorId(p.catalogoId)?.familia === "herramienta",
  );
  const armamentoPesado = sheet.equipo.filter(
    (p) => equipoPorId(p.catalogoId)?.familia === "armaPesada",
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {"//SYSTEM · equipo"}
        </p>
        {creditos !== undefined && <Fondos creditos={creditos} />}
      </div>
      <div className="flex gap-1">
        {(["todo", "aumentos"] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filtro === f}
            onClick={() => setFiltro(f)}
            className={`clip-chamfer-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide active:scale-95 ${
              filtro === f ? "border-accent text-accent" : "border-border text-muted"
            }`}
          >
            {f === "todo" ? "Todo" : "Aumentos"}
          </button>
        ))}
      </div>
      {todo && armaduras.map((a) => {
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

      {todo && armas.map((a) => {
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

      {todo && armasMelee.map((a) => {
        const cat = equipoPorId(a.catalogoId) as ArmaMelee | null;
        if (!cat || cat.familia !== "armaMelee") return null;
        return (
          <Acordeon
            key={a.instanciaId}
            titulo={cat.label}
            resumen={cat.resumen}
            etiqueta={<BotonQuitar onClick={() => onDesequipar(a.instanciaId)} />}
          >
            {a.viaEspecie && (
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-info">Vía especie</p>
            )}
            <DetalleArmaMelee p={cat} />
          </Acordeon>
        );
      })}

      {todo && herramientas.map((a) => {
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

      {todo && armamentoPesado.map((a) => {
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
      {(!todo || sheet.equipo.some(esPiezaAumento)) && <SeccionAumentos sheet={sheet} onDesequipar={onDesequipar} />}
    </div>
  );
}
