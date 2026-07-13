"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isAdmin, setAdminSession, clearAdminSession } from "@/lib/admin-auth";
import { canManageParty } from "@/lib/organizer-auth";
import { partyFormSchema, type PartyFormValues } from "@/lib/validations/party";
import { combineDateAndTimeUtc } from "@/lib/party-datetime";
import { getLocale } from "@/lib/i18n/get-locale";
import { dictionaries } from "@/lib/i18n/dictionaries";
import type { ItemListType } from "@/lib/generated/prisma/enums";

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
  try {
    await prisma.party.delete({ where: { id: partyId } });
  } catch (err) {
    console.error("adminDeleteParty failed", { partyId }, err);
    return { success: false as const };
  }
  revalidatePath("/admin");
  return { success: true as const };
}

export async function adminUpdateParty(
  slug: string,
  partyId: string,
  values: PartyFormValues,
  organizerToken?: string,
) {
  const t = dictionaries[await getLocale()];
  if (!(await canManageParty(slug, organizerToken))) {
    return { success: false as const, error: t.admin.notAdmin };
  }

  const parsed = partyFormSchema(t).safeParse(values);
  if (!parsed.success) {
    return { success: false as const, error: t.createPartyForm.genericError };
  }

  const startsAt = combineDateAndTimeUtc(parsed.data.date, parsed.data.time);
  if (Number.isNaN(startsAt.getTime())) {
    return { success: false as const, error: t.createPartyForm.invalidDateTime };
  }

  try {
    await prisma.party.update({
      where: { id: partyId },
      data: {
        title: parsed.data.title,
        startsAt,
        location: parsed.data.location,
        notes: parsed.data.notes || null,
      },
    });
  } catch (err) {
    console.error("adminUpdateParty failed", { slug, partyId }, err);
    return { success: false as const, error: t.common.actionFailed };
  }

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}

export async function adminCancelParty(slug: string, partyId: string, organizerToken?: string) {
  if (!(await canManageParty(slug, organizerToken))) return { success: false as const };
  try {
    await prisma.party.delete({ where: { id: partyId } });
  } catch (err) {
    console.error("adminCancelParty failed", { slug, partyId }, err);
    return { success: false as const };
  }
  redirect("/");
}

export async function adminUnmarkPurchased(slug: string, itemId: string, organizerToken?: string) {
  if (!(await canManageParty(slug, organizerToken))) return { success: false as const };
  try {
    await prisma.item.update({
      where: { id: itemId },
      data: { purchased: false, purchasedByParticipantId: null },
    });
  } catch (err) {
    console.error("adminUnmarkPurchased failed", { slug, itemId }, err);
    return { success: false as const };
  }
  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}

export async function adminRemoveContribution(
  slug: string,
  itemId: string,
  participantId: string,
  organizerToken?: string,
) {
  if (!(await canManageParty(slug, organizerToken))) return { success: false as const };
  try {
    await prisma.contribution.deleteMany({ where: { itemId, participantId } });
    const remaining = await prisma.contribution.count({ where: { itemId } });
    if (remaining === 0) {
      await prisma.item.delete({ where: { id: itemId } }).catch(() => {});
    }
  } catch (err) {
    console.error("adminRemoveContribution failed", { slug, itemId, participantId }, err);
    return { success: false as const };
  }
  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}

export async function adminMoveItem(
  slug: string,
  itemId: string,
  targetListType: ItemListType,
  organizerToken?: string,
) {
  if (!(await canManageParty(slug, organizerToken))) return { success: false as const };

  try {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item || item.listType === targetListType) return { success: false as const };

    // The (partyId, listType, name) constraint means a same-named item might
    // already sit on the target list — moving would collide, so bail out.
    const conflict = await prisma.item.findUnique({
      where: {
        partyId_listType_name: { partyId: item.partyId, listType: targetListType, name: item.name },
      },
    });
    if (conflict) return { success: false as const };

    await prisma.item.update({
      where: { id: itemId },
      data: {
        listType: targetListType,
        category: targetListType === "SHARED_PURCHASE" ? "OTHER" : null,
        purchased: false,
        purchasedByParticipantId: null,
      },
    });
  } catch (err) {
    console.error("adminMoveItem failed", { slug, itemId, targetListType }, err);
    return { success: false as const };
  }

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}

export async function adminRemoveGuest(
  slug: string,
  participantId: string,
  organizerToken?: string,
) {
  if (!(await canManageParty(slug, organizerToken))) return { success: false as const };

  try {
    const contributedItemIds = (
      await prisma.contribution.findMany({
        where: { participantId },
        select: { itemId: true },
      })
    ).map((c) => c.itemId);

    await prisma.participant.delete({ where: { id: participantId } });

    if (contributedItemIds.length > 0) {
      // One query for all now-possibly-empty items, instead of a per-item
      // count-then-maybe-delete round trip.
      await prisma.item.deleteMany({
        where: { id: { in: contributedItemIds }, contributions: { none: {} } },
      });
    }
  } catch (err) {
    console.error("adminRemoveGuest failed", { slug, participantId }, err);
    return { success: false as const };
  }

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}
