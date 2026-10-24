import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { rehypeTablasManual } from "@/lib/manual/tablas";
import estilosTabla from "./tablas.module.css";

// react-markdown pasa el nodo hast como prop; no debe llegar al DOM.
function sinNodo<P extends { node?: unknown }>(props: P): Omit<P, "node"> {
  const resto = { ...props };
  delete resto.node;
  return resto;
}

// Ancla bajo la cabecera de la app y la barra del lector (ambas sticky).
const ANCLA = "scroll-mt-32";

const componentes: Components = {
  h2: (props) => (
    <h2
      {...sinNodo(props)}
      className={`${ANCLA} mt-10 mb-3 border-b border-border pb-1.5 font-display text-xl font-bold uppercase tracking-wide text-accent`}
    />
  ),
  h3: (props) => (
    <h3
      {...sinNodo(props)}
      className={`${ANCLA} mt-8 mb-2 font-display text-lg font-semibold uppercase tracking-wide text-info`}
    />
  ),
  h4: (props) => (
    <h4
      {...sinNodo(props)}
      className={`${ANCLA} mt-6 mb-2 font-display text-base font-semibold text-foreground`}
    />
  ),
  p: (props) => (
    <p {...sinNodo(props)} className="my-3 text-[1.0625rem] leading-[1.65] text-soft" />
  ),
  strong: (props) => (
    <strong {...sinNodo(props)} className="font-semibold text-foreground" />
  ),
  em: (props) => <em {...sinNodo(props)} className="italic text-muted" />,
  ul: (props) => (
    <ul
      {...sinNodo(props)}
      className="my-3 list-disc space-y-1.5 pl-5 text-[1.0625rem] leading-[1.6] text-soft marker:text-accent"
    />
  ),
  ol: (props) => (
    <ol
      {...sinNodo(props)}
      className="my-3 list-decimal space-y-1.5 pl-5 text-[1.0625rem] leading-[1.6] text-soft marker:font-mono marker:text-accent"
    />
  ),
  a: (props) => (
    <a {...sinNodo(props)} className="text-info underline underline-offset-4" />
  ),
  code: (props) => (
    <code {...sinNodo(props)} className="font-mono text-[0.9em] text-info" />
  ),
  hr: () => <hr className="my-8 border-border" />,
  blockquote: (props) => (
    <blockquote {...sinNodo(props)} className="my-4 border-l-2 border-glitch pl-4 text-soft" />
  ),
  table: (props) => {
    const modo = (props as { "data-modo"?: string })["data-modo"];
    const envoltorio = modo === "fichas" ? estilosTabla.fichas : estilosTabla.scroll;
    return (
      <div className={`${estilosTabla.envoltorio} ${envoltorio}`}>
        <table {...sinNodo(props)} className={estilosTabla.tabla} />
      </div>
    );
  },
  // Envoltorio: en modo ficha la celda es un grid (etiqueta | valor) y sus hijos
  // sueltos (texto, <br>) no pueden ser cada uno una celda del grid.
  td: ({ children, ...props }) => (
    <td {...sinNodo(props)}>
      <div>{children}</div>
    </td>
  ),
};

export function DocumentoMarkdown({ markdown }: { markdown: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, rehypeTablasManual]}
      components={componentes}
    >
      {markdown}
    </Markdown>
  );
}
