import { redirect } from "next/navigation";
import { currentUser } from "@/lib/studio/auth";

/** `/app` is a router, never a page: send everyone to their own area. */
export default async function StudioEntry() {
  const user = await currentUser();
  if (!user) redirect("/app/entrar");
  redirect(user.role === "coach" ? "/app/coach" : "/app/aluno");
}
