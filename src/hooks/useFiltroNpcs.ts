"use client";

import { useMemo, useState } from "react";
import { filtrarNpcs, normalizarClave, recuentoEtiquetas } from "@/lib/npcEtiquetas";

type NpcFiltrable = { nombre: string; nota: string | null; etiquetas: readonly string[] };

// Estado del buscador + fichas de etiqueta de NPCs (catálogo y «Añadir combatientes»).
export function useFiltroNpcs<T extends NpcFiltrable>(npcs: readonly T[]) {
  const [busqueda, setBusqueda] = useState("");
  const [marcadas, setMarcadas] = useState<string[]>([]);

  const recuento = useMemo(() => recuentoEtiquetas(npcs), [npcs]);
  // Una etiqueta marcada que ya no lleva nadie (se quitó o su NPC fue a la papelera) deja de filtrar.
  const marcadasVivas = useMemo(
    () => marcadas.filter((m) => recuento.some((r) => normalizarClave(r.etiqueta) === normalizarClave(m))),
    [marcadas, recuento],
  );
  const filtrados = useMemo(() => filtrarNpcs(npcs, busqueda, marcadasVivas), [npcs, busqueda, marcadasVivas]);

  const marcada = (etiqueta: string) => marcadasVivas.some((m) => normalizarClave(m) === normalizarClave(etiqueta));
  const alternar = (etiqueta: string) =>
    setMarcadas((prev) =>
      marcada(etiqueta) ? prev.filter((m) => normalizarClave(m) !== normalizarClave(etiqueta)) : [...prev, etiqueta],
    );
  const limpiar = () => {
    setBusqueda("");
    setMarcadas([]);
  };

  return {
    busqueda,
    setBusqueda,
    recuento,
    marcada,
    alternar,
    limpiar,
    filtrados,
    filtrando: busqueda.trim() !== "" || marcadasVivas.length > 0,
  };
}
