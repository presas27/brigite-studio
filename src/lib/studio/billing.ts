import "server-only";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { sa, sm, sq } from "./convexServer";

export async function isAdmin(): Promise<boolean> {
  return sq(api.billing.isAdmin);
}

export async function myBilling() {
  return sq(api.billing.mine);
}

export async function billingOverview() {
  return sq(api.billing.overview);
}

export async function listCoachesAdmin() {
  return sq(api.billing.listCoaches);
}

export async function coachDetailAdmin(coachId: string) {
  return sq(api.billing.coachDetail, { coachId: coachId as Id<"users"> });
}

export async function listClientsAdmin() {
  return sq(api.billing.listClients);
}

export async function updateCoachBilling(input: {
  coachId: string;
  exempt: boolean;
  includedClients: number;
  pricePerClientCents: number;
}): Promise<void> {
  await sm(api.billing.updateCoachBilling, {
    coachId: input.coachId as Id<"users">,
    exempt: input.exempt,
    includedClients: input.includedClients,
    pricePerClientCents: input.pricePerClientCents,
  });
}

export async function startCheckout(): Promise<string> {
  const { url } = await sa(api.payments.startCheckout);
  return url;
}

export async function startPortal(): Promise<string> {
  const { url } = await sa(api.payments.startPortal);
  return url;
}

export function formatEur(cents: number): string {
  return (cents / 100).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}
