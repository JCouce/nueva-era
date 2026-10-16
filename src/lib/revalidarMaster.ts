import { revalidatePath } from "next/cache";

// Las pantallas del máster que enseñan datos de las fichas: la Mesa (/master, vida,
// estados, xp y créditos) y la lista de fichas (/master/fichas, estado de revisión).
export function revalidarPanelMaster() {
  revalidatePath("/master");
  revalidatePath("/master/fichas");
}
