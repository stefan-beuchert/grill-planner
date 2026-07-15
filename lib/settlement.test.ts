import { describe, it, expect } from "vitest";
import { computeNetBalances, simplifyDebts, type SplitReceipt } from "@/lib/settlement";

describe("computeNetBalances", () => {
  it("nets a payer correctly when a receipt is split evenly N ways", () => {
    const receipts: SplitReceipt[] = [
      {
        paidByParticipantId: "alice",
        lineItems: [{ lineTotalCents: 300, includedParticipantIds: ["alice", "bob", "carol"] }],
      },
    ];
    const balances = computeNetBalances(["alice", "bob", "carol"], receipts);
    expect(balances.get("alice")).toBe(200); // paid 300, owes 100
    expect(balances.get("bob")).toBe(-100);
    expect(balances.get("carol")).toBe(-100);
  });

  it("only charges a participant for line items they're included in on the same receipt", () => {
    const receipts: SplitReceipt[] = [
      {
        paidByParticipantId: "alice",
        lineItems: [
          { lineTotalCents: 200, includedParticipantIds: ["alice", "bob"] }, // bob owes 100
          { lineTotalCents: 300, includedParticipantIds: ["alice"] }, // bob excluded, owes 0
        ],
      },
    ];
    const balances = computeNetBalances(["alice", "bob"], receipts);
    expect(balances.get("bob")).toBe(-100);
    expect(balances.get("alice")).toBe(500 - 400); // paid 500 total, owes 100 + 300
  });

  it("accumulates correctly across multiple receipts with different payers", () => {
    const receipts: SplitReceipt[] = [
      {
        paidByParticipantId: "alice",
        lineItems: [{ lineTotalCents: 200, includedParticipantIds: ["alice", "bob"] }],
      },
      {
        paidByParticipantId: "bob",
        lineItems: [{ lineTotalCents: 200, includedParticipantIds: ["alice", "bob"] }],
      },
    ];
    const balances = computeNetBalances(["alice", "bob"], receipts);
    // Each paid 200, each owes 100+100=200 total across both receipts — net 0 for both.
    expect(balances.get("alice")).toBe(0);
    expect(balances.get("bob")).toBe(0);
  });

  it("contributes 0 to paid but a normal owed amount when paidByParticipantId is null", () => {
    const receipts: SplitReceipt[] = [
      {
        paidByParticipantId: null,
        lineItems: [{ lineTotalCents: 200, includedParticipantIds: ["alice", "bob"] }],
      },
    ];
    const balances = computeNetBalances(["alice", "bob"], receipts);
    expect(balances.get("alice")).toBe(-100);
    expect(balances.get("bob")).toBe(-100);
  });

  it("nets a participant who never paid and was never included to exactly 0", () => {
    const receipts: SplitReceipt[] = [
      {
        paidByParticipantId: "alice",
        lineItems: [{ lineTotalCents: 200, includedParticipantIds: ["alice", "bob"] }],
      },
    ];
    const balances = computeNetBalances(["alice", "bob", "carol"], receipts);
    expect(balances.get("carol")).toBe(0);
  });

  it("gives every participant a key even with no receipts", () => {
    const balances = computeNetBalances(["alice", "bob"], []);
    expect(balances.get("alice")).toBe(0);
    expect(balances.get("bob")).toBe(0);
  });

  it("doesn't crash on a line item with an empty includedParticipantIds", () => {
    const receipts: SplitReceipt[] = [
      {
        paidByParticipantId: "alice",
        lineItems: [{ lineTotalCents: 200, includedParticipantIds: [] }],
      },
    ];
    const balances = computeNetBalances(["alice"], receipts);
    expect(balances.get("alice")).toBe(200); // paid but nobody owes for it
  });
});

describe("simplifyDebts", () => {
  it("produces zero transactions for all-zero balances", () => {
    const balances = new Map([
      ["alice", 0],
      ["bob", 0],
    ]);
    expect(simplifyDebts(balances)).toEqual([]);
  });

  it("produces exactly one transaction for a single creditor and single debtor", () => {
    const balances = new Map([
      ["alice", 500],
      ["bob", -500],
    ]);
    const transactions = simplifyDebts(balances);
    expect(transactions).toEqual([{ fromParticipantId: "bob", toParticipantId: "alice", amountCents: 500 }]);
  });

  it("simplifies the canonical 3-way even split into 2 transactions, not a naive pairwise 3", () => {
    const balances = new Map([
      ["alice", 200],
      ["bob", -100],
      ["carol", -100],
    ]);
    const transactions = simplifyDebts(balances);
    expect(transactions).toHaveLength(2);
    expect(transactions.every((tx) => tx.toParticipantId === "alice")).toBe(true);
    const totalToAlice = transactions.reduce((sum, tx) => sum + tx.amountCents, 0);
    expect(totalToAlice).toBe(200);
  });

  it("always transacts the total exactly equal to the total positive balance", () => {
    const balances = new Map([
      ["a", 300],
      ["b", 150],
      ["c", -200],
      ["d", -250],
    ]);
    const transactions = simplifyDebts(balances);
    const totalTransacted = transactions.reduce((sum, tx) => sum + tx.amountCents, 0);
    expect(totalTransacted).toBe(450);
  });

  it("never produces more transactions than nonZeroBalances.length - 1", () => {
    const balances = new Map([
      ["a", 300],
      ["b", 150],
      ["c", -200],
      ["d", -250],
    ]);
    const nonZero = [...balances.values()].filter((v) => v !== 0);
    const transactions = simplifyDebts(balances);
    expect(transactions.length).toBeLessThanOrEqual(nonZero.length - 1);
  });

  it("breaks ties between equal-amount creditors deterministically", () => {
    const balances = new Map([
      ["zoe", 100],
      ["amy", 100],
      ["bob", -200],
    ]);
    const first = simplifyDebts(balances);
    const second = simplifyDebts(new Map(balances));
    expect(first).toEqual(second);
    // amy sorts before zoe alphabetically, so amy is settled first.
    expect(first[0]).toEqual({ fromParticipantId: "bob", toParticipantId: "amy", amountCents: 100 });
  });
});
