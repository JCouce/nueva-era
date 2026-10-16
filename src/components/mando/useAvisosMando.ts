"use client";

import { useCallback, useState, useTransition } from "react";
import type { AvisoMando } from "./tipos";

type Deshacer = (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;

// El aviso tras cada acción y el "Deshacer" del registro, igual en la Mesa y en el
// combate. La acción de deshacer la pone quien lo monta.
export function useAvisosMando(deshacerAccion: Deshacer) {
  const [aviso, setAviso] = useState<AvisoMando | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [deshaciendo, setDeshaciendo] = useState<string | null>(null);
  const [, startDeshacer] = useTransition();

  const avisar = useCallback((a: Omit<AvisoMando, "id">) => setAviso({ ...a, id: Date.now() }), []);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  const deshacer = (id: string) => {
    setDeshaciendo(id);
    startDeshacer(async () => {
      const r = await deshacerAccion(id);
      setDeshaciendo(null);
      setErrores((prev) => {
        const resto = { ...prev };
        delete resto[id];
        return r.ok ? resto : { ...resto, [id]: r.error };
      });
      avisar(r.ok ? { mensaje: "Deshecho", registroId: null, tono: "ok" } : { mensaje: r.error, registroId: null, tono: "aviso" });
    });
  };

  return { aviso, avisar, cerrarAviso, errores, deshaciendo, deshacer };
}
