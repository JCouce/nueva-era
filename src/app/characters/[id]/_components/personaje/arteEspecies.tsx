"use client";

import Image from "next/image";
import { useId, type ReactNode } from "react";

// Presentación de las especies (no es regla, no va al catálogo): dos colores por
// especie, uno por casta y casa, y un emblema geométrico hecho con código. Cuando
// haya ilustraciones, `imagen` (ruta bajo public/especies/) sustituye al emblema.

type ArteEspecie = {
  colores: [string, string];
  imagen?: string;
  // `uid` hace únicos los ids de <defs>: con dos emblemas en la página no se pisan.
  emblema: (c: [string, string], uid: string) => ReactNode;
};

const trazo = { fill: "none", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const ARTE: Record<string, ArteEspecie> = {
  // Hexágono con circuito: la Federación aumentada.
  humano: {
    colores: ["#00f0ff", "#3a6bff"],
    emblema: ([a, b], uid) => (
      <>
        <defs>
          <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={a} />
            <stop offset="1" stopColor={b} />
          </linearGradient>
        </defs>
        <g stroke={`url(#${uid}-g)`} {...trazo}>
          <polygon points="50,8 86,29 86,71 50,92 14,71 14,29" strokeWidth={2.4} />
          <polygon points="50,24 72,37 72,63 50,76 28,63 28,37" />
          <path d="M50 24 V8 M72 37 L86 29 M72 63 L86 71 M28 63 L14 71" />
          <path d="M50 76 V60 H40 M28 37 L38 43 V52 M72 50 H60 L56 44" />
        </g>
        <g fill={a}>
          <circle cx="40" cy="60" r="2.4" />
          <circle cx="38" cy="52" r="2.4" />
          <circle cx="56" cy="44" r="2.4" />
          <circle cx="50" cy="50" r="4" />
        </g>
      </>
    ),
  },
  // Órbitas: nómadas del espacio.
  riux: {
    colores: ["#c77dff", "#4cc9f0"],
    emblema: ([a, b], uid) => (
      <>
        <defs>
          <radialGradient id={`${uid}-g`}>
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor={a} />
          </radialGradient>
        </defs>
        <g stroke={b} {...trazo}>
          <ellipse cx="50" cy="50" rx="42" ry="14" transform="rotate(-25 50 50)" />
          <ellipse cx="50" cy="50" rx="42" ry="14" transform="rotate(35 50 50)" stroke={a} />
          <ellipse cx="50" cy="50" rx="30" ry="30" strokeDasharray="2 5" />
        </g>
        <circle cx="50" cy="50" r="9" fill={`url(#${uid}-g)`} />
        <circle cx="88" cy="32" r="3.2" fill={b} />
        <circle cx="20" cy="22" r="2.6" fill={a} />
        <circle cx="66" cy="82" r="2.2" fill={b} />
      </>
    ),
  },
  // Ondas: física vibratoria, mundos oceánicos.
  arianyi: {
    colores: ["#2ec4b6", "#3a86ff"],
    emblema: ([a, b]) => (
      <>
        <g {...trazo}>
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M8 ${30 + i * 10} Q 22 ${22 + i * 10} 36 ${30 + i * 10} T 64 ${30 + i * 10} T 92 ${30 + i * 10}`}
              stroke={i % 2 ? b : a}
              opacity={1 - Math.abs(i - 2) * 0.25}
            />
          ))}
        </g>
        <circle cx="50" cy="50" r="38" stroke={a} {...trazo} strokeDasharray="1 4" />
      </>
    ),
  },
  // Cristal facetado: el kerzul.
  arkoru: {
    colores: ["#ff8800", "#7b2cbf"],
    emblema: ([a, b], uid) => (
      <>
        <defs>
          <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={a} stopOpacity="0.55" />
            <stop offset="1" stopColor={b} stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <polygon points="50,6 74,30 64,92 36,92 26,30" {...trazo} fill={`url(#${uid}-g)`} stroke={a} strokeWidth={2.2} />
        <g stroke={a} {...trazo} opacity={0.8}>
          <path d="M26 30 H74 M50 6 L42 30 L50 92 L58 30 Z" />
          <path d="M42 30 L36 92 M58 30 L64 92" opacity={0.5} />
        </g>
        <g stroke={b} {...trazo}>
          <polygon points="18,58 26,48 32,62 24,74" />
          <polygon points="82,54 88,64 80,78 74,66" />
        </g>
      </>
    ),
  },
  // Cresta: castas y Casas nobles.
  manduk: {
    colores: ["#ff003c", "#ff8800"],
    emblema: ([a, b], uid) => (
      <>
        <defs>
          <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={b} />
            <stop offset="1" stopColor={a} />
          </linearGradient>
        </defs>
        <path
          d="M50 4 L58 22 L72 10 L74 30 L90 24 L82 44 L82 62 Q82 82 50 96 Q18 82 18 62 L18 44 L10 24 L26 30 L28 10 L42 22 Z"
          stroke={`url(#${uid}-g)`}
          {...trazo}
          strokeWidth={2.4}
        />
        <path d="M50 38 L64 50 L50 82 L36 50 Z" {...trazo} fill={a} fillOpacity={0.35} stroke={a} />
        <path d="M30 50 H40 M60 50 H70 M50 30 V38" stroke={b} {...trazo} />
      </>
    ),
  },
};

const NEUTRO: [string, string] = ["#8a8aa0", "#2d1b4e"];

export function coloresDeEspecie(especieId: string): [string, string] {
  return ARTE[especieId]?.colores ?? NEUTRO;
}

// Una por casta (Manduk) y una por casa (linaje).
const COLOR_OPCION: Record<string, string> = {
  noble: "#fcee0a",
  sabio: "#00f0ff",
  guerrero: "#ff003c",
  siervo: "#8a8aa0",
  ilkrem: "#ff5f1f",
  zimethroni: "#39ff14",
  irota: "#2ec4b6",
  maolher: "#ff2e97",
  axadren: "#c77dff",
  elion: "#ffd166",
};

export function colorDeOpcion(id: string): string {
  return COLOR_OPCION[id] ?? NEUTRO[0];
}

// El "arte" de la tarjeta: imagen si la hay; si no, el emblema sobre un degradado
// radial con los dos colores y scanlines sutiles.
export function ArteEspecie({ especieId, className = "" }: { especieId: string; className?: string }) {
  const uid = `emblema-${especieId}-${useId().replace(/:/g, "")}`;
  const arte = ARTE[especieId];
  const [a, b] = arte?.colores ?? NEUTRO;
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: `radial-gradient(circle at 50% 40%, ${a}55 0%, ${b}33 45%, var(--color-night) 85%)` }}
    >
      {arte?.imagen ? (
        <Image src={arte.imagen} alt="" fill sizes="(max-width: 448px) 86vw, 384px" className="object-cover" />
      ) : (
        arte && (
          <svg viewBox="0 0 100 100" aria-hidden className="absolute left-1/2 top-[42%] h-[62%] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_6px_rgba(255,255,255,0.25)]">
            {arte.emblema([a, b], uid)}
          </svg>
        )
      )}
      <div className="scanlines pointer-events-none absolute inset-0 opacity-60" />
    </div>
  );
}
