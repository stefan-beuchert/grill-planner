// Hand-written RFC 5545 (.ics) builder for a single, non-recurring party
// event — no attendees, no alarms, no recurrence, so this is simple enough
// to build by hand rather than pull in a dependency (CLAUDE.md's "avoid
// dependency bloat" rule).
//
// DTSTART/DTEND deliberately emit a *floating* local time (RFC 5545 §3.3.5:
// no trailing "Z", no TZID param) rather than doing real timezone
// conversion — consistent with `lib/party-datetime.ts`'s "floating
// wall-clock time faked as UTC" design. A real UTC value (trailing "Z")
// would make every calendar client convert it to the viewer's own device
// timezone on display, which is exactly what this app avoids everywhere
// else. A floating time renders at face value regardless of the viewer's
// timezone, matching `formatPartyDateTime`'s forced `timeZone: "UTC"`
// on-screen behavior.
//
// DTSTAMP is different: it's a genuine creation-instant timestamp (when
// this .ics file was generated), not the event time, so it correctly stays
// real UTC with the "Z" suffix.

const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours — schema has no end-time field.

// RFC 5545 §3.3.11: COMMA, SEMICOLON, BACKSLASH, and newlines must be
// escaped in TEXT values. Order matters — backslash must be escaped first
// so we don't double-escape the backslashes introduced by the other rules.
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r\n|\r|\n/g, "\\n");
}

// DATE-TIME in UTC ("form #2"), per RFC 5545 §3.3.5: YYYYMMDDTHHMMSSZ.
// Only used for DTSTAMP, which is a real instant.
function toIcsUtcDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

// DATE-TIME in floating local form ("form #1"), per RFC 5545 §3.3.5:
// YYYYMMDDTHHMMSS — no "Z", no TZID. `date` already stores the organizer's
// typed wall-clock time pinned to UTC (see `combineDateAndTimeUtc`), so we
// read its UTC field accessors to recover those exact digits and drop the
// "Z" that would otherwise mark it as a real UTC instant.
function toIcsFloatingDateTime(date: Date): string {
  return toIcsUtcDateTime(date).replace(/Z$/, "");
}

const MAX_LINE_OCTETS = 75;
const textEncoder = new TextEncoder();

// RFC 5545 §3.1 line folding: a content line longer than 75 octets must be
// split with a CRLF followed by a single leading space (which the reader
// strips back out on unfolding). Folds are counted in octets (UTF-8 bytes),
// not characters, and must not split a multi-byte codepoint — so we walk by
// Unicode codepoint, not by UTF-16 code unit, and budget in encoded bytes.
// The leading space on every continuation line itself counts toward that
// line's 75-octet budget, hence the -1 for non-first segments.
function foldIcsLine(line: string): string {
  const segments: string[] = [];
  let current = "";
  let currentOctets = 0;

  for (const ch of line) {
    const chOctets = textEncoder.encode(ch).length;
    const budget = segments.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    if (current.length > 0 && currentOctets + chOctets > budget) {
      segments.push(current);
      current = "";
      currentOctets = 0;
    }
    current += ch;
    currentOctets += chOctets;
  }
  segments.push(current);

  return segments.map((segment, i) => (i === 0 ? segment : ` ${segment}`)).join("\r\n");
}

export function buildPartyIcs(party: {
  id: string;
  title: string;
  startsAt: Date;
  location: string;
}): string {
  const dtStamp = toIcsUtcDateTime(new Date());
  const dtStart = toIcsFloatingDateTime(party.startsAt);
  const dtEnd = toIcsFloatingDateTime(new Date(party.startsAt.getTime() + DEFAULT_DURATION_MS));

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Grill Planner//grill-planner//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${party.id}@grill-planner`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(party.title)}`,
    `LOCATION:${escapeIcsText(party.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  // RFC 5545 §3.1 requires CRLF line endings, and mandates a trailing CRLF
  // after the final line.
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
