"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isAdmin, setAdminSession, clearAdminSession } from "@/lib/admin-auth";
import { partyFormSchema, type PartyFormValues } from "@/lib/validations/party";
import { combineDateAndTimeUtc } from "@/lib/party-datetime";
import { getLocale } from "@/lib/i18n/get-locale";
import { dictionaries } from "@/lib/i18n/dictionaries";

export async function adminLogin(passcode: string) {
  const t = dictionaries[await getLocale()];

  if (!process.env.ADMIN_PASSCODE || passcode !== process.env.ADMIN_PASSCODE) {
    return { success: false as const, error: t.admin.wrongPasscode };
  }

  await setAdminSession();
  revalidatePath("/admin");
  return { success: true as const };
}

export async function adminLogout() {
  await clearAdminSession();
  revalidatePath("/admin");
  return { success: true as const };
}

export async function adminDeleteParty(partyId: string) {
  if (!(await isAdmin())) return { success: false as const };
  await prisma.party.delete({ where: { id: partyId } });
  revalidatePath("/admin");
  return { success: true as const };
}

export async function adminUpdateParty(
  slug: string,
  partyId: string,
  values: PartyFormValues,
) {
  const t = dictionaries[await getLocale()];
  if (!(await isAdmin())) return { success: false as const, error: t.admin.notAdmin };

  const parsed = partyFormSchema(t).safeParse(values);
  if (!parsed.success) {
    return { success: false as const, error: t.createPartyForm.genericError };
  }

  const startsAt = combineDateAndTimeUtc(parsed.data.date, parsed.data.time);
  if (Number.isNaN(startsAt.getTime())) {
    return { success: false as const, error: t.createPartyForm.invalidDateTime };
  }

  await prisma.party.update({
    where: { id: partyId },
    data: {
      title: parsed.data.title,
      startsAt,
      location: parsed.data.location,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}

export async function adminCancelParty(partyId: string) {
  if (!(await isAdmin())) return;
  await prisma.party.delete({ where: { id: partyId } });
  redirect("/");
}

export async function adminUnmarkPurchased(slug: string, itemId: string) {
  if (!(await isAdmin())) return { success: false as const };
  await prisma.item.update({
    where: { id: itemId },
    data: { purchased: false, purchasedByParticipantId: null },
  });
  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}

export async function adminRemoveContribution(
  slug: string,
  itemId: string,
  participantId: string,
) {
  if (!(await isAdmin())) return { success: false as const };
  await prisma.contribution.deleteMany({ where: { itemId, participantId } });
  const remaining = await prisma.contribution.count({ where: { itemId } });
  if (remaining === 0) {
    await prisma.item.delete({ where: { id: itemId } }).catch(() => {});
  }
  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}

export async function adminRemoveGuest(slug: string, participantId: string) {
  if (!(await isAdmin())) return { success: false as const };

  const contributedItemIds = (
    await prisma.contribution.findMany({
      where: { participantId },
      select: { itemId: true },
    })
  ).map((c) => c.itemId);

  await prisma.participant.delete({ where: { id: participantId } });

  for (const itemId of contributedItemIds) {
    const remaining = await prisma.contribution.count({ where: { itemId } });
    if (remaining === 0) {
      await prisma.item.delete({ where: { id: itemId } }).catch(() => {});
    }
  }

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}
