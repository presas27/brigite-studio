"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasLocale } from "@/i18n/config";
import { setUserLocale } from "@/i18n/locale";
import { currentUser } from "@/lib/studio/auth";
import { setUserLocalePreference, setUserName } from "@/lib/studio/users";

/**
 * Save the signed-in user's own details. Scoped to `currentUser()` and nothing
 * else — there is no id in the form, so this action cannot be pointed at
 * somebody else's account.
 *
 * The locale is written twice on purpose: to the user row, which is what the
 * emailed sign-in link reads, and to the cookie, which is what the next page
 * render reads.
 */
export async function saveAccount(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/app/entrar");

  const name = String(formData.get("name") ?? "").trim();
  if (name && name.length <= 200 && name !== user.name) setUserName(user.id, name);

  const locale = String(formData.get("locale") ?? "");
  if (hasLocale(locale) && locale !== user.locale) {
    setUserLocalePreference(user.id, locale);
    await setUserLocale(locale);
  }

  revalidatePath("/app/conta");
  redirect("/app/conta?guardado=1");
}
