import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";

// Mirrors authorizeParticipant's shape, but keyed by Party.organizerToken
// instead of Participant.editToken — proves "this browser created this
// party" without a session table, same trust model.
export async function authorizeOrganizer(slug: string, organizerToken: string) {
  const party = await prisma.party.findUnique({ where: { slug } });
  if (!party || party.organizerToken !== organizerToken) {
    return null;
  }
  return party;
}

// Every per-party admin action accepts either: the app-wide admin passcode,
// or the organizer token of that specific party. Cross-party actions (e.g.
// listing/deleting every party from the admin dashboard) intentionally
// don't use this — there's no per-party equivalent of "manage everything".
export async function canManageParty(slug: string, organizerToken: string | null | undefined) {
  if (await isAdmin()) return true;
  if (!organizerToken) return false;
  return (await authorizeOrganizer(slug, organizerToken)) !== null;
}
