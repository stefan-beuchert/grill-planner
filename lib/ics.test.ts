import { describe, it, expect } from "vitest";
import { buildPartyIcs } from "@/lib/ics";

const baseParty = {
  id: "party123",
  title: "Summer BBQ",
  startsAt: new Date("2026-08-15T18:00:00.000Z"),
  location: "123 Garden Street",
};

describe("buildPartyIcs", () => {
  it("uses CRLF line endings throughout, per RFC 5545", () => {
    const ics = buildPartyIcs(baseParty);
    expect(ics).not.toMatch(/(?<!\r)\n/); // every \n is preceded by \r
    expect(ics.split("\r\n").length).toBeGreaterThan(1);
  });

  it("wraps the event in BEGIN/END VCALENDAR and VEVENT blocks", () => {
    const ics = buildPartyIcs(baseParty);
    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics).toContain("END:VCALENDAR\r\n");
    expect(ics).toContain("BEGIN:VEVENT\r\n");
    expect(ics).toContain("END:VEVENT\r\n");
  });

  it("derives a stable UID from the party id", () => {
    const ics = buildPartyIcs(baseParty);
    expect(ics).toContain("UID:party123@orbit\r\n");
  });

  it("emits DTSTART as a floating local time (no trailing Z), reusing startsAt's UTC-stored digits with no timezone conversion", () => {
    const ics = buildPartyIcs(baseParty);
    // 2026-08-15T18:00:00.000Z -> 20260815T180000 (floating, no Z)
    expect(ics).toContain("DTSTART:20260815T180000\r\n");
  });

  it("sets DTEND exactly 3 hours after DTSTART, also as a floating local time", () => {
    const ics = buildPartyIcs(baseParty);
    expect(ics).toContain("DTEND:20260815T210000\r\n");
  });

  it("marks DTSTAMP as a real UTC instant (trailing Z) while DTSTART/DTEND stay floating (no Z), so calendar clients don't convert the event time to the viewer's own timezone", () => {
    const ics = buildPartyIcs(baseParty);
    const dtStampLine = ics.split("\r\n").find((line) => line.startsWith("DTSTAMP:"));
    const dtStartLine = ics.split("\r\n").find((line) => line.startsWith("DTSTART:"));
    const dtEndLine = ics.split("\r\n").find((line) => line.startsWith("DTEND:"));
    expect(dtStampLine).toMatch(/Z$/);
    expect(dtStartLine).not.toMatch(/Z$/);
    expect(dtEndLine).not.toMatch(/Z$/);
  });

  it("includes SUMMARY and LOCATION but no DESCRIPTION", () => {
    const ics = buildPartyIcs(baseParty);
    expect(ics).toContain("SUMMARY:Summer BBQ\r\n");
    expect(ics).toContain("LOCATION:123 Garden Street\r\n");
    expect(ics).not.toContain("DESCRIPTION:");
  });

  it("escapes commas, semicolons, and backslashes in TEXT values", () => {
    const ics = buildPartyIcs({
      ...baseParty,
      title: "BBQ, Round 2; Bring \\ your appetite",
      location: "Garden St; Suite, 5 \\ Back",
    });
    expect(ics).toContain("SUMMARY:BBQ\\, Round 2\\; Bring \\\\ your appetite\r\n");
    expect(ics).toContain("LOCATION:Garden St\\; Suite\\, 5 \\\\ Back\r\n");
  });

  it("escapes newlines in TEXT values as literal \\n", () => {
    const ics = buildPartyIcs({
      ...baseParty,
      location: "123 Garden Street\nRing twice",
    });
    expect(ics).toContain("LOCATION:123 Garden Street\\nRing twice\r\n");
  });

  it("folds long SUMMARY/LOCATION lines per RFC 5545 §3.1 (CRLF + single leading space at the 75-octet boundary)", () => {
    const ics = buildPartyIcs({
      ...baseParty,
      title: "A".repeat(100),
      location: "B".repeat(100),
    });

    // No individual physical line (content between CRLFs) may exceed 75 octets.
    for (const line of ics.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }

    // "SUMMARY:" (8 octets) + 67 A's = 75 octets on the first line, then a
    // folded continuation ("\r\n " + remaining 33 A's).
    expect(ics).toContain(`SUMMARY:${"A".repeat(67)}\r\n ${"A".repeat(33)}\r\n`);
    // "LOCATION:" (9 octets) + 66 B's = 75 octets on the first line, then a
    // folded continuation ("\r\n " + remaining 34 B's).
    expect(ics).toContain(`LOCATION:${"B".repeat(66)}\r\n ${"B".repeat(34)}\r\n`);
  });

  it("produces a different UID for a different party id", () => {
    const icsA = buildPartyIcs(baseParty);
    const icsB = buildPartyIcs({ ...baseParty, id: "otherparty" });
    expect(icsA).toContain("UID:party123@orbit");
    expect(icsB).toContain("UID:otherparty@orbit");
  });
});
