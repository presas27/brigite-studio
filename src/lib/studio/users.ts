import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { Locale } from "@/i18n/config";
import { sm, sq } from "./convexServer";
import type { Client, PlanId, User, UserStatus } from "./types";

/**
 * Users and client profiles, as the server side of the app sees them.
 *
 * Every function here is one Convex call and nothing else. The authorisation is
 * not in this file — it is in `convex/users.ts`, checked against the session
 * token that `convexServer.ts` attaches, which is what makes it impossible to
 * bypass by calling the deployment directly. What is left here is the shape of
 * the API the pages were already written against.
 */

export async function findClient(clientId: string): Promise<Client | undefined> {
  const client = await sq(api.users.findClient, { clientId: clientId as Id<"users"> });
  return client ?? undefined;
}

/** Active and invited clients, alphabetical. Archived are excluded. */
export async function listClients(includeArchived = false): Promise<Client[]> {
  return sq(api.users.listClients, { includeArchived });
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const user = await sq(api.users.findByEmail, { email });
  return user ?? undefined;
}

/** Create a client plus its profile. Throws if the email already exists. */
export async function createClient(input: {
  email: string;
  name: string;
  plan: PlanId;
  goals?: string;
  injuries?: string;
  locale?: Locale;
}): Promise<Client> {
  return sm(api.users.createClient, input);
}

export async function updateClient(
  clientId: string,
  patch: {
    name?: string;
    plan?: PlanId;
    goals?: string;
    injuries?: string;
    notes?: string;
    tags?: string[];
    sessionsLeft?: number;
  },
): Promise<void> {
  await sm(api.users.updateClient, { clientId: clientId as Id<"users">, patch });
}

export async function setClientStatus(clientId: string, status: UserStatus): Promise<void> {
  await sm(api.users.setClientStatus, { clientId: clientId as Id<"users">, status });
}

/** Burn one in-person session credit. Returns the remaining balance. */
export async function consumeSession(clientId: string): Promise<number> {
  return sm(api.users.consumeSession, { clientId: clientId as Id<"users"> });
}

/** Rename yourself. The account page is the only caller, for either role. */
export async function setUserName(name: string): Promise<void> {
  await sm(api.users.renameSelf, { name });
}

export async function setUserLocalePreference(locale: Locale): Promise<void> {
  await sm(api.users.setOwnLocale, { locale });
}
