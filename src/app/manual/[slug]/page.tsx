import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { leerDocumento, listarDocumentos } from "@/lib/manual/documentos";
import { DocumentoMarkdown } from "../_components/DocumentoMarkdown";
import { LectorDocumento } from "../_components/LectorDocumento";

// Un documento por slug activo de docs/fuente/_indice.tsv, generado en build. Lo que no
// salió en build es 404: en Vercel docs/fuente no se lee en tiempo de petición.
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await listarDocumentos()).map((d) => ({ slug: d.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = (await listarDocumentos()).find((d) => d.slug === slug);
  return { title: doc ? `${doc.nombre} — Manual — Nueva Era` : "Manual — Nueva Era" };
}

export default async function DocumentoManualPage({ params }: Props) {
  const { slug } = await params;
  const doc = await leerDocumento(slug);
  if (!doc) notFound();

  return (
    <>
      <AppHeader back={{ href: "/manual", label: "Manual" }} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16">
        <LectorDocumento encabezados={doc.encabezados}>
          <h1 className="mt-5 mb-2 font-display text-2xl font-bold uppercase tracking-wide text-foreground">
            {doc.nombre}
          </h1>
          <DocumentoMarkdown markdown={doc.markdown} />
        </LectorDocumento>
      </main>
    </>
  );
}
