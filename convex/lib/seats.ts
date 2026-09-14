export const DEFAULT_INCLUDED = 2;
export const DEFAULT_PRICE_CENTS = 249;

export function extraSeats(activeCount: number, included: number): number {
  return Math.max(0, activeCount - included);
}

export function monthlyCents(extra: number, pricePerClientCents: number): number {
  return extra * pricePerClientCents;
}
