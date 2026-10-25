import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite abrir el dev server desde otros dispositivos de la red local (móvil, etc.).
  // Sin esto Next bloquea HMR y las server actions cuando entras por la IP en vez de localhost.
  allowedDevOrigins: ["10.224.68.175", "10.224.68.*", "192.168.1.*"],
  // El manual se genera en build desde docs/fuente/ (páginas estáticas). Por si alguna
  // ruta acaba renderizándose en el servidor de Vercel, que los documentos viajen.
  outputFileTracingIncludes: {
    "/manual": ["./docs/fuente/_indice.tsv", "./docs/fuente/*.md"],
    "/manual/*": ["./docs/fuente/_indice.tsv", "./docs/fuente/*.md"],
  },
};

export default nextConfig;
