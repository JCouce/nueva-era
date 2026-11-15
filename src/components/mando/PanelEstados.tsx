"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  ATRIBUTOS,
  estadosDelPanel,
  esIdPersonalizado,
  GRUPOS_ESTADO,
  HABILIDADES,
  MAX_LINEAS_PERSONALIZADO,
  MAX_NOMBRE_PERSONALIZADO,
  MAX_RONDAS_ESTADO,
  MAX_VALOR_PERSONALIZADO,
  estadoPorId,
  etiquetaDuracion,
  listaLegible,
  nombreCorto,
  resumenPersonalizado,
  textoInmuneAlAplicar,
  type DuracionEstado,
  type Estado,
  type EstadoActivoDescrito,
  type EstadoPersonalizado,
  type GrupoEstadoId,
  type InmuneAlAplicar,
  type ModificadorPersonalizado,
} from "@/lib/rules";
import { Boton, FOCO, Fila, Opcion, Stepper } from "./controles";
import { HojaInferior } from "./HojaInferior";
import { BarraObjetivo } from "./BarraObjetivo";
import type { AccionesMando, AvisoMando, EstadoAAplicar, ObjetivoMando } from "./tipos";

type TipoDuracion = DuracionEstado["tipo"];

// Sin tildes ni mayúsculas: "paralisis" encuentra Parálisis.
const normalizar = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// El grado que se propone al elegir un estado: Fracaso si lo tiene (el resultado más
// habitual de una salvación fallida), si no el primero.
const gradoInicial = (e: Estado) => (e.grados.some((g) => g.id === "fracaso") ? "fracaso" : e.grados[0].id);

// A7: lo que no se aplicó por inmune, a la espera de "Aplicar igualmente".
type PorForzar = { estado: EstadoAAplicar; label: string; inmunes: InmuneAlAplicar[] };

// La tarjeta «Personalizado» de la rejilla (crear uno nuevo). No es un id del catálogo ni «custom:…».
const NUEVO_PERSONALIZADO = "__personalizado";
const TEXTO_NUEVO_PERSONALIZADO = "Nombre libre y bonos o penalizadores a atributos y habilidades.";

// Una línea del formulario del personalizado: el objetivo va como «atributo:fuerza» para el <select>.
type LineaForm = { clave: number; objetivo: string; valor: number };
const OBJETIVO_INICIAL = `atributo:${ATRIBUTOS[0].id}`;

function lineaDeForm(l: LineaForm): ModificadorPersonalizado | null {
  const [tipo, id] = l.objetivo.split(":");
  if (tipo === "atributo") {
    const a = ATRIBUTOS.find((x) => x.id === id);
    return a ? { tipo, id: a.id, valor: l.valor } : null;
  }
  const h = HABILIDADES.find((x) => x.id === id);
  return tipo === "habilidad" && h ? { tipo, id: h.id, valor: l.valor } : null;
}

// Pestaña Estados del panel de mando: buscador, rejilla del catálogo por grupos plegables y la
// configuración del elegido (grado, duración, efecto). En escritorio la configuración va debajo de
// la rejilla; en móvil, tocar un estado abre la hoja inferior (CSS: los dos montados, cada uno
// escondido en su breakpoint). `enLinea`: la configuración siempre debajo y nunca la hoja propia,
// para cuando el panel ya va dentro de una (combate en móvil, E1d).
export function PanelEstados({
  objetivos,
  acciones,
  onAviso,
  onQuitarObjetivo,
  enLinea = false,
  onAplicado,
}: {
  objetivos: ObjetivoMando[];
  acciones: AccionesMando;
  onAviso: (a: Omit<AvisoMando, "id">) => void;
  onQuitarObjetivo: (id: string) => void;
  enLinea?: boolean;
  onAplicado?: () => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [estadoId, setEstadoId] = useState<string | null>(null);
  const [gradoId, setGradoId] = useState<string | null>(null);
  const [tipoDuracion, setTipoDuracion] = useState<TipoDuracion>("rondas");
  const [rondas, setRondas] = useState(1);
  const [hoja, setHoja] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [porForzar, setPorForzar] = useState<PorForzar | null>(null);
  const [pendiente, startTransition] = useTransition();
  // Grupos abiertos a mano. Arranca abierto solo Control, el que más se usa (usuario, 2026-11-15);
  // el resto plegado para que la rejilla quepa de un vistazo.
  const [abiertos, setAbiertos] = useState<ReadonlySet<GrupoEstadoId>>(() => new Set<GrupoEstadoId>(["control"]));
  const [nombreCustom, setNombreCustom] = useState("");
  const [lineas, setLineas] = useState<LineaForm[]>([{ clave: 0, objetivo: OBJETIVO_INICIAL, valor: 1 }]);
  const [siguienteClave, setSiguienteClave] = useState(1);

  const q = normalizar(busqueda.trim());
  const coincide = (texto: string) => !q || normalizar(texto).includes(q);
  // Los que llevan puestos y no se ponen desde aquí (Sigilo…), en «Otros» y solo para quitarlos.
  const delPanel = estadosDelPanel(objetivos.flatMap((o) => o.estados.filter((e) => !e.automatico).map((e) => e.estadoId)));
  // Los personalizados que ya llevan los objetivos, uno por id, para poder quitarlos desde aquí
  // (la Mesa no tiene × en sus chips).
  const personalizadosPuestos = [
    ...new Map(
      objetivos.flatMap((o) => o.estados.filter((e) => e.custom && esIdPersonalizado(e.estadoId))).map((e) => [e.estadoId, e]),
    ).values(),
  ];
  const puestoElegido: EstadoActivoDescrito | null = personalizadosPuestos.find((e) => e.estadoId === estadoId) ?? null;
  const nuevoElegido = estadoId === NUEVO_PERSONALIZADO;
  const estado = estadoId && !nuevoElegido && !esIdPersonalizado(estadoId) ? estadoPorId(estadoId) : null;
  const soloQuitar = delPanel.some((x) => x.soloQuitar && x.estado.id === estadoId) || !!puestoElegido;
  const grado = estado?.grados.find((g) => g.id === gradoId) ?? estado?.grados[0] ?? null;

  const custom: EstadoPersonalizado = {
    nombre: nombreCustom.trim(),
    modificadores: lineas.flatMap((l) => {
      const m = lineaDeForm(l);
      return m ? [m] : [];
    }),
  };
  const customListo = custom.nombre !== "" && custom.modificadores.length > 0;
  // Lo elegido, para títulos y avisos: «Aturdido», «Bendición del chamán».
  const titulo = estado?.label ?? puestoElegido?.nombre ?? (nuevoElegido ? custom.nombre || "Personalizado" : null);

  const trasElegir = () => {
    setError(null);
    setPorForzar(null);
    if (!enLinea) setHoja(true);
  };
  const elegirEstado = (e: Estado) => {
    setEstadoId(e.id);
    const g = gradoInicial(e);
    setGradoId(g);
    proponerDuracion(e, g);
    trasElegir();
  };
  const elegirNuevoPersonalizado = () => {
    setEstadoId(NUEVO_PERSONALIZADO);
    setGradoId(null);
    // Lo más habitual en uno a medida (una bendición, un favor) es que dure la escena.
    setTipoDuracion("escena");
    trasElegir();
  };
  const elegirPuesto = (e: EstadoActivoDescrito) => {
    setEstadoId(e.estadoId);
    setGradoId(null);
    trasElegir();
  };
  // Si el documento da una duración por defecto para el grado, se propone en rondas.
  const proponerDuracion = (e: Estado, g: string) => {
    const turnos = e.grados.find((x) => x.id === g)?.duracionTurnos ?? null;
    if (turnos !== null) {
      setTipoDuracion("rondas");
      setRondas(Math.max(1, turnos));
    }
  };

  const duracion: DuracionEstado =
    tipoDuracion === "rondas" ? { tipo: "rondas", rondas } : tipoDuracion === "escena" ? { tipo: "escena" } : { tipo: "hastaQuitarlo" };
  const nombres = listaLegible(objetivos.map((o) => nombreCorto(o.nombre)));
  // Los automáticos (la Inconsciencia por la vida o la fatiga) no se quitan: no están puestos.
  const idQuitable = estado?.id ?? puestoElegido?.estadoId ?? null;
  const conEste = idQuitable ? objetivos.filter((o) => o.estados.some((e) => e.estadoId === idQuitable && !e.automatico)) : [];
  // A7: los objetivos inmunes a un estado, con la pieza ("Javi (Ojo Biónico 2)").
  const inmunesA = (estadoId: string) =>
    objetivos.flatMap((o) => {
      const i = o.inmunidades.find((x) => x.estadoId === estadoId);
      return i ? [`${nombreCorto(o.nombre)} (${i.fuente})`] : [];
    });
  const inmunesAlElegido = estado ? inmunesA(estado.id) : [];

  // A quien es inmune no se le pone (A7): el resto lo recibe y el aviso de abajo ofrece
  // "Aplicar igualmente" solo para ellos. Al personalizado no le alcanza ninguna inmunidad.
  const aplicar = () => {
    if (objetivos.length === 0) return;
    let aAplicar: EstadoAAplicar;
    let label: string;
    if (nuevoElegido) {
      if (!customListo) return setError("Ponle un nombre y al menos un bono.");
      aAplicar = { custom, duracion };
      label = custom.nombre;
    } else {
      if (!estado || !grado) return;
      aAplicar = { estadoId: estado.id, gradoId: grado.id, duracion };
      label = estado.label;
    }
    setError(null);
    setPorForzar(null);
    startTransition(async () => {
      const r = await acciones.aplicarEstado(
        objetivos.map((o) => o.id),
        aAplicar,
      );
      if (!r.ok) return setError(r.error);
      const inmunes = r.inmunes ?? [];
      const aplicados = objetivos.filter((o) => !inmunes.some((i) => i.id === o.id));
      if (aplicados.length > 0) {
        const a = listaLegible(aplicados.map((o) => nombreCorto(o.nombre)));
        onAviso({ mensaje: `${label} a ${a}`, registroId: r.registroId, tono: "ok" });
      }
      if (inmunes.length > 0) return setPorForzar({ estado: aAplicar, label, inmunes });
      setHoja(false);
      onAplicado?.();
    });
  };
  const aplicarIgualmente = () => {
    if (!porForzar) return;
    setError(null);
    const { estado: aForzar, label, inmunes } = porForzar;
    startTransition(async () => {
      const r = await acciones.aplicarEstado(
        inmunes.map((i) => i.id),
        aForzar,
        true,
      );
      if (!r.ok) return setError(r.error);
      setPorForzar(null);
      setHoja(false);
      onAplicado?.();
      const quien = listaLegible(inmunes.map((i) => nombreCorto(i.nombre)));
      onAviso({ mensaje: `${label} forzado a ${quien}`, registroId: r.registroId, tono: "aviso" });
    });
  };
  const quitar = () => {
    if (!idQuitable || !titulo || conEste.length === 0) return;
    setError(null);
    startTransition(async () => {
      const r = await acciones.quitarEstado(conEste.map((o) => o.id), idQuitable);
      if (!r.ok) return setError(r.error);
      setHoja(false);
      onAplicado?.();
      const quien = listaLegible(conEste.map((o) => nombreCorto(o.nombre)));
      onAviso({ mensaje: `Quitado ${titulo} a ${quien}`, registroId: r.registroId, tono: "ok" });
    });
  };

  const textoAplicar = titulo ? `Aplicar ${titulo}${objetivos.length > 1 ? ` a ${objetivos.length}` : ""}` : "Aplicar";
  const puedeAplicar = objetivos.length > 0 && !pendiente && (!nuevoElegido || customListo);

  const filaDuracion = (
    <Fila etiqueta="Duración">
      <Opcion elegida={tipoDuracion === "rondas"} onClick={() => setTipoDuracion("rondas")}>
        Rondas
      </Opcion>
      <Opcion elegida={tipoDuracion === "escena"} onClick={() => setTipoDuracion("escena")}>
        Fin de escena
      </Opcion>
      <Opcion elegida={tipoDuracion === "hastaQuitarlo"} onClick={() => setTipoDuracion("hastaQuitarlo")}>
        Hasta quitarlo
      </Opcion>
      {tipoDuracion === "rondas" && (
        <Stepper valor={rondas} onCambio={setRondas} min={1} max={MAX_RONDAS_ESTADO} etiqueta="Rondas" />
      )}
    </Fila>
  );
  const avisoError = error && (
    <p role="alert" className="border border-danger px-3 py-2 text-sm text-danger">
      {error}
    </p>
  );

  const cambiarLinea = (clave: number, cambio: Partial<Omit<LineaForm, "clave">>) =>
    setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, ...cambio } : l)));
  const anadirLinea = () => {
    setLineas((ls) => [...ls, { clave: siguienteClave, objetivo: OBJETIVO_INICIAL, valor: 1 }]);
    setSiguienteClave((c) => c + 1);
  };

  const formularioPersonalizado = (
    <>
      <label className="grid gap-2">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">Nombre</span>
        <input
          type="text"
          value={nombreCustom}
          onChange={(e) => setNombreCustom(e.target.value)}
          maxLength={MAX_NOMBRE_PERSONALIZADO}
          placeholder="Bendición del chamán"
          autoComplete="off"
          className={`min-h-11 w-full border border-border bg-night px-3 placeholder:text-muted ${FOCO}`}
        />
      </label>
      <div className="grid gap-2">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">Bonos</span>
        {lineas.map((l, i) => (
          <div key={l.clave} className="flex flex-wrap items-center gap-2">
            <select
              value={l.objetivo}
              onChange={(e) => cambiarLinea(l.clave, { objetivo: e.target.value })}
              aria-label={`Bono ${i + 1}: atributo o habilidad`}
              className={`min-h-11 min-w-0 flex-1 basis-40 border border-border bg-night px-2 text-foreground ${FOCO}`}
            >
              <optgroup label="Atributos básicos">
                {ATRIBUTOS.map((a) => (
                  <option key={a.id} value={`atributo:${a.id}`}>
                    {a.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Habilidades">
                {HABILIDADES.map((h) => (
                  <option key={h.id} value={`habilidad:${h.id}`}>
                    {h.label}
                  </option>
                ))}
              </optgroup>
            </select>
            <Stepper
              valor={l.valor}
              // El 0 no existe: al cruzarlo se salta al otro lado.
              onCambio={(n) => cambiarLinea(l.clave, { valor: n === 0 ? (l.valor > 0 ? -1 : 1) : n })}
              min={-MAX_VALOR_PERSONALIZADO}
              max={MAX_VALOR_PERSONALIZADO}
              etiqueta={`Bono ${i + 1}`}
            />
            {lineas.length > 1 && (
              <button
                type="button"
                onClick={() => setLineas((ls) => ls.filter((x) => x.clave !== l.clave))}
                aria-label={`Quitar el bono ${i + 1}`}
                className={`grid size-11 shrink-0 place-items-center border border-border text-lg text-muted hover:text-foreground ${FOCO}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
        {lineas.length < MAX_LINEAS_PERSONALIZADO && (
          <Boton variante="fantasma" onClick={anadirLinea} className="justify-self-start px-0">
            + Añadir bono
          </Boton>
        )}
      </div>
      {filaDuracion}
      <div className="grid gap-1 border-l-2 border-accent py-1 pl-3">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">Efecto · {etiquetaDuracion(duracion)}</span>
        <p className="text-[0.95rem] leading-snug">
          {custom.modificadores.length > 0 ? resumenPersonalizado(custom) : "Sin bonos todavía."}
        </p>
      </div>
      {avisoError}
    </>
  );

  const configuracion: ReactNode = puestoElegido ? (
    <p className="border-l-2 border-accent py-1 pl-3 text-[0.95rem] leading-snug">
      {puestoElegido.valorTexto}. Personalizado ya puesto: aquí solo se quita; para cambiarlo, quítalo y pon otro.
    </p>
  ) : nuevoElegido ? (
    formularioPersonalizado
  ) : estado && grado && soloQuitar ? (
    <p className="border-l-2 border-accent py-1 pl-3 text-[0.95rem] leading-snug">{estado.resumen} Lo pone la ficha del jugador; aquí solo se quita.</p>
  ) : estado && grado && (
    <>
      {estado.grados.length > 1 && (
        <Fila etiqueta="Grado">
          {estado.grados.map((g) => (
            <Opcion
              key={g.id}
              elegida={g.id === grado.id}
              alerta={g.id === "fracaso_critico"}
              onClick={() => {
                setGradoId(g.id);
                proponerDuracion(estado, g.id);
              }}
            >
              {g.label}
            </Opcion>
          ))}
        </Fila>
      )}
      {filaDuracion}
      <div className="grid gap-1 border-l-2 border-accent py-1 pl-3">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">
          {estado.grados.length > 1 ? grado.label : "Efecto"} · {etiquetaDuracion(duracion)}
        </span>
        {(grado.detalle.length > 0 ? grado.detalle : [estado.resumen]).map((d) => (
          <p key={d} className="text-[0.95rem] leading-snug">
            {d}
          </p>
        ))}
      </div>
      {inmunesAlElegido.length > 0 && !porForzar && (
        <p className="border-l-2 border-info py-1 pl-3 text-sm text-info">
          Inmune: {listaLegible(inmunesAlElegido)}. No se le aplicará; luego podrás aplicarlo igualmente.
        </p>
      )}
      {porForzar && (
        <div role="alert" className="grid gap-2 border border-neon-orange px-3 py-2">
          {porForzar.inmunes.map((i) => (
            <p key={i.id} className="text-sm">
              {textoInmuneAlAplicar(i, nombreCorto(i.nombre))}: no se le ha aplicado.
            </p>
          ))}
          <div className="flex flex-wrap gap-2">
            <Boton variante="aviso" onClick={aplicarIgualmente} disabled={pendiente}>
              {pendiente ? "Aplicando…" : "Aplicar igualmente"}
            </Boton>
            <Boton onClick={() => setPorForzar(null)} disabled={pendiente}>
              Dejarlo así
            </Boton>
          </div>
        </div>
      )}
      {avisoError}
    </>
  );

  // Las tarjetas de cada grupo, ya filtradas por la búsqueda. Un grupo vacío no se pinta.
  const tarjetasDe = (grupo: GrupoEstadoId): ReactNode[] => {
    const delCatalogo = delPanel
      .filter((x) => x.grupo === grupo && coincide(x.estado.label))
      .map((x) => (
        <Tarjeta
          key={x.estado.id}
          titulo={x.estado.label}
          texto={x.estado.resumen}
          elegida={x.estado.id === estadoId}
          onClick={() => elegirEstado(x.estado)}
          inmunes={inmunesA(x.estado.id)}
        />
      ));
    if (grupo !== "personalizado") return delCatalogo;
    return [
      ...(coincide("Personalizado") || coincide("Nuevo personalizado")
        ? [
            <Tarjeta
              key={NUEVO_PERSONALIZADO}
              titulo="Personalizado"
              texto={TEXTO_NUEVO_PERSONALIZADO}
              elegida={nuevoElegido}
              onClick={elegirNuevoPersonalizado}
              nuevo
            />,
          ]
        : []),
      ...personalizadosPuestos
        .filter((e) => coincide(e.nombre))
        .map((e) => (
          <Tarjeta
            key={e.estadoId}
            titulo={e.nombre}
            texto={`${e.valorTexto ?? ""} · puesto a ${listaLegible(
              objetivos.filter((o) => o.estados.some((x) => x.estadoId === e.estadoId)).map((o) => nombreCorto(o.nombre)),
            )}`}
            elegida={e.estadoId === estadoId}
            onClick={() => elegirPuesto(e)}
          />
        )),
    ];
  };
  const grupos = GRUPOS_ESTADO.map((g) => ({ ...g, tarjetas: tarjetasDe(g.id) })).filter((g) => g.tarjetas.length > 0);
  const alternarGrupo = (id: GrupoEstadoId) =>
    setAbiertos((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="grid gap-4">
      <label className="flex items-center gap-2 border border-border bg-surface px-3 focus-within:border-info">
        <span aria-hidden="true" className="text-muted">
          ⌕
        </span>
        <span className="sr-only">Buscar estado</span>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar estado"
          autoComplete="off"
          className="min-h-11 w-full bg-transparent outline-none placeholder:text-muted"
        />
      </label>

      <div className="grid gap-2">
        {grupos.map((g) => {
          // Con búsqueda, abiertos todos los que tienen resultados (los vacíos ya no están).
          const abierto = !!q || abiertos.has(g.id);
          const panelId = `grupo-estados-${g.id}`;
          return (
            <section key={g.id} className="grid gap-2">
              <button
                type="button"
                aria-expanded={abierto}
                aria-controls={panelId}
                onClick={() => alternarGrupo(g.id)}
                disabled={!!q}
                className={`flex min-h-11 w-full items-center justify-between gap-3 border-b border-border px-1 text-left transition hover:border-muted disabled:cursor-default ${FOCO}`}
              >
                <span className="font-mono text-xs uppercase tracking-widest text-foreground">{g.label}</span>
                <span className="flex items-center gap-2 font-mono text-xs text-muted">
                  {g.tarjetas.length}
                  <span aria-hidden="true" className={`inline-block transition ${abierto ? "rotate-90 text-accent" : ""}`}>
                    ›
                  </span>
                </span>
              </button>
              {abierto && (
                <div id={panelId} className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
                  {g.tarjetas}
                </div>
              )}
            </section>
          );
        })}
        {grupos.length === 0 && <p className="text-muted">Ningún estado se llama así.</p>}
      </div>

      {/* Escritorio (o `enLinea`): configuración debajo de la rejilla. */}
      <div className={enLinea ? "" : "hidden lg:block"}>
        {configuracion ? (
          <div className="grid gap-4 border border-border bg-surface p-4">
            {configuracion}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-muted">
                {objetivos.length > 0 ? (
                  <>
                    A <b className="text-foreground">{nombres}</b>
                  </>
                ) : (
                  `Sin objetivo: elige a quién en la ${enLinea ? "cola" : "lista"}.`
                )}
              </span>
              <div className="flex flex-wrap gap-2">
                {conEste.length > 0 && (
                  <Boton variante="aviso" onClick={quitar} disabled={pendiente}>
                    Quitar a {listaLegible(conEste.map((o) => nombreCorto(o.nombre)))}
                  </Boton>
                )}
                {!soloQuitar && (
                  <Boton variante="primario" onClick={aplicar} disabled={!puedeAplicar}>
                    {pendiente ? "Aplicando…" : textoAplicar}
                  </Boton>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="border border-dashed border-border px-3 py-4 text-muted">Elige un estado de la lista.</p>
        )}
      </div>

      {/* Móvil: hoja inferior. */}
      {hoja && titulo && configuracion && (
        <HojaInferior
          titulo={titulo}
          onCerrar={() => setHoja(false)}
          className="lg:hidden"
          pie={
            <div className="grid gap-2">
              {conEste.length > 0 && (
                <Boton variante="aviso" onClick={quitar} disabled={pendiente} className="w-full">
                  Quitar {titulo} a {listaLegible(conEste.map((o) => nombreCorto(o.nombre)))}
                </Boton>
              )}
              {!soloQuitar && (
                <Boton variante="primario" onClick={aplicar} disabled={!puedeAplicar} className="min-h-13 w-full text-lg">
                  {objetivos.length === 0 ? "Elige a quién arriba" : pendiente ? "Aplicando…" : textoAplicar}
                </Boton>
              )}
            </div>
          }
        >
          <BarraObjetivo objetivos={objetivos} onQuitar={onQuitarObjetivo} vacio="Elige a quién en la tira de arriba." />
          {configuracion}
        </HojaInferior>
      )}
    </div>
  );
}

function Tarjeta({
  titulo,
  texto,
  elegida,
  onClick,
  inmunes = [],
  nuevo = false,
}: {
  titulo: string;
  texto: string;
  elegida: boolean;
  onClick: () => void;
  inmunes?: string[];
  // La de crear un personalizado: borde discontinuo, para que no se lea como un estado más.
  nuevo?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={elegida}
      onClick={onClick}
      className={`grid min-h-20 content-start gap-1 border p-2.5 text-left transition ${nuevo ? "border-dashed" : ""} ${
        elegida ? "border-accent bg-accent/5" : "border-border bg-surface hover:border-muted"
      } ${FOCO}`}
    >
      <b className="font-display text-[0.98rem] leading-tight">
        {nuevo && (
          <span aria-hidden="true" className="text-accent">
            +{" "}
          </span>
        )}
        {titulo}
      </b>
      <span className="line-clamp-2 text-sm leading-snug text-muted">{texto}</span>
      {inmunes.length > 0 && <span className="text-xs leading-snug text-info">Inmune: {listaLegible(inmunes)}</span>}
    </button>
  );
}
