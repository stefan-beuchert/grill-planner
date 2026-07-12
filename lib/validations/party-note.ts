import { z } from "zod";

export const partyNoteSchema = z.object({
  note: z.string().trim().max(300),
});

export type PartyNoteValues = z.infer<typeof partyNoteSchema>;
