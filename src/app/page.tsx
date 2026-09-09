import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";

export default async function Home() {
  const user = await requireUser();
  redirect(user.role === "MASTER" ? "/master" : "/characters");
}
