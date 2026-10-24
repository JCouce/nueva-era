import { manualDeLaFicha } from "@/lib/manual/documentos";

// Texto de los apartados referenciados de un documento, uno por slug y generado en
// build. Lo pide la ficha solo al abrir la hoja del manual.
export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  return Object.keys((await manualDeLaFicha()).apartados).map((slug) => ({ slug }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const apartados = (await manualDeLaFicha()).apartados[slug];
  if (!apartados) return Response.json({}, { status: 404 });
  return Response.json(apartados);
}
