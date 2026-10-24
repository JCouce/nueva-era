import { manualDeLaFicha } from "@/lib/manual/documentos";

// Índice elemento del catálogo → apartado del manual, generado en build desde
// docs/fuente/ (en Vercel no se lee en tiempo de petición). Lo protege src/proxy.ts
// como al resto de rutas: solo con sesión.
export const dynamic = "force-static";

export async function GET() {
  return Response.json((await manualDeLaFicha()).indice);
}
