import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// `date` and `time` come from <input type="date"> / <input type="time">,
// which give plain "YYYY-MM-DD" / "HH:MM" strings — combined into one
// `startsAt` instant only once validation passes (see lib/actions/party.ts).
// A function, not a static schema, so validation messages match whichever
// locale the caller (client form or server action) is currently using.
export function partyFormSchema(t: Dictionary) {
  return z.object({
    title: z.string().trim().min(1, t.createPartyForm.titleRequired).max(100),
    date: z.string().min(1, t.createPartyForm.dateRequired),
    time: z.string().min(1, t.createPartyForm.timeRequired),
    location: z.string().trim().min(1, t.createPartyForm.locationRequired).max(200),
    notes: z.string().trim().max(1000).optional(),
  });
}

export type PartyFormValues = z.infer<ReturnType<typeof partyFormSchema>>;
