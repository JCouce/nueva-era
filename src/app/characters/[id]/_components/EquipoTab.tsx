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
  armasIncorporables,
  ID_BRAZO_BIONICO,
  type PiezaEquipada,
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

// Brazo Biónico (A6b): qué arma lleva incorporada. Las armas de una mano equipadas, de cuerpo
// a cuerpo y de fuego (sin la Pelea). Sin exigir la tirada de "Incorporar arma".
type OnArmaIncorporada = (brazoInstanciaId: string, armaInstanciaId: string | null) => void;

function SelectorArmaIncorporada({
  sheet,
  brazo,
  onCambiar,
}: {
  sheet: Sheet;
  brazo: PiezaEquipada;
  onCambiar: OnArmaIncorporada;
}) {
  const armas = armasIncorporables(sheet);
  const etiqueta = (p: PiezaEquipada) => {
    const label = equipoPorId(p.catalogoId)?.label ?? p.catalogoId;
    const iguales = armas.filter((a) => a.catalogoId === p.catalogoId);
    return iguales.length > 1 ? `${label} (${iguales.indexOf(p) + 1})` : label;
  };
  const id = `arma-incorporada-${brazo.instanciaId}`;
  return (
    <div className="mt-2 flex flex-col gap-1 px-1">
      <label htmlFor={id} className="font-mono text-[10px] uppercase tracking-widest text-muted">
        Arma incorporada
      </label>
      <select
        id={id}
        value={brazo.armaIncorporada ?? ""}
        onChange={(e) => onCambiar(brazo.instanciaId, e.target.value || null)}
        className="w-full border border-border bg-elevated px-2 py-2 font-mono text-[11px] text-foreground outline-none focus:border-accent"
      >
        <option value="">Ninguna</option>
        {armas.map((a) => (
          <option key={a.instanciaId} value={a.instanciaId}>
            {etiqueta(a)}
          </option>
        ))}
      </select>
      <p className="font-sans text-[11px] leading-relaxed text-muted">
        {armas.length === 0
          ? "Equipa un arma de una mano (de cuerpo a cuerpo o de fuego) para incorporarla."
          : "Sus ataques y su bloqueo van siempre con el brazo. Desenfundado gratis, no te la pueden desarmar y cuenta para la carga. La tirada de «Incorporar arma» está en Acciones."}
      </p>
    </div>
  );
}

// Aumentos (A0, docs/sistema.md §11.3): pieza, nivel, elección y textos. Una operación
// cuyo requisito se ha quitado queda marcada "requisito roto", como las dotes.
function SeccionAumentos({
  sheet,
  onDesequipar,
  onArmaIncorporada,
}: {
  sheet: Sheet;
  onDesequipar: (instanciaId: string) => void;
  onArmaIncorporada?: OnArmaIncorporada;
}) {
  const aumentos = sheet.equipo.filter(esPiezaAumento);
  const rotos = aumentosConRequisitoRoto(sheet);
  if (aumentos.length === 0) {
    return <p className="font-sans text-[11px] leading-relaxed text-muted">Sin aumentos. Están en la Tienda.</p>;
  }
  return (
    <>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{`// Aumentos · ${aumentos.length}`}</p>
      <p className="font-sans text-[11px] leading-relaxed text-muted">
        De momento solo se aplican los atributos, la vida de Hipertrofia, las rebajas de coste de habilidad (con la ficha aprobada), los bonos a salvaciones (selector «Contra…»), las casillas de Buscar/percibir, la Alerta pasiva del Ojo, su bono a distancia, la armadura natural, las casillas de ventaja con fatiga de la rama cognitiva (y el ahorro de Mielinización), la ventaja en Iniciativa de Red Frontoparietal, sus textos en las tiradas, la reducción de los penalizadores por heridas y fatiga (Estabilización Autonómica, Neurogénesis) y las casillas de cobertura (Foveo, Ojo); el resto de sus efectos, todavía no. En creación, quitar un aumento devuelve lo pagado (bolsa y créditos); aprobada la ficha, no devuelve nada.
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
            {a.catalogoId === ID_BRAZO_BIONICO && onArmaIncorporada && (
              <SelectorArmaIncorporada sheet={sheet} brazo={a} onCambiar={onArmaIncorporada} />
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
  onArmaIncorporada,
}: {
  sheet: Sheet;
  // Ausente para un NPC (fase 6b 5.1): no lleva cartera de créditos que
  // enseñar, así que el bloque de fondos se oculta entero en vez de
  // inventarse un número.
  creditos?: number;
  onDesequipar: (instanciaId: string) => void;
  // El selector del arma incorporada del Brazo Biónico (A6b); sin él, no sale.
  onArmaIncorporada?: OnArmaIncorporada;
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
  const incorporadaId = sheet.equipo.find((p) => p.catalogoId === ID_BRAZO_BIONICO)?.armaIncorporada;
  const marcaIncorporada = (instanciaId: string) =>
    instanciaId === incorporadaId && (
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-info">Incorporada en el Brazo Biónico</p>
    );
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
            {marcaIncorporada(a.instanciaId)}
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
            {marcaIncorporada(a.instanciaId)}
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
      {(!todo || sheet.equipo.some(esPiezaAumento)) && <SeccionAumentos sheet={sheet} onDesequipar={onDesequipar} onArmaIncorporada={onArmaIncorporada} />}
    </div>
  );
}
