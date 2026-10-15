// Qué especialidad usa cada arma al atacar (tanda ESP, docs/sistema.md §3). Si la ficha
// tiene esa especialidad, el ataque va con el valor entero de la habilidad; si no, con la
// mitad (rules/montaje.ts, enEspecialidadEfectiva). Tabla revisable a mano: el test
// (rules/especialidades.test.ts) obliga a que toda arma que genera ataque tenga aquí una
// especialidad de la habilidad con la que ataca.
//
// La especialidad es de la habilidad de ESA tirada: un arma melee arrojadiza golpea con su
// especialidad de Combate Melee y se lanza con Lanzamiento (Atletismo, ver ESPECIALIDAD_LANZAR).
import type { EspecialidadId } from "./especialidades";
import { ARMAS, type ArmaFuego } from "./armasFuego";

// Armas de fuego por empleo (S44, usuario): a una mano, Armas de Fuego Cortas; a dos manos
// (subfusiles incluidos), Largas. Las ametralladoras están en Armas de Fuego, no en
// Armamento Pesado: Largas también, por su empleo. Melee y pesado siguen por tabla.
export function especialidadArmaFuego(arma: Pick<ArmaFuego, "empleo">): EspecialidadId {
  return arma.empleo === "una mano" ? "armas_de_fuego_cortas" : "armas_de_fuego_largas";
}

// Armas del catálogo (armasMelee.ts, armasFuego.ts, armamentoPesado.ts): id → especialidad.
// Las de fuego salen de su empleo (especialidadArmaFuego); el resto, a mano.
export const ESPECIALIDAD_ARMA: Readonly<Record<string, EspecialidadId>> = {
  // ── Combate Melee: grupos del catálogo que se llaman como su especialidad ──
  pelea_punetazo: "pelea",
  pelea_patada: "pelea",
  pelea_codazo_rodillazo: "pelea",
  corta_tonfa_porra: "armas_cortas",
  corta_maza_armas: "armas_cortas",
  corta_pico_cuervo: "armas_cortas",
  corta_hacha_armas: "armas_cortas",
  asta_baston_combate: "armas_de_asta",
  asta_lanza_corta: "armas_de_asta",
  asta_lanza_larga: "armas_de_asta",
  asta_hacha_guerra: "armas_de_asta",
  asta_martillo_enastado: "armas_de_asta",
  asta_alabarda: "armas_de_asta",
  escudo_rodela: "escudos",
  escudo_estandar: "escudos",
  escudo_rodela_metamaterial: "escudos",
  escudo_metamaterial: "escudos",
  espada_cuchillo_combate: "espadas_y_dagas",
  espada_ligera: "espadas_y_dagas",
  espada: "espadas_y_dagas",
  espada_montante: "espadas_y_dagas",
  flagelo_latigo: "flagelos",
  flagelo_mangual: "flagelos",
  flagelo_cadena_armada: "flagelos",

  // ── Armas Mecánicas: la fuente no las encaja en ninguna especialidad ──
  // Lectura por forma de uso, confirmada por el usuario (S44).
  mecanica_hoja_dentada: "espadas_y_dagas", // hoja a una mano
  mecanica_guantelete_piston: "pelea", // golpe con el puño
  mecanica_sierra_circular: "espadas_y_dagas", // hoja motorizada a dos manos
  mecanica_martillo_piston: "armas_de_asta", // como el Martillo Enastado
  mecanica_ariete_percusivo: "armas_de_asta", // a dos manos, con alcance

  // ── Kerzul: la misma especialidad que su arma básica ──
  kerzul_punal: "espadas_y_dagas",
  // Confirmado (S44): "Espada, Hacha o Pico de Guerra" y "Espadón o Hacha de Armas" mezclan
  // Espadas y Dagas con Armas Cortas (hacha de armas, pico de cuervo); van por la espada.
  kerzul_espada_hacha_pico: "espadas_y_dagas",
  kerzul_espadon_hacha_armas: "espadas_y_dagas",
  kerzul_maza: "armas_cortas",
  kerzul_baston_combate: "armas_de_asta",
  kerzul_lanza_corta: "armas_de_asta",
  kerzul_lanza_larga: "armas_de_asta",
  kerzul_martillo_enastado: "armas_de_asta",
  kerzul_alabarda: "armas_de_asta",
  kerzul_escudo: "escudos",

  // ── Combate a Distancia: las armas de fuego van por empleo (especialidadArmaFuego) ──
  ...Object.fromEntries(ARMAS.map((a) => [a.id, especialidadArmaFuego(a)])),

  // Armamento pesado
  lanzallamas_ligero: "armas_pesadas",
  lanzacohetes_rt: "armas_pesadas",
  lanzagranadas_pesado: "armas_pesadas",
  lanzamisiles_at: "armas_pesadas",
  canon_plasma: "armas_pesadas",
};

// Ataques que no salen de un arma del catálogo sino de una mejora o un subsistema.
export const ESPECIALIDAD_ATAQUE_ESPECIAL = {
  // Confirmado (S44): la Bayoneta usa el perfil del Cuchillo de Combate (Espadas y Dagas);
  // podría ser Armas de Asta (va en la punta de un fusil).
  bayoneta: "espadas_y_dagas",
  // Confirmado (S44): igual que el Lanzagranadas de armamento pesado; podría ser la
  // especialidad del fusil que lo lleva.
  lanzagranadas_integrado: "armas_pesadas",
  // Confirmado (S44): disparo de pulso de un emisor en la armadura, leído como arma corta.
  proyector_pulso_disparo: "armas_de_fuego_cortas",
  // Confirmado (S44): Aguijón, pincho corto de energía a bocajarro (Sutil), leído como daga.
  proyector_pulso_aguijon: "espadas_y_dagas",
} as const satisfies Record<string, EspecialidadId>;

// Lanzar un arma melee arrojadiza o una granada: Potencia + Atletismo (combate.ts), así
// que la especialidad es la de Atletismo.
// Confirmado (S41): Combate a Distancia trae "Armas Arrojadizas"; si lanzar pasa a Combate a
// Distancia, esto pasa a armas_arrojadizas.
export const ESPECIALIDAD_LANZAR: EspecialidadId = "lanzamiento";
