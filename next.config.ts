import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite abrir el dev server desde otros dispositivos de la red local (móvil, etc.).
  // Sin esto Next bloquea HMR y las server actions cuando entras por la IP en vez de localhost.
  allowedDevOrigins: ["10.224.68.175", "10.224.68.*"],
};

export default nextConfig;
