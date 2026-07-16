import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPartyIcs } from "@/lib/ics";

// Plain GET route (not a Server Action) since a browser download link needs
// a real URL to navigate/link to. Same public trust model as the party page
// itself — the slug is the only "authorization" needed, no token required.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const party = await prisma.party.findUnique({
    where: { slug },
    select: { id: true, title: true, startsAt: true, location: true },
  });

  if (!party) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ics = buildPartyIcs(party);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
    },
  });
}
