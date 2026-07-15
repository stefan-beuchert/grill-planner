import { describe, it, expect } from "vitest";
import { splitLineItemCents } from "@/lib/split";

describe("splitLineItemCents", () => {
  it("splits evenly with no remainder", () => {
    const shares = splitLineItemCents(300, ["a", "b", "c"]);
    expect(Object.fromEntries(shares)).toEqual({ a: 100, b: 100, c: 100 });
  });

  it("distributes the remainder to the front of the given order", () => {
    const shares = splitLineItemCents(101, ["a", "b", "c"]);
    expect(Object.fromEntries(shares)).toEqual({ a: 34, b: 34, c: 33 });
  });

  it("gives a single participant the full amount", () => {
    const shares = splitLineItemCents(999, ["a"]);
    expect(Object.fromEntries(shares)).toEqual({ a: 999 });
  });

  it("gives every participant a 0 share for a zero-cent line item", () => {
    const shares = splitLineItemCents(0, ["a", "b"]);
    expect(Object.fromEntries(shares)).toEqual({ a: 0, b: 0 });
  });

  it("returns an empty map for an empty participant list", () => {
    const shares = splitLineItemCents(500, []);
    expect(shares.size).toBe(0);
  });

  it("always sums exactly to the total, across a few (total, n) pairs", () => {
    const cases: [number, number][] = [
      [100, 3],
      [1, 7],
      [999, 4],
      [12345, 11],
      [0, 5],
      [7, 1],
    ];
    for (const [total, n] of cases) {
      const ids = Array.from({ length: n }, (_, i) => `p${i}`);
      const shares = splitLineItemCents(total, ids);
      const sum = [...shares.values()].reduce((a, b) => a + b, 0);
      expect(sum).toBe(total);
    }
  });

  it("shifts who gets the extra cent when the same participants are reordered", () => {
    const forward = splitLineItemCents(101, ["a", "b", "c"]);
    const reversed = splitLineItemCents(101, ["c", "b", "a"]);
    expect(Object.fromEntries(forward)).toEqual({ a: 34, b: 34, c: 33 });
    expect(Object.fromEntries(reversed)).toEqual({ c: 34, b: 34, a: 33 });
  });
});
