"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorizeParticipant } from "@/lib/participant-auth";
import { rideStatusSchema, type RideStatusValues } from "@/lib/validations/ride";
import { getLocale } from "@/lib/i18n/get-locale";
import { dictionaries } from "@/lib/i18n/dictionaries";

export async function setRideStatus(
  slug: string,
  participantId: string,
  editToken: string,
  input: RideStatusValues,
) {
  const t = dictionaries[await getLocale()];

  const parsed = rideStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: t.common.invalidRideInfo };
  }

  const participant = await authorizeParticipant(participantId, editToken);
  if (!participant) {
    return { success: false as const, error: t.common.onlyOwnInfo };
  }

  const { status } = parsed.data;
  try {
    await prisma.participant.update({
      where: { id: participantId },
      data: {
        isDriver: status === "driving",
        needsRide: status === "needsRide",
        seatsFree: status === "driving" ? (parsed.data.seatsFree ?? 1) : null,
      },
    });
  } catch (err) {
    console.error("setRideStatus failed", { slug, participantId }, err);
    return { success: false as const, error: t.common.actionFailed };
  }

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}
