// Pure rounding logic for splitting a line item's price across the
// participants included in it (Milestone 2 of Cost Splitting — see
// PRODUCT.md). No DB, no React — independently unit-testable, see
// lib/split.test.ts.

/// Floor-divides `lineTotalCents` evenly across `participantIdsInOrder`,
/// then hands the leftover cent(s) one at a time to the front of the given
/// order (index 0, 1, 2, ... get +1 cent until the remainder is
/// exhausted). Order-sensitive by design — reordering the same
/// participants shifts who gets the extra cent, so callers should pass a
/// stable, deterministic order (e.g. `createdAt asc`).
//
// Invariant: the sum of every returned share always exactly equals
// `lineTotalCents`.
export function splitLineItemCents(
  lineTotalCents: number,
  participantIdsInOrder: readonly string[],
): Map<string, number> {
  const shares = new Map<string, number>();
  const n = participantIdsInOrder.length;
  if (n === 0) return shares;

  const base = Math.floor(lineTotalCents / n);
  const remainder = lineTotalCents - base * n;

  participantIdsInOrder.forEach((participantId, index) => {
    shares.set(participantId, base + (index < remainder ? 1 : 0));
  });

  return shares;
}
