import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function participantNameSchema(t: Dictionary) {
  return z.object({
    name: z.string().trim().min(1, t.participants.nameRequired).max(50),
  });
}

export type ParticipantNameValues = z.infer<ReturnType<typeof participantNameSchema>>;
