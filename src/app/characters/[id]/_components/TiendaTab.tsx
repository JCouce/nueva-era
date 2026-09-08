"use client";

import { useState, type ReactNode } from "react";
import {
  ARMADURAS,
  ARMAS,
  MEJORAS_ESTANDAR,
  SUBSISTEMAS,
  MEJORAS_ARMA,
  MOVIMIENTO,
  ARMAS_MELEE,
  ARMAS_MELEE_KERZUL,
  equipoPorId,
  validarInstalacion,
  nuevaInstanciaId,
  type Sheet,
  type PiezaEquipada,
  type Armadura,
  type ArmaFuego,
  type ArmaMelee,
  type MejoraEstandar,
  type Subsistema,
  type MejoraDeArma,
  type MejoraMovimiento,
} from "@/lib/rules";
import { Acordeon } from "@/components/Acordeon";
import { DetalleArmadura, DetalleArma, DetalleArmaMelee, DetalleModulo } from "./equipo/PiezaDetalle";

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="border-b border-border pb-1 font-display text-sm font-semibold uppercase tracking-wide text-muted">
        {titulo}
      </h2>
      {children}
    </div>
  );
}

function Precio({ coste }: { coste: number | null }) {
  return (
    <span className="whitespace-nowrap font-mono text-[10px] uppercase text-muted">
      {coste === null ? "no se compra" : `${coste} cr.`}
    </span>
  );
}

const BOTON_EQUIPAR =
  "clip-chamfer-sm w-full border border-accent bg-accent py-2 font-display text-xs font-semibold " +
  "uppercase tracking-wide text-black active:scale-95 disabled:border-border disabled:bg-elevated disabled:text-muted";

// Armas, armaduras y armas melee no necesitan dónde instalarse: un botón y ya.
function AccionSimple({
  pieza,
  onEquipar,
}: {
  pieza: Armadura | ArmaFuego | ArmaMelee;
  onEquipar: (p: PiezaEquipada) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onEquipar({ instanciaId: nuevaInstanciaId(), catalogoId: pieza.id })}
      className={`${BOTON_EQUIPAR} mt-3`}
    >
      Equipar
    </button>
  );
}

// Mejoras estándar y subsistemas necesitan una armadura donde vivir; las
// mejoras de arma, un arma. Mismo flujo en los dos casos — "¿dónde lo
// instalas?" y, si no hay hueco o no es compatible, el motivo —
// validarInstalacion ya lo explica y ya sabe distinguir un host de otro,
// aquí solo se elige la lista y se muestra.
function AccionInstalable({
  pieza,
  sheet,
  onEquipar,
}: {
  pieza: MejoraEstandar | Subsistema | MejoraDeArma | MejoraMovimiento;
  sheet: Sheet;
  onEquipar: (p: PiezaEquipada) => void;
}) {
  const [nivel, setNivel] = useState(pieza.niveles[0].nivel);
  const familiaHost = pieza.familia === "mejoraArma" ? "arma" : "armadura";
  const hosts = sheet.equipo.filter((p) => equipoPorId(p.catalogoId)?.familia === familiaHost);
  const sinHostTexto =
    familiaHost === "armadura"
      ? "Necesitas tener puesta una armadura para instalarlo."
      : "Necesitas tener un arma equipada para instalarlo.";

  return (
    <div className="mt-3 border-t border-border pt-3">
      {pieza.niveles.length > 1 && (
        <>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {"// Nivel a instalar"}
          </p>
          <div className="mt-1.5 flex gap-1">
            {pieza.niveles.map((n) => (
              <button
                key={n.nivel}
                type="button"
                onClick={() => setNivel(n.nivel)}
                className={`clip-chamfer-sm flex-1 border py-1.5 font-mono text-xs active:scale-95 ${
                  nivel === n.nivel ? "border-accent text-accent" : "border-border text-muted"
                }`}
              >
                {n.nivel}
              </button>
            ))}
          </div>
        </>
      )}

      <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted">
        {"// Instalar en"}
      </p>
      {hosts.length === 0 ? (
        <p className="mt-1.5 font-sans text-[11px] leading-relaxed text-danger">{sinHostTexto}</p>
      ) : (
        <div className="mt-1.5 flex flex-col gap-2">
          {hosts.map((h) => {
            const cat = equipoPorId(h.catalogoId)!;
            const v = validarInstalacion(sheet, pieza.id, h.instanciaId, nivel);
            return (
              <div key={h.instanciaId}>
                <button
                  type="button"
                  disabled={!v.ok}
                  onClick={() =>
                    onEquipar({
                      instanciaId: nuevaInstanciaId(),
                      catalogoId: pieza.id,
                      nivel,
                      instaladoEnId: h.instanciaId,
                    })
                  }
                  className={BOTON_EQUIPAR}
                >
                  Equipar en {cat.label}
                </button>
                {!v.ok && (
                  <p className="mt-1 font-sans text-[11px] leading-relaxed text-danger">
                    {v.motivo}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TiendaTab({
  sheet,
  onEquipar,
}: {
  sheet: Sheet;
  onEquipar: (p: PiezaEquipada) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="font-sans text-[11px] leading-relaxed text-muted">
        Catálogo de consulta: por ahora comprar es marcar como tuyo, sin descontar créditos
        — no sabemos con cuánto empieza un personaje (pregunta 7 de docs/sistema.md).
      </p>

      <Seccion titulo="Armaduras">
        {ARMADURAS.map((p) => (
          <Acordeon key={p.id} titulo={p.label} resumen={p.resumen} etiqueta={<Precio coste={p.coste} />}>
            <DetalleArmadura p={p} />
            <AccionSimple pieza={p} onEquipar={onEquipar} />
          </Acordeon>
        ))}
      </Seccion>

      <Seccion titulo="Armas">
        {ARMAS.map((p) => (
          <Acordeon key={p.id} titulo={p.label} resumen={p.resumen} etiqueta={<Precio coste={p.coste} />}>
            <DetalleArma p={p} />
            <AccionSimple pieza={p} onEquipar={onEquipar} />
          </Acordeon>
        ))}
      </Seccion>

      <Seccion titulo="Mejoras estándar">
        {MEJORAS_ESTANDAR.map((p) => (
          <Acordeon key={p.id} titulo={p.label} resumen={p.resumen}>
            <DetalleModulo p={p} />
            <AccionInstalable pieza={p} sheet={sheet} onEquipar={onEquipar} />
          </Acordeon>
        ))}
      </Seccion>

      <Seccion titulo="Subsistemas">
        {SUBSISTEMAS.map((p) => (
          <Acordeon key={p.id} titulo={p.label} resumen={p.resumen}>
            <DetalleModulo p={p} />
            <AccionInstalable pieza={p} sheet={sheet} onEquipar={onEquipar} />
          </Acordeon>
        ))}
      </Seccion>

      <Seccion titulo="Mejoras de arma">
        {MEJORAS_ARMA.map((p) => (
          <Acordeon key={p.id} titulo={p.label} resumen={p.resumen}>
            <DetalleModulo p={p} />
            <AccionInstalable pieza={p} sheet={sheet} onEquipar={onEquipar} />
          </Acordeon>
        ))}
      </Seccion>

      <Seccion titulo="Movimiento">
        {MOVIMIENTO.map((p) => (
          <Acordeon key={p.id} titulo={p.label} resumen={p.resumen}>
            <DetalleModulo p={p} />
            <AccionInstalable pieza={p} sheet={sheet} onEquipar={onEquipar} />
          </Acordeon>
        ))}
      </Seccion>

      <Seccion titulo="Combate melee">
        {ARMAS_MELEE.filter((p) => !ARMAS_MELEE_KERZUL.includes(p)).map((p) => (
          <Acordeon key={p.id} titulo={p.label} resumen={p.resumen} etiqueta={<Precio coste={p.coste} />}>
            <DetalleArmaMelee p={p} />
            <AccionSimple pieza={p} onEquipar={onEquipar} />
          </Acordeon>
        ))}
      </Seccion>

      <Seccion titulo="Kerzul">
        {ARMAS_MELEE_KERZUL.map((p) => (
          <Acordeon key={p.id} titulo={p.label} resumen={p.resumen} etiqueta={<Precio coste={p.coste} />}>
            <DetalleArmaMelee p={p} />
            <AccionSimple pieza={p} onEquipar={onEquipar} />
          </Acordeon>
        ))}
      </Seccion>
    </div>
  );
}
