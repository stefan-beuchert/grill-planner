"use client";

import { useRouter } from "next/navigation";
import { joinParty } from "@/lib/actions/participant";
import { setStoredParticipant } from "@/lib/participant-storage";

export function useJoinParty(slug: string) {
  const router = useRouter();

  return async function join(name: string) {
    const result = await joinParty(slug, name);
    if (!result.success) {
      return { success: false as const, error: result.error };
    }
    setStoredParticipant(slug, {
      participantId: result.participantId,
      editToken: result.editToken,
    });
    router.refresh();
    return { success: true as const };
  };
}
