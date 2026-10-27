import {
  ACCIONES,
  ID_APUNTADO,
  ID_APUNTAR,
  VITALIDAD_DE_FICHA,
  alcanzaA,
  defaultSheet,
  equipoPorId,
  especialidadesDeTirada,
  resolverFicha,
  type Accion,
  type AplicadoId,
  type ContextoAccion,
  type FichaResuelta,
} from "@/lib/rules";

// "te afecta: A, B, C" de una hoja de tirada: los nombres (sin números) de lo que pone la ficha
// del personaje en ESTA tirada — dotes, aumentos, equipo y mejoras de arma, especie, fármacos,
// poderes —, para recordarlo y comprobar que se aplica. Solo lee la Accion ya pasada por
// conExtrasDeFicha y la FichaResuelta; no suma nada.

// Lo general no se lista: alcance "todas" (umbrales, estados) y los de habilidad o especialidad,
// que ya salen en el número de su rama y en todas sus filas.
const ALCANCES_GENERALES = new Set(["todas", "habilidad", "especialidad"]);

// El contexto con el que montarTirada mira los alcances, con el aplicado con el que se tira de
// verdad (Sutil incluido). Sin modo elegido: la tirada aún no se ha abierto.
const contexto = (t: Accion, aplicado: AplicadoId): ContextoAccion => ({
  id: t.id,
  grupo: t.grupo,
  habilidad: t.habilidad,
  modoElegido: null,
  aplicado,
  ...(t.familiaArma && { familiaArma: t.familiaArma }),
  ...(t.empleoArma && { empleoArma: t.empleoArma }),
  ...(t.desarmado && { desarmado: true }),
  ...(t.contundente && { contundente: true }),
  ...(t.especialidadArma && { especialidadArma: t.especialidadArma }),
  especialidades: especialidadesDeTirada(t, true),
});

// Las casillas no guardan de dónde vienen. Las de una pieza equipada (mejoras de arma sin
// alcance, casillas con alcance de equipo y aumentos) se reconocen por su id en el catálogo de
// esa pieza, y se nombran con la pieza.
function piezaPorCasilla(ficha: FichaResuelta): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const pieza of ficha.ficha.equipo) {
    const cat = equipoPorId(pieza.catalogoId);
    if (!cat || !("niveles" in cat)) continue;
    for (const n of cat.niveles) {
      if (!("condiciones" in n)) continue;
      for (const c of n.condiciones ?? []) if (!mapa.has(c.id)) mapa.set(c.id, cat.label);
    }
  }
  return mapa;
}

// Las casillas con alcance que tiene cualquier ficha, también una vacía (la de «Bajo Ultra
// Estimulante», que sale siempre en las físicas): no son de este personaje. Se calcula una vez.
let universales: Set<string> | null = null;
function casillasDeCualquiera(): Set<string> {
  if (!universales) {
    const i = resolverFicha(defaultSheet(), { estados: [], vitalidad: VITALIDAD_DE_FICHA }).indiceCondiciones;
    const entradas = [
      ...[i.porTiradaId, i.porGrupo, i.porHabilidad, i.porFamiliaArma, i.porEspecialidad].flatMap((m) => [...m.values()].flat()),
      ...i.porAplicado,
      ...i.todas,
    ];
    universales = new Set(entradas.map((e) => e.condicion.id));
  }
  return universales;
}

// Las casillas de dote llevan la fuente al final, entre paréntesis y con mayúscula («En tu
// bioma predilecto (Bioma Predilecto: Selva densa)», «Con Táctica (Vigilancia Táctica)», a
// veces con un umbral detrás de una coma): esa es el nombre. Sin ella, la etiqueta entera.
function nombreDeEtiqueta(etiqueta: string): string {
  const fuente = /\(([A-ZÁÉÍÓÚÑ][^()]*)\)$/.exec(etiqueta)?.[1];
  return fuente ? fuente.split(/[,;] /)[0] : etiqueta;
}

// Las aclaraciones en minúscula que el motor pega a una fuente ("Escudo (bloqueo)", "Mira
// Telescópica 3 (la integrada ya va en la dificultad)") no son parte del nombre.
const sinAclaracion = (fuente: string) => fuente.replace(/ \([a-zà-ú][^()]*\)$/, "");

export function teAfecta(ficha: FichaResuelta, t: Accion, aplicado: AplicadoId): string[] {
  const ctx = contexto(t, aplicado);
  const base = ACCIONES.find((a) => a.id === t.id);
  const idsBase = new Set((base?.condiciones ?? []).map((c) => c.id));
  const deMejoras = piezaPorCasilla(ficha);

  const nombres: string[] = [
    ...ficha.modificadores.flatMap((m) =>
      m.tipo === "tirada" && m.origen !== "estado" && !ALCANCES_GENERALES.has(m.alcance.tipo) && alcanzaA(m.alcance, ctx)
        ? [m.fuente]
        : [],
    ),
    ...(t.ventaja ? [t.ventaja] : []),
    ...(t.criticoFijo ? [t.criticoFijo.fuente] : []),
    ...(t.subeGradoFijo ? [t.subeGradoFijo] : []),
    ...(t.falloCritico ? [t.falloCritico.fuente] : []),
    ...(t.extremidad ? [t.extremidad.fuente] : []),
    // La otra habilidad, si no la trae ya la tirada del catálogo ("Con Sigilo" en la distracción).
    ...(t.habilidadAlternativa && base?.habilidadAlternativa?.etiqueta !== t.habilidadAlternativa.etiqueta
      ? [t.habilidadAlternativa.ajuste?.fuente ?? nombreDeEtiqueta(t.habilidadAlternativa.etiqueta)]
      : []),
    ...(t.bonosTramo ?? []).map((b) => b.fuente),
    ...(t.condiciones ?? []).flatMap((c): string[] => {
      if (c.tipo === "contador" && c.descuento) return c.descuento.fuente.split(", ");
      const pieza = deMejoras.get(c.id);
      if (pieza) return [pieza];
      // Con alcance vienen del índice de la ficha (especie, dotes, aumentos); sin él, de la
      // propia tirada, salvo lo que se le añade a una fija y no trae su catálogo (psiónica).
      if (c.alcance) return c.alcance.tipo === "todas" || casillasDeCualquiera().has(c.id) ? [] : [nombreDeEtiqueta(c.etiqueta)];
      if (base && !idsBase.has(c.id)) return [nombreDeEtiqueta(c.etiqueta)];
      return [];
    }),
    // Gran Puntería cambia el selector «Apuntado» de los ataques sin dejar fuente en él.
    ...((t.condiciones ?? []).some((c) => c.id === ID_APUNTADO)
      ? ficha.extrasDotes.grados.flatMap((g) =>
          g.alcance.tipo === "tiradaId" && g.alcance.id === ID_APUNTAR && g.margen === 0 ? [g.fuente] : [],
        )
      : []),
    ...(t.ajustesFijos ?? []).map((a) => a.fuente),
    ...(t.efectos ?? []).map((e) => e.fuente),
    ...(t.ignoraBlindaje ? [t.ignoraBlindaje.fuente] : []),
    // Los textos van pegados a la nota o al crítico con su fuente entre paréntesis
    // (conTextosEnTirada): se reconocen por esa marca.
    ...ficha.textosTirada.flatMap((x) =>
      [t.nota, t.efectoCritico, t.efectoCriticoNatural].some((s) => s?.includes(`(${x.fuente})`)) ? [x.fuente] : [],
    ),
  ];

  // Lo que nombra la propia tirada (el arma con la que se dispara) no se repite.
  const label = t.label.toLowerCase();
  return [...new Set(nombres.map(sinAclaracion))].filter((n) => n && !label.includes(n.toLowerCase()));
}
