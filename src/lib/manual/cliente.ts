import type { ApartadosDocumento, IndiceManual } from "./paraFicha";

// Lado cliente del enlace ficha → manual. El índice se pide una vez por carga de página
// (caché de módulo, compartida por todos los botones) y los apartados de cada documento
// solo al abrir la hoja. Si algo falla (sin sesión, sin red) no hay botón: el manual es
// un extra, no se avisa.

let indice: IndiceManual | null = null;
let pidiendo = false;
const oyentes = new Set<() => void>();

function pedirIndice() {
  if (indice || pidiendo) return;
  pidiendo = true;
  fetch("/api/manual/referencias")
    .then((r) => (r.ok ? (r.json() as Promise<IndiceManual>) : null))
    .catch(() => null)
    .then((datos) => {
      pidiendo = false;
      // Sin datos se deja en null: el próximo botón que se monte lo reintenta.
      if (!datos) return;
      indice = datos;
      oyentes.forEach((o) => o());
    });
}

export function suscribirIndice(oyente: () => void): () => void {
  oyentes.add(oyente);
  pedirIndice();
  return () => {
    oyentes.delete(oyente);
  };
}

export const leerIndice = (): IndiceManual | null => indice;

const apartados = new Map<string, Promise<ApartadosDocumento | null>>();

export function cargarApartados(slug: string): Promise<ApartadosDocumento | null> {
  let p = apartados.get(slug);
  if (!p) {
    p = fetch(`/api/manual/apartados/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? (r.json() as Promise<ApartadosDocumento>) : null))
      .catch(() => null)
      .then((datos) => {
        if (!datos) apartados.delete(slug);
        return datos;
      });
    apartados.set(slug, p);
  }
  return p;
}
